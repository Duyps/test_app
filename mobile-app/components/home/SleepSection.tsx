import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import MetricCard from './MetricCard';

interface SleepStage {
  label: string;
  minutes: number;
  percent: number;
  color: string;
}

interface SleepSectionProps {
  duration: string;
  stages: SleepStage[];
  timeRange: 'day' | 'week' | 'month';
  dailySummary: any[]; // Truyền dữ liệu hàng ngày từ backend vào đây
}

const SleepSection: React.FC<SleepSectionProps> = ({ duration, stages, timeRange, dailySummary }) => {
  
  // Tính toán trung bình giấc ngủ cho tab Tuần/Tháng thay vì tổng cộng dồn
  const avgDuration = useMemo(() => {
    if (timeRange === 'day') return duration;
    const validDays = dailySummary.filter(d => d.sleep_hours > 0);
    if (validDays.length === 0) return '0.0';
    const sum = validDays.reduce((acc, curr) => acc + curr.sleep_hours, 0);
    return (sum / validDays.length).toFixed(1);
  }, [dailySummary, duration, timeRange]);

  const renderChart = useMemo(() => {
    if (timeRange === 'day') {
      // BIỂU ĐỒ THANH NGANG CHO TAB NGÀY (Giữ nguyên logic Duy thích)
      return (
        <View style={styles.chartContainerDay}>
          {stages.map((stage, index) => (
            stage.percent > 0 && (
              <View 
                key={index} 
                style={{ 
                  flex: stage.percent, 
                  backgroundColor: stage.color,
                  height: '100%' 
                }} 
              />
            )
          ))}
        </View>
      );
    } else {
      // BIỂU ĐỒ CỘT CHỒNG (STACKED BAR) CHO TAB TUẦN/THÁNG
      // Mỗi cột là 1 ngày, trong cột chia tỉ lệ Sâu/REM/Nhẹ
      const displaySummary = dailySummary.slice(timeRange === 'week' ? -7 : -30);
      
      return (
        <View style={styles.chartContainerWeek}>
          {displaySummary.map((day, index) => {
            const hasSleep = day.sleep_hours > 0;
            return (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  {hasSleep ? (
                    <>
                      <View style={{ flex: day.deep_sleep_hours, backgroundColor: '#5B21B6' }} />
                      <View style={{ flex: day.rem_sleep_hours, backgroundColor: '#A78BFA' }} />
                      <View style={{ flex: (day.sleep_hours - day.deep_sleep_hours - day.rem_sleep_hours), backgroundColor: '#8B5CF6' }} />
                    </>
                  ) : (
                    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }} />
                  )}
                </View>
                <Text style={styles.miniLabel}>{timeRange === 'week' ? `T${index + 2}` : ''}</Text>
              </View>
            );
          })}
        </View>
      );
    }
  }, [stages, timeRange, dailySummary]);

  return (
    <MetricCard
      title="Cấu trúc giấc ngủ"
      subtitle={timeRange === 'day' ? `Tổng: ${duration} giờ` : `Trung bình: ${avgDuration} giờ/đêm`}
      value={`${timeRange === 'day' ? duration : avgDuration}h`}
      icon="moon"
      iconColor={Colors.health.sleep}
      onPress={() => router.push('/(health)/sleep-detail')}
      footer={
        <View style={styles.footerContainer}>
          {stages.map((stage, index) => (
            <View key={index} style={styles.statItem}>
              <View style={[styles.dot, { backgroundColor: stage.color }]} />
              <Text style={styles.statLabel}>{stage.label}: </Text>
              <Text style={styles.statValue}>
                {timeRange === 'day' 
                  ? `${(stage.minutes / 60).toFixed(1)}h` 
                  : `${Math.round(stage.percent)}%`}
              </Text>
            </View>
          ))}
        </View>
      }
    >
      <View style={styles.chartWrapper}>
        {renderChart}
      </View>
    </MetricCard>
  );
};

export default SleepSection;

const styles = StyleSheet.create({
  chartWrapper: {
    marginVertical: 12,
    height: 50,
    justifyContent: 'center',
  },
  chartContainerDay: {
    flexDirection: 'row',
    height: 16,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  chartContainerWeek: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 50,
    width: '100%',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barTrack: {
    width: 8,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'column-reverse', // Để ngủ sâu nằm dưới cùng
    backgroundColor: '#F1F5F9',
  },
  miniLabel: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 4,
  },
  footerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statLabel: { fontSize: 10, color: '#64748B' },
  statValue: { fontSize: 10, fontWeight: '700', color: '#1E293B' },
});