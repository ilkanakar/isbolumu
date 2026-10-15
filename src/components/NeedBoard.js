import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatShort } from '../logic/dates.js';
import { sharePlanPdf } from '../services/sharePlan.js';
import { useHouse } from '../state/Store.js';
import { colors } from '../theme.js';
import { useEditor } from './Editor.js';
import T from './Type.js';
import { Button, feel } from './ui.js';

export default function NeedBoard({ onClose }) {
  const { place, toggleNeed } = useHouse();
  const editor = useEditor();
  const needs = [...(place?.needs || [])].sort((a, b) => Number(a.done) - Number(b.done));
  const open = needs.filter((need) => !need.done);
  const done = needs.filter((need) => need.done);

  const tick = (id) => {
    feel('done');
    toggleNeed(id);
  };

  const line = (need) => (
    <Pressable key={need.id} accessibilityRole="checkbox" accessibilityState={{ checked: need.done }} onPress={() => tick(need.id)} style={styles.line}>
      <View style={[styles.box, need.done && styles.boxOn]}>
        {need.done ? <T weight="bold" style={styles.tick}>✓</T> : null}
      </View>
      <View style={styles.text}>
        <T weight="semi" style={[styles.title, need.done && styles.done]}>{need.title}</T>
        {[need.date ? formatShort(need.date) : '', need.notes].filter(Boolean).join(' · ') ? (
          <T weight="medium" style={styles.meta}>{[need.date ? formatShort(need.date) : '', need.notes].filter(Boolean).join(' · ')}</T>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.body}>
            <T weight="display" style={styles.head}>Alınacaklar</T>
            <T weight="medium" style={styles.lead}>Tiklenen alındı sayılır. Tik kalkınca yine alınacaklarda durur.</T>
            {open.length ? open.map(line) : <T weight="medium" style={styles.empty}>Alınacak bir şey kalmadı.</T>}
            {done.length ? <T weight="serif" style={styles.section}>Alınanlar</T> : null}
            {done.map(line)}
            <View style={styles.actions}>
              <Button label="Satır ekle" onPress={() => { onClose(); editor.open('need'); }} />
              <View style={styles.gap} />
              <Button
                label="Listeyi PDF paylaş"
                tone="quiet"
                onPress={() => sharePlanPdf(place, { needsOnly: true, mode: 'day' }).catch(() => {})}
              />
            </View>
            <Pressable onPress={onClose} style={styles.close}><T weight="semi" style={styles.closeText}>Kapat</T></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,26,22,0.35)' },
  sheet: { maxHeight: '88%', backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  body: { padding: 20, paddingBottom: 36 },
  head: { fontSize: 32, color: colors.ink },
  lead: { color: colors.inkSoft, marginTop: 4, marginBottom: 14, lineHeight: 20 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  boxOn: { backgroundColor: colors.moss, borderColor: colors.moss },
  tick: { color: colors.white, fontSize: 16 },
  text: { flex: 1 },
  title: { color: colors.ink, fontSize: 17 },
  done: { color: colors.faint, textDecorationLine: 'line-through' },
  meta: { color: colors.inkSoft, marginTop: 2 },
  empty: { color: colors.inkSoft, marginBottom: 12 },
  section: { fontSize: 22, color: colors.ink, marginTop: 18, marginBottom: 4 },
  actions: { marginTop: 18 },
  gap: { height: 8 },
  close: { alignItems: 'center', marginTop: 14 },
  closeText: { color: colors.inkSoft },
});
