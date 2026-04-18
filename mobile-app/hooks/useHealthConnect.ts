import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { initialize, requestPermission, readRecords } from 'react-native-health-connect';
import api from '../services/api';

// Định nghĩa nguồn dữ liệu ưu tiên (Huawei thông qua Health Sync)
const PRIORITY_SOURCE = 'nl.appyhapps.healthsync';

export function useHealthConnect() {
  const [loading, setLoading] = useState(false);

  const syncHealthData = useCallback(async (daysToFetch: number = 30) => {
    if (Platform.OS !== 'android') return false;
    setLoading(true);

    try {
      // 1. Khởi tạo và xin quyền
      await initialize();
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'BasalMetabolicRate' }, // Thêm quyền đọc Calo cơ bản
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'SleepSession' },
      ]);

      const now = new Date();
      const startTime = new Date(now.getTime() - daysToFetch * 24 * 60 * 60 * 1000).toISOString();
      const endTime = now.toISOString();
      const filter = { timeRangeFilter: { operator: 'between', startTime, endTime } };

      // 2. Fetch dữ liệu thô
      const [steps, heart, oxygen, calories, distance, sleepSessions, basal] = await Promise.all([
        readRecords('Steps', filter as any),
        readRecords('HeartRate', filter as any),
        readRecords('OxygenSaturation', filter as any),
        readRecords('ActiveCaloriesBurned', filter as any),
        readRecords('Distance', filter as any),
        readRecords('SleepSession', filter as any),
        readRecords('BasalMetabolicRate', filter as any), // Lấy dữ liệu BMR
      ]);

      const groupedMap: Record<string, any> = {};

      // 3. Hàm gộp dữ liệu thông minh (Giữ nguyên logic của Duy)
      const addToMap = (time: string, fields: any) => {
        if (!time) return;
        const date = new Date(time);
        date.setSeconds(0, 0); 
        const timeKey = date.toISOString();

        if (!groupedMap[timeKey]) {
          groupedMap[timeKey] = {
            record_time: timeKey,
            heart_rate: null,
            steps: 0,
            blood_oxygen: null,
            calories: 0,
            distance: 0,
            sleep_duration: 0,
            raw_data: {},
            hr_samples: [] 
          };
        }

        const entry = groupedMap[timeKey];

        // Gộp nhịp tim
        if (fields.heart_rate != null) {
          entry.hr_samples.push(fields.heart_rate);
          const sum = entry.hr_samples.reduce((a: number, b: number) => a + b, 0);
          entry.heart_rate = Math.round(sum / entry.hr_samples.length);
        }

        // Gộp SpO2
        if (fields.blood_oxygen != null) {
          entry.blood_oxygen = fields.blood_oxygen;
        }

        // Cộng dồn các chỉ số vận động
        if (fields.steps != null) entry.steps += fields.steps;
        if (fields.calories != null) entry.calories += fields.calories;
        if (fields.distance != null) entry.distance += fields.distance;
        if (fields.sleep_duration != null) entry.sleep_duration += fields.sleep_duration;

        if (fields.raw_data) {
          entry.raw_data = { ...entry.raw_data, ...fields.raw_data };
        }
      };

      // 4. XỬ LÝ NHỊP TIM (Giữ nguyên)
      heart.records.forEach((record: any) => {
        if (record.samples && record.samples.length > 0) {
          record.samples.forEach((sample: any) => {
            addToMap(sample.time, { heart_rate: sample.beatsPerMinute });
          });
        } else if (record.beatsPerMinute != null) {
          addToMap(record.startTime, { heart_rate: record.beatsPerMinute });
        }
      });

      // 5. XỬ LÝ GIẤC NGỦ (Giữ nguyên)
      sleepSessions.records.forEach((session: any) => {
        if (session.metadata?.dataOrigin !== PRIORITY_SOURCE && sleepSessions.records.some(r => r.metadata?.dataOrigin === PRIORITY_SOURCE)) return;

        if (session.stages && session.stages.length > 0) {
          session.stages.forEach((stage: any) => {
            const s = new Date(stage.startTime).getTime();
            const e = new Date(stage.endTime).getTime();
            const durationInMinutes = Math.round((e - s) / 60000);
            addToMap(stage.startTime, { 
              sleep_duration: durationInMinutes,
              raw_data: { sleep_stages: stage.stage } 
            });
          });
        } else {
          const s = new Date(session.startTime).getTime();
          const e = new Date(session.endTime).getTime();
          addToMap(session.startTime, { sleep_duration: Math.round((e - s) / 60000) });
        }
      });

      // 6. XỬ LÝ CÁC CHỈ SỐ VẬN ĐỘNG (Lọc ưu tiên Huawei/Health Sync)
      
      // Xử lý Steps
      steps.records.forEach((r: any) => {
        if (r.metadata?.dataOrigin === PRIORITY_SOURCE) {
          addToMap(r.startTime, { steps: r.count });
        }
      });
      
      // Xử lý Calories: Gộp Active + Basal để khớp con số Huawei
      // Bước A: Cộng Active Calories (32 kcal Duy đang thấy)
      calories.records.forEach((r: any) => {
        if (r.metadata?.dataOrigin === PRIORITY_SOURCE) {
          const kcal = r.energy.inKilocalories;
          if (kcal > 0 && kcal < 200) { 
            addToMap(r.startTime, { calories: kcal });
          }
        }
      });

      // Bước B: Cộng Basal Calories (Phần 90 kcal còn thiếu)
      // BMR trong Health Connect thường ghi theo mốc thời gian (time)
      basal.records.forEach((r: any) => {
        if (r.metadata?.dataOrigin === PRIORITY_SOURCE) {
          // BMR trả về kcal/ngày. Ta quy đổi ra kcal/phút tại thời điểm đó.
          const kcalPerMinute = r.basalMetabolicRate.inKilocaloriesPerDay / 1440;
          addToMap(r.time, { calories: kcalPerMinute });
        }
      });

      // Xử lý Distance
      distance.records.forEach((r: any) => {
        if (r.metadata?.dataOrigin === PRIORITY_SOURCE) {
          addToMap(r.startTime, { distance: r.distance.inMeters });
        }
      });

      // Xử lý SpO2
      oxygen.records.forEach((r: any) => {
        if (r.percentage != null) {
            addToMap(r.time, { blood_oxygen: r.percentage });
        }
      });

      // 7. Tạo Payload cuối cùng (Giữ nguyên)
      const finalPayload = Object.values(groupedMap)
        .filter((item: any) => {
          return item.steps > 0 || 
                 item.heart_rate != null || 
                 item.blood_oxygen != null || 
                 item.calories > 0 || 
                 item.sleep_duration > 0;
        })
        .map(({ hr_samples, ...rest }) => rest);

      // 8. Đẩy lên Server (Giữ nguyên)
      if (finalPayload.length > 0) {
        await api.syncMetrics({ data: finalPayload });
        return true;
      }

      return false;

    } catch (error: any) {
      console.error("❌ [Sync Error]:", error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { syncHealthData, loading };
}