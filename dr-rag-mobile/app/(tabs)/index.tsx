/**
 * Home/Query screen — main remedy search interface.
 */

import React, { useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput, Button, IconButton, Menu, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  // Resolve effective input mode when voice is disabled by admin
  const effectiveMode = (!settings.show_voice && inputMode === 'voice') ? 'text' : inputMode;

  const markdownStyles = {
    body: { color: colors.textPrimary, fontSize: 15, lineHeight: 24 },
    heading2: { color: colors.primary[700], fontSize: 18, fontWeight: '700' as const, marginTop: 16, marginBottom: 8 },
    heading3: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 6 },
    strong: { color: colors.primary[700], fontWeight: '600' as const },
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
            <MaterialCommunityIcons name="leaf" size={26} color={colors.primary[500]} />
            <Text style={styles.headerTitle}>DR-RAG</Text>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton icon="account-circle" size={26} iconColor={colors.primary[500]}
                onPress={() => setMenuVisible(true)} />
            }
          >
            <Menu.Item title={user?.full_name || 'User'} leadingIcon="account" disabled />
            <Menu.Item title="Logout" leadingIcon="logout" onPress={handleLogout} />
          </Menu>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Streaming response (live tokens) ─────────────── */}
          {isStreaming && streamingText !== '' && (
            <View style={styles.card}>
              <View style={styles.streamingHeader}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
                <Text style={styles.streamingLabel}>Analysing…</Text>
              </View>
              <Markdown style={markdownStyles}>{streamingText}</Markdown>
            </View>
          )}

          {/* ── Loading indicator (before first token) ───────── */}
          {(isLoading || isStreaming) && streamingText === '' && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Analysing symptoms…</Text>
            </View>
          )}

          {/* ── Final response ────────────────────────────────── */}
          {currentResponse && !isStreaming && (
            <View style={styles.responseSection}>
              <View style={styles.responseSectionHeader}>
                <Text style={styles.sectionTitle}>Repertorization</Text>
                <Button mode="text" compact onPress={handleNewQuery} icon="plus">New Query</Button>
              </View>
              <ResponseCard response={currentResponse} />
            </View>
          )}

          {/* ── Error ─────────────────────────────────────────── */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Input section ─────────────────────────────────── */}
          {!currentResponse && !isStreaming && !isLoading && (
            <View style={styles.inputSection}>

              {/* Mode toggle (only if voice is enabled by admin) */}
              {settings.show_voice && (
                <View style={styles.modeRow}>
                  <TouchableMode
                    active={effectiveMode === 'text'}
                    icon="keyboard"
                    label="Text"
                    onPress={() => setInputMode('text')}
                  />
                  <TouchableMode
                    active={effectiveMode === 'voice'}
                    icon="microphone"
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
                    value={currentQuery}
                    onChangeText={setQuery}
                    multiline
                    numberOfLines={5}
                    style={styles.textInput}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary[500]}
                  />
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    disabled={!currentQuery.trim()}
                    style={styles.submitButton}
                    contentStyle={styles.submitButtonContent}
                    icon="magnify"
                  >
                    Analyse Symptoms
                  </Button>
                </>
              )}

              {/* Voice input */}
              {effectiveMode === 'voice' && settings.show_voice && (
                <VoiceRecorder onRecordingComplete={handleVoiceComplete} maxDuration={60} />
              )}

              {/* Tips */}
              {!error && (
                <View style={styles.tips}>
                  <Text style={styles.tipsTitle}>Tips for better results</Text>
                  {[
                    'Describe symptoms in detail — location, sensation, onset',
                    'Include what makes symptoms better or worse',
                    'Mention mental or emotional symptoms',
                    'Note time of aggravation (e.g. worse at midnight)',
                  ].map((tip, i) => (
                    <View key={i} style={styles.tipItem}>
                      <MaterialCommunityIcons name="check-circle" size={14} color={colors.primary[500]} />
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

function TouchableMode({ active, icon, label, onPress }: { active: boolean; icon: string; label: string; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Button
        mode={active ? 'contained' : 'outlined'}
        icon={icon}
        onPress={onPress}
        style={[styles.modeBtn, active && styles.modeBtnActive]}
        labelStyle={{ fontSize: 13 }}
        compact
      >
        {label}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 14, gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3,
  },
  streamingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  streamingLabel: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  loadingCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  loadingText: { fontSize: 15, color: colors.textSecondary },
  responseSection: { gap: 8 },
  responseSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: colors.errorLight, borderRadius: 10,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 14 },
  inputSection: { gap: 14 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { borderRadius: 10 },
  modeBtnActive: { backgroundColor: colors.primary[500] },
  textInput: { backgroundColor: colors.background, minHeight: 130 },
  submitButton: { borderRadius: 12, backgroundColor: colors.primary[500] },
  submitButtonContent: { height: 52 },
  tips: {
    backgroundColor: colors.primary[50], borderRadius: 12, padding: 14, gap: 8,
  },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: colors.primary[700] },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 13, color: colors.primary[800], lineHeight: 18 },
});
