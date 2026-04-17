import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';

type TimeRange = 'day' | 'week' | 'month';

const SLEEP_COLORS = {
  deep: '#5B21B6',  // Tím đậm
  light: '#8B5CF6', // Tím vừa
  rem: '#A78BFA',   // Tím nhạt
  awake: '#E5E7EB', // Xám
};

export default function SleepDetailScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const { data: serverResponse, loading } = useHealthData(timeRange) as any;

  const processedSleep = useMemo(() => {
    const raw = serverResponse?.raw_data || [];
    const summary = serverResponse?.daily_summary || [];

    // 1. TÌM NGÀY CÓ GIẤC NGỦ GẦN NHẤT
    const sleepRecords = raw.filter((r: any) => r.sleep_duration > 0);
    const latestRec = sleepRecords[sleepRecords.length - 1];
    const targetDateStr = latestRec ? new Date(latestRec.record_time).toDateString() : new Date().toDateString();

    // 2. LỌC DỮ LIỆU ĐÊM QUA
    const tonightRecords = sleepRecords.filter((r: any) => 
      new Date(r.record_time).toDateString() === targetDateStr
    ).sort((a: any, b: any) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime());

    let stats = { deep: 0, light: 0, rem: 0, awake: 0, total: 0 };
    let stages: any[] = [];
    
    tonightRecords.forEach((r: any) => {
      const stage = r.sleep_stage || r.raw_data?.sleep_stages;
      const duration = r.sleep_duration || 0;
      stats.total += duration;

      let type = 'light';
      if (stage === 5) { stats.deep += duration; type = 'deep'; }
      else if (stage === 6) { stats.rem += duration; type = 'rem'; }
      else if (stage === 1 || stage === 2) { stats.awake += duration; type = 'awake'; }
      else { stats.light += duration; }

      stages.push({ type, duration, time: r.record_time });
    });

    const bedTime = tonightRecords.length ? new Date(tonightRecords[0].record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const wakeTime = tonightRecords.length ? new Date(tonightRecords[tonightRecords.length - 1].record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    // 3. LOGIC TREND (TUẦN/THÁNG)
    const trendData = summary.map((s: any) => ({
      value: s.sleep_hours || 0,
      label: new Date(s.date).getDate().toString()
    })).slice(timeRange === 'week' ? -7 : -10);

    const avgDuration = trendData.length ? (trendData.reduce((a: any, b: any) => a + b.value, 0) / trendData.length).toFixed(1) : '0';

    return {
      day: {
        duration: (stats.total / 60).toFixed(1),
        quality: Math.min(100, Math.round((stats.deep + stats.rem) / (stats.total || 1) * 150)),
        deep: (stats.deep / 60).toFixed(1),
        light: (stats.light / 60).toFixed(1),
        rem: (stats.rem / 60).toFixed(1),
        awake: (stats.awake / 60).toFixed(1),
        stages, bedTime, wakeTime
      },
      trend: { data: trendData, avgDuration }
    };
  }, [serverResponse, timeRange]);

  const renderTimeline = () => {
    if (processedSleep.day.stages.length === 0) return (
      <View style={styles.noData}><Text style={{color: '#94A3B8'}}>Chưa có dữ liệu chi tiết</Text></View>
    );

    return (
      <View style={styles.timelineContainer}>
        <View style={styles.timelineBar}>
          {processedSleep.day.stages.map((s, i) => (
            <View key={i} style={{ 
              flex: s.duration, 
              backgroundColor: SLEEP_COLORS[s.type as keyof typeof SLEEP_COLORS],
              height: '100%',
              borderRadius: 2
            }} />
          ))}
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineTxt}>{processedSleep.day.bedTime}</Text>
          <Text style={styles.timelineTxt}>{processedSleep.day.wakeTime}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Giấc ngủ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Main Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.moonIcon, { backgroundColor: Colors.health.sleep + '20' }]}>
              <Ionicons name="moon" size={28} color={Colors.health.sleep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Thời gian ngủ</Text>
              <View style={styles.valRow}>
                <Text style={styles.bigVal}>{processedSleep.day.duration}</Text>
                <Text style={styles.unit}>giờ</Text>
              </View>
            </View>
            <View style={[styles.qualityBadge, { backgroundColor: Colors.status.success + '15' }]}>
              <Text style={[styles.qVal, { color: Colors.status.success }]}>{processedSleep.day.quality}%</Text>
              <Text style={[styles.qLab, { color: Colors.status.success }]}>Tốt</Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Ionicons name="bed-outline" size={18} color="#64748B" />
              <View><Text style={styles.timeLabel}>Đi ngủ</Text><Text style={styles.timeVal}>{processedSleep.day.bedTime}</Text></View>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
            <View style={styles.timeItem}>
              <Ionicons name="sunny-outline" size={18} color="#64748B" />
              <View><Text style={styles.timeLabel}>Thức dậy</Text><Text style={styles.timeVal}>{processedSleep.day.wakeTime}</Text></View>
            </View>
          </View>
        </View>

        {/* Stages Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Giai đoạn giấc ngủ</Text>
          {renderTimeline()}
          <View style={styles.stagesGrid}>
            <StageInfo dot={SLEEP_COLORS.deep} lab="Sâu" val={processedSleep.day.deep} />
            <StageInfo dot={SLEEP_COLORS.light} lab="Nhẹ" val={processedSleep.day.light} />
            <StageInfo dot={SLEEP_COLORS.rem} lab="REM" val={processedSleep.day.rem} />
            <StageInfo dot={SLEEP_COLORS.awake} lab="Thức" val={processedSleep.day.awake} />
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {(['day', 'week', 'month'] as TimeRange[]).map((r) => (
            <TouchableOpacity key={r} onPress={() => setTimeRange(r)} style={[styles.tab, timeRange === r && styles.tabActive]}>
              <Text style={[styles.tabTxt, timeRange === r && styles.tabTxtActive]}>
                {r === 'day' ? 'Đêm qua' : r === 'week' ? 'Tuần' : 'Tháng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {timeRange !== 'day' && (
          <View style={styles.card}>
             <Text style={styles.sectionTitle}>Xu hướng</Text>
             <View style={styles.chartArea}>
                {processedSleep.trend.data.map((item: any, i: number) => (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: (item.value / 10) * 120, backgroundColor: Colors.health.sleep }]} />
                    <Text style={styles.xTxt}>{item.label}</Text>
                  </View>
                ))}
             </View>
             <Text style={styles.avgText}>Trung bình: <Text style={{fontWeight: 'bold'}}>{processedSleep.trend.avgDuration}h/đêm</Text></Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const StageInfo = ({ dot, lab, val }: any) => (
  <View style={styles.stageItem}>
    <View style={[styles.dot, { backgroundColor: dot }]} />
    <Text style={styles.stageLab}>{lab}</Text>
    <Text style={styles.stageVal}>{val}h</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1 },
  summaryCard: { backgroundColor: '#FFF', margin: 20, marginTop: 0, padding: 20, borderRadius: 28, ...Shadows.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  moonIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, color: '#64748B' },
  valRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigVal: { fontSize: 36, fontWeight: '800', color: '#1E293B' },
  unit: { fontSize: 16, color: '#64748B', marginLeft: 4 },
  qualityBadge: { padding: 10, borderRadius: 16, alignItems: 'center' },
  qVal: { fontSize: 16, fontWeight: 'bold' },
  qLab: { fontSize: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeLabel: { fontSize: 10, color: '#94A3B8' },
  timeVal: { fontSize: 14, fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', margin: 20, marginTop: 0, padding: 20, borderRadius: 28, ...Shadows.sm },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  timelineContainer: { marginBottom: 20 },
  timelineBar: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timelineTxt: { fontSize: 10, color: '#94A3B8' },
  stagesGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  stageItem: { alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  stageLab: { fontSize: 10, color: '#64748B' },
  stageVal: { fontSize: 13, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', margin: 20, padding: 4, borderRadius: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#FFF', ...Shadows.sm },
  tabTxt: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tabTxtActive: { color: '#1E293B' },
  noData: { height: 60, justifyContent: 'center', alignItems: 'center' },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingBottom: 20 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 15, borderRadius: 8 },
  xTxt: { fontSize: 10, color: '#94A3B8', marginTop: 5 },
  avgText: { textAlign: 'center', fontSize: 13, color: '#64748B' }
});