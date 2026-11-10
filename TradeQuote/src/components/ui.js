import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, testID }) {
  const palette = {
    primary: [colors.primary, '#fff'],
    accent: [colors.accent, '#fff'],
    ghost: ['transparent', colors.primary],
    soft: [colors.primarySoft, colors.primary],
    danger: [colors.dangerSoft, colors.danger],
  }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette[0], opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        variant === 'ghost' && styles.buttonGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette[1]} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette[1]} /> : null}
          <Text style={[styles.buttonText, { color: palette[1] }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, prefix, suffix, style, inputStyle, multiline, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label || inputProps.placeholder}
          placeholderTextColor={colors.faint}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          {...inputProps}
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon, color = colors.primary, testID }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? '#fff' : colors.sub} /> : null}
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Header({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export const STATUS = {
  draft: { label: 'Draft', fg: colors.sub, bg: '#EDF0F3' },
  sent: { label: 'Sent', fg: colors.info, bg: colors.infoSoft },
  accepted: { label: 'Accepted', fg: colors.success, bg: colors.successSoft },
  declined: { label: 'Declined', fg: colors.danger, bg: colors.dangerSoft },
};

export function StatusPill({ status }) {
  const meta = STATUS[status] || STATUS.draft;
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.pillText, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonGhost: { borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: 16, fontWeight: '700' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 48 },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: 8 },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: colors.ink, paddingVertical: 8 },
  inputMultiline: { minHeight: 84 },
  affix: { fontSize: 16, color: colors.sub, marginHorizontal: 2 },
  hint: { fontSize: 12, color: colors.sub, marginTop: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.sub, letterSpacing: 0.8, textTransform: 'uppercase' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: colors.bg },
  headerBack: { marginLeft: -6, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  headerSub: { fontSize: 13, color: colors.sub, marginTop: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '700' },
});
