import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import MetricCard from './MetricCard';
import { router } from 'expo-router';

// Định nghĩa interface cho dữ liệu thô
interface HeartRateRaw {
  heart_rate: number;
  avg_hr?: number; // Dùng cho dailySummary
}

interface HeartRateSectionProps {
  current: number;
  avg: number;
  history: number[];
  timeRange: 'day' | 'week' | 'month';
  rawData: HeartRateRaw[]; 
}

const HeartRateSection: React.FC<HeartRateSectionProps> = ({ current, avg, history, timeRange, rawData }) => {
  
  // 1. Tính toán Min/Max/Avg chính xác từ rawData
  const stats = useMemo(() => {
    if (!rawData || rawData.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const validHR = rawData
      .map((r: HeartRateRaw) => r.heart_rate || r.avg_hr) // Fix lỗi tham số 'r'
      .filter((v): v is number => v != null && v > 0);

    if (validHR.length === 0) return { min: 0, max: 0, avg: 0 };

    return {
      min: Math.min(...validHR),
      max: Math.max(...validHR),
      avg: Math.round(validHR.reduce((a: number, b: number) => a + b, 0) / validHR.length)
    };
  }, [rawData]);

  // 2. Logic vẽ biểu đồ theo từng Tab
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    let displayData = [...history];
    if (timeRange === 'day') displayData = history.slice(-35); 
    
    const validValues = displayData.filter((v: number) => v > 0);
    const cMax = validValues.length > 0 ? Math.max(...validValues) : 100;
    const cMin = validValues.length > 0 ? Math.min(...validValues) : 40;
    const cRange = (cMax - cMin) || 1;

    return displayData.map((v: number) => ({
      value: v,
      // Chiều cao bar tối thiểu 3px, tối đa 40px
      height: v > 0 ? ((v - cMin) / cRange) * 35 + 5 : 2, 
    }));
  }, [history, timeRange]);

  return (
    <MetricCard
      title="Nhịp tim"
      subtitle={timeRange === 'day' ? "Chỉ số gần nhất" : "Trung bình giai đoạn"}
      value={current > 0 ? current : (stats.avg > 0 ? stats.avg : '--')} 
      unit="BPM"
      icon="heart"
      iconColor={Colors.health.heartRate}
      onPress={() => router.push('/(health)/heart-rate-detail')}
    >
      {/* 1. Biểu đồ xu hướng */}
      <View style={styles.chartContainer}>
        <View style={styles.miniChart}>
          {chartData.length > 0 ? (
            chartData.map((point, i) => (
              <View
                key={i}
                style={[
                  styles.miniChartBar,
                  {
                    height: point.height,
                    backgroundColor: i === chartData.length - 1 
                      ? Colors.health.heartRate 
                      : Colors.health.heartRate + '40',
                    width: timeRange === 'day' ? 4 : (timeRange === 'week' ? 18 : 6)
                  },
                ]}
              />
            ))
          ) : (
            <Text style={styles.noDataText}>Không có dữ liệu nhịp tim</Text>
          )}
        </View>
      </View>

      {/* 2. Chỉ số Min - Avg - Max */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Thấp nhất</Text>
          <Text style={styles.statValue}>{stats.min > 0 ? stats.min : '--'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Trung bình</Text>
          <Text style={styles.statValue}>{stats.avg > 0 ? stats.avg : '--'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Cao nhất</Text>
          <Text style={styles.statValue}>{stats.max > 0 ? stats.max : '--'}</Text>
        </View>
      </View>
    </MetricCard>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 45,
    gap: 3,
  },
  miniChartBar: {
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#64748B', marginBottom: 2, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  divider: { width: 1, height: 20, backgroundColor: '#E2E8F0' },
  noDataText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }
});

export default HeartRateSection;