// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';

interface SectionHeaderProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  color?: string;
  index?: number;
}

export function SectionHeader({ icon, title, subtitle, color = Colors.primary, index }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.text}>
        {index !== undefined && (
          <Text style={[styles.index, { color }]}>0{index}</Text>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  text: {
    flex: 1,
  },
  index: {
    fontSize: Font.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 1,
  },
  title: {
    fontSize: Font.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Font.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
