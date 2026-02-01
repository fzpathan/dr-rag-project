/**
 * Response card with markdown rendering.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import type { QueryResponse, Citation } from '../../types/query';

interface ResponseCardProps {
  response: QueryResponse;
}

export function ResponseCard({ response }: ResponseCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(response.answer);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markdownStyles = {
    body: {
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 24,
    },
    heading2: {
      color: colors.primary[700],
      fontSize: 18,
      fontWeight: '700' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    heading3: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600' as const,
      marginTop: 12,
      marginBottom: 6,
    },
    strong: {
      color: colors.primary[700],
      fontWeight: '600' as const,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginVertical: 12,
    },
    th: {
      backgroundColor: colors.primary[50],
      padding: 8,
      fontWeight: '600' as const,
    },
    td: {
      padding: 8,
      borderTopWidth: 1,
      borderColor: colors.borderLight,
    },
    bullet_list: {
      marginVertical: 8,
    },
    list_item: {
      marginVertical: 4,
    },
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        {/* Query */}
        {response.question && (
          <View style={styles.queryContainer}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={18}
              color={colors.primary[500]}
            />
            <Text style={styles.queryText}>{response.question}</Text>
          </View>
        )}

        {response.question && <Divider style={styles.divider} />}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={20}
              color={colors.primary[500]}
            />
            <Text style={styles.headerTitle}>Remedy Recommendations</Text>
          </View>

          <View style={styles.headerRight}>
            {response.cached && (
              <Chip
                mode="flat"
                compact
                style={styles.cachedChip}
                textStyle={styles.cachedChipText}
              >
                Cached
              </Chip>
            )}
            <Text style={styles.processingTime}>
              {response.processing_time_ms}ms
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Answer - removed nested ScrollView and maxHeight */}
        <View style={styles.answerContainer}>
          <Markdown style={markdownStyles}>{response.answer}</Markdown>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopy}
          >
            <MaterialCommunityIcons
              name={copied ? 'check' : 'content-copy'}
              size={18}
              color={copied ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.actionText, copied && styles.actionTextSuccess]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sources */}
        {response.citations.length > 0 && (
          <>
            <Divider style={styles.divider} />

            <TouchableOpacity
              style={styles.sourcesHeader}
              onPress={() => setShowSources(!showSources)}
            >
              <View style={styles.sourcesHeaderLeft}>
                <MaterialCommunityIcons
                  name="book-open-page-variant"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.sourcesTitle}>
                  Sources ({response.citations.length})
                </Text>
              </View>
              <MaterialCommunityIcons
                name={showSources ? 'chevron-up' : 'chevron-down'}
                size={24}
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
      </Card.Content>
    </Card>
  );
}

function SourceItem({ citation, index }: { citation: Citation; index: number }) {
  return (
    <View style={styles.sourceItem}>
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceNumber}>[{index + 1}]</Text>
        <Text style={styles.sourceName}>{citation.source}</Text>
        {citation.page && (
          <Text style={styles.sourcePage}>p. {citation.page}</Text>
        )}
      </View>
      <Text style={styles.sourceExcerpt} numberOfLines={3}>
        {citation.excerpt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginVertical: 8,
    elevation: 2,
  },
  queryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primary[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  queryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[800],
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cachedChip: {
    backgroundColor: colors.primary[50],
    height: 24,
  },
  cachedChipText: {
    fontSize: 10,
    color: colors.primary[700],
  },
  processingTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    marginVertical: 12,
  },
  answerContainer: {
    // No maxHeight - let the parent ScrollView handle scrolling
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionTextSuccess: {
    color: colors.success,
  },
  sourcesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sourcesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sourcesList: {
    marginTop: 8,
  },
  sourceItem: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sourceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[500],
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  sourcePage: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sourceExcerpt: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default ResponseCard;
