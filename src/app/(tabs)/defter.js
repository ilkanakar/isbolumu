import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../../components/AdBanner.js';
import { useEditor } from '../../components/Editor.js';
import { DayItem, LessonItem, LoanItem, NeedItem, NoteItem, ReminderItem } from '../../components/records.js';
import T from '../../components/Type.js';
import { Button, Empty, Seg } from '../../components/ui.js';
import { nextSpecialDate } from '../../logic/dates.js';
import { useHouse } from '../../state/Store.js';
import { colors } from '../../theme.js';

const tabs = [
  { id: 'liste', label: 'Liste' },
  { id: 'ders', label: 'Ders' },
  { id: 'not', label: 'Not' },
  { id: 'gun', label: 'Gün' },
  { id: 'hatir', label: 'Hatır' },
  { id: 'emanet', label: 'Emanet' },
];

export default function NotebookScreen() {
  const insets = useSafeAreaInsets();
  const { place } = useHouse();
  const editor = useEditor();
  const [tab, setTab] = useState('liste');
  if (!place) return null;
  const openLoans = place.loans.filter((loan) => !loan.settled);
  const shutLoans = place.loans.filter((loan) => loan.settled);
  const days = [...place.days].sort((a, b) => nextSpecialDate(a).localeCompare(nextSpecialDate(b)));
  const notes = [...place.notes].sort((a, b) => Number(b.showOnHome || b.pinned) - Number(a.showOnHome || a.pinned) || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const needs = [...(place.needs || [])].sort((a, b) => Number(a.done) - Number(b.done));
  const lessons = place.lessons || [];
  const addType = { liste: 'need', ders: 'lesson', not: 'note', gun: 'day', hatir: 'reminder', emanet: 'loan' }[tab];

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top }}>
        <AdBanner />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      <T weight="semi" style={styles.kicker}>Defter</T>
      <T weight="display" style={styles.title}>Kayıtlar</T>
      <T weight="medium" style={styles.lead}>Alınacaklar, ders, not, özel gün ve emanet.</T>
      <Seg options={tabs} value={tab} onChange={setTab} />

      {tab === 'liste' ? (
        needs.length ? needs.map((need) => <NeedItem key={need.id} need={need} />) : <Empty text="Süt, deterjan, ampul. Geç tuşu alt satırı açar." />
      ) : null}
      {tab === 'ders' ? (
        lessons.length ? lessons.map((lesson) => <LessonItem key={lesson.id} lesson={lesson} />) : <Empty text="Ders gününü ve saatini yaz. Sınavı da aynı yerden ekle." />
      ) : null}
      {tab === 'emanet' ? (
        <View>
          {openLoans.length ? openLoans.map((loan) => <LoanItem key={loan.id} loan={loan} />) : <Empty text="Verdiğin ya da aldığın bir şey yok." />}
          {shutLoans.length ? <T weight="semi" style={styles.shut}>Kapananlar</T> : null}
          {shutLoans.map((loan) => <LoanItem key={loan.id} loan={loan} />)}
        </View>
      ) : null}
      {tab === 'hatir' ? (
        place.reminders.length
          ? place.reminders.map((reminder) => <ReminderItem key={reminder.id} reminder={reminder} />)
          : <Empty text="Günlük, haftalık, aylık ya da yıllık. Bir kez de olur." />
      ) : null}
      {tab === 'gun' ? (
        days.length ? days.map((day) => <DayItem key={day.id} entry={day} />) : <Empty text="Doğum günü ve yıldönümü her yıl aynı gün hatırlatılır." />
      ) : null}
      {tab === 'not' ? (
        notes.length ? notes.map((note) => <NoteItem key={note.id} note={note} />) : <Empty text="Wi-Fi şifresi, kargo notu. Ana sayfada durmasını ayrıca seçersin." />
      ) : null}

      <View style={styles.add}>
        <Button label="Ekle" onPress={() => editor.open(addType)} />
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  kicker: { letterSpacing: 1.4, textTransform: 'uppercase', color: colors.faint, fontSize: 12 },
  title: { fontSize: 40, color: colors.ink, marginTop: 4 },
  lead: { color: colors.inkSoft, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  shut: { marginTop: 12, marginBottom: 8, color: colors.inkSoft },
  add: { marginTop: 16 },
});
