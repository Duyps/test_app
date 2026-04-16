import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { readRecords, initialize, requestPermission } from 'react-native-health-connect';

export default function DebugHealthScreen() {
  const [formattedData, setFormattedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const transformData = (steps: any, heart: any, sleep: any, oxygen: any) => {
    return {
      metadata: {
        lastSync: new Date().toLocaleString(),
        device: "Health Connect (Aggregated)",
      },
      metrics: {
        // Cộng tổng bước chân
        steps: {
          total: steps.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0),
          unit: 'steps',
          recordsCount: steps.records.length
        },
        // Lấy nhịp tim gần nhất và trung bình
        heartRate: {
          latest: heart.records.length > 0 ? heart.records[heart.records.length - 1].samples[0]?.beatsPerMinute : 0,
          avg: heart.records.length > 0 
            ? Math.round(heart.records.reduce((sum: number, r: any) => sum + (r.samples[0]?.beatsPerMinute || 0), 0) / heart.records.length) 
            : 0,
          unit: 'bpm'
        },
        // Tính tổng thời gian ngủ (phút)
        sleep: {
          totalMinutes: sleep.records.reduce((sum: number, r: any) => {
            const start = new Date(r.startTime).getTime();
            const end = new Date(r.endTime).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0).toFixed(0),
          sessions: sleep.records.length,
          unit: 'minutes'
        },
        // Oxy trong máu gần nhất
        spO2: {
          latest: oxygen.records.length > 0 ? (oxygen.records[oxygen.records.length - 1].percentage || 0) : 0,
          unit: '%'
        }
      },
      // Giữ lại một ít bản ghi đã được làm sạch để xem cấu trúc
      samples: {
        stepSamples: steps.records.slice(-3).map((r: any) => ({ time: r.startTime, count: r.count })),
        heartSamples: heart.records.slice(-3).map((r: any) => ({ time: r.startTime, bpm: r.samples[0]?.beatsPerMinute })),
      }
    };
  };

  const fetchAndFormatData = async () => {
    setLoading(true);
    try {
      await initialize();
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
      ]);

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date().toISOString();
      
      const filter = { timeRangeFilter: { operator: 'between', startTime: startOfDay, endTime: endOfDay } };

      const [steps, heart, sleep, oxygen] = await Promise.all([
        readRecords('Steps', filter as any),
        readRecords('HeartRate', filter as any),
        readRecords('SleepSession', filter as any),
        readRecords('OxygenSaturation', filter as any),
      ]);

      const cleanData = transformData(steps, heart, sleep, oxygen);
      
      setFormattedData(cleanData);
      console.log("📊 [HEALTH METRICS]:", JSON.stringify(cleanData, null, 2));

    } catch (e: any) {
      setFormattedData({ error: e.message });
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Metric Debugger</Text>
      
      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={fetchAndFormatData}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>ĐỌC & CHUYỂN ĐỔI DATA</Text>}
      </TouchableOpacity>

      <ScrollView style={styles.jsonContainer}>
        {formattedData ? (
          <View>
            <Text style={styles.sectionTitle}>--- Console Output View ---</Text>
            <Text style={styles.jsonText}>{JSON.stringify(formattedData, null, 2)}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Dữ liệu sau khi xử lý sẽ hiện ở đây...</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20, paddingTop: 50 },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  btnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },
  jsonContainer: { marginTop: 20, backgroundColor: '#1E293B', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#94A3B8', marginBottom: 10, fontSize: 12, fontWeight: 'bold' },
  jsonText: { color: '#38BDF8', fontFamily: 'monospace', fontSize: 13 },
  placeholder: { color: '#64748B', textAlign: 'center', marginTop: 50 },
});