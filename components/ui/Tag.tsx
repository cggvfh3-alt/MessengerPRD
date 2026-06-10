// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';

interface TagProps {
  label: string;
  color?: string;
  borderColor?: string;
}

export function Tag({ label, color = Colors.tag1, borderColor = Colors.tag1Border }: TagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: color, borderColor }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Font.xs,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});
