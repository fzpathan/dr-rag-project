/**
 * Home/Query screen - main remedy search interface.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, IconButton, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { useQueryStore } from '../../src/stores/queryStore';
import { InputModeToggle, VoiceRecorder, ResponseCard } from '../../src/components';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const {
    currentQuery,
    currentResponse,
    isLoading,
    error,
    inputMode,
    setQuery,
    setInputMode,
    submitQuery,
    transcribeAudio,
    clearResponse,
    clearError,
  } = useQueryStore();

  const [menuVisible, setMenuVisible] = useState(false);

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, []);

  const handleSubmit = async () => {
    if (!currentQuery.trim()) {
      Alert.alert('Empty Query', 'Please enter or record your question.');
      return;
    }

    try {
      await submitQuery({ question: currentQuery.trim() });
    } catch (err) {
      // Error is already handled in the store
    }
  };

  const handleVoiceRecordingComplete = async (uri: string) => {
    try {
      const transcription = await transcribeAudio(uri);
      // Auto-submit after transcription
      if (transcription) {
        await submitQuery({ question: transcription });
      }
    } catch (err) {
      Alert.alert('Transcription Failed', 'Unable to transcribe audio. Please try again or type your question.');
    }
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const handleNewQuery = () => {
    clearResponse();
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="leaf"
              size={28}
              color={colors.primary[500]}
            />
            <Text style={styles.headerTitle}>Remedy Finder</Text>
          </View>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="account-circle"
                size={28}
                iconColor={colors.primary[500]}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              title={user?.full_name || 'User'}
              leadingIcon="account"
              disabled
            />
            <Menu.Item
              title="Logout"
              leadingIcon="logout"
              onPress={handleLogout}
            />
          </Menu>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Response Card (if available) */}
          {currentResponse && (
            <View style={styles.responseSection}>
              <View style={styles.responseSectionHeader}>
                <Text style={styles.sectionTitle}>Response</Text>
                <Button
                  mode="text"
                  compact
                  onPress={handleNewQuery}
                  icon="plus"
                >
                  New Query
                </Button>
              </View>
              <ResponseCard response={currentResponse} />
            </View>
          )}

          {/* Input Section */}
          {!currentResponse && (
            <View style={styles.inputSection}>
              <Text style={styles.welcomeText}>
                Ask about symptoms, conditions, or remedies
              </Text>

              {/* Mode Toggle */}
              <View style={styles.toggleContainer}>
                <InputModeToggle mode={inputMode} onModeChange={setInputMode} />
              </View>

              {/* Text Input */}
              {inputMode === 'text' && (
                <View style={styles.textInputContainer}>
                  <TextInput
                    mode="outlined"
                    placeholder="Enter symptoms or condition..."
                    value={currentQuery}
                    onChangeText={setQuery}
                    multiline
                    numberOfLines={4}
                    style={styles.textInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                  />

                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={isLoading}
                    disabled={isLoading || !currentQuery.trim()}
                    style={styles.submitButton}
                    contentStyle={styles.submitButtonContent}
                    icon="magnify"
                  >
                    Find Remedy
                  </Button>
                </View>
              )}

              {/* Voice Input */}
              {inputMode === 'voice' && (
                <View style={styles.voiceInputContainer}>
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecordingComplete}
                    maxDuration={30}
                    disabled={isLoading}
                  />
                </View>
              )}

              {/* Loading State */}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <LoadingSpinner message="Analyzing your query..." />
                </View>
              )}

              {/* Error State */}
              {error && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={24}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>
          )}

          {/* Tips */}
          {!currentResponse && !isLoading && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Tips for better results:</Text>
              <View style={styles.tipItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={colors.primary[500]}
                />
                <Text style={styles.tipText}>
                  Describe symptoms in detail (location, sensation, modalities)
                </Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={colors.primary[500]}
                />
                <Text style={styles.tipText}>
                  Include what makes symptoms better or worse
                </Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={colors.primary[500]}
                />
                <Text style={styles.tipText}>
                  Mention any emotional or mental symptoms
                </Text>
              </View>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  toggleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  textInputContainer: {
    gap: 16,
  },
  textInput: {
    backgroundColor: colors.background,
    minHeight: 120,
  },
  submitButton: {
    borderRadius: 12,
    backgroundColor: colors.primary[500],
  },
  submitButtonContent: {
    height: 52,
  },
  voiceInputContainer: {
    alignItems: 'center',
  },
  loadingContainer: {
    marginTop: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.errorLight,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 14,
  },
  responseSection: {
    marginBottom: 24,
  },
  responseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tipsSection: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary[800],
    lineHeight: 18,
  },
});
