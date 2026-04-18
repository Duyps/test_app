import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { api } from '../../services/api';
import { getAllDeviceNames, removeDeviceName, saveDeviceName } from '../../services/deviceStorage';
import { initHealthConnect, requestHealthPermissions, syncHealthDataToServer, HealthConnectStatus } from '../../services/healthConnect';

type DeviceStatus = 'connected' | 'disconnected' | 'syncing';

type Device = {
  id: string;
  name: string;
  type: 'smartwatch' | 'fitness_band' | 'scale' | 'blood_pressure';
  provider: string;
  status: DeviceStatus;
  battery: number;
  lastSync: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const DEVICE_TYPE_LABELS = {
  smartwatch: 'Đồng hồ thông minh',
  fitness_band: 'Vòng tay sức khỏe',
  scale: 'Cân thông minh',
  blood_pressure: 'Máy đo huyết áp',
};

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthConnectStatus>('NOT_SUPPORTED');
  const [syncingHC, setSyncingHC] = useState(false);

  // Fetch devices từ API
  const fetchDevices = async () => {
    try {
      setError(null);
      const response = await api.getDevices();
      
      // Lấy tên thiết bị đã lưu locally
      const localNames = await getAllDeviceNames();
      
      // API trả về mảng trực tiếp
      const deviceList = Array.isArray(response) ? response : [];
      
      // Map dữ liệu từ API sang format của FE
      const mappedDevices: Device[] = deviceList.map((d: any) => ({
        id: d.device_id,
        // Ưu tiên: tên local > tên từ API > provider > mặc định
        name: localNames[d.device_id] || d.device_name || d.provider || 'Thiết bị',
        type: d.device_type || 'fitness_band',
        provider: d.provider || 'Unknown',
        status: (d.status === 'active' || d.status === 'connected') ? 'connected' : 'disconnected',
        battery: d.battery || 100,
        lastSync: d.last_sync_time ? formatTimeAgo(d.last_sync_time) : 'Chưa đồng bộ',
        icon: 'watch' as keyof typeof Ionicons.glyphMap,
      }));
      
      setDevices(mappedDevices);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(message);
      console.warn('⚠️ Không thể lấy danh sách thiết bị:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Format thời gian
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return `${Math.floor(diff / 1440)} ngày trước`;
  };

  useEffect(() => {
    fetchDevices();
    checkHealthStatus();
  }, []);

  const checkHealthStatus = async () => {
    const status = await initHealthConnect();
    setHealthStatus(status);
  };

  const connectedDevices = devices.filter((d) => d.status === 'connected');
  const disconnectedDevices = devices.filter((d) => d.status !== 'connected');

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
  };

  // Hàm lấy icon pin phù hợp với mức pin
  const getBatteryIcon = (battery: number): keyof typeof Ionicons.glyphMap => {
    if (battery > 75) return 'battery-full';
    if (battery > 50) return 'battery-three-quarters' as any; // fallback
    if (battery > 25) return 'battery-half';
    if (battery > 10) return 'battery-low' as any; // fallback  
    return 'battery-dead';
  };

  const handleDisconnect = (device: Device) => {
    Alert.alert(
      'Quên thiết bị?',
      `Bạn có chắc muốn xóa ${device.name} khỏi danh sách?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // Gọi API xóa thiết bị
              await api.deleteDevice(device.id);
              // Xóa tên thiết bị đã lưu locally
              await removeDeviceName(device.id);
              // Cập nhật UI
              setDevices((prev) => prev.filter((d) => d.id !== device.id));
            } catch (err) {
              console.error('Lỗi xóa thiết bị:', err);
              Alert.alert('Lỗi', 'Không thể xóa thiết bị. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleReconnect = async (device: Device) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, status: 'syncing' as DeviceStatus } : d
      )
    );

    try {
      // Lưu tên thiết bị locally để giữ lại sau khi reconnect
      await saveDeviceName(device.id, device.name);
      
      // Gọi API để reconnect (thêm lại thiết bị)
      await api.addDevice({
        device_id: device.id,
        device_name: device.name,
        provider: device.provider,
      });
      
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, status: 'connected' as DeviceStatus, lastSync: 'Vừa xong' } : d
        )
      );
    } catch (err) {
      console.error('Lỗi kết nối lại:', err);
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, status: 'disconnected' as DeviceStatus } : d
        )
      );
      Alert.alert('Lỗi', 'Không thể kết nối lại thiết bị.');
    }
  };

  const handleAddDevice = () => {
    router.push('/(device)/add');
  };

  const handleConnectHC = async () => {
    const granted = await requestHealthPermissions();
    if (granted) {
      try {
        // Đăng ký Health Connect như một thiết bị ảo trên Server để tránh lỗi 403 khi sync
        await api.addDevice({
          device_id: 'HEALTH_CONNECT',
          device_name: 'Google Health Connect',
          provider: 'android_system'
        });
        
        setHealthStatus('AVAILABLE');
        Alert.alert('Thành công', 'Đã kết nối với Health Connect!');
      } catch (err) {
        console.error('Lỗi đăng ký Health Connect:', err);
        // Ngay cả khi lỗi đăng ký (có thể đã tồn tại), vẫn set trạng thái nếu quyền đã cấp
        setHealthStatus('AVAILABLE');
        Alert.alert('Thông báo', 'Đã cấp quyền Health Connect. Bạn có thể bắt đầu đồng bộ.');
      }
    } else {
      Alert.alert('Thất bại', 'Bạn cần cấp quyền truy cập để sử dụng tính năng này.');
    }
  };

  const handleSyncHC = async () => {
    setSyncingHC(true);
    try {
      const success = await syncHealthDataToServer(async (data) => {
        // Chuyển đổi dữ liệu Health Connect sang MetricsSyncPayload
        const metrics: any[] = [];
        const now = new Date().toISOString();

        if (data.heartRate.current > 0) {
          metrics.push({
            record_time: now,
            heart_rate: data.heartRate.current,
            device_id: 'HEALTH_CONNECT'
          });
        }
        
        if (data.steps.today > 0) {
          metrics.push({
            record_time: now,
            steps: data.steps.today,
            distance: data.steps.distance,
            calories: data.steps.calories,
            device_id: 'HEALTH_CONNECT'
          });
        }

        if (data.sleep.duration > 0) {
          metrics.push({
            record_time: data.sleep.startTime || now,
            sleep_duration: data.sleep.duration * 60, // Phút sang giây
            device_id: 'HEALTH_CONNECT'
          });
        }

        if (metrics.length > 0) {
          await api.syncMetrics({
            device_id: 'HEALTH_CONNECT',
            data: metrics
          });
        }
      });

      if (success) {
        Alert.alert('Thành công', 'Dữ liệu đã được đồng bộ lên máy chủ!');
        fetchDevices(); // Refresh list to show last sync time
      } else {
        Alert.alert('Thông báo', 'Không có dữ liệu mới để đồng bộ.');
      }
    } catch (err) {
      console.error('Lỗi đồng bộ Health Connect:', err);
      Alert.alert('Lỗi', 'Không thể đồng bộ dữ liệu. Vui lòng thử lại.');
    } finally {
      setSyncingHC(false);
    }
  };

  const handleDevicePress = (device: Device) => {
    router.push({
      pathname: '/(device)/detail',
      params: {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        deviceProvider: device.provider,
        deviceStatus: device.status,
        deviceBattery: device.battery.toString(),
      },
    });
  };

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case 'connected':
        return Colors.status.success;
      case 'syncing':
        return Colors.status.warning;
      default:
        return Colors.neutral.placeholder;
    }
  };

  const getStatusText = (status: DeviceStatus) => {
    switch (status) {
      case 'connected':
        return 'Đã kết nối';
      case 'syncing':
        return 'Đang đồng bộ...';
      default:
        return 'Chưa kết nối';
    }
  };

  const renderDeviceCard = (device: Device) => (
    <TouchableOpacity
      key={device.id}
      style={styles.deviceCard}
      onPress={() => handleDevicePress(device)}
      activeOpacity={0.7}
    >
      <View style={styles.deviceIconContainer}>
        <Ionicons name={device.icon} size={28} color={Colors.primary.main} />
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(device.status) },
          ]}
        />
      </View>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{device.name}</Text>
        <Text style={styles.deviceProvider}>
          {device.provider} • {DEVICE_TYPE_LABELS[device.type]}
        </Text>
        <View style={styles.deviceMeta}>
          <View style={styles.metaItem}>
            <Ionicons
              name="ellipse"
              size={8}
              color={getStatusColor(device.status)}
            />
            <Text
              style={[styles.metaText, { color: getStatusColor(device.status) }]}
            >
              {getStatusText(device.status)}
            </Text>
          </View>
          {device.status === 'connected' && (
            <>
              <Text style={styles.metaDivider}>•</Text>
              <View style={styles.metaItem}>
                <Ionicons
                  name={device.battery > 75 ? 'battery-full' : device.battery > 25 ? 'battery-half' : 'battery-dead'}
                  size={14}
                  color={
                    device.battery > 20
                      ? Colors.secondary.green
                      : Colors.status.error
                  }
                />
                <Text style={styles.metaText}>{device.battery}%</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.deviceActions}>
        {device.status === 'connected' ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDisconnect(device)}
          >
            <Ionicons name="link" size={20} color={Colors.status.error} />
          </TouchableOpacity>
        ) : device.status === 'syncing' ? (
          <Ionicons name="sync" size={20} color={Colors.status.warning} />
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleReconnect(device)}
          >
            <Ionicons name="refresh" size={20} color={Colors.primary.main} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý thiết bị</Text>
        <Text style={styles.headerSubtitle}>
          {connectedDevices.length} thiết bị đang kết nối
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {/* Data Sources Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary.main} />
          <Text style={styles.infoText}>
            Kết nối thiết bị để đồng bộ dữ liệu sức khỏe tự động qua Health Connect
          </Text>
        </View>

        {/* Platform Services Section */}
        <Text style={styles.sectionTitle}>Dịch vụ hệ thống</Text>
        <View style={styles.deviceCard}>
          <View style={[styles.deviceIconContainer, { backgroundColor: '#4285F420' }]}>
            <Ionicons name="logo-google" size={28} color="#4285F4" />
            <View
              style={[
                styles.statusDot,
                { backgroundColor: healthStatus === 'AVAILABLE' ? Colors.status.success : Colors.neutral.placeholder },
              ]}
            />
          </View>

          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>Google Health Connect</Text>
            <Text style={styles.deviceProvider}>
              Android System • Đồng bộ nhịp tim, bước chân...
            </Text>
            <View style={styles.deviceMeta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="ellipse"
                  size={8}
                  color={healthStatus === 'AVAILABLE' ? Colors.status.success : Colors.neutral.placeholder}
                />
                <Text
                  style={[styles.metaText, { color: healthStatus === 'AVAILABLE' ? Colors.status.success : Colors.neutral.placeholder }]}
                >
                  {healthStatus === 'AVAILABLE' ? 'Đã kết nối' : healthStatus === 'NOT_SUPPORTED' ? 'Không hỗ trợ' : 'Chưa kết nối'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.deviceActions}>
            {healthStatus === 'AVAILABLE' ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSyncHC}
                disabled={syncingHC}
              >
                {syncingHC ? (
                  <ActivityIndicator size="small" color={Colors.primary.main} />
                ) : (
                  <Ionicons name="sync" size={20} color={Colors.primary.main} />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleConnectHC}
                disabled={healthStatus === 'NOT_SUPPORTED'}
              >
                <Ionicons name="add-circle-outline" size={24} color={healthStatus === 'NOT_SUPPORTED' ? Colors.neutral.placeholder : Colors.primary.main} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
            <Text style={styles.loadingText}>Đang tải danh sách thiết bị...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.status.error} />
            <Text style={styles.errorText}>Không thể tải thiết bị. Kéo xuống để thử lại.</Text>
          </View>
        )}

        {/* Connected Devices */}
        {!loading && connectedDevices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Đang kết nối</Text>
            {connectedDevices.map(renderDeviceCard)}
          </>
        )}

        {/* Disconnected Devices */}
        {!loading && disconnectedDevices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Đã ngắt kết nối</Text>
            {disconnectedDevices.map(renderDeviceCard)}
          </>
        )}

        {/* Empty State */}
        {!loading && devices.length === 0 && !error && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="watch-outline" size={48} color={Colors.neutral.placeholder} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có thiết bị nào</Text>
            <Text style={styles.emptyText}>
              Thêm thiết bị đeo thông minh để theo dõi sức khỏe của bạn
            </Text>
          </View>
        )}

        {/* Supported Devices */}
        <View style={styles.supportedSection}>
          <Text style={styles.supportedTitle}>Thiết bị hỗ trợ</Text>
          <View style={styles.supportedGrid}>
            <View style={styles.supportedItem}>
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text style={styles.supportedName}>Health Connect</Text>
            </View>
            <View style={styles.supportedItem}>
              <Ionicons name="watch" size={24} color="#1428A0" />
              <Text style={styles.supportedName}>Samsung</Text>
            </View>
            <View style={styles.supportedItem}>
              <Ionicons name="fitness" size={24} color="#00B0B9" />
              <Text style={styles.supportedName}>Fitbit</Text>
            </View>
            <View style={styles.supportedItem}>
              <Ionicons name="heart" size={24} color="#FF6B00" />
              <Text style={styles.supportedName}>Xiaomi</Text>
            </View>
            <View style={styles.supportedItem}>
              <Ionicons name="phone-portrait" size={24} color="#C7112B" />
              <Text style={styles.supportedName}>Huawei</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Device Button */}
      <View style={styles.bottomContainer}>
        <Button
          title="Thêm thiết bị mới"
          onPress={handleAddDevice}
          size="lg"
          leftIcon={<Ionicons name="add" size={20} color={Colors.neutral.white} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.status.infoLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary.main,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  deviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.status.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
  },
  deviceProvider: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
    marginTop: 2,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.neutral.textSecondary,
  },
  metaDivider: {
    marginHorizontal: Spacing.sm,
    color: Colors.neutral.placeholder,
  },
  deviceActions: {
    padding: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
  },
  emptyText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  supportedSection: {
    marginTop: Spacing.xl,
  },
  supportedTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textSecondary,
    marginBottom: Spacing.md,
  },
  supportedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  supportedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  supportedName: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.status.error,
  },
});
