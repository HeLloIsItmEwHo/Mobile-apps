import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function getDealTier(score) {
  if (score >= 9) return { label: 'GOLDMINE FOUND!', emoji: '🎯', color: colors.gold };
  if (score >= 7.5) return { label: 'HOT FLIP', emoji: '🔥', color: colors.magenta };
  if (score >= 5.5) return { label: 'SOLID DEAL', emoji: '👍', color: colors.profit };
  if (score >= 3.5) return { label: 'THIN MARGIN', emoji: '🤔', color: colors.textSecondary };
  return { label: 'SKIP IT', emoji: '⚠️', color: colors.danger };
}

export default function DealScoreBadge({ score }) {
  const tier = getDealTier(score);
  return (
    <View style={[styles.container, { borderColor: tier.color, shadowColor: tier.color }]}>
      <Text style={[styles.score, { color: tier.color }]}>
        {score.toFixed(1)}
        <Text style={styles.scoreMax}> / 10</Text>
      </Text>
      <Text style={[styles.label, { color: tier.color }]}>
        {tier.emoji} {tier.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  score: { fontSize: 40, fontWeight: '800' },
  scoreMax: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  label: { fontSize: 15, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
});
