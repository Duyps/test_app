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
      await initialize();
      
      // 1. Xin quyền các chỉ số quan trọng
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'SleepSession' },
      ]);

      const now = new Date();
      // Lấy dữ liệu trong 30 ngày gần nhất
      const startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = now.toISOString();
      const filter = { timeRangeFilter: { operator: 'between', startTime, endTime } };

      // 2. Đọc tất cả dữ liệu song song
      const [steps, heart, oxygen, calories, distance, sleepSessions] = await Promise.all([
        readRecords('Steps', filter as any),
        readRecords('HeartRate', filter as any),
        readRecords('OxygenSaturation', filter as any),
        readRecords('ActiveCaloriesBurned', filter as any),
        readRecords('Distance', filter as any),
        readRecords('SleepSession', filter as any),
      ]);

      const groupedMap: Record<string, any> = {};

      // 3. Hàm bổ trợ để gộp dữ liệu thông minh
      const addToMap = (time: string, fields: any) => {
        if (!time) return;
        
        // Làm tròn về mốc 1 phút để "hội quân" các dữ liệu đo cùng lúc
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
            sleep_duration: 0
          };
        }

        // Với các chỉ số tích lũy: Cộng dồn (+=)
        if (fields.steps !== undefined) groupedMap[timeKey].steps += fields.steps;
        if (fields.calories !== undefined) groupedMap[timeKey].calories += fields.calories;
        if (fields.distance !== undefined) groupedMap[timeKey].distance += fields.distance;
        if (fields.sleep_duration !== undefined) groupedMap[timeKey].sleep_duration += fields.sleep_duration;
        
        // Với các chỉ số tức thời: Lấy giá trị mới nhất
        if (fields.heart_rate !== undefined) groupedMap[timeKey].heart_rate = fields.heart_rate;
        if (fields.blood_oxygen !== undefined) groupedMap[timeKey].blood_oxygen = fields.blood_oxygen;
      };

      // 4. Đổ dữ liệu vào Map xử lý
      steps.records.forEach((r: any) => addToMap(r.startTime, { steps: r.count }));
      
      heart.records.forEach((r: any) => {
        const lastBpm = r.samples[r.samples.length - 1]?.beatsPerMinute;
        if (lastBpm) addToMap(r.startTime, { heart_rate: lastBpm });
      });

      oxygen.records.forEach((r: any) => addToMap(r.time, { blood_oxygen: r.percentage }));
      
      calories.records.forEach((r: any) => addToMap(r.startTime, { calories: r.energy.inKilocalories }));
      
      distance.records.forEach((r: any) => addToMap(r.startTime, { distance: r.distance.inMeters }));

      // Xử lý riêng giấc ngủ (Tính duration từ Session)
      sleepSessions.records.forEach((r: any) => {
        const s = new Date(r.startTime).getTime();
        const e = new Date(r.endTime).getTime();
        const diffMinutes = Math.round((e - s) / 60000);
        if (diffMinutes > 0) {
          addToMap(r.startTime, { sleep_duration: diffMinutes });
        }
      });

      // 5. Chuyển Map thành Array và đẩy lên Server
      const finalPayload = Object.values(groupedMap).filter((item: any) => {
        // Chỉ gửi những bản ghi thực sự có dữ liệu
        return item.steps > 0 || item.heart_rate || item.blood_oxygen || item.calories > 0 || item.sleep_duration > 0;
      });

      if (finalPayload.length > 0) {
        console.log(`🚀 [Sync] Đang gửi ${finalPayload.length} bản ghi đã gộp lên Server...`);
        await api.syncMetrics({ data: finalPayload });
        return true;
      }

      console.log("⚠️ [Sync] Không có dữ liệu mới để đồng bộ.");
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