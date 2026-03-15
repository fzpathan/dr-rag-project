/**
 * History screen — shows the last 50 queries with expandable responses.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { colors } from '../../src/constants/colors';
import { useQueryStore } from '../../src/stores/queryStore';
import type { QueryHistoryItem } from '../../src/types/query';

export default function HistoryScreen() {
  const { history, loadHistory, deleteHistoryItem } = useQueryStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const fmtDate = (timestamp: Date | string) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const markdownStyles = {
    body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
    heading2: { color: colors.primary[700], fontSize: 16, fontWeight: '700' as const, marginTop: 12, marginBottom: 6 },
    strong: { color: colors.primary[700], fontWeight: '600' as const },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginVertical: 8 },
    th: { backgroundColor: colors.primary[50], padding: 6, fontWeight: '600' as const },
    td: { padding: 6, borderTopWidth: 1, borderColor: colors.borderLight },
  };

  const renderItem = ({ item }: { item: QueryHistoryItem }) => {
    const expanded = expandedId === item.id;
    return (
      <View style={styles.item}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => setExpandedId(expanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.question} numberOfLines={expanded ? undefined : 2}>
              {item.question}
            </Text>
            {item.cached && (
              <View style={styles.cachedBadge}>
                <Text style={styles.cachedText}>Cached</Text>
              </View>
            )}
          </View>
          <View style={styles.itemHeaderRight}>
            <Text style={styles.date}>{fmtDate(item.timestamp)}</Text>
            <View style={styles.itemHeaderActions}>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
              <IconButton
                icon="delete-outline"
                size={18}
                iconColor={colors.error}
                style={styles.deleteBtn}
                onPress={() => Alert.alert(
                  'Delete Query',
                  'Remove this query from history?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteHistoryItem(item.id) },
                  ]
                )}
              />
            </View>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.answerContainer}>
            <Divider style={styles.divider} />
            <Markdown style={markdownStyles}>{item.answer}</Markdown>
          </View>
        )}
      </View>
    );
  };

  if (!history.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="history" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No queries yet</Text>
          <Text style={styles.emptySubtext}>Your recent queries will appear here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSubtitle}>{history.length} queries</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  list: {
    padding: 12,
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  cachedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cachedText: {
    fontSize: 10,
    color: colors.primary[700],
    fontWeight: '600',
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    margin: 0,
    marginLeft: 2,
  },
  date: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  divider: {
    marginVertical: 12,
  },
  answerContainer: {
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
