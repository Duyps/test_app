import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { initialize, requestPermission, readRecords } from 'react-native-health-connect';
import api from '../services/api';

export function useHealthConnect() {
  const [loading, setLoading] = useState(false);

  const syncHealthData = useCallback(async () => {
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
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'SleepSession' },
      ]);

      const now = new Date();
      // Fetch dữ liệu 3 ngày gần nhất để đảm bảo đủ dữ liệu vẽ biểu đồ
      const startTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = now.toISOString();
      const filter = { timeRangeFilter: { operator: 'between', startTime, endTime } };

      // 2. Đọc toàn bộ record thô
      const [steps, heart, oxygen, calories, distance, sleepSessions] = await Promise.all([
        readRecords('Steps', filter as any),
        readRecords('HeartRate', filter as any),
        readRecords('OxygenSaturation', filter as any),
        readRecords('ActiveCaloriesBurned', filter as any),
        readRecords('Distance', filter as any),
        readRecords('SleepSession', filter as any),
      ]);

      const groupedMap: Record<string, any> = {};

      // 3. Hàm gộp dữ liệu thông minh (Gộp theo phút để khớp @@unique)
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
            raw_data: {} 
          };
        }

        const entry = groupedMap[timeKey];
        if (fields.steps) entry.steps += fields.steps;
        if (fields.calories) entry.calories += fields.calories;
        if (fields.distance) entry.distance += fields.distance;
        if (fields.sleep_duration) entry.sleep_duration += fields.sleep_duration;
        if (fields.heart_rate) entry.heart_rate = fields.heart_rate;
        if (fields.blood_oxygen) entry.blood_oxygen = fields.blood_oxygen;

        // Gộp raw_data để tránh mất stage khi gộp nhiều loại dữ liệu cùng 1 phút
        if (fields.raw_data) {
          entry.raw_data = { ...entry.raw_data, ...fields.raw_data };
        }
      };

      // 4. XỬ LÝ NHỊP TIM (Lấy từng điểm đo nhỏ nhất)
      heart.records.forEach((record: any) => {
        record.samples?.forEach((sample: any) => {
          addToMap(sample.time, { heart_rate: sample.beatsPerMinute });
        });
      });

      // 5. XỬ LÝ GIẤC NGỦ (Deep, Light, REM, Awake)
      sleepSessions.records.forEach((session: any) => {
        if (session.stages && session.stages.length > 0) {
          session.stages.forEach((stage: any) => {
            const s = new Date(stage.startTime).getTime();
            const e = new Date(stage.endTime).getTime();
            const dur = Math.round((e - s) / 60000);
            
            addToMap(stage.startTime, { 
              sleep_duration: dur,
              raw_data: { sleep_stages: stage.stage } 
            });
          });
        } else {
          const s = new Date(session.startTime).getTime();
          const e = new Date(session.endTime).getTime();
          addToMap(session.startTime, { sleep_duration: Math.round((e - s) / 60000) });
        }
      });

      // 6. XỬ LÝ CÁC CHỈ SỐ KHÁC
      steps.records.forEach((r: any) => addToMap(r.startTime, { steps: r.count }));
      oxygen.records.forEach((r: any) => addToMap(r.time, { blood_oxygen: r.percentage }));
      calories.records.forEach((r: any) => addToMap(r.startTime, { calories: r.energy.inKilocalories }));
      distance.records.forEach((r: any) => addToMap(r.startTime, { distance: r.distance.inMeters }));

      const finalPayload = Object.values(groupedMap).filter((item: any) => {
        return item.steps > 0 || item.heart_rate || item.blood_oxygen || item.calories > 0 || item.sleep_duration > 0;
      });

      // --- 7. CONSOLE LOG KIỂM TRA (DUY XEM Ở ĐÂY) ---
      console.log("------------------------------------------");
      console.log(`📊 Tổng số bản ghi chuẩn bị gửi: ${finalPayload.length}`);
      
      const sleepCheck = finalPayload.filter(p => p.raw_data?.sleep_stages);
      if (sleepCheck.length > 0) {
        console.log("✅ Đã tìm thấy dữ liệu giai đoạn ngủ (Stages):");
        const stageNames: any = { 1: "Thức", 4: "Nông", 5: "Sâu", 6: "REM" };
        sleepCheck.slice(0, 5).forEach(s => {
          console.log(`   - Lúc: ${s.record_time} | Stage: ${stageNames[s.raw_data.sleep_stages]} | Phút: ${s.sleep_duration}`);
        });
      } else {
        console.log("⚠️ Cảnh báo: Payload không chứa Sleep Stage chi tiết!");
      }
      console.log("------------------------------------------");

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