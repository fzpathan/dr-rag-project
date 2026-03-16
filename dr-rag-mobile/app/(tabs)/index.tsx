/**
 * Home/Query screen — premium dark design.
 */

import React, { useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { Text, TextInput, ActivityIndicator, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { router } from 'expo-router';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { useQueryStore } from '../../src/stores/queryStore';
import { VoiceRecorder, ResponseCard } from '../../src/components';

export default function HomeScreen() {
  const { user, logout, settings } = useAuthStore();
  const {
    currentQuery, currentResponse, streamingText, isStreaming, isLoading, error,
    inputMode, setQuery, setInputMode, submitQuery, clearResponse, clearError,
  } = useQueryStore();

  const [menuVisible, setMenuVisible] = React.useState(false);

  useEffect(() => { clearError(); }, []);

  const handleSubmit = async () => {
    if (!currentQuery.trim()) return;
    await submitQuery({ question: currentQuery.trim() });
  };

  const handleVoiceComplete = async (text: string) => {
    if (!text.trim()) return;
    setQuery(text.trim());
    await submitQuery({ question: text.trim() });
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const handleNewQuery = () => {
    clearResponse();
    setQuery('');
    clearError();
  };

  const effectiveMode = (!settings.show_voice && inputMode === 'voice') ? 'text' : inputMode;

  const markdownStyles = {
    body: { color: colors.textPrimary, fontSize: 15, lineHeight: 24 },
    heading2: { color: colors.primary[300], fontSize: 18, fontWeight: '700' as const, marginTop: 16, marginBottom: 8 },
    heading3: { color: colors.primary[400], fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 6 },
    strong: { color: colors.primary[300], fontWeight: '600' as const },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginVertical: 12 },
    th: { backgroundColor: colors.primary[50], padding: 8, fontWeight: '600' as const },
    td: { padding: 8, borderTopWidth: 1, borderColor: colors.borderLight },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerLogo}
            >
              <MaterialCommunityIcons name="stethoscope" size={16} color="#fff" />
            </LinearGradient>
            <Text style={styles.headerTitle}>
              <Text style={styles.headerTitleMain}>Clin</Text>
              <Text style={styles.headerTitleAccent}>IQ</Text>
            </Text>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            contentStyle={styles.menuContent}
            anchor={
              <TouchableOpacity style={styles.avatarBtn} onPress={() => setMenuVisible(true)}>
                <Text style={styles.avatarText}>
                  {(user?.full_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              title={user?.full_name || 'User'}
              leadingIcon="account-circle-outline"
              disabled
              titleStyle={{ color: colors.textSecondary, fontSize: 13 }}
            />
            <Menu.Item
              title="Sign out"
              leadingIcon="logout"
              onPress={handleLogout}
              titleStyle={{ color: colors.error }}
            />
          </Menu>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Streaming live */}
          {isStreaming && streamingText !== '' && (
            <View style={styles.streamCard}>
              <View style={styles.streamHeader}>
                <ActivityIndicator size={14} color={colors.primary[400]} />
                <Text style={styles.streamLabel}>Analysing…</Text>
              </View>
              <Markdown style={markdownStyles}>{streamingText}</Markdown>
            </View>
          )}

          {/* Loading spinner (before first token) */}
          {(isLoading || isStreaming) && streamingText === '' && (
            <View style={styles.loadingCard}>
              <View style={styles.loadingDot}>
                <ActivityIndicator size="large" color={colors.primary[400]} />
              </View>
              <Text style={styles.loadingText}>Analysing symptoms…</Text>
              <Text style={styles.loadingSubtext}>Cross-referencing clinical patterns</Text>
            </View>
          )}

          {/* Final response */}
          {currentResponse && !isStreaming && (
            <View style={styles.responseSection}>
              <View style={styles.responseSectionHeader}>
                <Text style={styles.sectionTitle}>Repertorization</Text>
                <TouchableOpacity style={styles.newQueryBtn} onPress={handleNewQuery}>
                  <MaterialCommunityIcons name="plus" size={14} color={colors.primary[400]} />
                  <Text style={styles.newQueryText}>New Query</Text>
                </TouchableOpacity>
              </View>
              <ResponseCard response={currentResponse} />
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Input section */}
          {!currentResponse && !isStreaming && !isLoading && (
            <View style={styles.inputSection}>

              {/* Mode toggle */}
              {settings.show_voice && (
                <View style={styles.modeRow}>
                  <ModeBtn
                    active={effectiveMode === 'text'}
                    icon="keyboard-outline"
                    label="Text"
                    onPress={() => setInputMode('text')}
                  />
                  <ModeBtn
                    active={effectiveMode === 'voice'}
                    icon="microphone-outline"
                    label="Voice"
                    onPress={() => setInputMode('voice')}
                  />
                </View>
              )}

              {/* Text input */}
              {effectiveMode === 'text' && (
                <>
                  <TextInput
                    mode="outlined"
                    placeholder="Describe the patient's symptoms in detail…"
                    placeholderTextColor={colors.textSecondary}
                    value={currentQuery}
                    onChangeText={setQuery}
                    multiline
                    numberOfLines={5}
                    style={styles.textInput}
                    outlineStyle={styles.textInputOutline}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                    textColor={colors.textPrimary}
                  />
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!currentQuery.trim()}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={currentQuery.trim()
                        ? [colors.gradientStart, colors.gradientEnd]
                        : [colors.surface, colors.surface]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.submitBtn, !currentQuery.trim() && styles.submitBtnDisabled]}
                    >
                      <MaterialCommunityIcons name="magnify" size={18} color={currentQuery.trim() ? '#fff' : colors.textSecondary} />
                      <Text style={[styles.submitBtnText, !currentQuery.trim() && styles.submitBtnTextDisabled]}>
                        Analyse Symptoms
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* Voice input */}
              {effectiveMode === 'voice' && settings.show_voice && (
                <VoiceRecorder onRecordingComplete={handleVoiceComplete} maxDuration={60} />
              )}

              {/* Tips */}
              {!error && (
                <View style={styles.tips}>
                  <View style={styles.tipsHeader}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={14} color={colors.primary[400]} />
                    <Text style={styles.tipsTitle}>Tips for better results</Text>
                  </View>
                  {[
                    'Describe symptoms in detail — location, sensation, onset',
                    'Include what makes symptoms better or worse',
                    'Mention mental or emotional symptoms',
                    'Note time of aggravation (e.g. worse at midnight)',
                  ].map((tip, i) => (
                    <View key={i} style={styles.tipItem}>
                      <View style={styles.tipDot} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeBtn({ active, icon, label, onPress }: {
  active: boolean; icon: string; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modePill, active && styles.modePillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        color={active ? colors.primary[400] : colors.textSecondary}
      />
      <Text style={[styles.modePillText, active && styles.modePillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {},
  headerTitleMain: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  headerTitleAccent: { fontSize: 20, fontWeight: '800', color: colors.primary[400], letterSpacing: -0.5 },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[500],
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary[400] },
  menuContent: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  // Content
  content: { padding: 16, gap: 14 },

  // Stream card
  streamCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
  },
  streamHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  streamLabel: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', letterSpacing: 0.3 },

  // Loading card
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  loadingSubtext: { fontSize: 13, color: colors.textSecondary },

  // Response
  responseSection: { gap: 10 },
  responseSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  newQueryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  newQueryText: { fontSize: 12, fontWeight: '600', color: colors.primary[400] },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { flex: 1, color: colors.error, fontSize: 14 },

  // Input section
  inputSection: { gap: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modePillActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  modePillText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modePillTextActive: { color: colors.primary[400] },

  textInput: {
    backgroundColor: colors.surface,
    minHeight: 130,
    fontSize: 15,
  },
  textInputOutline: { borderRadius: 12 },

  submitBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.glowTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  submitBtnTextDisabled: { color: colors.textSecondary },

  // Tips
  tips: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tipsTitle: { fontSize: 12, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, textTransform: 'uppercase' },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
    marginTop: 7,
  },
  tipText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
