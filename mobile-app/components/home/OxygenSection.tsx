import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography } from '../../constants/Colors';
import MetricCard from './MetricCard'; // Tận dụng lại card chung của Duy

interface OxygenSectionProps {
  percent: number;
}

const OxygenSection: React.FC<OxygenSectionProps> = ({ percent }) => {
  // Logic đánh giá trạng thái SpO2
  const getStatus = (val: number) => {
    if (val === 0) return { label: 'N/A', color: '#94A3B8' };
    if (val >= 95) return { label: 'Bình thường', color: '#10B981' };
    if (val >= 90) return { label: 'Thấp', color: '#F59E0B' };
    return { label: 'Cảnh báo', color: '#EF4444' };
  };

  const status = getStatus(percent);

  return (
    <MetricCard
      title="Nồng độ Oxy máu"
      subtitle="Chỉ số SpO2"
      value={percent || '--'}
      unit="%"
      icon="water"
      iconColor="#0EA5E9"
      onPress={() => {}} // Duy có thể điều hướng đến trang chi tiết sau
    >
      <View style={styles.container}>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={styles.desc}>
          {percent >= 95 
            ? 'Chỉ số nồng độ oxy của bạn đang ở mức tuyệt vời.' 
            : percent > 0 
            ? 'Hãy chú ý nghỉ ngơi và theo dõi thêm.' 
            : 'Chưa nhận được dữ liệu đo.'}
        </Text>
      </View>
    </MetricCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  desc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});

export default OxygenSection;