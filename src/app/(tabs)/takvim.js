import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../../components/AdBanner.js';
import { useEditor } from '../../components/Editor.js';
import T from '../../components/Type.js';
import { Button, Empty } from '../../components/ui.js';
import {
  formatLong,
  formatMonthYear,
  iso,
  monthGrid,
  parseISO,
  shiftMonth,
  todayISO,
  weekdayName,
} from '../../logic/dates.js';
import { agendaFor, monthMarks } from '../../logic/house.js';
import { useHouse } from '../../state/Store.js';
import { colors, tones } from '../../theme.js';

const heads = [1, 2, 3, 4, 5, 6, 0];

function Pip({ kind }) {
  if (kind === 'bill') return <View style={[styles.pipSq, { backgroundColor: tones.bill }]} />;
  if (kind === 'reminder') return <View style={[styles.pipRing, { borderColor: tones.reminder }]} />;
  if (kind === 'day') return <View style={[styles.pipDiamond, { backgroundColor: tones.day }]} />;
  if (kind === 'loan') return <View style={[styles.pipDash, { backgroundColor: tones.loan }]} />;
  if (kind === 'shop') return <View style={styles.pipTri} />;
  return <View style={[styles.pipDot, { backgroundColor: tones.chore }]} />;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { place } = useHouse();
  const editor = useEditor();
  const today = todayISO();
  const now = parseISO(today);
  const [cursor, setCursor] = useState({ y: now.y, m: now.m });
  const [selected, setSelected] = useState(today);
  if (!place) return null;
  const marks = monthMarks(place, cursor.y, cursor.m, today);
  const cells = monthGrid(cursor.y, cursor.m);
  const cell = Math.floor((width - 32) / 7);
  const agenda = agendaFor(place, selected, today);

  const move = (delta) => {
    const next = shiftMonth(cursor.y, cursor.m, delta);
    setCursor(next);
    if (next.y === now.y && next.m === now.m) setSelected(today);
    else setSelected(iso(next.y, next.m, 1));
  };

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top }}>
        <AdBanner />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      <T weight="semi" style={styles.kicker}>Takvim</T>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" onPress={() => move(-1)} style={styles.arrow}><T weight="bold" style={styles.arrowText}>‹</T></Pressable>
        <T weight="display" style={styles.month}>{formatMonthYear(cursor.y, cursor.m)}</T>
        <Pressable accessibilityRole="button" onPress={() => move(1)} style={styles.arrow}><T weight="bold" style={styles.arrowText}>›</T></Pressable>
      </View>

      <View style={styles.week}>
        {heads.map((day) => (
          <View key={day} style={{ width: cell }}>
            <T weight="semi" style={styles.weekText}>{weekdayName(day, true)}</T>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((item, index) => {
          if (!item) return <View key={`e-${index}`} style={{ width: cell, height: cell }} />;
          const on = item.iso === selected;
          const isToday = item.iso === today;
          const dots = marks[item.iso] || [];
          return (
            <Pressable key={item.iso} onPress={() => setSelected(item.iso)} style={[styles.cell, { width: cell, height: cell }]}>
              <View style={[styles.bubble, on && styles.bubbleOn, !on && isToday && styles.bubbleToday]}>
                <T weight="semi" style={[styles.day, on && styles.dayOn]}>{item.day}</T>
              </View>
              <View style={styles.dots}>
                {dots.slice(0, 4).map((kind) => <Pip key={kind} kind={kind} />)}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        {[['chore', 'İş'], ['bill', 'Fatura'], ['reminder', 'Hatırlatma'], ['day', 'Gün'], ['loan', 'Emanet'], ['shop', 'Alınacak']].map(([kind, label]) => (
          <View key={kind} style={styles.legendItem}>
            <Pip kind={kind} />
            <T weight="medium" style={styles.legendText}>{label}</T>
          </View>
        ))}
      </View>

      <T weight="serif" style={styles.selected}>{formatLong(selected)}</T>
      {agenda.length ? agenda.map((item) => (
        <Pressable key={item.key} onPress={() => editor.open(item.edit.type, item.edit.item)} style={[styles.row, { borderLeftColor: tones[item.kind] }]}>
          <View style={styles.rowHead}>
            <Pip kind={item.kind} />
            <T weight="semi" style={styles.rowTitle}>{item.title}</T>
          </View>
          {item.meta ? <T weight="medium" style={styles.rowMeta}>{item.meta}</T> : null}
        </Pressable>
      )) : <Empty text="Bu günde kayıt yok." />}

      <View style={styles.add}>
        <Button label="Bu güne ekle" onPress={() => editor.open('create', { date: selected })} />
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  kicker: { letterSpacing: 1.4, textTransform: 'uppercase', color: colors.faint, fontSize: 12, paddingHorizontal: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  month: { fontSize: 32, color: colors.ink },
  arrow: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, color: colors.ink },
  week: { flexDirection: 'row', marginTop: 8 },
  weekText: { textAlign: 'center', color: colors.faint, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bubbleOn: { backgroundColor: colors.clay },
  bubbleToday: { borderWidth: 1.5, borderColor: colors.clay },
  day: { color: colors.ink, fontSize: 15 },
  dayOn: { color: colors.white },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 10, marginTop: 1 },
  pipDot: { width: 8, height: 8, borderRadius: 4 },
  pipSq: { width: 8, height: 8, borderRadius: 1 },
  pipRing: { width: 8, height: 8, borderRadius: 4, borderWidth: 2.5, backgroundColor: 'transparent' },
  pipDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }] },
  pipDash: { width: 10, height: 4, borderRadius: 2 },
  pipTri: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0F766E',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: colors.inkSoft, fontSize: 12 },
  selected: { fontSize: 26, color: colors.ink, marginTop: 18, marginBottom: 10, paddingHorizontal: 4 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 16, color: colors.ink, flex: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMeta: { color: colors.inkSoft, marginTop: 3 },
  add: { marginTop: 12, paddingHorizontal: 4 },
});
