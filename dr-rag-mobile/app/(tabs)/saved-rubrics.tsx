/**
 * Saved Rubrics screen — server-synced, with markdown answer display.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, DataTable, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { colors } from '../../src/constants/colors';
import { useRubricStore } from '../../src/stores/rubricStore';
import type { SavedRubric } from '../../src/types/rubric';

export default function SavedRubricsScreen() {
  const { savedRubrics, loadRubrics, deleteRubric, clearAllRubrics, isLoading } = useRubricStore();

  useEffect(() => { loadRubrics(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Rubric', 'Delete this saved rubric?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRubric(id) },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all saved rubrics? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearAllRubrics() },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="bookmark-multiple" size={20} color={colors.primary[400]} />
          <Text style={styles.headerTitle}>Saved Rubrics</Text>
          {savedRubrics.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{savedRubrics.length}</Text>
            </View>
          )}
        </View>
        {savedRubrics.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={16} color={colors.error} />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && savedRubrics.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[400]} />
          <Text style={styles.loadingText}>Loading saved rubrics…</Text>
        </View>
      ) : savedRubrics.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="bookmark-off-outline" size={40} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Saved Rubrics</Text>
          <Text style={styles.emptyText}>
            After getting a response, tap "Save Rubric" to bookmark it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {savedRubrics.map((rubric) => (
            <RubricCard
              key={rubric.id}
              rubric={rubric}
              onDelete={() => handleDelete(rubric.id)}
              formatDate={formatDate}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RubricCard({
  rubric, onDelete, formatDate,
}: {
  rubric: SavedRubric;
  onDelete: () => void;
  formatDate: (iso: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const markdownStyles = {
    body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
    heading2: { color: colors.primary[300], fontSize: 16, fontWeight: '700' as const, marginTop: 12, marginBottom: 6 },
    heading3: { color: colors.primary[400], fontSize: 14, fontWeight: '600' as const, marginTop: 10, marginBottom: 4 },
    strong: { color: colors.primary[300], fontWeight: '600' as const },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginVertical: 8 },
    th: { backgroundColor: colors.primary[50], padding: 7, fontWeight: '600' as const },
    td: { padding: 7, borderTopWidth: 1, borderColor: colors.borderLight },
  };

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardDot} />
          <Text style={styles.cardQuestion} numberOfLines={expanded ? undefined : 2}>
            {rubric.name || rubric.question}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <MaterialCommunityIcons name="delete-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.cardDate}>{formatDate(rubric.savedAt)}</Text>

      <View style={styles.divider} />

      {/* Table if available */}
      {rubric.table ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
            <DataTable>
              <DataTable.Header style={styles.tableHeader}>
                {rubric.table.headers.map((h, i) => (
                  <DataTable.Title
                    key={i}
                    style={i === 0 ? styles.firstCol : styles.dataCol}
                    textStyle={styles.thText}
                  >
                    {h}
                  </DataTable.Title>
                ))}
              </DataTable.Header>
              {rubric.table.rows.map((row, ri) => {
                const isTotal = ri === rubric.table!.rows.length - 1;
                return (
                  <DataTable.Row key={ri} style={isTotal ? styles.totalRow : undefined}>
                    {row.cells.map((cell, ci) => (
                      <DataTable.Cell
                        key={ci}
                        style={ci === 0 ? styles.firstCol : styles.dataCol}
                        textStyle={isTotal ? styles.totalText : ci === 0 ? styles.symptomText : styles.cellText}
                      >
                        {cell.replace(/\*\*/g, '')}
                      </DataTable.Cell>
                    ))}
                  </DataTable.Row>
                );
              })}
            </DataTable>
          </ScrollView>

          {/* Toggle to show full answer */}
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.expandBtnText}>{expanded ? 'Hide full analysis' : 'Show full analysis'}</Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary[400]}
            />
          </TouchableOpacity>

          {expanded && (
            <View style={styles.answerBody}>
              <Markdown style={markdownStyles}>{rubric.answer}</Markdown>
            </View>
          )}
        </>
      ) : (
        /* No table — show full answer */
        <Markdown style={markdownStyles}>{rubric.answer}</Markdown>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.primary[100],
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary[400] },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: colors.errorLight,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: colors.error },

  // Center states
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22,
  },

  // Scroll content
  content: { padding: 16, gap: 14 },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.primary[500],
    marginTop: 7,
  },
  cardQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
  deleteBtn: { padding: 4, marginLeft: 8 },
  cardDate: { fontSize: 11, color: colors.textSecondary, marginLeft: 14, marginBottom: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },

  // Table
  tableScroll: { marginHorizontal: -4 },
  tableHeader: { backgroundColor: colors.primary[50] },
  firstCol: { minWidth: 130, maxWidth: 170 },
  dataCol: { minWidth: 60, justifyContent: 'center' },
  thText: { fontSize: 12, fontWeight: '700', color: colors.primary[400] },
  symptomText: { fontSize: 12, color: colors.textPrimary },
  cellText: { fontSize: 13, textAlign: 'center', color: colors.textPrimary },
  totalRow: { backgroundColor: colors.primary[50] },
  totalText: { fontSize: 12, fontWeight: '700', color: colors.primary[400] },

  // Expand
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  expandBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary[400] },
  answerBody: { marginTop: 12 },
});
