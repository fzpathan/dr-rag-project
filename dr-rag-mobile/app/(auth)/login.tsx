/**
 * Login screen.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors } from '../../src/constants/colors';
import { useAuth } from '../../src/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.detail || 'Invalid email or password'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons
                name="leaf"
                size={48}
                color={colors.primary[500]}
              />
            </View>
            <Text style={styles.appName}>Homeopathy Remedy</Text>
            <Text style={styles.appTagline}>Finder</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.email}
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                  left={<TextInput.Icon icon="email" />}
                />
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password"
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.password}
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}

            {/* Remember Me */}
            <TouchableOpacity
              style={styles.rememberMe}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                color={colors.primary[500]}
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              labelStyle={styles.loginButtonLabel}
            >
              Login
            </Button>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  appTagline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary[500],
  },
  form: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  rememberMeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
  },
  loginButtonContent: {
    height: 52,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: colors.primary[500],
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
});
