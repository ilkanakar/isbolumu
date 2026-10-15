import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, tones } from '../theme.js';
import T from './Type.js';

export function feel(kind = 'tap') {
  const run = kind === 'done'
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Promise.resolve(run).catch(() => {});
}

export function Button({ label, onPress, tone = 'clay', disabled = false }) {
  const background = tone === 'ink' ? colors.ink : tone === 'quiet' ? colors.card : colors.clay;
  const text = tone === 'quiet' ? colors.ink : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        feel();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: tone === 'quiet' ? colors.line : background },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <T weight="semi" style={[styles.buttonText, { color: text }]}>{label}</T>
    </Pressable>
  );
}

export function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <T weight="semi" style={styles.fieldLabel}>{label}</T>
      {children}
    </View>
  );
}

export const Input = forwardRef(function Input({ style, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.faint}
      {...props}
      style={[styles.input, style]}
    />
  );
});

export function Chips({ options, value, onChange, multiple = false }) {
  const selected = multiple ? value : [value];
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => {
              feel();
              if (!multiple) {
                onChange(option.id);
                return;
              }
              onChange(on ? value.filter((item) => item !== option.id) : [...value, option.id]);
            }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <T weight="semi" style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ member, size = 36 }) {
  const letter = (member?.name || '?').trim().charAt(0).toLocaleUpperCase('tr');
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: member?.color || colors.clay }]}>
      <T weight="bold" style={{ color: colors.white, fontSize: size * 0.38 }}>{letter}</T>
    </View>
  );
}

export function Item({ tone = 'chore', title, meta, extra, action, onAction, onPress }) {
  return (
    <View style={[styles.item, { borderLeftColor: tones[tone] || colors.line }]}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.itemBody}>
        <T weight="semi" style={styles.itemTitle}>{title}</T>
        {meta ? <T weight="medium" style={styles.itemMeta}>{meta}</T> : null}
        {extra ? <T weight="medium" style={styles.itemExtra}>{extra}</T> : null}
      </Pressable>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            feel('done');
            onAction?.();
          }}
          style={styles.action}
        >
          <T weight="semi" style={styles.actionText}>{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Section({ title, hint, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <T weight="serif" style={styles.sectionTitle}>{title}</T>
        {hint ? <T weight="medium" style={styles.hint}>{hint}</T> : null}
      </View>
      {children}
    </View>
  );
}

export function Empty({ text }) {
  return (
    <View style={styles.empty}>
      <T weight="medium" style={styles.emptyText}>{text}</T>
    </View>
  );
}

export function Seg({ options, value, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable key={option.id} accessibilityRole="button" onPress={() => onChange(option.id)} style={[styles.segItem, on && styles.segOn]}>
            <T weight="semi" style={[styles.segText, on && styles.segTextOn]}>{option.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  buttonText: { fontSize: 16 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: colors.inkSoft, marginBottom: 8 },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.medium,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.white },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 12,
    marginBottom: 8,
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 16, color: colors.ink },
  itemMeta: { fontSize: 13, color: colors.inkSoft, marginTop: 3 },
  itemExtra: { fontSize: 13, color: colors.faint, marginTop: 2 },
  action: {
    backgroundColor: colors.paperDeep,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { fontSize: 13, color: colors.clayDeep },
  section: { marginTop: 22 },
  sectionHead: { marginBottom: 10 },
  sectionTitle: { fontSize: 26, color: colors.ink },
  hint: { color: colors.inkSoft, marginTop: 2, fontSize: 13 },
  empty: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    padding: 16,
  },
  emptyText: { color: colors.inkSoft, fontSize: 15, lineHeight: 21 },
  seg: {
    flexDirection: 'row',
    backgroundColor: colors.paperDeep,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segItem: { flex: 1, alignItems: 'center', borderRadius: 11, paddingVertical: 8 },
  segOn: { backgroundColor: colors.card },
  segText: { fontSize: 13, color: colors.inkSoft },
  segTextOn: { color: colors.ink },
});
