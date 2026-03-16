/**
 * Response card — premium dark design with teal accent.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import { useRubricStore } from '../../stores/rubricStore';
import { hasRubricTable } from '../../utils/parseRubricTable';
import type { QueryResponse, Citation } from '../../types/query';

interface ResponseCardProps {
  response: QueryResponse;
}

export function ResponseCard({ response }: ResponseCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { saveRubric, isRubricSaved } = useRubricStore();

  const rubricAvailable = hasRubricTable(response.answer);
  const alreadySaved = isRubricSaved(response.id);

  const handleSave = async () => {
    await saveRubric(response.question, response.id, response.answer, response.citations);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(response.answer);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markdownStyles = {
    body: { color: colors.textPrimary, fontSize: 15, lineHeight: 24 },
    heading2: { color: colors.primary[300], fontSize: 18, fontWeight: '700' as const, marginTop: 16, marginBottom: 8 },
    heading3: { color: colors.primary[400], fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 6 },
    strong: { color: colors.primary[300], fontWeight: '600' as const },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginVertical: 12 },
    th: { backgroundColor: colors.primary[50], padding: 8, fontWeight: '600' as const },
    td: { padding: 8, borderTopWidth: 1, borderColor: colors.borderLight },
    bullet_list: { marginVertical: 8 },
    list_item: { marginVertical: 4 },
  };

  return (
    <View style={styles.card}>
      {/* Query bubble */}
      {response.question && (
        <View style={styles.queryBubble}>
          <MaterialCommunityIcons name="help-circle-outline" size={16} color={colors.primary[400]} />
          <Text style={styles.queryText}>{response.question}</Text>
        </View>
      )}

      {/* Answer header */}
      <View style={styles.answerHeader}>
        <View style={styles.answerHeaderLeft}>
          <View style={styles.aiDot} />
          <Text style={styles.answerHeaderTitle}>Clinical Analysis</Text>
        </View>
        <View style={styles.answerHeaderRight}>
          {response.cached && (
            <View style={styles.cachedBadge}>
              <Text style={styles.cachedBadgeText}>Cached</Text>
            </View>
          )}
          <Text style={styles.processingTime}>{response.processing_time_ms}ms</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Markdown answer */}
      <View style={styles.answerBody}>
        <Markdown style={markdownStyles}>{response.answer}</Markdown>
      </View>

      {/* Action row */}
      <View style={styles.actions}>
        {rubricAvailable && (
          <TouchableOpacity
            style={[styles.actionBtn, (alreadySaved || saved) && styles.actionBtnSuccess]}
            onPress={handleSave}
            disabled={alreadySaved || saved}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={alreadySaved || saved ? 'bookmark-check' : 'bookmark-outline'}
              size={16}
              color={alreadySaved || saved ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.actionBtnText, (alreadySaved || saved) && styles.actionBtnTextSuccess]}>
              {alreadySaved || saved ? 'Saved' : 'Save Rubric'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, copied && styles.actionBtnSuccess]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={copied ? 'check' : 'content-copy'}
            size={16}
            color={copied ? colors.success : colors.textSecondary}
          />
          <Text style={[styles.actionBtnText, copied && styles.actionBtnTextSuccess]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sources */}
      {response.citations.length > 0 && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.sourcesToggle}
            onPress={() => setShowSources(!showSources)}
            activeOpacity={0.7}
          >
            <View style={styles.sourcesToggleLeft}>
              <MaterialCommunityIcons name="database-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.sourcesToggleText}>Sources ({response.citations.length})</Text>
            </View>
            <MaterialCommunityIcons
              name={showSources ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showSources && (
            <View style={styles.sourcesList}>
              {response.citations.map((citation, index) => (
                <SourceItem key={index} citation={citation} index={index} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function SourceItem({ citation, index }: { citation: Citation; index: number }) {
  return (
    <View style={styles.sourceItem}>
      <View style={styles.sourceHeader}>
        <View style={styles.sourceIndexBadge}>
          <Text style={styles.sourceIndexText}>{index + 1}</Text>
        </View>
        <Text style={styles.sourceName} numberOfLines={1}>{citation.source}</Text>
        {citation.page && <Text style={styles.sourcePage}>p.{citation.page}</Text>}
      </View>
      <Text style={styles.sourceExcerpt} numberOfLines={3}>{citation.excerpt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    overflow: 'hidden',
    marginVertical: 4,
  },

  // Query bubble
  queryBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primary[50],
    padding: 14,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  queryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // Answer header
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  answerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    shadowColor: colors.glowTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  answerHeaderTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.2 },
  answerHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cachedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.primary[50],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  cachedBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5 },
  processingTime: { fontSize: 11, color: colors.textSecondary },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12, marginHorizontal: 16 },

  answerBody: { paddingHorizontal: 16, paddingBottom: 4 },

  // Actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
  },
  actionBtnSuccess: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  actionBtnTextSuccess: { color: colors.success },

  // Sources
  sourcesToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sourcesToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourcesToggleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  sourcesList: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  sourceItem: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sourceIndexBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIndexText: { fontSize: 11, fontWeight: '700', color: colors.primary[400] },
  sourceName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  sourcePage: { fontSize: 11, color: colors.textSecondary },
  sourceExcerpt: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
});

export default ResponseCard;
