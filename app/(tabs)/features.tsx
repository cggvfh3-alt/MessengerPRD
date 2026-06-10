/*
 * @Description: MVP Features Tab
 */
// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Font, Radius } from '@/constants/theme';
import { MVP_FEATURES } from '@/constants/prd-data';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default function FeaturesScreen() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number[]>([0]);

  const toggle = (i: number) => {
    setExpanded((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>MVP SCOPE</Text>
        <Text style={styles.headerTitle}>Ключевой функционал</Text>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {MVP_FEATURES.map((f) => (
          <View key={f.category} style={styles.statItem}>
            <Text style={[styles.statNum, { color: f.color }]}>{f.items.length}</Text>
            <Text style={styles.statLabel}>{f.category.split(' ')[0]}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: Spacing.md }}
      >
        <SectionHeader
          icon="featured-play-list"
          title="Функциональные требования"
          subtitle={`${MVP_FEATURES.reduce((acc, f) => acc + f.items.length, 0)} фич в MVP`}
          color={Colors.primary}
          index={2}
        />

        {MVP_FEATURES.map((feature, i) => {
          const isOpen = expanded.includes(i);
          return (
            <View key={feature.category} style={styles.featureBlock}>
              <TouchableOpacity
                onPress={() => toggle(i)}
                activeOpacity={0.8}
                style={[
                  styles.featureHeader,
                  { borderColor: isOpen ? feature.color + '66' : Colors.border },
                  isOpen ? { backgroundColor: feature.color + '11' } : {},
                ]}
              >
                <View style={[styles.featureIconBox, { backgroundColor: feature.color + '22' }]}>
                  <MaterialIcons name={feature.icon as any} size={20} color={feature.color} />
                </View>
                <View style={styles.featureTitleWrap}>
                  <Text style={styles.featureCat}>{feature.category}</Text>
                  <Text style={[styles.featureCount, { color: feature.color }]}>
                    {feature.items.length} функций
                  </Text>
                </View>
                <MaterialIcons
                  name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color={isOpen ? feature.color : Colors.textMuted}
                />
              </TouchableOpacity>

              {isOpen ? (
                <View style={[styles.featureBody, { borderColor: feature.color + '33' }]}>
                  {feature.items.map((item, j) => (
                    <View key={j} style={styles.featureItem}>
                      <View style={[styles.featureBullet, { backgroundColor: feature.color }]} />
                      <Text style={styles.featureText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Security callout */}
        <View style={styles.securityBanner}>
          <MaterialIcons name="lock" size={20} color="#2DA8FF" />
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Безопасность в основе архитектуры</Text>
            <Text style={styles.securityDesc}>
              E2E-шифрование для секретных чатов, Zero-knowledge хранилище, 
              регулярные аудиты безопасности, GDPR-совместимость.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLabel: {
    fontSize: Font.xs,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: Font.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: Font.lg,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  featureBlock: {
    marginBottom: Spacing.sm,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.bgCard,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  featureTitleWrap: {
    flex: 1,
  },
  featureCat: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  featureCount: {
    fontSize: Font.xs,
    fontWeight: '600',
    marginTop: 1,
  },
  featureBody: {
    backgroundColor: Colors.bgCardAlt,
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  featureText: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  securityBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '11',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
