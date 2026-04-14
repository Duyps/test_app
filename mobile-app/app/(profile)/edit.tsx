import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { api } from '../../services/api';

type Gender = 'male' | 'female' | 'other';
type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+' , 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditProfileScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // ==========================================
  // LOAD DATA (Đã sửa để khớp Backend mới)
  // ==========================================
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.getProfile();
        if (profile) {
          // Backend trả về full_name (từ bảng User) và phone_number, blood_type (từ Profile)
          setFullName(profile.full_name || '');
          setPhone(profile.phone_number || '');
          
          // Sử dụng field 'birth' thay vì 'date_of_birth'
          if (profile.birth) {
            const date = new Date(profile.birth);
            setBirthDate(
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, '0')}/${date.getFullYear()}`
            );
          }
          
          setGender((profile.gender as Gender) || 'male');
          setHeight(profile.height?.toString() || '');
          setWeight(profile.weight?.toString() || '');
          setBloodType((profile.blood_type as BloodType) || 'O+');
        }
      } catch (err) {
        console.warn('Could not load profile:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<any>>) => {
    return (value: any) => {
      setter(value);
      setHasChanges(true);
    };
  };

  // ==========================================
  // SAVE DATA (Đã sửa để khớp Prisma/Backend)
  // ==========================================
  const handleSave = async () => {
    setLoading(true);
    try {
      // Chuyển định dạng ngày DD/MM/YYYY sang YYYY-MM-DD cho Backend
      let formattedBirth = null;
      if (birthDate) {
        const parts = birthDate.split('/');
        if (parts.length === 3) {
          formattedBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      await api.updateProfile({
        full_name: fullName,       // Gửi để cập nhật bảng User
        phone_number: phone,       // Cột mới trong HealthProfile
        birth: formattedBirth,     // Key 'birth' khớp Prisma
        gender: gender,            // String 'male'/'female'
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        blood_type: bloodType,     // Cột mới trong HealthProfile
      });
      
      Alert.alert('Thành công', 'Thông tin sức khỏe đã được cập nhật', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Hủy thay đổi?', 'Các thay đổi chưa được lưu sẽ bị mất.', [
        { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
        { text: 'Hủy', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const formatBirthDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    } else {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }
    handleChange(setBirthDate)(formatted);
  };

  // BMI Logic
  const bmi = height && weight
    ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
    : '0';

  const getBmiStatus = () => {
    const bmiNum = parseFloat(bmi);
    if (bmiNum < 18.5) return { text: 'Thiếu cân', color: Colors.status.warning };
    if (bmiNum < 25) return { text: 'Bình thường', color: Colors.status.success };
    if (bmiNum < 30) return { text: 'Thừa cân', color: Colors.status.warning };
    return { text: 'Béo phì', color: Colors.status.error };
  };
  const bmiStatus = getBmiStatus();

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin sức khỏe</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.section}>
            <Input
              label="Họ và tên"
              value={fullName}
              onChangeText={handleChange(setFullName)}
              leftIcon="person-outline"
            />

            <Input
              label="Số điện thoại"
              value={phone}
              onChangeText={handleChange(setPhone)}
              leftIcon="call-outline"
              keyboardType="phone-pad"
            />

            <Input
              label="Ngày sinh"
              value={birthDate}
              onChangeText={formatBirthDate}
              leftIcon="calendar-outline"
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderContainer}>
                {[
                  { value: 'male' as Gender, label: 'Nam', icon: 'male' },
                  { value: 'female' as Gender, label: 'Nữ', icon: 'female' },
                  { value: 'other' as Gender, label: 'Khác', icon: 'person' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      gender === option.value && styles.genderOptionSelected,
                    ]}
                    onPress={() => handleChange(setGender)(option.value)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={gender === option.value ? Colors.primary.main : Colors.neutral.placeholder}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        gender === option.value && styles.genderTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Chỉ số cơ thể</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Chiều cao (cm)"
                  value={height}
                  onChangeText={handleChange(setHeight)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Cân nặng (kg)"
                  value={weight}
                  onChangeText={handleChange(setWeight)}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.bmiCard}>
              <View style={styles.bmiHeader}>
                <Text style={styles.bmiLabel}>Chỉ số BMI</Text>
                <View style={[styles.bmiStatusBadge, { backgroundColor: bmiStatus.color + '20' }]}>
                  <Text style={[styles.bmiStatusText, { color: bmiStatus.color }]}>
                    {bmiStatus.text}
                  </Text>
                </View>
              </View>
              <Text style={[styles.bmiValue, { color: bmiStatus.color }]}>{bmi}</Text>
              <View style={styles.bmiScale}>
                <View style={[styles.bmiScaleSegment, { backgroundColor: Colors.status.warning, flex: 1 }]} />
                <View style={[styles.bmiScaleSegment, { backgroundColor: Colors.status.success, flex: 2 }]} />
                <View style={[styles.bmiScaleSegment, { backgroundColor: Colors.status.warning, flex: 1.5 }]} />
                <View style={[styles.bmiScaleSegment, { backgroundColor: Colors.status.error, flex: 1 }]} />
              </View>
              <View style={styles.bmiLabels}>
                <Text style={styles.bmiScaleLabel}>{'<18.5'}</Text>
                <Text style={styles.bmiScaleLabel}>18.5-25</Text>
                <Text style={styles.bmiScaleLabel}>25-30</Text>
                <Text style={styles.bmiScaleLabel}>{'>30'}</Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Nhóm máu</Text>
              <View style={styles.bloodTypeContainer}>
                {BLOOD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodTypeOption,
                      bloodType === type && styles.bloodTypeOptionSelected,
                    ]}
                    onPress={() => handleChange(setBloodType)(type)}
                  >
                    <Text
                      style={[
                        styles.bloodTypeText,
                        bloodType === type && styles.bloodTypeTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <Button
            title="Lưu thay đổi"
            onPress={handleSave}
            loading={loading}
            disabled={!hasChanges}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.neutral.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  section: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.neutral.textPrimary,
    marginBottom: Spacing.sm,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  genderOptionSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.status.infoLight,
  },
  genderText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  genderTextSelected: {
    color: Colors.primary.main,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  bmiCard: {
    backgroundColor: Colors.neutral.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bmiLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
  },
  bmiStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  bmiStatusText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  bmiValue: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  bmiScale: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  bmiScaleSegment: {
    borderRadius: 4,
  },
  bmiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  bmiScaleLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.neutral.textSecondary,
  },
  bloodTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bloodTypeOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  bloodTypeOptionSelected: {
    borderColor: Colors.status.error,
    backgroundColor: Colors.status.errorLight,
  },
  bloodTypeText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.neutral.textSecondary,
  },
  bloodTypeTextSelected: {
    color: Colors.status.error,
  },
  addConditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary.main,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
  },
  addConditionText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeights.medium,
  },
  conditionHint: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.neutral.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
  },
});
