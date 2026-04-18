import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import MetricCard from './MetricCard';

interface OxygenData {
  blood_oxygen: number;
  record_time?: string;
  min_spo2?: number; // Dữ liệu từ dailySummary
  max_spo2?: number; // Dữ liệu từ dailySummary
}

interface OxygenSectionProps {
  percent: number;
  timeRange: 'day' | 'week' | 'month';
  rawData: OxygenData[];
}

const OxygenSection: React.FC<OxygenSectionProps> = ({ percent, timeRange, rawData }) => {
  // 1. Logic đánh giá trạng thái
  const getStatus = (val: number) => {
    if (val === 0) return { label: 'N/A', color: '#94A3B8' };
    if (val >= 95) return { label: 'Bình thường', color: '#10B981' };
    if (val >= 90) return { label: 'Thấp', color: '#F59E0B' };
    return { label: 'Cảnh báo', color: '#EF4444' };
  };

  const status = getStatus(percent);

  // 2. Logic vẽ biểu đồ
  const renderChart = useMemo(() => {
    if (!rawData || rawData.length === 0) return <Text style={styles.noDataText}>Chưa có dữ liệu đo</Text>;

    if (timeRange === 'day') {
      // Biểu đồ mốc thời gian (Timeline Dots) cho Tab Ngày
      const dayData = rawData.filter(d => d.blood_oxygen > 0).slice(-12); // Lấy 12 mốc gần nhất
      return (
        <View style={styles.dayChartContainer}>
          {dayData.map((d, i) => (
            <View key={i} style={styles.timelinePoint}>
              <View style={[styles.bar, { height: (d.blood_oxygen - 80) * 2, backgroundColor: getStatus(d.blood_oxygen).color }]} />
              <Text style={styles.miniLabel}>{d.blood_oxygen}%</Text>
            </View>
          ))}
        </View>
      );
    } else {
      // Biểu đồ Box Plot (Min-Max) cho Tab Tuần/Tháng
      return (
        <View style={styles.boxPlotContainer}>
          {rawData.slice(-7).map((d, i) => {
            const min = d.min_spo2 || d.blood_oxygen || 90;
            const max = d.max_spo2 || d.blood_oxygen || 100;
            const range = 100 - 80; // Scale từ 80% - 100%
            
            return (
              <View key={i} style={styles.boxColumn}>
                <View style={styles.boxTrack}>
                  <View style={[styles.boxLine, { 
                    bottom: ((min - 80) / range) * 40, 
                    height: ((max - min) / range) * 40,
                    backgroundColor: getStatus(max).color
                  }]} />
                </View>
                <Text style={styles.miniLabel}>{timeRange === 'week' ? 'T' + (i+2) : ''}</Text>
              </View>
            );
          })}
        </View>
      );
    }
  }, [rawData, timeRange]);

  return (
    <MetricCard
      title="Nồng độ Oxy máu"
      subtitle={timeRange === 'day' ? "Chỉ số gần nhất" : "Khoảng biến thiên"}
      value={percent || '--'}
      unit="%"
      icon="water"
      iconColor="#0EA5E9"
      onPress={() => router.push('/(health)/oxygen-detail')}
    >
      <View style={styles.innerContent}>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>

        <View style={styles.chartWrapper}>
          {renderChart}
        </View>

        <Text style={styles.desc}>
          {percent >= 95 
            ? 'Chỉ số oxy máu của bạn rất tốt.' 
            : percent > 0 
            ? 'Hãy chú ý hít thở sâu và nghỉ ngơi.' 
            : 'Chưa nhận được dữ liệu đo trong giai đoạn này.'}
        </Text>
      </View>
    </MetricCard>
  );
};

const styles = StyleSheet.create({
  innerContent: { marginTop: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  chartWrapper: { height: 60, justifyContent: 'center', marginBottom: 10 },
  dayChartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 50 },
  timelinePoint: { alignItems: 'center' },
  bar: { width: 4, borderRadius: 2, marginBottom: 4 },
  boxPlotContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 50 },
  boxColumn: { alignItems: 'center', flex: 1 },
  boxTrack: { width: 2, height: 40, backgroundColor: '#E2E8F0', borderRadius: 1, position: 'relative' },
  boxLine: { position: 'absolute', width: 6, left: -2, borderRadius: 3 },
  miniLabel: { fontSize: 8, color: '#94A3B8', marginTop: 4 },
  desc: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  noDataText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }
});

export default OxygenSection;