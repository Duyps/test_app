import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '../../constants/Colors';

interface CaloriesSectionProps {
  calories?: number;
  timeRange: string;
  goal?: number; // Thêm mục tiêu kcal (mặc định 2000 kcal)
}

export default function CaloriesSection({ calories = 0, timeRange, goal = 2000 }: CaloriesSectionProps) {
  const displayCalories = useMemo(() => {
    const baseCalories = calories ?? 0;
    if (timeRange === 'day' && baseCalories > 0) {
      const now = new Date();
      const minutesPassed = now.getHours() * 60 + now.getMinutes();
      const bmrCompensation = Math.round(minutesPassed * 0.08); 
      return baseCalories + bmrCompensation;
    }
    return baseCalories;
  }, [calories, timeRange]);

  // Tính % hoàn thành
  const progress = Math.min((displayCalories / goal) * 100, 100);

  return (
    <View style={styles.smallCard}>
      {/* Header với Icon Ngọn lửa */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="flame" size={18} color="#F97316" />
        </View>
        <Text style={styles.smallCardLabel}>Kcal</Text>
      </View>

      {/* Giá trị chính */}
      <View style={styles.content}>
        <Text style={styles.smallCardValue}>{displayCalories.toLocaleString()}</Text>
        <Text style={styles.unitText}>kcal tiêu thụ</Text>
      </View>

      {/* Progress Bar màu Cam */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Ionicons name="trending-up" size={12} color="#F97316" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  smallCard: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 24, 
    justifyContent: 'space-between',
    minHeight: 120,
    ...Shadows.sm 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F9731615',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  smallCardLabel: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#64748B' 
  },
  content: {
    marginBottom: 8,
  },
  smallCardValue: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1E293B' 
  },
  unitText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: -2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 3,
  },
});