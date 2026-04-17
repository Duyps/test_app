import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';

interface HealthScoreCardProps {
  score: number;
}

const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ score }) => {
  // Logic xác định trạng thái dựa trên score
  const getStatus = (val: number) => {
    if (val >= 75) return { text: 'Tuyệt vời', color: Colors.status.success }; // Hạ từ 80 xuống 75
    if (val >= 60) return { text: 'Ổn định', color: '#0EA5E9' }; // Màu xanh dương cho mức khá
    if (val >= 40) return { text: 'Trung bình', color: Colors.secondary.orange };
    return { text: 'Cần chú ý', color: Colors.status.error };
  };

  const status = getStatus(score);

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <Text style={styles.label}>Chỉ số sức khỏe</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.value}>{score}</Text>
          <Text style={styles.unit}>/100</Text>
        </View>
        <Text style={[styles.status, { color: status.color }]}>
          Tình trạng: {status.text}
        </Text>
      </View>
      <View style={styles.rightContent}>
        <Ionicons name="shield-checkmark" size={60} color={Colors.primary.main} />
      </View>
    </View>
  );
};

export default HealthScoreCard;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  leftContent: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.xs,
  },
  value: {
    fontSize: 48,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.main,
  },
  unit: {
    fontSize: Typography.fontSizes.lg,
    color: Colors.neutral.textSecondary,
    marginLeft: 4,
  },
  status: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginTop: Spacing.xs,
  },
  rightContent: {
    justifyContent: 'center',
  },
});