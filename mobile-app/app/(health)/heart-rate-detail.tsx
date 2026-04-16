import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'day' | 'week' | 'month';

export default function HeartRateDetailScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const { data: serverDataRaw, loading } = useHealthData();

  // 1. LOGIC XỬ LÝ DỮ LIỆU TỪ SERVER (CHÍNH XÁC 100%)
  const processedStats = useMemo(() => {
    const raw = (serverDataRaw as any)?.data?.raw_data || (serverDataRaw as any)?.raw_data || [];
    const now = new Date();

    // Lọc dữ liệu theo Tab thời gian
    const filtered = raw.filter((r: any) => {
      const rDate = new Date(r.record_time);
      if (timeRange === 'day') return rDate.toDateString() === now.toDateString();
      if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return rDate >= weekAgo;
      }
      return true; // Month (30 ngày gần nhất)
    }).filter((r: any) => r.heart_rate !== null);

    const hrValues = filtered.map((r: any) => r.heart_rate);
    
    // Tính toán các chỉ số thống kê
    const max = hrValues.length ? Math.max(...hrValues) : 0;
    const min = hrValues.length ? Math.min(...hrValues) : 0;
    const avg = hrValues.length ? Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length) : 0;
    const current = hrValues.length ? hrValues[hrValues.length - 1] : 0;
    
    // Lấy nhịp tim nghỉ ngơi (giả định là giá trị thấp nhất khi không hoạt động)
    const resting = hrValues.length ? Math.min(...hrValues.slice(0, 5)) : 0;

    // Chuẩn bị nhãn biểu đồ (Lấy tối đa 12 cột để không bị tràn)
    const chartData = hrValues.slice(-12);
    const labels = filtered.slice(-12).map((r: any) => {
      const d = new Date(r.record_time);
      return timeRange === 'day' ? `${d.getHours()}h` : `${d.getDate()}/${d.getMonth() + 1}`;
    });

    return { 
      current, max, min, avg, resting, 
      chartData, labels, 
      measurements: filtered.reverse().slice(0, 10) // Lấy 10 lần đo gần nhất cho danh sách
    };
  }, [serverDataRaw, timeRange]);

  const getHeartRateZone = (bpm: number) => {
    if (bpm <= 0) return { zone: '--', color: '#94A3B8', bg: '#F1F5F9' };
    if (bpm < 60) return { zone: 'Thấp', color: Colors.secondary.teal, bg: '#CCFBF1' };
    if (bpm < 100) return { zone: 'Bình thường', color: Colors.status.success, bg: Colors.status.successLight };
    if (bpm < 140) return { zone: 'Cardio', color: Colors.secondary.orange, bg: Colors.status.warningLight };
    return { zone: 'Cao', color: Colors.status.error, bg: Colors.status.errorLight };
  };

  const currentZone = getHeartRateZone(processedStats.current);

  const renderChart = () => {
    const { chartData, max, min } = processedStats;
    if (chartData.length === 0) return <View style={styles.noDataInChart}><Text>Chưa có dữ liệu</Text></View>;

    const maxVal = max + 10;
    const minVal = Math.max(0, min - 10);
    const range = maxVal - minVal || 1;
    const chartHeight = 150;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{maxVal}</Text>
          <Text style={styles.yAxisLabel}>{Math.round((maxVal + minVal) / 2)}</Text>
          <Text style={styles.yAxisLabel}>{minVal}</Text>
        </View>

        <View style={styles.chartArea}>
          <View style={styles.gridLines}>
            <View style={styles.gridLine} /><View style={styles.gridLine} /><View style={styles.gridLine} />
          </View>

          <View style={styles.barsContainer}>
            {chartData.map((value: number, index: number) => {
              const barHeight = ((value - minVal) / range) * chartHeight;
              const zone = getHeartRateZone(value);
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.bar, { height: Math.max(barHeight, 5), backgroundColor: zone.color + 'BF' }]} />
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhịp tim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Current Value Card */}
        <View style={styles.currentValueCard}>
          <View style={styles.currentValueHeader}>
            <View style={[styles.heartIcon, { backgroundColor: Colors.health.heartRate + '20' }]}>
              <Ionicons name="heart" size={28} color={Colors.health.heartRate} />
            </View>
            <View style={styles.currentValueInfo}>
              <Text style={styles.currentLabel}>Lần đo gần nhất</Text>
              <View style={styles.currentValueRow}>
                <Text style={styles.currentValue}>{processedStats.current || '--'}</Text>
                <Text style={styles.currentUnit}>BPM</Text>
              </View>
            </View>
            <View style={[styles.zoneBadge, { backgroundColor: currentZone.bg }]}>
              <Text style={[styles.zoneText, { color: currentZone.color }]}>{currentZone.zone}</Text>
            </View>
          </View>
          <View style={styles.deviceRow}>
            <Ionicons name="watch-outline" size={14} color={Colors.neutral.textSecondary} />
            <Text style={styles.deviceText}>{loading ? 'Đang đồng bộ...' : 'Huawei Band 8 • Vừa xong'}</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.timeRangeCard}>
          {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
                {range === 'day' ? 'Ngày' : range === 'week' ? 'Tuần' : 'Tháng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Xu hướng nhịp tim</Text>
          {loading ? <ActivityIndicator color={Colors.primary.main} style={{height: 170}} /> : renderChart()}
          <View style={[styles.xAxisLabels, { marginLeft: 35 }]}>
            {processedStats.labels
              .filter((_: any, i: number) => i % 3 === 0) // Thêm : any và : number ở đây
              .map((label: string, index: number) => (
                <Text key={index} style={styles.xAxisLabel}>
                  {label}
                </Text>
              ))}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="arrow-down" size={20} color={Colors.secondary.teal} />
            <Text style={styles.statValue}>{processedStats.min || '--'}</Text>
            <Text style={styles.statLabel}>Thấp nhất</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="analytics" size={20} color={Colors.primary.main} />
            <Text style={styles.statValue}>{processedStats.avg || '--'}</Text>
            <Text style={styles.statLabel}>Trung bình</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-up" size={20} color={Colors.status.error} />
            <Text style={styles.statValue}>{processedStats.max || '--'}</Text>
            <Text style={styles.statLabel}>Cao nhất</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="bed" size={20} color={Colors.health.sleep} />
            <Text style={styles.statValue}>{processedStats.resting || '--'}</Text>
            <Text style={styles.statLabel}>Nghỉ ngơi</Text>
          </View>
        </View>

        {/* Recent Measurements */}
        <View style={styles.measurementsCard}>
          <Text style={styles.sectionTitle}>Lịch sử đo</Text>
          {processedStats.measurements.length > 0 ? (
            processedStats.measurements.map((item: any, index: number) => (
              <View key={index} style={[styles.measurementRow, index < processedStats.measurements.length - 1 && styles.measurementBorder]}>
                <View style={styles.measurementLeft}>
                  <Text style={styles.measurementTime}>
                    {new Date(item.record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.measurementActivity}>{new Date(item.record_time).toLocaleDateString()}</Text>
                </View>
                <View style={styles.measurementRight}>
                  <Text style={[styles.measurementValue, { color: getHeartRateZone(item.heart_rate).color }]}>
                    {item.heart_rate} <Text style={styles.measurementUnit}>BPM</Text>
                  </Text>
                </View>
              </View>
            ))
          ) : (
             <Text style={styles.noDataText}>Không có dữ liệu đo gần đây</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral.textPrimary },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  currentValueCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, ...Shadows.md },
  currentValueHeader: { flexDirection: 'row', alignItems: 'center' },
  heartIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  currentValueInfo: { flex: 1 },
  currentLabel: { fontSize: 12, color: Colors.neutral.textSecondary },
  currentValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  currentValue: { fontSize: 40, fontWeight: '800', color: Colors.neutral.textPrimary },
  currentUnit: { fontSize: 16, color: Colors.neutral.textSecondary, marginLeft: 4 },
  zoneBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  zoneText: { fontSize: 12, fontWeight: '700' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.neutral.border, gap: 6 },
  deviceText: { fontSize: 12, color: Colors.neutral.textSecondary },
  timeRangeCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, padding: 4, marginBottom: 16, ...Shadows.sm },
  timeRangeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  timeRangeButtonActive: { backgroundColor: Colors.primary.main },
  timeRangeText: { fontSize: 14, fontWeight: '600', color: Colors.neutral.textSecondary },
  timeRangeTextActive: { color: '#FFF' },
  chartCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 16, marginBottom: 16, ...Shadows.sm },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.neutral.textPrimary, marginBottom: 20 },
  chartContainer: { flexDirection: 'row', height: 170 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingVertical: 5 },
  yAxisLabel: { fontSize: 10, color: Colors.neutral.placeholder, textAlign: 'right' },
  chartArea: { flex: 1, position: 'relative', marginLeft: 10 },
  gridLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: Colors.neutral.border },
  barsContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barWrapper: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  xAxisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  xAxisLabel: { fontSize: 10, color: Colors.neutral.placeholder },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center', ...Shadows.sm },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.neutral.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 12, color: Colors.neutral.textSecondary },
  measurementsCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, ...Shadows.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral.textPrimary, marginBottom: 16 },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  measurementBorder: { borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  measurementLeft: {},
  measurementTime: { fontSize: 15, fontWeight: '700', color: Colors.neutral.textPrimary },
  measurementActivity: { fontSize: 12, color: Colors.neutral.textSecondary, marginTop: 2 },
  measurementRight: { alignItems: 'flex-end' },
  measurementValue: { fontSize: 18, fontWeight: '700' },
  measurementUnit: { fontSize: 12, fontWeight: '400', color: '#94A3B8' },
  noDataInChart: { height: 150, justifyContent: 'center', alignItems: 'center' },
  noDataText: { textAlign: 'center', color: '#94A3B8', marginTop: 20 }
});