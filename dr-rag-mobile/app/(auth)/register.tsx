/**
 * Register screen.
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
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors } from '../../src/constants/colors';
import { useAuth } from '../../src/hooks/useAuth';

const registerSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'Unable to create account. Please try again.'
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us to find homeopathic remedies
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Full Name"
                  mode="outlined"
                  autoCapitalize="words"
                  autoComplete="name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.full_name}
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                  left={<TextInput.Icon icon="account" />}
                />
              )}
            />
            {errors.full_name && (
              <Text style={styles.errorText}>{errors.full_name.message}</Text>
            )}

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

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Confirm Password"
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.confirmPassword}
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
              )}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
            )}

            {/* Register Button */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.registerButton}
              contentStyle={styles.registerButtonContent}
              labelStyle={styles.registerButtonLabel}
            >
              Create Account
            </Button>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Login</Text>
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
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
  registerButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
  },
  registerButtonContent: {
    height: 52,
  },
  registerButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
});
