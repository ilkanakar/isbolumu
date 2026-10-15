import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { addDays, formatLong, todayISO } from '../logic/dates.js';
import { exportPlanToCalendar, sharePlanPdf } from '../services/sharePlan.js';
import { colors } from '../theme.js';
import Popup from './Popup.js';
import T from './Type.js';
import { Button, Chips, Field } from './ui.js';

const PARTS = [
  ['tasks', 'İşler'],
  ['needs', 'Alınacaklar'],
  ['days', 'Özel günler'],
  ['bills', 'Faturalar'],
  ['reminders', 'Hatırlatmalar'],
  ['loans', 'Emanet'],
  ['lessons', 'Ders ve sınav'],
];

function DayStep({ label, value, onChange }) {
  return (
    <View style={styles.step}>
      <T weight="semi" style={styles.stepLabel}>{label}</T>
      <View style={styles.stepRow}>
        <Pressable accessibilityRole="button" onPress={() => onChange(addDays(value, -1))} style={styles.arrow}><T weight="bold">‹</T></Pressable>
        <T weight="semi" style={styles.stepValue}>{formatLong(value)}</T>
        <Pressable accessibilityRole="button" onPress={() => onChange(addDays(value, 1))} style={styles.arrow}><T weight="bold">›</T></Pressable>
      </View>
    </View>
  );
}

export default function ShareSheet({ place, onClose }) {
  const today = todayISO();
  const [mode, setMode] = useState('week');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 6));
  const [personId, setPersonId] = useState('');
  const [parts, setParts] = useState({
    tasks: true, needs: true, days: true, bills: true, reminders: true, loans: true, lessons: true,
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!place) return null;

  const options = () => ({
    mode,
    from,
    to: to < from ? from : to,
    personId: personId || null,
    parts,
    today,
  });

  const run = async (task) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await task();
      if (typeof result === 'number') setMessage(result ? `${result} kayıt takvime yazıldı.` : 'Bu kayıtlar takvimde zaten var.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Paylaşım açılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popup onClose={onClose}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <T weight="display" style={styles.title}>İşleri paylaş</T>
            <T weight="medium" style={styles.lead}>Seçtiğin günler PDF olur. Çıktı alıp eve asabilirsin. Aynı seçim telefon takvimine de yazılır.</T>
            <Field label="Aralık">
              <Chips
                options={[
                  { id: 'day', label: 'Bugün' },
                  { id: 'week', label: 'Bu hafta' },
                  { id: 'month', label: 'Bu ay' },
                  { id: 'custom', label: 'Tarih seç' },
                ]}
                value={mode}
                onChange={setMode}
              />
            </Field>
            {mode === 'custom' ? (
              <View>
                <DayStep label="Başlangıç" value={from} onChange={setFrom} />
                <DayStep label="Bitiş" value={to < from ? from : to} onChange={setTo} />
              </View>
            ) : null}
            <Field label="Kişi">
              <Chips
                options={[{ id: '', label: 'Herkes' }, ...(place.members || []).map((member) => ({ id: member.id, label: member.name }))]}
                value={personId}
                onChange={setPersonId}
              />
            </Field>
            <Field label="Neler gitsin">
              <Chips
                multiple
                options={PARTS.map(([id, label]) => ({ id, label }))}
                value={PARTS.filter(([id]) => parts[id]).map(([id]) => id)}
                onChange={(ids) => {
                  const next = {};
                  PARTS.forEach(([id]) => { next[id] = ids.includes(id); });
                  setParts(next);
                }}
              />
            </Field>
            {message ? <T weight="medium" style={styles.message}>{message}</T> : null}
            <Button label={busy ? 'Hazırlanıyor' : 'PDF paylaş'} disabled={busy} onPress={() => run(() => sharePlanPdf(place, options()))} />
            <View style={styles.gap} />
            <Button label="Alışveriş raporu" tone="quiet" disabled={busy} onPress={() => run(() => sharePlanPdf(place, { ...options(), needsOnly: true }))} />
            <View style={styles.gap} />
            <Button label="Telefon takvimine aktar" tone="quiet" disabled={busy} onPress={() => run(() => exportPlanToCalendar(place, options()))} />
            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={16} onPress={onClose} style={styles.close}><T weight="semi" style={styles.closeText}>Kapat</T></Pressable>
          </ScrollView>
    </Popup>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 36 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  title: { fontSize: 32, color: colors.ink },
  lead: { color: colors.inkSoft, marginTop: 6, marginBottom: 8, lineHeight: 20 },
  step: { marginBottom: 10 },
  stepLabel: { color: colors.inkSoft, marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8, paddingVertical: 8 },
  stepValue: { color: colors.ink, flex: 1, textAlign: 'center' },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  message: { color: colors.clayDeep, marginBottom: 10 },
  gap: { height: 8 },
  close: { alignItems: 'center', marginTop: 16 },
  closeText: { color: colors.inkSoft },
});
