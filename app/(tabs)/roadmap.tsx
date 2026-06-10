/*
 * @Description: Roadmap Tab — 3-month development plan
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
import { ROADMAP } from '@/constants/prd-data';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default function RoadmapScreen() {
  const insets = useSafeAreaInsets();
  const [activeMonth, setActiveMonth] = useState(0);

  const month = ROADMAP[activeMonth];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ПЛАН РАЗРАБОТКИ</Text>
        <Text style={styles.headerTitle}>Роадмап · 3 месяца</Text>
      </View>

      {/* Month tabs */}
      <View style={styles.monthTabs}>
        {ROADMAP.map((m, i) => (
          <TouchableOpacity
            key={m.month}
            onPress={() => setActiveMonth(i)}
            activeOpacity={0.8}
            style={[
              styles.monthTab,
              activeMonth === i
                ? { backgroundColor: m.color, borderColor: m.color }
                : { borderColor: Colors.border },
            ]}
          >
            <Text
              style={[
                styles.monthTabText,
                { color: activeMonth === i ? Colors.textInverse : Colors.textMuted },
              ]}
            >
              {m.month}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: Spacing.md }}
      >
        <SectionHeader
          icon="timeline"
          title={month.month}
          subtitle={month.subtitle}
          color={month.color}
          index={5}
        />

        {/* Deliverable banner */}
        <View style={[styles.deliverable, { borderColor: month.color + '55', backgroundColor: month.color + '11' }]}>
          <MaterialIcons name="emoji-events" size={18} color={month.color} />
          <View style={styles.deliverableText}>
            <Text style={[styles.deliverableLabel, { color: month.color }]}>Результат месяца</Text>
            <Text style={styles.deliverableValue}>{month.deliverable}</Text>
          </View>
        </View>

        {/* Weeks */}
        {month.weeks.map((week, wi) => (
          <View key={wi} style={styles.weekBlock}>
            {/* Timeline dot */}
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: month.color }]} />
              {wi < month.weeks.length - 1 ? (
                <View style={[styles.timelineLine, { backgroundColor: month.color + '33' }]} />
              ) : null}
            </View>

            <View style={styles.weekContent}>
              <View style={[styles.weekHeader, { backgroundColor: month.color + '15', borderColor: month.color + '33' }]}>
                <Text style={[styles.weekRange, { color: month.color }]}>{week.week}</Text>
                <Text style={styles.weekTitle}>{week.title}</Text>
              </View>

              <View style={styles.taskList}>
                {week.tasks.map((task, ti) => (
                  <View key={ti} style={styles.taskRow}>
                    <View style={[styles.taskCheck, { borderColor: month.color + '66' }]}>
                      <MaterialIcons name="radio-button-unchecked" size={14} color={month.color} />
                    </View>
                    <Text style={styles.taskText}>{task}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* Total tasks count */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            {ROADMAP.map((m) => {
              const totalTasks = m.weeks.reduce((acc, w) => acc + w.tasks.length, 0);
              return (
                <View key={m.month} style={styles.totalItem}>
                  <View style={[styles.totalDot, { backgroundColor: m.color }]} />
                  <Text style={[styles.totalNum, { color: m.color }]}>{totalTasks}</Text>
                  <Text style={styles.totalLabel}>задач</Text>
                  <Text style={styles.totalMonth}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Overall timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Общая временная шкала</Text>
          <View style={styles.timelineBar}>
            {ROADMAP.map((m, i) => (
              <View
                key={m.month}
                style={[
                  styles.timelineSegment,
                  { backgroundColor: m.color, opacity: activeMonth === i ? 1 : 0.4 },
                ]}
              >
                <Text style={styles.timelineSegLabel}>{m.month}</Text>
              </View>
            ))}
          </View>
          <View style={styles.timelineLabels}>
            <Text style={styles.timelineLabelText}>Старт</Text>
            <Text style={styles.timelineLabelText}>Середина</Text>
            <Text style={styles.timelineLabelText}>Релиз</Text>
          </View>
        </View>

        {/* Success criteria */}
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Критерии успеха релиза</Text>
          {[
            'Регистрация и отправка сообщений менее 3 сек',
            'Доставка сообщения менее 100 мс (p95)',
            '99.9% uptime SLA первый месяц после релиза',
            'Оценка в сторах 4.5+ на основе первых 100 отзывов',
            'Время сборки и деплоя менее 10 минут',
          ].map((c, i) => (
            <View key={i} style={styles.successRow}>
              <MaterialIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.successText}>{c}</Text>
            </View>
          ))}
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
    color: Colors.success,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: Font.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  monthTabs: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  monthTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  monthTabText: {
    fontSize: Font.sm,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  deliverable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  deliverableText: {
    flex: 1,
  },
  deliverableLabel: {
    fontSize: Font.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  deliverableValue: {
    fontSize: Font.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  weekBlock: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 14,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    minHeight: 40,
  },
  weekContent: {
    flex: 1,
  },
  weekHeader: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  weekRange: {
    fontSize: Font.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekTitle: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  taskList: {
    gap: 8,
    paddingLeft: Spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  taskCheck: {
    marginTop: 1,
    flexShrink: 0,
  },
  taskText: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  totalCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
    gap: 2,
  },
  totalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  totalNum: {
    fontSize: Font.xl,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: Font.xs,
    color: Colors.textMuted,
  },
  totalMonth: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  timelineCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  timelineTitle: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  timelineBar: {
    flexDirection: 'row',
    height: 36,
    borderRadius: Radius.md,
    overflow: 'hidden',
    gap: 2,
  },
  timelineSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineSegLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  timelineLabelText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  successCard: {
    backgroundColor: Colors.success + '11',
    borderWidth: 1,
    borderColor: Colors.success + '44',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 10,
  },
  successTitle: {
    fontSize: Font.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  successText: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
