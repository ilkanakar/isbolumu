import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../../components/AdBanner.js';
import { useEditor } from '../../components/Editor.js';
import NeedBoard from '../../components/NeedBoard.js';
import PurchaseFile from '../../components/PurchaseFile.js';
import T from '../../components/Type.js';
import { Button, Empty } from '../../components/ui.js';
import { addDays, formatLong, todayISO } from '../../logic/dates.js';
import { agendaFor, kindLabel } from '../../logic/house.js';
import { useHouse } from '../../state/Store.js';
import { colors, tones } from '../../theme.js';

const kindName = {
  chore: 'İş',
  bill: 'Fatura',
  reminder: 'Hatırlatma',
  day: 'Gün',
  loan: 'Emanet',
  shop: 'Alınacak',
  class: 'Ders',
};

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { place } = useHouse();
  const editor = useEditor();
  const [needsOpen, setNeedsOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  if (!place) return null;
  const todayPlan = agendaFor(place, today, today);
  const tomorrowPlan = agendaFor(place, tomorrow, today);
  const homeNotes = (place.notes || []).filter((note) => note.showOnHome || note.pinned);
  const homeNeeds = (place.needs || []).filter((need) => need.showOnHome && !need.done);
  const hasFile = (place.needs || []).some((need) => need.done) || (place.bills || []).some((bill) => bill.amount);

  const openPlan = (item) => editor.open(item.edit.type, item.edit.item);

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top }}>
        <AdBanner />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.switcher}>
            <T weight="semi" style={styles.kicker}>{kindLabel(place.kind)}</T>
            <T weight="display" style={styles.place}>{place.name}</T>
            <Pressable accessibilityRole="button" onPress={() => editor.open('places')} style={styles.switchBtn}>
              <T weight="semi" style={styles.switchText}>Yer değiştir veya yeni ekle</T>
            </Pressable>
          </View>
        </View>

        <T weight="serif" style={styles.day}>{formatLong(today)}</T>
        <View style={styles.list}>
          {todayPlan.length ? todayPlan.map((item) => (
            <Pressable key={item.key} onPress={() => openPlan(item)} style={[styles.card, { borderLeftColor: tones[item.kind] || colors.clay }]}>
              <View style={styles.cardText}>
                <T weight="medium" style={styles.kind}>{kindName[item.kind] || 'Plan'}</T>
                <T weight="semi" style={styles.cardTitle}>{item.title}</T>
                {item.meta ? <T weight="medium" style={styles.cardMeta}>{item.meta}</T> : null}
              </View>
              {item.edit.type === 'mark' ? <T weight="semi" style={styles.mark}>İşaretle</T> : null}
            </Pressable>
          )) : <Empty text="Bugün plan yok. Takvimden ekleyebilirsin." />}
        </View>

        {homeNotes.length ? (
          <View style={styles.box}>
            <T weight="serif" style={styles.boxTitle}>Notlar</T>
            {homeNotes.map((note) => (
              <Pressable key={note.id} onPress={() => editor.open('note', note)} style={styles.line}>
                <T weight="semi" style={styles.lineTitle}>{note.title}</T>
                {note.body ? <T weight="medium" style={styles.lineMeta}>{note.body}</T> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {homeNeeds.length ? (
          <Pressable accessibilityRole="button" onPress={() => setNeedsOpen(true)} style={styles.box}>
            <T weight="serif" style={styles.boxTitle}>Alınacaklar</T>
            <T weight="medium" style={styles.lineMeta}>Listeyi aç, aldıklarını tikle.</T>
            {(homeNeeds).slice(0, 4).map((need) => (
              <View key={need.id} style={styles.line}>
                <T weight="semi" style={styles.lineTitle}>{need.title}</T>
              </View>
            ))}
          </Pressable>
        ) : null}
        {hasFile ? (
          <Pressable accessibilityRole="button" onPress={() => setFileOpen(true)} style={styles.box}>
            <T weight="serif" style={styles.boxTitle}>Alışveriş dosyası</T>
            <T weight="medium" style={styles.lineMeta}>Alınanlar ve ücretli işlerin tutarı burada.</T>
          </Pressable>
        ) : null}
        {needsOpen ? <NeedBoard onClose={() => setNeedsOpen(false)} onOpenFile={() => { setNeedsOpen(false); setFileOpen(true); }} /> : null}
        {fileOpen ? <PurchaseFile onClose={() => setFileOpen(false)} /> : null}

        <View style={styles.tomorrow}>
          <T weight="serif" style={styles.tomorrowTitle}>Yarın</T>
          {tomorrowPlan.length ? tomorrowPlan.map((item) => (
            <Pressable key={item.key} onPress={() => openPlan(item)} style={styles.tomorrowRow}>
              <T weight="medium" style={styles.kind}>{kindName[item.kind]}</T>
              <T weight="semi" style={styles.tomorrowName}>{item.title}</T>
              {item.meta ? <T weight="medium" style={styles.tomorrowWho}>{item.meta}</T> : null}
            </Pressable>
          )) : <T weight="medium" style={styles.tomorrowEmpty}>Yarın plan yok.</T>}
        </View>

        <View style={styles.add}>
          <Button label="İş ekle" onPress={() => editor.open('task')} />
          <View style={styles.gap} />
          <Button label="Alınacak ekle" tone="quiet" onPress={() => editor.open('need')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  switcher: { flex: 1 },
  kicker: { letterSpacing: 1.4, textTransform: 'uppercase', color: colors.faint, fontSize: 12 },
  place: { fontSize: 34, color: colors.ink, marginTop: 2 },
  switchBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.clay,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchText: { color: colors.white, fontSize: 14 },
  day: { fontSize: 22, color: colors.ink, marginTop: 18 },
  list: { gap: 8, marginTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 5,
    padding: 14,
    gap: 10,
  },
  cardText: { flex: 1 },
  kind: { color: colors.faint, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardTitle: { fontSize: 17, color: colors.ink, marginTop: 2 },
  cardMeta: { color: colors.inkSoft, marginTop: 3 },
  mark: { color: colors.clayDeep, fontSize: 13 },
  box: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  boxTitle: { fontSize: 22, color: colors.ink, marginBottom: 6 },
  line: { paddingVertical: 8 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineTitle: { color: colors.ink, fontSize: 16 },
  lineMeta: { color: colors.inkSoft, marginTop: 2 },
  tomorrow: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  tomorrowTitle: { fontSize: 22, color: colors.ink, marginBottom: 8 },
  tomorrowRow: { paddingVertical: 8 },
  tomorrowName: { color: colors.ink, marginTop: 2 },
  tomorrowWho: { color: colors.inkSoft, marginTop: 2 },
  tomorrowEmpty: { color: colors.inkSoft },
  add: { marginTop: 18 },
  gap: { height: 10 },
});
