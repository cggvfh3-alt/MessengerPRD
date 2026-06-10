/*
 * @Description: PRD Overview — Concept & UI Principles
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Font, Radius } from '@/constants/theme';
import { APP_NAMES, CORE_VALUES, UI_PRINCIPLES } from '@/constants/prd-data';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';

const { width } = Dimensions.get('window');

export default function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const [selectedName, setSelectedName] = useState(0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>PRODUCT REQUIREMENTS DOCUMENT</Text>
          <Text style={styles.headerTitle}>Messenger App</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v1.0</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.heroWrap}>
          <Image
            source={require('@/assets/images/hero-prd.png')}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTagline}>Cross-platform messenger</Text>
            <Text style={styles.heroSub}>iOS · Android · Web</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader icon="text-fields" title="Варианты названия" subtitle="Выберите концепцию бренда" color={Colors.primary} index={1} />
          {APP_NAMES.map((item, i) => (
            <TouchableOpacity key={item.name} onPress={() => setSelectedName(i)} activeOpacity={0.8}>
              <Card accent={selectedName === i ? item.color : undefined}>
                <View style={styles.nameRow}>
                  <View style={[styles.nameDot, { backgroundColor: item.color }]} />
                  <View style={styles.nameText}>
                    <View style={styles.nameTopRow}>
                      <Text style={styles.nameTitle}>{item.name}</Text>
                      <Text style={[styles.nameTagline, { color: item.color }]}>{item.tagline}</Text>
                    </View>
                    <Text style={styles.nameDesc}>{item.description}</Text>
                  </View>
                  {selectedName === i
                    ? <MaterialIcons name="check-circle" size={22} color={item.color} />
                    : <MaterialIcons name="radio-button-unchecked" size={22} color={Colors.textMuted} />}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader icon="star" title="Основные ценности и УТП" subtitle="Чем отличаемся от конкурентов" color={Colors.accent} index={2} />
          <View style={styles.valuesGrid}>
            {CORE_VALUES.map((val) => (
              <Card key={val.title} style={styles.valueCard}>
                <View style={[styles.valueIcon, { backgroundColor: val.color + '22' }]}>
                  <MaterialIcons name={val.icon as any} size={22} color={val.color} />
                </View>
                <Text style={styles.valueTitle}>{val.title}</Text>
                <Text style={styles.valueText}>{val.text}</Text>
              </Card>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader icon="palette" title="Интерфейс и UX/UI" subtitle="Базовые принципы дизайна" color="#A371F7" index={3} />
          {UI_PRINCIPLES.map((p) => (
            <Card key={p.title} accent={p.color} style={styles.uiCard}>
              <View style={styles.uiRow}>
                <View style={[styles.uiIconBox, { backgroundColor: p.color + '22' }]}>
                  <MaterialIcons name={p.icon as any} size={18} color={p.color} />
                </View>
                <View style={styles.uiText}>
                  <Text style={styles.uiTitle}>{p.title}</Text>
                  <Text style={styles.uiDesc}>{p.desc}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}><MaterialIcons name="calendar-today" size={14} color={Colors.textMuted} /><Text style={styles.metaMuted}>  Дата: Q2 2026</Text></View>
          <View style={styles.metaRow}><MaterialIcons name="person" size={14} color={Colors.textMuted} /><Text style={styles.metaMuted}>  Senior PM + Full-Stack Dev</Text></View>
          <View style={styles.metaRow}><MaterialIcons name="flag" size={14} color={Colors.textMuted} /><Text style={styles.metaMuted}>  Статус: Draft v1.0</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLabel: { fontSize: Font.xs, color: Colors.primary, fontWeight: '700', letterSpacing: 1 },
  headerTitle: { fontSize: Font.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  versionBadge: {
    backgroundColor: Colors.primary + '22', borderWidth: 1, borderColor: Colors.primary + '55',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  versionText: { fontSize: Font.sm, color: Colors.primary, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  heroWrap: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing.md, marginBottom: Spacing.lg, height: 180 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: 'rgba(13,17,23,0.7)' },
  heroTagline: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  heroSub: { fontSize: Font.sm, color: Colors.primary, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  nameDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm, alignSelf: 'flex-start', marginTop: 4 },
  nameText: { flex: 1, marginRight: Spacing.sm },
  nameTopRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  nameTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  nameTagline: { fontSize: Font.sm, fontWeight: '500' },
  nameDesc: { fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 19 },
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  valueCard: { width: (width - Spacing.md * 2 - 10) / 2, marginBottom: 0 },
  valueIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  valueTitle: { fontSize: Font.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  valueText: { fontSize: Font.xs, color: Colors.textSecondary, lineHeight: 17 },
  uiCard: { marginBottom: Spacing.sm },
  uiRow: { flexDirection: 'row', alignItems: 'flex-start' },
  uiIconBox: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, flexShrink: 0 },
  uiText: { flex: 1 },
  uiTitle: { fontSize: Font.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  uiDesc: { fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 19 },
  metaCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaMuted: { fontSize: Font.sm, color: Colors.textMuted },
});
