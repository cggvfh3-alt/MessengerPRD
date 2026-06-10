/*
 * @Description: Tech Stack Tab
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
import { TECH_STACK } from '@/constants/prd-data';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default function TechScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(0);

  const item = TECH_STACK[selected];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ТЕХНИЧЕСКИЙ СТЕК</Text>
        <Text style={styles.headerTitle}>Архитектура системы</Text>
      </View>

      {/* Layer picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.picker}
        contentContainerStyle={styles.pickerContent}
      >
        {TECH_STACK.map((t, i) => (
          <TouchableOpacity
            key={t.layer}
            onPress={() => setSelected(i)}
            activeOpacity={0.8}
            style={[
              styles.pickerItem,
              selected === i
                ? { backgroundColor: t.color + '22', borderColor: t.color + '66' }
                : { borderColor: Colors.border },
            ]}
          >
            <MaterialIcons
              name={t.icon as any}
              size={16}
              color={selected === i ? t.color : Colors.textMuted}
            />
            <Text
              style={[
                styles.pickerLabel,
                { color: selected === i ? t.color : Colors.textMuted },
              ]}
            >
              {t.layer}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: Spacing.md }}
      >
        <SectionHeader
          icon={item.icon as any}
          title={item.layer}
          subtitle={item.tech}
          color={item.color}
          index={3}
        />

        {/* Tech badge */}
        <View style={[styles.techBadge, { backgroundColor: item.color + '15', borderColor: item.color + '44' }]}>
          <Text style={[styles.techName, { color: item.color }]}>{item.tech}</Text>
          <View style={[styles.techDot, { backgroundColor: item.color }]} />
          <Text style={styles.techStatus}>Recommended</Text>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Компоненты стека</Text>
          {item.details.map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <View style={[styles.detailNum, { backgroundColor: item.color + '22' }]}>
                <Text style={[styles.detailNumText, { color: item.color }]}>{i + 1}</Text>
              </View>
              <Text style={styles.detailText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Rationale */}
        <View style={[styles.rationaleCard, { borderColor: item.color + '33' }]}>
          <View style={styles.rationaleHeader}>
            <MaterialIcons name="lightbulb" size={16} color={item.color} />
            <Text style={[styles.rationaleLabel, { color: item.color }]}>Обоснование выбора</Text>
          </View>
          <Text style={styles.rationaleText}>{item.rationale}</Text>
        </View>

        {/* Architecture diagram placeholder */}
        <View style={styles.archCard}>
          <Text style={styles.archTitle}>Схема взаимодействия компонентов</Text>
          <View style={styles.archDiagram}>
            {['Client (Mobile/Web)', 'API Gateway', 'Microservices', 'Database Layer', 'Storage Layer'].map((layer, i, arr) => (
              <View key={layer}>
                <View style={[styles.archLayer, i === 0 ? { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '55' } : {}]}>
                  <Text style={styles.archLayerText}>{layer}</Text>
                </View>
                {i < arr.length - 1 ? (
                  <View style={styles.archArrow}>
                    <MaterialIcons name="arrow-downward" size={16} color={Colors.textMuted} />
                  </View>
                ) : null}
              </View>
            ))}
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
    color: '#A371F7',
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: Font.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  picker: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexGrow: 0,
  },
  pickerContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 5,
  },
  pickerLabel: {
    fontSize: Font.xs,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  techBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  techName: {
    fontSize: Font.md,
    fontWeight: '800',
    flex: 1,
  },
  techDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  techStatus: {
    fontSize: Font.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: 10,
  },
  detailsTitle: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  detailNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  detailNumText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailText: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  rationaleCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgCardAlt,
  },
  rationaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  rationaleLabel: {
    fontSize: Font.sm,
    fontWeight: '700',
  },
  rationaleText: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  archCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  archTitle: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  archDiagram: {
    alignItems: 'center',
  },
  archLayer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.bgSection,
    alignItems: 'center',
    minWidth: 220,
  },
  archLayerText: {
    fontSize: Font.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  archArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
});
