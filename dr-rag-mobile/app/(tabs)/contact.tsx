/**
 * Contact Us page.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Text, TextInput, Button, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors } from '../../src/constants/colors';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactForm = z.infer<typeof contactSchema>;

const contactInfo = [
  {
    icon: 'email',
    label: 'Email',
    value: 'support@drrag.com',
    action: 'mailto:support@drrag.com',
  },
  {
    icon: 'web',
    label: 'Website',
    value: 'www.drrag.com',
    action: 'https://www.drrag.com',
  },
  {
    icon: 'twitter',
    label: 'Twitter',
    value: '@drrag_app',
    action: 'https://twitter.com/drrag_app',
  },
];

export default function ContactScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactForm) => {
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Message Sent',
        'Thank you for contacting us. We will get back to you soon!',
        [{ text: 'OK', onPress: () => reset() }]
      );
    }, 1500);
  };

  const handleContactPress = async (action: string) => {
    try {
      await Linking.openURL(action);
    } catch (error) {
      Alert.alert('Error', 'Unable to open link');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Contact Us</Text>
            <Text style={styles.subtitle}>
              We'd love to hear from you. Send us a message!
            </Text>
          </View>

          {/* Contact Info */}
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text style={styles.infoTitle}>Get in Touch</Text>
              {contactInfo.map((item, index) => (
                <View key={index} style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={colors.primary[500]}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text
                      style={styles.infoValue}
                      onPress={() => handleContactPress(item.action)}
                    >
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Contact Form */}
          <Card style={styles.formCard}>
            <Card.Content>
              <Text style={styles.formTitle}>Send a Message</Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Your Name"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.name}
                    style={styles.input}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                  />
                )}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name.message}</Text>
              )}

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Email Address"
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.email}
                    style={styles.input}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}

              <Controller
                control={control}
                name="subject"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Subject"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.subject}
                    style={styles.input}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                  />
                )}
              />
              {errors.subject && (
                <Text style={styles.errorText}>{errors.subject.message}</Text>
              )}

              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Message"
                    mode="outlined"
                    multiline
                    numberOfLines={5}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.message}
                    style={[styles.input, styles.messageInput]}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                  />
                )}
              />
              {errors.message && (
                <Text style={styles.errorText}>{errors.message.message}</Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                icon="send"
              >
                Send Message
              </Button>
            </Card.Content>
          </Card>

          {/* FAQ Link */}
          <View style={styles.faqSection}>
            <MaterialCommunityIcons
              name="frequently-asked-questions"
              size={24}
              color={colors.textSecondary}
            />
            <Text style={styles.faqText}>
              Have questions? Check our{' '}
              <Text style={styles.faqLink}>FAQ section</Text>
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
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  messageInput: {
    minHeight: 120,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
  },
  submitButtonContent: {
    height: 48,
  },
  faqSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  faqText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  faqLink: {
    color: colors.primary[500],
    fontWeight: '500',
  },
});
