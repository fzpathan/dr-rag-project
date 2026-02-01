/**
 * About page.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';

const features = [
  {
    icon: 'brain',
    title: 'AI-Powered Analysis',
    description: 'Advanced RAG technology analyzes your symptoms against classical homeopathy texts.',
  },
  {
    icon: 'book-open-page-variant',
    title: 'Classical Sources',
    description: 'Recommendations based on authoritative homeopathy materia medica and repertories.',
  },
  {
    icon: 'microphone',
    title: 'Voice Input',
    description: 'Speak your symptoms naturally and get instant transcription.',
  },
  {
    icon: 'lightning-bolt',
    title: 'Fast Results',
    description: 'Intelligent caching ensures quick responses for similar queries.',
  },
  {
    icon: 'format-quote-close',
    title: 'Source Citations',
    description: 'Every recommendation includes citations from the original texts.',
  },
  {
    icon: 'shield-check',
    title: 'Evidence-Based',
    description: 'Strictly grounded in textbook information with no external assumptions.',
  },
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name="leaf"
              size={48}
              color={colors.primary[500]}
            />
          </View>
          <Text style={styles.title}>Homeopathy Remedy Finder</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {/* Mission */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.paragraph}>
              To provide practitioners and students with a reliable,
              AI-powered tool for finding homeopathic remedies based on
              classical textbook knowledge. We believe in making homeopathy
              education more accessible while maintaining strict adherence
              to traditional sources.
            </Text>
          </Card.Content>
        </Card>

        {/* Features */}
        <Text style={styles.featuresTitle}>Key Features</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Card key={index} style={styles.featureCard}>
              <Card.Content style={styles.featureContent}>
                <View style={styles.featureIconContainer}>
                  <MaterialCommunityIcons
                    name={feature.icon as any}
                    size={24}
                    color={colors.primary[500]}
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* How It Works */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>How It Works</Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Describe Symptoms</Text>
                <Text style={styles.stepDescription}>
                  Type or speak your patient's symptoms, conditions, or remedy query.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>AI Analysis</Text>
                <Text style={styles.stepDescription}>
                  Our RAG system searches through classical homeopathy texts
                  to find relevant passages.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Get Recommendations</Text>
                <Text style={styles.stepDescription}>
                  Receive remedy suggestions with symptom-overlap grids
                  and source citations.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Disclaimer */}
        <Card style={[styles.card, styles.disclaimerCard]}>
          <Card.Content>
            <View style={styles.disclaimerHeader}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color={colors.warning}
              />
              <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerText}>
              This application is intended for educational purposes only
              and should not replace professional medical advice, diagnosis,
              or treatment. Always consult with a qualified homeopathic
              practitioner or healthcare provider before starting any treatment.
              The recommendations provided are based on classical homeopathy
              texts and may not be suitable for all individuals.
            </Text>
          </Card.Content>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with care for the homeopathy community
          </Text>
          <MaterialCommunityIcons
            name="heart"
            size={16}
            color={colors.primary[500]}
          />
        </View>
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 8,
  },
  featureCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  featureContent: {
    alignItems: 'center',
    padding: 12,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  disclaimerCard: {
    backgroundColor: colors.warningLight,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
  },
  disclaimerText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
