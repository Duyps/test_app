import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';
import { getUserData } from '../../services/auth';
import { useHealthTips } from '../../hooks/useHealthTips';

// Import styles từ file riêng cùng thư mục
import { styles } from './index.styles';

// 1. Interface định nghĩa cấu trúc dữ liệu bản ghi từ cảm biến
interface HealthRecord {
  user_id: string;
  record_time: string | Date;
  heart_rate: number | null;
  steps: number | null;
  blood_oxygen: number | null;
  calories: number | null;
  distance: number | null;
  sleep_duration: number | null;
}

type TimeRange = 'day' | 'week' | 'month';

export default function HomeScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [userName, setUserName] = useState<string>('');
  
  // Gọi hook dữ liệu sức khỏe
  const healthDataHook = useHealthData();
  
  // Ép kiểu an toàn: Chuyển đổi dữ liệu trả về thành mảng HealthRecord
  const data = useMemo(() => {
    const raw = healthDataHook?.data;
    return Array.isArray(raw) ? (raw as unknown as HealthRecord[]) : [];
  }, [healthDataHook?.data]);
  
  const loading = healthDataHook?.loading || false;
  const refresh = healthDataHook?.refresh;

  const { randomTip } = useHealthTips();

  // 2. Xử lý logic tính toán từ mảng dữ liệu
  const processedData = useMemo(() => {
    // Giá trị mặc định nếu mảng rỗng
    const defaultData = {
      heartRate: { current: 0, min: 0, max: 0, avg: 0, history: [] as number[] },
      oxygen: { current: 0, history: [] as number[] },
      steps: { current: 0, goal: 10000 },
      sleep: { duration: 0, quality: 85 }
    };

    if (!data || data.length === 0) return defaultData;

    // Lọc mảng cho từng loại chỉ số (loại bỏ null)
    const hrList = data.filter(r => r.heart_rate !== null).map(r => r.heart_rate as number);
    const stepsList = data.filter(r => r.steps !== null).map(r => r.steps as number);
    const oxList = data.filter(r => r.blood_oxygen !== null).map(r => r.blood_oxygen as number);
    const sleepList = data.filter(r => r.sleep_duration !== null).map(r => r.sleep_duration as number);

    return {
      heartRate: {
        // Giá trị cuối cùng là giá trị mới nhất
        current: hrList.length ? hrList[hrList.length - 1] : 0,
        min: hrList.length ? Math.min(...hrList) : 0,
        max: hrList.length ? Math.max(...hrList) : 0,
        // Tính trung bình cộng
        avg: hrList.length ? Math.round(hrList.reduce((a, b) => a + b, 0) / hrList.length) : 0,
        // Lấy 7 điểm gần nhất để vẽ biểu đồ mini
        history: hrList.slice(-7),
      },
      oxygen: {
        current: oxList.length ? oxList[oxList.length - 1] : 0,
        history: oxList.slice(-7)
      },
      steps: {
        // Cộng dồn tổng số bước chân trong mảng
        current: stepsList.reduce((a, b) => a + b, 0),
        goal: 10000,
      },
      sleep: {
        // Cộng dồn tổng thời gian ngủ (giờ)
        duration: sleepList.reduce((a, b) => a + b, 0),
        quality: 85,
      }
    };
  }, [data]);

  // 3. Tính điểm sức khỏe dựa trên công thức SpO2 + Nhịp tim
  const healthScore = useMemo(() => {
    let score = 60; // Điểm sàn
    if (processedData.oxygen.current >= 95) score += 20;
    if (processedData.heartRate.avg >= 60 && processedData.heartRate.avg <= 100) score += 20;
    return Math.min(100, score);
  }, [processedData]);

  // Hành động vuốt để đồng bộ/làm mới
  const onRefresh = useCallback(() => {
    if (refresh) refresh();
  }, [refresh]);

  useEffect(() => {
    const loadUserName = async () => {
      const userData = await getUserData();
      if (userData?.name) setUserName(userData.name);
      else if (userData?.email) setUserName(userData.email.split('@')[0]);
    };
    loadUserName();
  }, []);

  const renderMiniChart = (chartData: number[], color: string) => {
    if (!chartData || chartData.length === 0) return <View style={styles.miniChart} />;
    const max = Math.max(...chartData, 1);
    const min = Math.min(...chartData, 0);
    const range = max - min || 1;

    return (
      <View style={styles.miniChart}>
        {chartData.map((value, index) => (
          <View key={index} style={[styles.miniChartBar, { 
            height: ((value - min) / range) * 40 + 8, 
            backgroundColor: index === chartData.length - 1 ? color : color + '40' 
          }]} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{userName || 'Người dùng'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.timeRangeContainer}>
          {(['day', 'week', 'month'] as TimeRange[]).map((r) => (
            <TouchableOpacity 
              key={r} 
              style={[styles.timeRangeButton, timeRange === r && styles.timeRangeButtonActive]} 
              onPress={() => setTimeRange(r)}
            >
              <Text style={[styles.timeRangeText, timeRange === r && styles.timeRangeTextActive]}>
                {r === 'day' ? 'Hôm nay' : r === 'week' ? 'Tuần' : 'Tháng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[Colors.primary.main]} />
        }
      >
        {/* Card Điểm sức khỏe */}
        <View style={styles.healthScoreCard}>
          <View style={styles.healthScoreLeft}>
            <Text style={styles.healthScoreLabel}>Điểm sức khỏe</Text>
            <View style={styles.healthScoreRow}>
              <Text style={styles.healthScoreValue}>{healthScore}</Text>
              <Text style={styles.healthScoreUnit}>/100</Text>
            </View>
            <Text style={styles.healthScoreStatus}>{healthScore >= 80 ? 'Rất Tốt' : 'Ổn định'}</Text>
          </View>
          <Ionicons name="heart-circle" size={80} color={Colors.primary.main} />
        </View>

        {/* Card Nhịp tim */}
        <TouchableOpacity style={styles.metricCard} onPress={() => router.push('/(health)/heart-rate-detail')}>
          <View style={styles.metricHeader}>
            <View style={styles.metricIconContainer}><Ionicons name="heart" size={20} color="#FF4B4B" /></View>
            <View style={styles.metricTitleContainer}>
              <Text style={styles.metricTitle}>Nhịp tim</Text>
              <Text style={styles.deviceText}>Dữ liệu từ cảm biến</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </View>
          <View style={styles.metricBody}>
            <View style={styles.metricMainValue}>
              <Text style={styles.mainValueText}>{processedData.heartRate.current}</Text>
              <Text style={styles.mainValueUnit}> BPM</Text>
            </View>
            <View style={styles.metricChart}>{renderMiniChart(processedData.heartRate.history, "#FF4B4B")}</View>
          </View>
          <View style={styles.metricFooter}>
            <Text style={styles.statLabel}>Min: <Text style={styles.statValue}>{processedData.heartRate.min}</Text></Text>
            <View style={styles.metricStatDivider} />
            <Text style={styles.statLabel}>Avg: <Text style={styles.statValue}>{processedData.heartRate.avg}</Text></Text>
            <View style={styles.metricStatDivider} />
            <Text style={styles.statLabel}>Max: <Text style={styles.statValue}>{processedData.heartRate.max}</Text></Text>
          </View>
        </TouchableOpacity>

        {/* Card Nồng độ Oxy (SpO2) */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#E0F2FE' }]}><Ionicons name="water" size={20} color="#0EA5E9" /></View>
            <View style={styles.metricTitleContainer}>
              <Text style={styles.metricTitle}>Nồng độ Oxy (SpO2)</Text>
              <Text style={styles.deviceText}>Cập nhật thời gian thực</Text>
            </View>
          </View>
          <View style={styles.metricBody}>
            <View style={styles.metricMainValue}>
              <Text style={styles.mainValueText}>{processedData.oxygen.current}</Text>
              <Text style={styles.mainValueUnit}> %</Text>
            </View>
            <View style={styles.metricChart}>{renderMiniChart(processedData.oxygen.history, "#0EA5E9")}</View>
          </View>
        </View>

        {/* Hàng ngang: Bước chân & Giấc ngủ */}
        <View style={styles.smallCardsRow}>
          <View style={styles.smallCard}>
            <Ionicons name="footsteps" size={24} color="#10B981" />
            <Text style={styles.smallCardValue}>{processedData.steps.current.toLocaleString()}</Text>
            <Text style={styles.smallCardLabel}>bước chân</Text>
          </View>
          <View style={styles.smallCard}>
            <Ionicons name="moon" size={24} color="#8B5CF6" />
            <Text style={styles.smallCardValue}>{processedData.sleep.duration}</Text>
            <Text style={styles.smallCardLabel}>giờ ngủ</Text>
          </View>
        </View>

        {/* Lời khuyên sức khỏe */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 {randomTip?.title || 'Gợi ý hôm nay'}</Text>
          <Text style={styles.tipsText}>{randomTip?.content || 'Uống đủ nước để duy trì năng lượng cho ngày mới.'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}