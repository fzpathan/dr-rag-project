/**
 * Saved Rubrics screen - view and manage saved repertorization tables.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, DataTable, IconButton, Divider, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { useRubricStore } from '../../src/stores/rubricStore';
import type { SavedRubric } from '../../src/types/rubric';

export default function SavedRubricsScreen() {
  const { savedRubrics, deleteRubric, clearAllRubrics } = useRubricStore();

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Rubric',
      'Are you sure you want to delete this saved rubric?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRubric(id),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Rubrics',
      'This will delete all saved rubrics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAllRubrics(),
        },
      ]
    );
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="bookmark-multiple"
              size={40}
              color={colors.primary[500]}
            />
          </View>
          <Text style={styles.title}>Saved Rubrics</Text>
          <Text style={styles.subtitle}>
            Your saved repertorization tables for quick reference
          </Text>
        </View>

        {/* Clear all button */}
        {savedRubrics.length > 0 && (
          <View style={styles.clearAllContainer}>
            <Chip
              mode="outlined"
              compact
              icon="delete-sweep"
              onPress={handleClearAll}
              style={styles.clearAllChip}
              textStyle={styles.clearAllText}
            >
              Clear All ({savedRubrics.length})
            </Chip>
          </View>
        )}

        {/* Empty state */}
        {savedRubrics.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="bookmark-off-outline"
                size={48}
                color={colors.neutral[300]}
              />
              <Text style={styles.emptyTitle}>No Saved Rubrics</Text>
              <Text style={styles.emptyText}>
                When you get a remedy recommendation, tap "Save Rubric" to
                save the repertorization table here for future reference.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Rubric cards */}
        {savedRubrics.map((rubric) => (
          <RubricCard
            key={rubric.id}
            rubric={rubric}
            onDelete={() => handleDelete(rubric.id)}
            formatDate={formatDate}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function RubricCard({
  rubric,
  onDelete,
  formatDate,
}: {
  rubric: SavedRubric;
  onDelete: () => void;
  formatDate: (iso: string) => string;
}) {
  return (
    <Card style={styles.rubricCard}>
      <Card.Content>
        {/* Question & delete */}
        <View style={styles.rubricHeader}>
          <View style={styles.rubricHeaderLeft}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={16}
              color={colors.primary[500]}
            />
            <Text style={styles.rubricQuestion} numberOfLines={2}>
              {rubric.question}
            </Text>
          </View>
          <IconButton
            icon="delete-outline"
            size={20}
            iconColor={colors.textSecondary}
            onPress={onDelete}
          />
        </View>

        <Text style={styles.rubricDate}>{formatDate(rubric.savedAt)}</Text>

        <Divider style={styles.rubricDivider} />

        {/* DataTable with horizontal scroll for wide tables */}
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <DataTable>
            <DataTable.Header style={styles.tableHeader}>
              {rubric.table.headers.map((header, i) => (
                <DataTable.Title
                  key={i}
                  style={i === 0 ? styles.firstColumn : styles.dataColumn}
                  textStyle={styles.headerText}
                >
                  {header}
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {rubric.table.rows.map((row, rowIndex) => {
              const isLastRow = rowIndex === rubric.table.rows.length - 1;
              return (
                <DataTable.Row
                  key={rowIndex}
                  style={isLastRow ? styles.totalRow : undefined}
                >
                  {row.cells.map((cell, cellIndex) => (
                    <DataTable.Cell
                      key={cellIndex}
                      style={
                        cellIndex === 0 ? styles.firstColumn : styles.dataColumn
                      }
                      textStyle={
                        isLastRow
                          ? styles.totalText
                          : cellIndex === 0
                          ? styles.symptomText
                          : styles.cellText
                      }
                    >
                      {cell.replace(/\*\*/g, '')}
                    </DataTable.Cell>
                  ))}
                </DataTable.Row>
              );
            })}
          </DataTable>
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  clearAllContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  clearAllChip: {
    borderColor: colors.error,
  },
  clearAllText: {
    color: colors.error,
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  rubricCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    elevation: 2,
  },
  rubricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rubricHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
    paddingTop: 8,
  },
  rubricQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[800],
    lineHeight: 20,
  },
  rubricDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 24,
    marginBottom: 8,
  },
  rubricDivider: {
    marginVertical: 8,
  },
  tableHeader: {
    backgroundColor: colors.primary[50],
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  firstColumn: {
    minWidth: 140,
    maxWidth: 180,
  },
  dataColumn: {
    minWidth: 64,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[700],
  },
  symptomText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  cellText: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  totalRow: {
    backgroundColor: colors.neutral[50],
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary[700],
  },
});
