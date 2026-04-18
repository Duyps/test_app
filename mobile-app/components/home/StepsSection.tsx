import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Sử dụng icon có sẵn của Expo
import { Shadows } from '../../constants/Colors';

interface StepsSectionProps {
  steps?: number;
  goal?: number; // Thêm mục tiêu bước chân (mặc định 10,000)
}

export default function StepsSection({ steps = 0, goal = 10000 }: StepsSectionProps) {
  // Tính toán phần trăm hoàn thành mục tiêu
  const progress = Math.min((steps / goal) * 100, 100);

  return (
    <View style={styles.smallCard}>
      {/* Icon và Badge */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="footsteps" size={18} color="#10B981" />
        </View>
        <Text style={styles.smallCardLabel}>Bước chân</Text>
      </View>

      {/* Giá trị chính */}
      <View style={styles.content}>
        <Text style={styles.smallCardValue}>{(steps ?? 0).toLocaleString()}</Text>
        <Text style={styles.goalText}>/ {goal.toLocaleString()}</Text>
      </View>

      {/* Thanh tiến trình mini phía dưới */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.percentText}>{Math.round(progress)}%</Text>
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
    minHeight: 120, // Đảm bảo card có độ cao đồng nhất
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
    backgroundColor: '#10B98115', // Màu nền nhạt cho icon
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
    marginBottom: 10,
  },
  smallCardValue: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1E293B' 
  },
  goalText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: -2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  percentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    width: 25,
  },
});