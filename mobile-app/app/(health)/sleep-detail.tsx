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
import { Colors, Shadows, Typography, BorderRadius, Spacing } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';

type TimeRange = 'day' | 'week' | 'month';

const SLEEP_COLORS = {
  awake: '#94A3B8', 
  rem: '#F472B6',   
  light: '#8B5CF6', 
  deep: '#4C1D95',  
};

interface SleepStageData {
  type: keyof typeof SLEEP_COLORS;
  duration: number;
  time: string;
}

export default function SleepDetailScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [selectedStage, setSelectedStage] = useState<SleepStageData | null>(null);
  const { data: serverResponse, loading } = useHealthData(timeRange) as any;

  const processedSleep = useMemo(() => {
    const raw = serverResponse?.raw_data || [];
    const summary = serverResponse?.daily_summary || [];

    const sleepRecords = raw.filter((r: any) => r.sleep_duration > 0);
    const latestRec = sleepRecords[sleepRecords.length - 1];
    const targetDateStr = latestRec ? new Date(latestRec.record_time).toDateString() : new Date().toDateString();

    const tonightRecords = sleepRecords.filter((r: any) => 
      new Date(r.record_time).toDateString() === targetDateStr
    ).sort((a: any, b: any) => new Date(a.record_time).getTime() - new Date(b.record_time).getTime());

    let stats = { deep: 0, light: 0, rem: 0, awake: 0, total: 0 };
    let stages: SleepStageData[] = tonightRecords.map((r: any) => {
      const stage = r.sleep_stage || r.raw_data?.sleep_stages;
      const duration = r.sleep_duration || 0;
      stats.total += duration;

      let type: keyof typeof SLEEP_COLORS = 'light';
      if (stage === 5) { stats.deep += duration; type = 'deep'; }
      else if (stage === 6) { stats.rem += duration; type = 'rem'; }
      else if (stage === 1 || stage === 2) { stats.awake += duration; type = 'awake'; }
      else { stats.light += duration; }

      return { type, duration, time: r.record_time };
    });

    // Tính Sleep Score nâng cao
    const totalHrs = stats.total / 60;
    const durationScore = Math.min(50, (totalHrs / 8) * 50);
    const deepScore = Math.min(30, ((stats.deep / 60) / 1.5) * 30);
    const remScore = Math.min(20, ((stats.rem / 60) / 1.5) * 20);
    const awakePenalty = Math.floor(stats.awake / 10) * 2;
    const finalScore = Math.max(0, Math.round(durationScore + deepScore + remScore - awakePenalty));

    const bedTime = tonightRecords.length ? new Date(tonightRecords[0].record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const wakeTime = tonightRecords.length ? new Date(tonightRecords[tonightRecords.length - 1].record_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    const trendData = summary.map((s: any) => ({
      total: s.sleep_hours || 0,
      deep: s.deep_sleep_hours || 0,
      rem: s.rem_sleep_hours || 0,
      quality: s.sleep_quality || 75,
      label: new Date(s.date).getDate().toString()
    })).slice(timeRange === 'week' ? -7 : -15);

    const avgDuration = trendData.length 
      ? (trendData.reduce((a: number, b: any) => a + b.total, 0) / trendData.length).toFixed(1) 
      : '0';

    return {
      day: {
        duration: totalHrs.toFixed(1),
        score: finalScore,
        deep: (stats.deep / 60).toFixed(1),
        light: (stats.light / 60).toFixed(1),
        rem: (stats.rem / 60).toFixed(1),
        awake: (stats.awake / 60).toFixed(1),
        stages, bedTime, wakeTime
      },
      trend: { data: trendData, avgDuration }
    };
  }, [serverResponse, timeRange]);

  const renderHypnogram = () => {
    if (processedSleep.day.stages.length === 0) return (
      <View style={styles.noData}><Text style={{color: '#94A3B8'}}>Chưa có dữ liệu đêm qua</Text></View>
    );

    return (
      <View style={styles.hypnoContainer}>
        <View style={styles.gridLines}>
          <View style={styles.gridLine}><Text style={styles.gridLabel}>Thức</Text></View>
          <View style={styles.gridLine}><Text style={styles.gridLabel}>REM</Text></View>
          <View style={styles.gridLine}><Text style={styles.gridLabel}>Nhẹ</Text></View>
          <View style={styles.gridLine}><Text style={styles.gridLabel}>Sâu</Text></View>
        </View>

        <View style={styles.stagesContainer}>
          {processedSleep.day.stages.map((s, i) => {
            let marginTop = 0;
            if (s.type === 'rem') marginTop = 30;
            if (s.type === 'light') marginTop = 60;
            if (s.type === 'deep') marginTop = 90;

            return (
              <TouchableOpacity 
                key={i} 
                onPress={() => setSelectedStage(s)}
                style={{
                  flex: s.duration,
                  height: 20,
                  marginTop: marginTop,
                  backgroundColor: SLEEP_COLORS[s.type],
                  borderRadius: 4,
                  marginHorizontal: 0.5,
                }}
              />
            );
          })}
        </View>
        <View style={styles.timeLabels}>
          <Text style={styles.timeTxt}>{processedSleep.day.bedTime}</Text>
          {selectedStage && (
            <View style={styles.popover}>
              <Text style={styles.popoverTxt}>{selectedStage.duration}m {selectedStage.type.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.timeTxt}>{processedSleep.day.wakeTime}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giấc ngủ</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.moonIcon, { backgroundColor: Colors.health.sleep + '20' }]}>
                <Ionicons name="moon" size={28} color={Colors.health.sleep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Đêm qua</Text>
                <View style={styles.valRow}>
                  <Text style={styles.bigVal}>{processedSleep.day.duration}</Text>
                  <Text style={styles.unit}>giờ</Text>
                </View>
              </View>
              <View style={styles.scoreRing}>
                <Text style={styles.scoreValue}>{processedSleep.day.score}%</Text>
                <Text style={styles.scoreLabel}>Chất lượng</Text>
              </View>
            </View>

            <View style={styles.bedWakeRow}>
              <View style={styles.timeInfo}>
                <Ionicons name="bed-outline" size={18} color="#64748B" />
                <View style={{marginLeft: 10}}>
                  <Text style={styles.smallLabel}>Đi ngủ</Text>
                  <Text style={styles.timeText}>{processedSleep.day.bedTime}</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
              <View style={styles.timeInfo}>
                <Ionicons name="sunny-outline" size={18} color="#64748B" />
                <View style={{marginLeft: 10}}>
                  <Text style={styles.smallLabel}>Thức dậy</Text>
                  <Text style={styles.timeText}>{processedSleep.day.wakeTime}</Text>
                </View>
              </View>
            </View>

            <View style={styles.deviceRow}>
              <Ionicons name="watch-outline" size={14} color="#94A3B8" />
              <Text style={styles.deviceText}>Cập nhật từ Health Connect</Text>
            </View>
          </View>

          {/* Hypnogram Section */}
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Giai đoạn giấc ngủ</Text>
            {renderHypnogram()}
            <View style={styles.statsGrid}>
              <StatItem label="Sâu" value={processedSleep.day.deep} color={SLEEP_COLORS.deep} />
              <StatItem label="REM" value={processedSleep.day.rem} color={SLEEP_COLORS.rem} />
              <StatItem label="Nhẹ" value={processedSleep.day.light} color={SLEEP_COLORS.light} />
              <StatItem label="Thức" value={processedSleep.day.awake} color={SLEEP_COLORS.awake} />
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            {(['day', 'week', 'month'] as TimeRange[]).map((r) => (
              <TouchableOpacity key={r} onPress={() => setTimeRange(r)} style={[styles.tab, timeRange === r && styles.tabActive]}>
                <Text style={[styles.tabTxt, timeRange === r && styles.tabTxtActive]}>
                  {r === 'day' ? 'Hàng ngày' : r === 'week' ? 'Tuần' : 'Tháng'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {timeRange !== 'day' ? (
            <View style={styles.card}>
               <Text style={styles.sectionTitle}>Xu hướng cấu trúc ngủ</Text>
               <View style={styles.trendArea}>
                  {processedSleep.trend.data.map((item: any, i: number) => (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barStack}>
                         <View style={{ flex: item.deep, backgroundColor: SLEEP_COLORS.deep }} />
                         <View style={{ flex: item.rem, backgroundColor: SLEEP_COLORS.rem }} />
                         <View style={{ flex: item.light, backgroundColor: SLEEP_COLORS.light }} />
                         {item.total === 0 && <View style={{ flex: 1, backgroundColor: '#F1F5F9' }} />}
                      </View>
                      <Text style={styles.xTxt}>{item.label}</Text>
                    </View>
                  ))}
               </View>
               <Text style={styles.avgText}>Trung bình: <Text style={{fontWeight: 'bold'}}>{processedSleep.trend.avgDuration}h/đêm</Text></Text>
            </View>
          ) : (
            <>
              {/* Analysis Scores */}
              <View style={styles.scoreCard}>
                <Text style={styles.sectionTitle}>Phân tích chi tiết</Text>
                {[
                  { name: 'Thời lượng', score: Math.min(100, (parseFloat(processedSleep.day.duration)/8)*100), icon: 'time-outline' },
                  { name: 'Ngủ sâu', score: Math.min(100, (parseFloat(processedSleep.day.deep)/1.5)*100), icon: 'moon-outline' },
                  { name: 'Liên tục', score: 100 - (parseFloat(processedSleep.day.awake)*10), icon: 'refresh-outline' },
                  { name: 'Hiệu quả', score: processedSleep.day.score, icon: 'checkmark-circle-outline' },
                ].map((item, index) => (
                  <View key={index} style={styles.scoreRow}>
                    <Ionicons name={item.icon as any} size={20} color={Colors.health.sleep} />
                    <Text style={styles.scoreName}>{item.name}</Text>
                    <View style={styles.scoreBarContainer}>
                      <View style={[styles.scoreBar, { width: `${item.score}%` }]} />
                    </View>
                    <Text style={styles.scoreValue}>{Math.round(item.score)}</Text>
                  </View>
                ))}
              </View>

              {/* Tips */}
              <View style={styles.tipsCard}>
                <Ionicons name="bulb" size={22} color={Colors.secondary.orange} />
                <View style={{marginLeft: 15, flex: 1}}>
                  <Text style={styles.tipsTitle}>Gợi ý cải thiện</Text>
                  <Text style={styles.tipsText}>
                    {processedSleep.day.score > 80 
                      ? "Bạn đang có giấc ngủ rất chất lượng! Hãy duy trì thói quen đi ngủ đúng giờ nhé."
                      : "Hãy thử hạn chế dùng điện thoại 30 phút trước khi ngủ để tăng tỉ lệ ngủ sâu của Duy."}
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const StatItem = ({label, value, color}: any) => (
  <View style={styles.statItem}>
    <View style={[styles.statDot, {backgroundColor: color}]} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}h</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1 },
  summaryCard: { backgroundColor: '#FFF', margin: 20, marginTop: 0, padding: 25, borderRadius: 32, ...Shadows.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  moonIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, color: '#64748B' },
  valRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigVal: { fontSize: 36, fontWeight: '800', color: '#1E293B' },
  unit: { fontSize: 16, color: '#64748B', marginLeft: 4 },
  scoreRing: { alignItems: 'center', padding: 10, borderRadius: 16, backgroundColor: '#8B5CF610' },
  scoreValue: { fontSize: 18, fontWeight: 'bold', color: '#8B5CF6' },
  scoreLabel: { fontSize: 9, color: '#64748B' },
  bedWakeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  timeInfo: { flexDirection: 'row', alignItems: 'center' },
  smallLabel: { fontSize: 10, color: '#94A3B8' },
  timeText: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, gap: 5 },
  deviceText: { fontSize: 11, color: '#94A3B8' },
  chartCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 32, ...Shadows.sm, marginBottom: 20 },
  card: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 32, ...Shadows.sm, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20, color: '#1E293B' },
  hypnoContainer: { height: 130, position: 'relative', marginBottom: 30 },
  gridLines: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'space-between' },
  gridLine: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', height: 30, justifyContent: 'center' },
  gridLabel: { fontSize: 9, color: '#CBD5E1', position: 'absolute', left: -5, top: 0 },
  stagesContainer: { flexDirection: 'row', height: 110 },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  timeTxt: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold' },
  popover: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  popoverTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statItem: { alignItems: 'center' },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#64748B' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', margin: 20, padding: 4, borderRadius: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#FFF', ...Shadows.sm },
  tabTxt: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tabTxtActive: { color: '#8B5CF6' },
  scoreCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 32, ...Shadows.sm, marginBottom: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  scoreName: { fontSize: 13, color: '#1E293B', width: 80, marginLeft: 10 },
  scoreBarContainer: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  scoreBar: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 },
 // Đổi scoreValue thành scoreRowValue
  scoreRowValue: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: '#1E293B', 
    width: 30, 
    textAlign: 'right' 
  },
  tipsCard: { flexDirection: 'row', backgroundColor: '#FFF7ED', marginHorizontal: 20, padding: 20, borderRadius: 24, marginBottom: 40 },
  tipsTitle: { fontSize: 15, fontWeight: 'bold', color: '#C2410C' },
  tipsText: { fontSize: 13, color: '#9A3412', marginTop: 4, lineHeight: 18 },
  trendArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 160, paddingTop: 10 },
  barCol: { alignItems: 'center', flex: 1 },
  barStack: { width: 12, height: 130, borderRadius: 6, overflow: 'hidden', flexDirection: 'column-reverse' },
  xTxt: { fontSize: 9, color: '#94A3B8', marginTop: 8 },
  avgText: { textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 15 },
  noData: { height: 100, justifyContent: 'center', alignItems: 'center' }
});