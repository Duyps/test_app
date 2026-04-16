import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import Constants & Services
import { Colors } from '../../constants/Colors';
import { useHealthData } from '../../hooks/useHealthData';
import { getUserData } from '../../services/auth';
import { useHealthTips } from '../../hooks/useHealthTips';
import { useHealthConnect } from '../../hooks/useHealthConnect';

// Import styles
import { styles } from './index.styles';

interface HealthRecord {
  record_time: string;
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
  
  const { syncHealthData, loading: isSyncing } = useHealthConnect();
  const { data: serverDataRaw, loading: isTableLoading, refresh: refreshFromServer } = useHealthData();
  const { randomTip } = useHealthTips();

  // 1. DATA PICKER
  const serverData = useMemo(() => {
    const raw = (serverDataRaw as any)?.data?.raw_data || 
                (serverDataRaw as any)?.raw_data || 
                (serverDataRaw as any)?.data ||
                serverDataRaw;
    
    return Array.isArray(raw) ? (raw as HealthRecord[]) : [];
  }, [serverDataRaw]);

  // 2. HÀM REFRESH
  const onRefresh = useCallback(async () => {
    const success = await syncHealthData();
    if (success && refreshFromServer) {
      await refreshFromServer();
    }
  }, [syncHealthData, refreshFromServer]);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await getUserData();
      const nameToShow = (userData as any)?.full_name || (userData as any)?.name || 'Duy';
      setUserName(nameToShow);
    };
    loadUser();
    onRefresh();
  }, []);

  // 3. LOGIC TÍNH TOÁN (Đã thêm Calories và Distance)
  const processedData = useMemo(() => {
    const defaultStats = {
      heartRate: { current: 0, min: 0, max: 0, avg: 0, history: [] as number[] },
      oxygen: { current: 0, avg: 0, history: [] as number[] },
      steps: { current: 0, goal: 10000 },
      sleep: { duration: '0.0', quality: 85 },
      calories: 0,
      distance: '0.00'
    };

    if (serverData.length === 0) return defaultStats;

    const now = new Date();
    const filteredRecords = serverData.filter(r => {
      const rDate = new Date(r.record_time);
      if (timeRange === 'day') return rDate.toDateString() === now.toDateString();
      if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return rDate >= weekAgo;
      }
      return true;
    });

    const hrValues = filteredRecords.map(r => r.heart_rate).filter((v): v is number => v !== null);
    const oxValues = filteredRecords.map(r => r.blood_oxygen).filter((v): v is number => v !== null);
    
    // Cộng dồn các chỉ số tích lũy
    const totalSteps = filteredRecords.reduce((sum, r) => sum + (r.steps || 0), 0);
    const totalCalories = filteredRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
    const totalDistance = filteredRecords.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalSleepMin = filteredRecords.reduce((sum, r) => sum + (r.sleep_duration || 0), 0);

    return {
      heartRate: {
        current: hrValues.length ? hrValues[hrValues.length - 1] : 0,
        min: hrValues.length ? Math.min(...hrValues) : 0,
        max: hrValues.length ? Math.max(...hrValues) : 0,
        avg: hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0,
        history: hrValues.slice(-8),
      },
      oxygen: {
        current: oxValues.length ? oxValues[oxValues.length - 1] : 0,
        avg: oxValues.length ? Math.round(oxValues.reduce((a, b) => a + b, 0) / oxValues.length) : 0,
        history: oxValues.slice(-8)
      },
      steps: { current: Math.round(totalSteps), goal: 10000 },
      calories: Math.round(totalCalories),
      distance: (totalDistance / 1000).toFixed(2), // Đổi sang km
      sleep: { duration: totalSleepMin > 0 ? (totalSleepMin / 60).toFixed(1) : '0.0', quality: 85 }
    };
  }, [serverData, timeRange]);

  const healthScore = useMemo(() => {
    let score = 65;
    const checkVal = processedData.oxygen.avg || (processedData.oxygen.current as any);
    if (checkVal >= 95) score += 20;
    if (processedData.heartRate.avg >= 60 && processedData.heartRate.avg <= 100) score += 15;
    return Math.min(100, score);
  }, [processedData]);

  const renderMiniChart = (chartData: number[], color: string) => {
    if (!chartData.length) return <View style={styles.miniChart} />;
    const max = Math.max(...chartData, 1);
    const min = Math.min(...chartData, 0);
    const range = max - min || 1;
    return (
      <View style={styles.miniChart}>
        {chartData.map((value, index) => (
          <View key={index} style={[styles.miniChartBar, { 
            height: ((value - min) / range) * 35 + 8, 
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
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={onRefresh}>
            {isSyncing ? <ActivityIndicator color="#FFF" /> : <Ionicons name="notifications-outline" size={24} color="#FFF" />}
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
        refreshControl={<RefreshControl refreshing={isSyncing || isTableLoading} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
      >
        <View style={styles.healthScoreCard}>
          <View>
            <Text style={styles.healthScoreLabel}>Chỉ số sức khỏe ({timeRange === 'day' ? 'nay' : 'giai đoạn'})</Text>
            <View style={styles.healthScoreRow}>
              <Text style={styles.healthScoreValue}>{healthScore}</Text>
              <Text style={styles.healthScoreUnit}>/100</Text>
            </View>
            <Text style={styles.healthScoreStatus}>{healthScore >= 80 ? 'Rất Tốt' : 'Bình thường'}</Text>
          </View>
          <View style={styles.scoreIconBox}>
             <Ionicons name="shield-checkmark" size={50} color={Colors.primary.main} />
          </View>
        </View>

        <TouchableOpacity style={styles.metricCard} onPress={() => router.push('/(health)/heart-rate-detail')}>
          <View style={styles.metricHeader}>
            <View style={[styles.iconContainer, {backgroundColor: '#FFE4E6'}]}>
              <Ionicons name="heart" size={20} color="#E11D48" />
            </View>
            <View style={styles.metricTitleContainer}>
              <Text style={styles.metricTitle}>Nhịp tim (BPM)</Text>
              <Text style={styles.deviceText}>T.bình: {processedData.heartRate.avg}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </View>
          <View style={styles.metricBody}>
            <Text style={styles.mainValueText}>{processedData.heartRate.avg || '--'}</Text>
            <View style={styles.chartArea}>
              {renderMiniChart(processedData.heartRate.history, "#E11D48")}
            </View>
          </View>
          <View style={styles.metricFooter}>
            <View style={styles.statBox}>
               <Text style={styles.statLabel}>Thấp nhất</Text>
               <Text style={styles.statValue}>{processedData.heartRate.min}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
               <Text style={styles.statLabel}>Cao nhất</Text>
               <Text style={styles.statValue}>{processedData.heartRate.max}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.smallCardsRow}>
           <View style={styles.smallCard}>
              <View style={[styles.iconCircle, {backgroundColor: '#E0F2FE'}]}>
                 <Ionicons name="water" size={20} color="#0284C7" />
              </View>
              <Text style={styles.smallCardValue}>{processedData.oxygen.current}%</Text>
              <Text style={styles.smallCardLabel}>Oxy máu</Text>
           </View>
           <View style={styles.smallCard}>
              <View style={[styles.iconCircle, {backgroundColor: '#F3E8FF'}]}>
                 <Ionicons name="moon" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.smallCardValue}>{processedData.sleep.duration}h</Text>
              <Text style={styles.smallCardLabel}>Giờ ngủ</Text>
           </View>
        </View>

        <View style={styles.activityCard}>
           <View style={styles.metricHeader}>
              <View style={[styles.iconContainer, {backgroundColor: '#DCFCE7'}]}>
                 <Ionicons name="walk" size={20} color="#16A34A" />
              </View>
              <Text style={styles.metricTitle}>Hoạt động</Text>
           </View>
           <View style={styles.activityGrid}>
              <View style={styles.activityItem}>
                 <Text style={styles.activityVal}>{processedData.steps.current.toLocaleString()}</Text>
                 <Text style={styles.activityLab}>Bước chân</Text>
              </View>
              <View style={styles.activityItem}>
                 <Text style={styles.activityVal}>{processedData.calories}</Text>
                 <Text style={styles.activityLab}>Kcal</Text>
              </View>
              <View style={styles.activityItem}>
                 <Text style={styles.activityVal}>{processedData.distance}</Text>
                 <Text style={styles.activityLab}>Km</Text>
              </View>
           </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Gợi ý sức khỏe</Text>
          <Text style={styles.tipsText}>{randomTip?.content || 'Đang cập nhật lời khuyên cho bạn...'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}