import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';

type WorkoutType = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  caloriesPerMin: number;
};

const WORKOUT_TYPES: WorkoutType[] = [
  { id: 'running', name: 'Chạy bộ', icon: 'walk', color: '#EF4444', caloriesPerMin: 10 },
  { id: 'cycling', name: 'Đạp xe', icon: 'bicycle', color: '#F59E0B', caloriesPerMin: 8 },
  { id: 'swimming', name: 'Bơi lội', icon: 'water', color: '#06B6D4', caloriesPerMin: 12 },
  { id: 'yoga', name: 'Yoga', icon: 'body', color: '#8B5CF6', caloriesPerMin: 4 },
  { id: 'gym', name: 'Tập gym', icon: 'barbell', color: '#22C55E', caloriesPerMin: 7 },
  { id: 'walking', name: 'Đi bộ', icon: 'footsteps', color: '#3B82F6', caloriesPerMin: 5 },
];

export default function LiveTrackingScreen() {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutType | null>(null);
  
  // 1. Kiểm tra loading từ hook
  const { data: healthData, loading } = useHealthData();

  // 2. Sử dụng useMemo để tính toán an toàn (Safe Computing)
  const stats = useMemo(() => {
    // Nếu chưa có data, trả về giá trị mặc định ngay để tránh lỗi property of null
    if (!healthData || !healthData.steps) {
      return { calories: 0, minutes: 0, sessions: 0 };
    }

    const currentSteps = healthData.steps.current || 0;
    
    return {
      calories: healthData.steps.calories || 0,
      minutes: currentSteps > 0 ? Math.round(currentSteps / 100) : 0,
      sessions: currentSteps > 0 ? 1 : 0
    };
  }, [healthData]);

  const handleStartWorkout = () => {
    if (!selectedWorkout) return;

    router.push({
      pathname: '/(exercise)/session',
      params: {
        workoutId: selectedWorkout.id,
        workoutName: selectedWorkout.name,
        workoutIcon: selectedWorkout.icon,
        workoutColor: selectedWorkout.color,
        caloriesPerMin: selectedWorkout.caloriesPerMin.toString(),
      },
    });
  };

  // 3. Hiển thị Loading khi dữ liệu đang tải
  if (loading && !healthData) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={{ marginTop: 10, color: Colors.neutral.textSecondary }}>Đang tải dữ liệu tập luyện...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <Text style={styles.headerSubtitle}>
          Chọn loại bài tập và bắt đầu theo dõi
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Stats Summary - Dùng dữ liệu từ biến stats an toàn */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color={Colors.health.calories} />
            <Text style={styles.statValue}>{stats.calories}</Text>
            <Text style={styles.statLabel}>kcal hôm nay</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={Colors.primary.main} />
            <Text style={styles.statValue}>{stats.minutes}</Text>
            <Text style={styles.statLabel}>phút tập</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={Colors.secondary.orange} />
            <Text style={styles.statValue}>{stats.sessions}</Text>
            <Text style={styles.statLabel}>buổi tập</Text>
          </View>
        </View>

        {/* Workout Type Selection */}
        <Text style={styles.sectionTitle}>Chọn loại bài tập</Text>
        <View style={styles.workoutGrid}>
          {WORKOUT_TYPES.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={[
                styles.workoutCard,
                selectedWorkout?.id === workout.id && styles.workoutCardSelected,
                selectedWorkout?.id === workout.id && { borderColor: workout.color },
              ]}
              onPress={() => setSelectedWorkout(workout)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.workoutIconContainer,
                  { backgroundColor: workout.color + '20' },
                  selectedWorkout?.id === workout.id && { backgroundColor: workout.color + '30' },
                ]}
              >
                <Ionicons
                  name={workout.icon}
                  size={28}
                  color={workout.color}
                />
              </View>
              <Text
                style={[
                  styles.workoutName,
                  selectedWorkout?.id === workout.id && { color: workout.color },
                ]}
              >
                {workout.name}
              </Text>
              {selectedWorkout?.id === workout.id && (
                <View style={[styles.selectedBadge, { backgroundColor: workout.color }]}>
                  <Ionicons name="checkmark" size={12} color={Colors.neutral.white} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={Colors.secondary.orange} />
            <Text style={styles.tipsTitle}>Mẹo tập luyện</Text>
          </View>
          <Text style={styles.tipsText}>
            • Khởi động 5-10 phút trước khi tập{'\n'}
            • Uống đủ nước trong suốt buổi tập{'\n'}
            • Nghỉ ngơi khi cảm thấy quá sức
          </Text>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.bottomContainer}>
        <Button
          title={selectedWorkout ? `Bắt đầu ${selectedWorkout.name}` : 'Chọn bài tập để bắt đầu'}
          onPress={handleStartWorkout}
          disabled={!selectedWorkout}
          size="lg"
          leftIcon={
            <Ionicons
              name="play"
              size={20}
              color={selectedWorkout ? Colors.neutral.white : Colors.neutral.placeholder}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.textPrimary,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.neutral.textSecondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral.border,
    marginVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  workoutCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  workoutCardSelected: {
    ...Shadows.md,
  },
  workoutIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  workoutName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.neutral.textPrimary,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsCard: {
    backgroundColor: Colors.status.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.secondary.orange,
  },
  tipsText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
});