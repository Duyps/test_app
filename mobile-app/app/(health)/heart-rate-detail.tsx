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

type TimeRange = 'day' | 'week' | 'month';

export default function HeartRateDetailScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  // Luôn truyền range vào hook để lấy đúng dữ liệu từ Server
  const { data: serverDataRaw, loading } = useHealthData(timeRange) as any;

  // 1. LOGIC XỬ LÝ DỮ LIỆU (KHỚP MỐI GIỜ VÀ THỜI GIAN THỰC)
  const processedStats = useMemo(() => {
    const raw = serverDataRaw?.raw_data || [];
    const summary = serverDataRaw?.daily_summary || [];

    // Tìm ngày mới nhất có dữ liệu để tránh màn hình trắng
    const latestRec = raw[raw.length - 1];
    const targetDate = latestRec ? new Date(latestRec.record_time) : new Date();
    const targetDateStr = targetDate.toDateString();

    // Lọc dữ liệu cho ngày/tuần/tháng
    const filtered = raw
      .filter((r: any) => {
        if (timeRange === 'day') return new Date(r.record_time).toDateString() === targetDateStr;
        return true; // Week/Month dùng summary hoặc raw dài hạn
      })
      .filter((r: any) => r.heart_rate != null && r.heart_rate > 0);

    const hrValues = filtered.map((r: any) => r.heart_rate);
    const current = hrValues.length ? hrValues[hrValues.length - 1] : 0;
    const max = hrValues.length ? Math.max(...hrValues) : 0;
    const min = hrValues.length ? Math.min(...hrValues) : 0;
    const avg = hrValues.length ? Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length) : 0;
    const resting = hrValues.length ? Math.min(...hrValues.slice(0, 10)) : 0;

    // --- LOGIC BIỂU ĐỒ CHUẨN XÁC ---
    let chartData: number[] = [];
    let labels: string[] = [];

    if (timeRange === 'day') {
      const currentHour = new Date().getHours();
      // Chỉ vẽ đến giờ hiện tại, mỗi 2 tiếng một cột (Tối đa 12 cột)
      for (let i = 0; i <= 22; i += 2) {
        if (i <= currentHour + 1) {
          const hourRecords = filtered.filter((r: any) => {
            const h = new Date(r.record_time).getHours();
            return h >= i && h < i + 2;
          });
          const hourAvg = hourRecords.length 
            ? Math.round(hourRecords.reduce((s: number, r: any) => s + r.heart_rate, 0) / hourRecords.length)
            : 0;
          chartData.push(hourAvg);
          labels.push(`${i}h`);
        }
      }
    } else {
      // Week/Month lấy từ summary
      const source = summary.slice(timeRange === 'week' ? -7 : -12);
      chartData = source.map((d: any) => d.avg_hr || 0);
      labels = source.map((d: any) => new Date(d.date).getDate().toString());
    }

    return { current, max, min, avg, resting, chartData, labels, measurements: [...filtered].reverse().slice(0, 15) };
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

    const maxVal = max > 0 ? max + 10 : 160;
    const minVal = min > 0 ? Math.max(0, min - 10) : 40;
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
              const height = value > 0 ? ((value - minVal) / (maxVal - minVal)) * chartHeight : 4;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.bar, { 
                    height: Math.max(height, 4), 
                    backgroundColor: value > 0 ? getHeartRateZone(value).color : '#E2E8F0' 
                  }]} />
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

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dữ liệu Nhịp tim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.currentValueCard}>
          <View style={styles.currentValueHeader}>
            <View style={[styles.heartIcon, { backgroundColor: Colors.health.heartRate + '20' }]}>
              <Ionicons name="heart" size={28} color={Colors.health.heartRate} />
            </View>
            <View style={styles.currentValueInfo}>
              <Text style={styles.currentLabel}>Nhịp tim hiện tại</Text>
              <View style={styles.currentValueRow}>
                <Text style={styles.currentValue}>{processedStats.current || '--'}</Text>
                <Text style={styles.currentUnit}>BPM</Text>
              </View>
            </View>
            <View style={[styles.zoneBadge, { backgroundColor: currentZone.bg }]}>
              <Text style={[styles.zoneText, { color: currentZone.color }]}>{currentZone.zone}</Text>
            </View>
          </View>
        </View>

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

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Xu hướng</Text>
          {loading ? <ActivityIndicator color={Colors.primary.main} style={{height: 170}} /> : renderChart()}
          <View style={[styles.xAxisLabels, { marginLeft: 35 }]}>
            {processedStats.labels.map((label, index) => (
              <Text key={index} style={styles.xAxisLabel}>{label}</Text>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="arrow-up" size={20} color={Colors.status.error} />
            <Text style={styles.statValue}>{processedStats.max || '--'}</Text>
            <Text style={styles.statLabel}>Tối đa</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="analytics" size={20} color={Colors.primary.main} />
            <Text style={styles.statValue}>{processedStats.avg || '--'}</Text>
            <Text style={styles.statLabel}>T.Bình</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-down" size={20} color={Colors.secondary.teal} />
            <Text style={styles.statValue}>{processedStats.min || '--'}</Text>
            <Text style={styles.statLabel}>Tối thiểu</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="bed" size={20} color={Colors.health.sleep} />
            <Text style={styles.statValue}>{processedStats.resting || '--'}</Text>
            <Text style={styles.statLabel}>Nghỉ ngơi</Text>
          </View>
        </View>

        <View style={styles.measurementsCard}>
          <Text style={styles.sectionTitle}>Lịch sử đo</Text>
          {processedStats.measurements.map((item: any, index: number) => (
            <View key={index} style={[styles.measurementRow, index < processedStats.measurements.length - 1 && styles.measurementBorder]}>
              <View>
                <Text style={styles.measurementTime}>{new Date(item.record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.measurementActivity}>{new Date(item.record_time).toLocaleDateString()}</Text>
              </View>
              <View style={styles.measurementRight}>
                <Text style={[styles.measurementValue, { color: getHeartRateZone(item.heart_rate).color }]}>{item.heart_rate} <Text style={styles.measurementUnit}>BPM</Text></Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  currentValueCard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 16, ...Shadows.md },
  currentValueHeader: { flexDirection: 'row', alignItems: 'center' },
  heartIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  currentValueInfo: { flex: 1 },
  currentLabel: { fontSize: 13, color: '#64748B' },
  currentValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  currentValue: { fontSize: 42, fontWeight: '800', color: '#1E293B' },
  currentUnit: { fontSize: 16, color: '#64748B', marginLeft: 4, fontWeight: '600' },
  zoneBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  zoneText: { fontSize: 12, fontWeight: 'bold' },
  timeRangeCard: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 16 },
  timeRangeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  timeRangeButtonActive: { backgroundColor: '#FFF', ...Shadows.sm },
  timeRangeText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  timeRangeTextActive: { color: '#1E293B' },
  chartCard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 16, ...Shadows.sm },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  chartContainer: { flexDirection: 'row', height: 160 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingVertical: 5 },
  yAxisLabel: { fontSize: 10, color: '#94A3B8', textAlign: 'right' },
  chartArea: { flex: 1, marginLeft: 12, position: 'relative' },
  gridLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: '#F1F5F9' },
  barsContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barWrapper: { flex: 1, alignItems: 'center' },
  bar: { width: 8, borderRadius: 4 },
  xAxisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  xAxisLabel: { fontSize: 10, color: '#94A3B8' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 24, padding: 16, alignItems: 'center', ...Shadows.sm },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#64748B' },
  measurementsCard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, ...Shadows.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  measurementBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  measurementTime: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  measurementActivity: { fontSize: 12, color: '#94A3B8' },
  measurementRight: { alignItems: 'flex-end' },
  measurementValue: { fontSize: 18, fontWeight: '800' },
  measurementUnit: { fontSize: 12, fontWeight: '400', color: '#94A3B8' },
  noDataInChart: { height: 150, justifyContent: 'center', alignItems: 'center' }
});