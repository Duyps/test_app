import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'day' | 'week' | 'month';

interface OxyRecord { value: number; time: string; }
interface OxyTrendItem { avg: number; min: number; max: number; label: string; }

export default function OxygenDetailScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const { data: serverResponse, loading } = useHealthData(timeRange) as any;

  const processedOxy = useMemo(() => {
    const raw = serverResponse?.raw_data || [];
    const summary = serverResponse?.daily_summary || [];

    // Lọc mốc đo thực tế, nếu quá nhiều thì lấy mẫu (sampling)
    let oxyRecords: OxyRecord[] = raw
      .filter((r: any) => r.blood_oxygen > 0)
      .map((r: any) => ({
        value: r.blood_oxygen,
        time: new Date(r.record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

    // Nếu nhiều hơn 12 mốc, chỉ lấy 12 mốc để không bị tràn
    if (oxyRecords.length > 12) {
      const step = Math.ceil(oxyRecords.length / 12);
      oxyRecords = oxyRecords.filter((_, i) => i % step === 0);
    }

    const currentVal = oxyRecords.length > 0 ? oxyRecords[oxyRecords.length - 1].value : 0;

    const trendData: OxyTrendItem[] = summary.map((s: any) => ({
      avg: s.avg_spo2 || 0,
      min: s.min_spo2 || s.avg_spo2 || 0,
      max: s.max_spo2 || s.avg_spo2 || 0,
      label: new Date(s.date).getDate().toString()
    })).slice(timeRange === 'week' ? -7 : -15);

    const allValues: number[] = timeRange === 'day' 
      ? oxyRecords.map((r: OxyRecord) => r.value) 
      : trendData.map((t: OxyTrendItem) => t.avg).filter((v: number) => v > 0);

    const min = allValues.length ? Math.min(...allValues) : 0;
    const max = allValues.length ? Math.max(...allValues) : 0;
    const avg = allValues.length 
      ? Math.round(allValues.reduce((a: number, b: number) => a + b, 0) / allValues.length) 
      : 0;

    return { currentVal, oxyRecords, trendData, stats: { min, max, avg } };
  }, [serverResponse, timeRange]);

  const getStatusColor = (val: number) => {
    if (val === 0) return '#94A3B8';
    if (val >= 95) return '#10B981'; 
    return '#F59E0B'; 
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SpO2</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.mainCard}>
            <View style={styles.mainHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#0EA5E915' }]}>
                <Ionicons name="water" size={28} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mainLabel}>Đo gần nhất</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.mainValue}>{processedOxy.currentVal || '--'}</Text>
                  <Text style={styles.mainUnit}>%</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(processedOxy.currentVal) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(processedOxy.currentVal) }]}>
                  {processedOxy.currentVal >= 95 ? 'Tốt' : 'Chú ý'}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statLabel}>Thấp</Text><Text style={styles.statVal}>{processedOxy.stats.min}%</Text></View>
              <View style={styles.divider} />
              <View style={styles.statItem}><Text style={styles.statLabel}>TB</Text><Text style={styles.statVal}>{processedOxy.stats.avg}%</Text></View>
              <View style={styles.divider} />
              <View style={styles.statItem}><Text style={styles.statLabel}>Cao</Text><Text style={styles.statVal}>{processedOxy.stats.max}%</Text></View>
            </View>
          </View>

          <View style={styles.tabWrapper}>
            {(['day', 'week', 'month'] as TimeRange[]).map((r) => (
              <TouchableOpacity key={r} onPress={() => setTimeRange(r)} style={[styles.tabItem, timeRange === r && styles.tabActive]}>
                <Text style={[styles.tabLabel, timeRange === r && styles.tabLabelActive]}>
                  {r === 'day' ? 'Ngày' : r === 'week' ? 'Tuần' : 'Tháng'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Biểu đồ SpO2 (%)</Text>
            
            <View style={styles.chartContainer}>
                {timeRange === 'day' ? (
                  <View style={styles.barArea}>
                    {processedOxy.oxyRecords.map((r, i) => (
                      <View key={i} style={styles.barWrapper}>
                        <View style={[styles.bar, { height: (r.value - 85) * 6, backgroundColor: getStatusColor(r.value) }]} />
                        {/* Chỉ hiện nhãn thời gian cho cột đầu, giữa và cuối để tránh tràn */}
                        {(i === 0 || i === Math.floor(processedOxy.oxyRecords.length/2) || i === processedOxy.oxyRecords.length - 1) ? (
                          <Text style={styles.xLabel}>{r.time}</Text>
                        ) : <View style={{height: 12}} />}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.barArea}>
                    {processedOxy.trendData.map((item, i) => (
                      <View key={i} style={styles.barWrapper}>
                        <View style={styles.boxTrack}>
                          <View style={[styles.boxLine, { 
                              bottom: ((item.min - 85) / 15) * 100, 
                              height: Math.max(4, ((item.max - item.min) / 15) * 100), 
                              backgroundColor: getStatusColor(item.max) 
                          }]} />
                        </View>
                        {(i % (timeRange === 'week' ? 1 : 3) === 0) && <Text style={styles.xLabel}>{item.label}</Text>}
                      </View>
                    ))}
                  </View>
                )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Thông tin về SpO2</Text>
            <View style={styles.infoRow}>
              <View style={[styles.dot, {backgroundColor: '#10B981'}]} />
              <Text style={styles.infoText}><Text style={{fontWeight: 'bold'}}>95% - 100%:</Text> Chỉ số bình thường, sức khỏe tốt.</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, {backgroundColor: '#F59E0B'}]} />
              <Text style={styles.infoText}><Text style={{fontWeight: 'bold'}}>90% - 94%:</Text> Chỉ số oxy máu thấp, cần nghỉ ngơi.</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, {backgroundColor: '#EF4444'}]} />
              <Text style={styles.infoText}><Text style={{fontWeight: 'bold'}}>Dưới 90%:</Text> Cảnh báo nguy hiểm, nên tham khảo ý kiến bác sĩ.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  content: { flex: 1 },
  mainCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 24, ...Shadows.sm },
  mainHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mainLabel: { fontSize: 12, color: '#64748B' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  mainValue: { fontSize: 32, fontWeight: '800', color: '#1E293B' },
  mainUnit: { fontSize: 16, color: '#64748B', marginLeft: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, color: '#94A3B8' },
  statVal: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  divider: { width: 1, height: 15, backgroundColor: '#E2E8F0' },
  tabWrapper: { flexDirection: 'row', backgroundColor: '#E2E8F0', margin: 20, padding: 4, borderRadius: 12 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FFF', ...Shadows.sm },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabLabelActive: { color: '#0EA5E9' },
  chartCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 15, borderRadius: 24, ...Shadows.sm, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15, color: '#1E293B' },
  chartContainer: { height: 150, width: '100%' },
  barArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  barWrapper: { alignItems: 'center', flex: 1 },
  bar: { width: 6, borderRadius: 3 },
  boxTrack: { width: 2, height: 100, backgroundColor: '#F1F5F9', position: 'relative' },
  boxLine: { position: 'absolute', width: 8, left: -3, borderRadius: 4 },
  xLabel: { fontSize: 8, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  infoCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 15, borderRadius: 20, marginBottom: 30 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  infoText: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  noDataText: { color: '#94A3B8', fontSize: 12, fontStyle: 'italic', marginBottom: 20 }
});