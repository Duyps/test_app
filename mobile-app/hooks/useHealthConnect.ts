// ===========================================
// HOOK: useHealthConnect - Quản lý kết nối Health Connect
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  initHealthConnect,
  requestHealthPermissions,
  readAllHealthData,
  HealthConnectData,
  HealthConnectStatus,
} from '../services/healthConnect';
import { api, SyncRecord } from '../services/api'; // Đảm bảo đã export SyncRecord từ api.ts

interface UseHealthConnectReturn {
  status: HealthConnectStatus;
  isAvailable: boolean;
  hasPermission: boolean;
  data: HealthConnectData | null;
  loading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  requestPermissions: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  syncToServer: () => Promise<boolean>;
}

export function useHealthConnect(): UseHealthConnectReturn {
  const [status, setStatus] = useState<HealthConnectStatus>('NOT_SUPPORTED');
  const [hasPermission, setHasPermission] = useState(false);
  const [data, setData] = useState<HealthConnectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS !== 'android') {
        setStatus('NOT_SUPPORTED');
        return;
      }
      const initStatus = await initHealthConnect();
      setStatus(initStatus);
    };
    init();
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (status !== 'AVAILABLE') {
      setError('Health Connect không khả dụng');
      return false;
    }
    try {
      const granted = await requestHealthPermissions();
      setHasPermission(granted);
      if (!granted) setError('Quyền truy cập bị từ chối');
      return granted;
    } catch (err) {
      setError('Lỗi yêu cầu quyền');
      return false;
    }
  }, [status]);

  const refreshData = useCallback(async (): Promise<void> => {
    if (status !== 'AVAILABLE') return;
    setLoading(true);
    setError(null);

    try {
      if (!hasPermission) {
        const granted = await requestHealthPermissions();
        if (!granted) {
          setError('Cần cấp quyền truy cập Health Connect');
          setLoading(false);
          return;
        }
        setHasPermission(true);
      }

      const healthData = await readAllHealthData();
      if (healthData) {
        setData(healthData);
        setLastSyncTime(new Date());
      } else {
        setError('Không có dữ liệu từ Health Connect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [status, hasPermission]);

  // --- PHẦN SỬA ĐỔI QUAN TRỌNG NHẤT ---
  const syncToServer = useCallback(async (): Promise<boolean> => {
    if (!data) {
      setError('Không có dữ liệu để đồng bộ');
      return false;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      
      // Tạo mảng phẳng chứa các bản ghi riêng lẻ (Atom Records)
      const syncRecords: SyncRecord[] = [];

      // 1. Nhịp tim
      if (data.heartRate.current && data.heartRate.current > 0) {
        syncRecords.push({ 
          type: 'HEART_RATE', 
          value: data.heartRate.current, 
          time: now 
        });
      }

      // 2. Bước chân
      if (data.steps.today && data.steps.today > 0) {
        syncRecords.push({ 
          type: 'STEPS', 
          value: data.steps.today, 
          time: now 
        });
      }

      // 3. Nồng độ Oxy
      if (data.oxygen.current && data.oxygen.current > 0) {
        syncRecords.push({ 
          type: 'BLOOD_OXYGEN', 
          value: data.oxygen.current, 
          time: now 
        });
      }

      // 4. Giấc ngủ (phút)
      if (data.sleep.duration && data.sleep.duration > 0) {
        syncRecords.push({ 
          type: 'SLEEP', 
          value: Math.round(data.sleep.duration), 
          time: now 
        });
      }

      // 5. Calories
      if (data.steps.calories && data.steps.calories > 0) {
        syncRecords.push({ 
          type: 'CALORIES', 
          value: data.steps.calories, 
          time: now 
        });
      }

      // 6. Quãng đường
      if (data.steps.distance && data.steps.distance > 0) {
        syncRecords.push({ 
          type: 'DISTANCE', 
          value: data.steps.distance, 
          time: now 
        });
      }

      // Nếu không có dữ liệu nào hợp lệ thì dừng
      if (syncRecords.length === 0) {
        setLoading(false);
        return true;
      }

      // Gửi mảng lên Backend qua hàm syncMetrics (đã được sửa đổi ở api.ts để nhận { data: [...] })
      await api.syncMetrics({
        data: syncRecords,
      });
      
      setLastSyncTime(new Date());
      return true;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi đồng bộ';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [data]);

  return {
    status,
    isAvailable: status === 'AVAILABLE',
    hasPermission,
    data,
    loading,
    error,
    lastSyncTime,
    requestPermissions,
    refreshData,
    syncToServer,
  };
}

export default useHealthConnect;