/**
 * Coming Up page - future features roadmap.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';

const upcomingFeatures = [
  {
    title: 'Query History',
    description: 'Browse, search, and re-run your past queries. Never lose a useful remedy search.',
    icon: 'history',
    status: 'In Progress',
    statusColor: colors.primary[500],
  },
  {
    title: 'Offline Mode',
    description: 'Access frequently used queries and saved remedies without internet connection.',
    icon: 'cloud-off-outline',
    status: 'Planned',
    statusColor: colors.secondary[500],
  },
  {
    title: 'Multi-Language Support',
    description: 'Voice input and UI in Hindi, German, Spanish, and more languages.',
    icon: 'translate',
    status: 'Planned',
    statusColor: colors.secondary[500],
  },
  {
    title: 'Remedy Bookmarks',
    description: 'Save your favorite remedies for quick reference with personal notes.',
    icon: 'bookmark-multiple',
    status: 'Planned',
    statusColor: colors.secondary[500],
  },
  {
    title: 'Dark Mode',
    description: 'System-aware dark theme for comfortable night-time usage.',
    icon: 'theme-light-dark',
    status: 'Planned',
    statusColor: colors.secondary[500],
  },
  {
    title: 'Export to PDF',
    description: 'Generate professional consultation reports for your records.',
    icon: 'file-pdf-box',
    status: 'Researching',
    statusColor: colors.info,
  },
  {
    title: 'Biometric Login',
    description: 'Quick and secure access with Face ID, Touch ID, or fingerprint.',
    icon: 'fingerprint',
    status: 'Planned',
    statusColor: colors.secondary[500],
  },
  {
    title: 'Push Notifications',
    description: 'Get notified about new knowledge base updates and app features.',
    icon: 'bell-ring',
    status: 'Researching',
    statusColor: colors.info,
  },
];

export default function ComingUpScreen() {
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
              name="rocket-launch"
              size={40}
              color={colors.primary[500]}
            />
          </View>
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.subtitle}>
            Exciting features we're working on to make your experience even better
          </Text>
        </View>

        {/* Status Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary[500] }]} />
            <Text style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.secondary[500] }]} />
            <Text style={styles.legendText}>Planned</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
            <Text style={styles.legendText}>Researching</Text>
          </View>
        </View>

        {/* Features List */}
        {upcomingFeatures.map((feature, index) => (
          <Card key={index} style={styles.featureCard}>
            <Card.Content style={styles.featureContent}>
              <View style={styles.featureHeader}>
                <View style={styles.featureIconContainer}>
                  <MaterialCommunityIcons
                    name={feature.icon as any}
                    size={24}
                    color={colors.primary[500]}
                  />
                </View>
                <View style={styles.featureTitleContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Chip
                    mode="flat"
                    compact
                    style={[styles.statusChip, { backgroundColor: `${feature.statusColor}15` }]}
                    textStyle={[styles.statusChipText, { color: feature.statusColor }]}
                  >
                    {feature.status}
                  </Chip>
                </View>
              </View>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </Card.Content>
          </Card>
        ))}

        {/* Feedback Section */}
        <Card style={styles.feedbackCard}>
          <Card.Content>
            <View style={styles.feedbackHeader}>
              <MaterialCommunityIcons
                name="lightbulb-on"
                size={28}
                color={colors.secondary[500]}
              />
              <Text style={styles.feedbackTitle}>Have a Feature Idea?</Text>
            </View>
            <Text style={styles.feedbackText}>
              We love hearing from our users! If you have suggestions for features
              that would help you in your homeopathy practice, please let us know
              through the Contact page.
            </Text>
            <View style={styles.feedbackFooter}>
              <MaterialCommunityIcons
                name="heart"
                size={16}
                color={colors.primary[500]}
              />
              <Text style={styles.feedbackFooterText}>
                Your feedback shapes our roadmap
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Newsletter Section */}
        <Card style={styles.newsletterCard}>
          <Card.Content style={styles.newsletterContent}>
            <MaterialCommunityIcons
              name="email-newsletter"
              size={32}
              color={colors.primary[500]}
            />
            <Text style={styles.newsletterTitle}>Stay Updated</Text>
            <Text style={styles.newsletterText}>
              Follow us on social media or enable notifications to be the first
              to know when new features are released.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  featureCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  featureContent: {
    padding: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  statusChip: {
    height: 24,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  feedbackCard: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.secondary[50],
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary[700],
  },
  feedbackText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackFooterText: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: '500',
  },
  newsletterCard: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
  },
  newsletterContent: {
    alignItems: 'center',
    padding: 8,
  },
  newsletterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[700],
    marginTop: 12,
    marginBottom: 8,
  },
  newsletterText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
