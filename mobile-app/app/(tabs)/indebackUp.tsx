/*import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';
import { getUserData } from '../../services/auth';
import { useHealthTips } from '../../hooks/useHealthTips';

interface HealthRecord {
  user_id: string;
  record_time: Date;
  heart_rate: number | null;
  steps: number | null;
  blood_oxygen: number | null;
  calories: number | null;
  distance: number | null;
  sleep_duration: number | null;
}

type TimeRange = 'day' | 'week' | 'month';

export default function HomeScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [userName, setUserName] = useState<string>('');
  
  const healthDataHook = useHealthData();
  
  // Kiểm tra kỹ dữ liệu đầu vào. Nếu không phải mảng, ép về mảng rỗng ngay lập tức.
  const rawData = healthDataHook?.data;
  const data = useMemo(() => {
    return Array.isArray(rawData) ? (rawData as HealthRecord[]) : [];
  }, [rawData]);
  
  const loading = healthDataHook?.loading || false;
  const error = healthDataHook?.error;
  const refresh = healthDataHook?.refresh;
  const isConnected = healthDataHook?.isConnected || false;

  const { randomTip } = useHealthTips();

  // Logic xử lý dữ liệu an toàn
  const processedData = useMemo(() => {
    // Luôn khởi tạo giá trị mặc định để tránh lỗi undefined trong render
    const defaultData = {
      heartRate: { current: 0, min: 0, max: 0, avg: 0, history: [] as number[] },
      oxygen: { current: 0, history: [] as number[] },
      steps: { current: 0, goal: 10000 },
      sleep: { duration: 0, quality: 0 }
    };

    if (!data || data.length === 0) return defaultData;

    const validHeartRates = data.filter(r => r && r.heart_rate !== null).map(r => r.heart_rate as number);
    const validSteps = data.filter(r => r && r.steps !== null).map(r => r.steps as number);
    const validOxygen = data.filter(r => r && r.blood_oxygen !== null).map(r => r.blood_oxygen as number);
    const validSleep = data.filter(r => r && r.sleep_duration !== null).map(r => r.sleep_duration as number);

    return {
      heartRate: {
        current: validHeartRates.length ? validHeartRates[validHeartRates.length - 1] : 0,
        min: validHeartRates.length ? Math.min(...validHeartRates) : 0,
        max: validHeartRates.length ? Math.max(...validHeartRates) : 0,
        avg: validHeartRates.length ? Math.round(validHeartRates.reduce((a, b) => a + b, 0) / validHeartRates.length) : 0,
        history: validHeartRates.slice(-7),
      },
      oxygen: {
        current: validOxygen.length ? validOxygen[validOxygen.length - 1] : 0,
        history: validOxygen.slice(-7)
      },
      steps: {
        current: validSteps.reduce((a, b) => a + b, 0),
        goal: 10000,
      },
      sleep: {
        duration: validSleep.reduce((a, b) => a + b, 0),
        quality: 85,
      }
    };
  }, [data]);

  const healthScore = useMemo(() => {
    let score = 60; 
    if (processedData.oxygen.current >= 95) score += 20;
    if (processedData.heartRate.avg >= 60 && processedData.heartRate.avg <= 100) score += 20;
    return Math.min(100, score);
  }, [processedData]);

  const onRefresh = useCallback(() => {
    if (refresh) refresh();
  }, [refresh]);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const userData = await getUserData();
        if (userData?.name) setUserName(userData.name);
        else if (userData?.email) setUserName(userData.email.split('@')[0]);
      } catch (e) {
        //console.log("Error loading user name", e);
      }
    };
    loadUserName();
  }, []);

  const renderMiniChart = (chartData: number[], color: string) => {
    if (!chartData || chartData.length === 0) return <View style={styles.miniChart} />;
    const max = Math.max(...chartData, 1);
    const min = Math.min(...chartData, 0);
    const range = max - min || 1;

    return (
      <View style={styles.miniChart}>
        {chartData.map((value, index) => (
          <View key={index} style={[styles.miniChartBar, { 
            height: ((value - min) / range) * 40 + 8, 
            backgroundColor: index === chartData.length - 1 ? color : color + '40' 
          }]} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary.main} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{userName || 'Người dùng'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.timeRangeContainer}>
          {(['day', 'week', 'month'] as TimeRange[]).map((r) => (
            <TouchableOpacity 
              key={r} 
              style={[styles.timeRangeButton, timeRange === r && styles.timeRangeButtonActive]} 
              onPress={() => setTimeRange(r)}
            >
              <Text style={[styles.timeRangeText, timeRange === r && styles.timeRangeTextActive]}>
                {r === 'day' ? 'Hôm nay' : r === 'week' ? 'Tuần' : 'Tháng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[Colors.primary.main]} />
        }
      >
        <View style={styles.healthScoreCard}>
          <View style={styles.healthScoreLeft}>
            <Text style={styles.healthScoreLabel}>Điểm sức khỏe</Text>
            <View style={styles.healthScoreRow}>
              <Text style={styles.healthScoreValue}>{healthScore}</Text>
              <Text style={styles.healthScoreUnit}>/100</Text>
            </View>
            <Text style={styles.healthScoreStatus}>{healthScore >= 80 ? 'Rất Tốt' : 'Ổn định'}</Text>
          </View>
          <View style={styles.healthScoreRight}>
            <View style={styles.scoreCircle}>
              <View style={styles.scoreCircleInner}>
                <Ionicons name="heart" size={24} color={Colors.primary.main} />
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.metricCard} onPress={() => router.push('/(health)/heart-rate-detail')}>
          <View style={styles.metricHeader}>
            <View style={styles.metricIconContainer}><Ionicons name="heart" size={20} color={Colors.health.heartRate} /></View>
            <View style={styles.metricTitleContainer}>
              <Text style={styles.metricTitle}>Nhịp tim</Text>
              <Text style={styles.deviceText}>Dữ liệu trực tiếp</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.neutral.placeholder} />
          </View>
          <View style={styles.metricBody}>
            <View style={styles.metricMainValue}>
              <Text style={styles.mainValueText}>{processedData.heartRate.current}</Text>
              <Text style={styles.mainValueUnit}> BPM</Text>
            </View>
            <View style={styles.metricChart}>{renderMiniChart(processedData.heartRate.history, Colors.health.heartRate)}</View>
          </View>
          <View style={styles.metricFooter}>
            <Text style={styles.statLabel}>Min: <Text style={styles.statValue}>{processedData.heartRate.min}</Text></Text>
            <View style={styles.metricStatDivider} />
            <Text style={styles.statLabel}>Avg: <Text style={styles.statValue}>{processedData.heartRate.avg}</Text></Text>
            <View style={styles.metricStatDivider} />
            <Text style={styles.statLabel}>Max: <Text style={styles.statValue}>{processedData.heartRate.max}</Text></Text>
          </View>
        </TouchableOpacity>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#E0F2FE' }]}><Ionicons name="water" size={20} color="#0EA5E9" /></View>
            <View style={styles.metricTitleContainer}>
              <Text style={styles.metricTitle}>Nồng độ Oxy (SpO2)</Text>
              <Text style={styles.deviceText}>Tính toán từ cảm biến</Text>
            </View>
          </View>
          <View style={styles.metricBody}>
            <View style={styles.metricMainValue}>
              <Text style={styles.mainValueText}>{processedData.oxygen.current}</Text>
              <Text style={styles.mainValueUnit}> %</Text>
            </View>
            <View style={styles.metricChart}>{renderMiniChart(processedData.oxygen.history, "#0EA5E9")}</View>
          </View>
        </View>

        <View style={styles.smallCardsRow}>
          <View style={styles.smallCard}>
            <View style={[styles.smallCardIcon, { backgroundColor: Colors.health.steps + '20' }]}><Ionicons name="footsteps" size={20} color={Colors.health.steps} /></View>
            <Text style={styles.smallCardValue}>{processedData.steps.current.toLocaleString()}</Text>
            <Text style={styles.smallCardLabel}>bước</Text>
          </View>

          <View style={styles.smallCard}>
            <View style={[styles.smallCardIcon, { backgroundColor: Colors.health.sleep + '20' }]}><Ionicons name="moon" size={20} color={Colors.health.sleep} /></View>
            <Text style={styles.smallCardValue}>{processedData.sleep.duration}</Text>
            <Text style={styles.smallCardLabel}>giờ ngủ</Text>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 {randomTip?.title || 'Gợi ý'}</Text>
          <Text style={styles.tipsText}>{randomTip?.content || 'Uống đủ nước để duy trì sức khỏe tốt nhất.'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.main,
  },
  header: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.white + 'CC',
  },
  userName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.white,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.status.error,
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.neutral.white,
  },
  timeRangeText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.neutral.white + 'CC',
  },
  timeRangeTextActive: {
    color: Colors.primary.main,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: -Spacing.md,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  healthScoreCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  healthScoreLeft: {
    flex: 1,
  },
  healthScoreLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.xs,
  },
  healthScoreValue: {
    fontSize: 48,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.main,
  },
  healthScoreUnit: {
    fontSize: Typography.fontSizes.lg,
    color: Colors.neutral.textSecondary,
    marginLeft: 4,
  },
  healthScoreStatus: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.status.success,
    fontWeight: Typography.fontWeights.medium,
    marginTop: Spacing.xs,
  },
  healthScoreRight: {
    justifyContent: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: Colors.primary.light + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.status.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.health.heartRate + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  metricTitleContainer: {
    flex: 1,
  },
  metricTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
  },
  deviceText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.neutral.textSecondary,
    marginTop: 2,
  },
  metricBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  metricMainValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainValueText: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.textPrimary,
  },
  mainValueUnit: {
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
  },
  metricChart: {
    width: 100,
    height: 50,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    gap: 4,
  },
  miniChartBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 8,
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  metricStat: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  metricStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.neutral.border,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.neutral.textSecondary,
  },
  statValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
  },
  smallCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  smallCard: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  smallCardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  smallCardValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.textPrimary,
  },
  smallCardLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.neutral.border,
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tipsCard: {
    backgroundColor: Colors.status.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.orange,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.secondary.orange,
  },
  tipsText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
    lineHeight: 20,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.light + '30',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary.main,
  },
});*/

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { initialize, requestPermission, readRecords, getSdkStatus, SdkAvailabilityStatus } from 'react-native-health-connect';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api'; 

