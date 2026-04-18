import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Input, Logo } from '../../components';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import { loginSuccess } from '../../services/auth';
import { setAuthToken } from '../../services/api';
import { API_CONFIG, ENDPOINTS } from '../../config/api';
import { setIsAuthenticated } from '../_layout';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const extractLoginPayload = (payload: any) => {
    const token =
      (typeof payload?.token === 'string' && payload.token) ||
      (typeof payload?.access_token === 'string' && payload.access_token) ||
      (typeof payload?.accessToken === 'string' && payload.accessToken) ||
      (typeof payload?.data?.token === 'string' && payload.data.token) ||
      (typeof payload?.data?.access_token === 'string' && payload.data.access_token) ||
      (typeof payload?.data?.accessToken === 'string' && payload.data.accessToken) ||
      null;

    const user = payload?.user || payload?.data?.user || null;

    return { token, user };
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email hoặc số điện thoại';
    } else if (!email.includes('@') && !/^\d{10,11}$/.test(email)) {
      newErrors.email = 'Email hoặc số điện thoại không hợp lệ';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Gọi API login thật
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.AUTH_LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Hiển thị lỗi từ server
        setErrors({ email: data.message || 'Đăng nhập thất bại' });
        return;
      }

      const { token, user } = extractLoginPayload(data);

      if (!token) {
        console.error('❌ Login response thiếu token hợp lệ:', data);
        setErrors({ email: data?.message || 'Phản hồi đăng nhập không hợp lệ từ server' });
        return;
      }

      // Lưu token vào secure storage
      await loginSuccess(token, {
        user_id: String(user?.user_id || data?.user_id || ''),
        email: String(user?.email || email),
      });
      
      // Set token vào cache để dùng cho API calls
      setAuthToken(token);
      
      // Cập nhật global auth state
      setIsAuthenticated(true);
      
      console.log('✅ Đăng nhập thành công, token đã lưu');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      setErrors({ email: 'Không thể kết nối server. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo size="lg" />
            <Text style={styles.welcomeText}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitleText}>
              Đăng nhập để theo dõi sức khỏe của bạn
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email hoặc Số điện thoại"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              leftIcon="lock-closed-outline"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <Button
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              size="lg"
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <Button
              title="Tiếp tục với Google"
              variant="outline"
              onPress={() => {}}
              size="lg"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Chưa có tài khoản?{' '}
              <Link href="/(auth)/register" asChild>
                <Text style={styles.linkText}>Đăng ký ngay</Text>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  welcomeText: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.neutral.textPrimary,
    marginTop: Spacing.lg,
  },
  subtitleText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeights.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: Colors.neutral.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.neutral.textSecondary,
  },
  linkText: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeights.semibold,
  },
});
