import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Đảm bảo import Text rõ ràng từ react-native để tránh lỗi JSX
import { View, StyleSheet, ScrollView, RefreshControl, Text } from 'react-native';

// Constants & Components
import { Colors, Spacing, Shadows } from '../../constants/Colors';
import Header from '../../components/home/Header';
import HealthScoreCard from '../../components/home/HealthScoreCard';
import SleepSection from '../../components/home/SleepSection';
import HealthTipCard from '../../components/home/HealthTips';
import HeartRateSection from '../../components/home/HeartRateSection';
import OxygenSection from '../../components/home/OxygenSection';

// Hooks & Services
import { useHealthData } from '../../hooks/useHealthData';
import { getUserData } from '../../services/auth';
import { useHealthTips } from '../../hooks/useHealthTips';
import { useHealthConnect } from '../../hooks/useHealthConnect';

type TimeRange = 'day' | 'week' | 'month';

export default function HomeScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [userName, setUserName] = useState<string>('');
  
  const { syncHealthData, loading: isSyncing } = useHealthConnect() as any;
  const { data: serverResponse, loading: isDataLoading, refresh } = useHealthData(timeRange) as any;
  const { randomTip } = useHealthTips();

  const rawData = useMemo(() => serverResponse?.raw_data || [], [serverResponse]);
  const dailySummary = useMemo(() => serverResponse?.daily_summary || [], [serverResponse]);

  const processedData = useMemo(() => {
    if (rawData.length === 0 && dailySummary.length === 0) {
      return {
        score: 0,
        heartRate: { current: 0, avg: 0, history: [] as number[] },
        sleep: { duration: '0.0', stages: [] as any[] },
        oxygen: 0,
        steps: 0,
        calories: 0,
      };
    }

    // --- XỬ LÝ TAB NGÀY ---
    if (timeRange === 'day') {
      const availableDates = Array.from(new Set(rawData.map((r: any) => new Date(r.record_time).toDateString()))).reverse();
      
      // Fix lỗi unknown bằng cách gán kiểu string rõ ràng
      let targetDateStr: string = new Date().toDateString();
      
      for (const dStr of availableDates) {
        const hasMainData = rawData.some((r: any) => 
          new Date(r.record_time).toDateString() === (dStr as string) && (r.heart_rate > 0 || r.steps > 0 || r.blood_oxygen > 0)
        );
        if (hasMainData) { 
          targetDateStr = dStr as string; 
          break; 
        }
      }

      const targetRecords = rawData.filter((r: any) => new Date(r.record_time).toDateString() === targetDateStr);
      const hrValues = targetRecords.map((r: any) => r.heart_rate).filter((v: any) => v != null && v > 0);
      const oxygenValues = targetRecords.map((r: any) => r.blood_oxygen).filter((v: any) => v != null && v > 0);
      const sleepRecs = targetRecords.filter((r: any) => r.sleep_duration > 0);
      
      let deep = 0, rem = 0, light = 0, totalSleep = 0;
      sleepRecs.forEach((r: any) => {
        const stage = r.sleep_stage || r.raw_data?.sleep_stages;
        totalSleep += (r.sleep_duration || 0);
        if (stage === 5) deep += r.sleep_duration;
        else if (stage === 6) rem += r.sleep_duration;
        else light += r.sleep_duration;
      });

      const totalSteps = targetRecords.reduce((s: number, r: any) => s + (r.steps || 0), 0);

      return {
        score: Math.min(100, 65 + (totalSteps / 200) + (totalSleep / 120)),
        heartRate: {
          current: hrValues.length ? hrValues[hrValues.length - 1] : 0,
          avg: hrValues.length ? Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length) : 0,
          history: hrValues.slice(-30)
        },
        oxygen: oxygenValues.length ? oxygenValues[oxygenValues.length - 1] : 0,
        sleep: {
          duration: (totalSleep / 60).toFixed(1),
          stages: [
            { label: 'Sâu', minutes: deep, percent: totalSleep ? (deep/totalSleep)*100 : 0, color: '#5B21B6' },
            { label: 'REM', minutes: rem, percent: totalSleep ? (rem/totalSleep)*100 : 0, color: '#A78BFA' },
            { label: 'Nhẹ', minutes: light, percent: totalSleep ? (light/totalSleep)*100 : 0, color: '#8B5CF6' },
          ]
        },
        steps: Math.round(totalSteps),
        calories: Math.round(targetRecords.reduce((s: number, r: any) => s + (r.calories || 0), 0)),
      };
    }

    // --- TAB TUẦN / THÁNG ---
    const totalSteps = dailySummary.reduce((s: number, d: any) => s + (d.steps || 0), 0);
    const totalCals = dailySummary.reduce((s: number, d: any) => s + (d.calories || 0), 0);
    const hrHistory = dailySummary.map((d: any) => d.avg_hr).filter((v: any) => v > 0);
    const oxyHistory = dailySummary.map((d: any) => d.avg_spo2 || 0).filter((v: any) => v > 0);
    const totalSleepHrs = dailySummary.reduce((s: number, d: any) => s + (d.sleep_hours || 0), 0);
    const sumDeep = dailySummary.reduce((s: number, d: any) => s + (d.deep_sleep_hours || 0), 0);
    const sumRem = dailySummary.reduce((s: number, d: any) => s + (d.rem_sleep_hours || 0), 0);

    return {
      score: Math.min(100, 55 + (totalSteps / (timeRange === 'week' ? 1000 : 5000))),
      heartRate: {
        current: hrHistory.length ? hrHistory[hrHistory.length - 1] : 0,
        avg: hrHistory.length ? Math.round(hrHistory.reduce((a: number, b: number) => a + b, 0) / hrHistory.length) : 0,
        history: hrHistory
      },
      oxygen: oxyHistory.length ? Math.round(oxyHistory.reduce((a: number, b: number) => a + b, 0) / oxyHistory.length) : 0,
      sleep: {
        duration: totalSleepHrs.toFixed(1),
        stages: [
          { label: 'Sâu', minutes: sumDeep * 60, percent: totalSleepHrs ? (sumDeep/totalSleepHrs)*100 : 0, color: '#5B21B6' },
          { label: 'REM', minutes: sumRem * 60, percent: totalSleepHrs ? (sumRem/totalSleepHrs)*100 : 0, color: '#A78BFA' },
          { label: 'Nhẹ', minutes: (totalSleepHrs - sumDeep - sumRem) * 60, percent: totalSleepHrs ? ((totalSleepHrs - sumDeep - sumRem)/totalSleepHrs)*100 : 0, color: '#8B5CF6' },
        ]
      },
      steps: Math.round(totalSteps),
      calories: Math.round(totalCals)
    };
  }, [rawData, dailySummary, timeRange]);

  const onRefresh = useCallback(async () => {
    await syncHealthData(30);
    setTimeout(() => refresh(), 800);
  }, [syncHealthData, refresh]);

  useEffect(() => {
    getUserData().then((u: any) => setUserName(u?.full_name || 'Duy'));
    onRefresh();
  }, []);

  return (
    <View style={styles.container}>
      <Header 
        userName={userName} 
        timeRange={timeRange} 
        setTimeRange={setTimeRange} 
        isSyncing={isSyncing} 
        onRefresh={onRefresh} 
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isDataLoading} onRefresh={refresh} colors={[Colors.primary.main]} />}
      >
        <HealthScoreCard score={Math.round(processedData.score)} />

        <HeartRateSection 
          current={processedData.heartRate.current}
          avg={processedData.heartRate.avg}
          history={processedData.heartRate.history}
        />

        <OxygenSection percent={processedData.oxygen} />

        <SleepSection duration={processedData.sleep.duration} stages={processedData.sleep.stages} />

        <View style={styles.smallCardsRow}>
          <View style={styles.smallCard}>
            <Text style={styles.smallCardValue}>{processedData.steps.toLocaleString()}</Text>
            <Text style={styles.smallCardLabel}>Bước chân</Text>
          </View>
          <View style={styles.smallCard}>
            <Text style={styles.smallCardValue}>{processedData.calories}</Text>
            <Text style={styles.smallCardLabel}>Kcal tiêu thụ</Text>
          </View>
        </View>

        <HealthTipCard tipContent={randomTip?.content || "Duy trì lối sống lành mạnh cùng HealthGuard nhé!"} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.main },
  content: { flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -Spacing.md },
  contentContainer: { padding: 20, paddingBottom: 40 },
  smallCardsRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  smallCard: { flex: 1, backgroundColor: '#FFF', padding: 18, borderRadius: 24, alignItems: 'center', ...Shadows.sm },
  smallCardValue: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  smallCardLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
});