export default function HealthDashboard() {
  const [loading, setLoading] = useState(false);
  const [dataGroups, setDataGroups] = useState<any>({});

  const syncToDatabase = async (rawData: any) => {
    try {
      //console.log("🔄 [Sync] Bắt đầu chuẩn hóa dữ liệu cho Backend...");
      
      // Backend yêu cầu mảng nằm trong key "data"
      // Và mỗi item phải có: type, value, time
      const allRecords: any[] = [];

      // Map Bước chân
      rawData.Steps.forEach((r: any) => {
        allRecords.push({ type: 'STEPS', value: r.count, time: r.startTime });
      });

      // Map Nhịp tim
      rawData.HeartRate.forEach((r: any) => {
        const bpm = r.samples[r.samples.length - 1]?.beatsPerMinute;
        if (bpm) allRecords.push({ type: 'HEART_RATE', value: bpm, time: r.startTime });
      });

      // Map Calo
      rawData.Calories.forEach((r: any) => {
        allRecords.push({ type: 'CALORIES', value: r.energy.inKilocalories, time: r.startTime });
      });

      // Map Quãng đường
      rawData.Distance.forEach((r: any) => {
        allRecords.push({ type: 'DISTANCE', value: r.distance.inMeters, time: r.startTime });
      });

      // Map SpO2
      rawData.Oxygen.forEach((r: any) => {
        allRecords.push({ type: 'BLOOD_OXYGEN', value: r.percentage, time: r.time });
      });

      if (allRecords.length === 0) return;

      //console.log(`📤 [Sync] Gửi ${allRecords.length} bản ghi lên server...`);

      // CHÚ Ý: Backend Duy dùng const { data } = req.body
      // Nên ta phải gửi object có key là "data"
      const payload = { data: allRecords };

      // Sử dụng axios/fetch thông qua api service
      // Vì hàm syncHealthDataSmart trong api.ts đang bọc metrics, Duy nên dùng hàm syncMetrics 
      // hoặc gọi trực tiếp fetch để khớp key "data"
      const response: any = await api.syncMetrics(payload as any); 

      if (response) {
        //console.log(`✅ [Sync] Thành công! Đã lưu ${response.count} bản ghi.`);
      }
    } catch (error: any) {
      //console.error("❌ [Sync] Lỗi:", error.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await initialize();
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);

      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const filter = { timeRangeFilter: { operator: 'between', startTime, endTime: now.toISOString() } };

      const [steps, heartRate, oxygen, distance, calories] = await Promise.all([
        readRecords('Steps', filter as any),
        readRecords('HeartRate', filter as any),
        readRecords('OxygenSaturation', filter as any),
        readRecords('Distance', filter as any),
        readRecords('ActiveCaloriesBurned', filter as any), 
      ]);

      const rawData = {
        Steps: steps.records,
        HeartRate: heartRate.records,
        Oxygen: oxygen.records,
        Distance: distance.records,
        Calories: calories.records,
      };

      setDataGroups(rawData);
      await syncToDatabase(rawData);
    } catch (e) {
      //console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.appBar}><Text style={styles.appBarTitle}>Đồng bộ Duy</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.txt}>Dữ liệu hôm nay: {Object.values(dataGroups).flat().length} mục</Text>
      </ScrollView>
      <TouchableOpacity style={styles.btn} onPress={fetchData} disabled={loading}>
        <Text style={styles.btnTxt}>{loading ? 'ĐANG CHẠY...' : 'ĐỒNG BỘ NGAY'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  appBar: { height: 90, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', paddingTop: 30 },
  appBarTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  txt: { textAlign: 'center', color: '#666' },
  btn: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 50, backgroundColor: '#10B981', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: 'bold' }
});

