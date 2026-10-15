import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatShort } from '../logic/dates.js';
import { sharePlanPdf } from '../services/sharePlan.js';
import { useHouse } from '../state/Store.js';
import { colors } from '../theme.js';
import { useEditor } from './Editor.js';
import { BuyForm } from './PurchaseFile.js';
import Popup from './Popup.js';
import T from './Type.js';
import { Button } from './ui.js';

export default function NeedBoard({ onClose, onOpenFile }) {
  const { place } = useHouse();
  const editor = useEditor();
  const [buying, setBuying] = useState(null);
  const open = (place?.needs || []).filter((need) => !need.done);
  const buyingNeed = open.find((need) => need.id === buying) || null;

  return (
    <Popup onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <T weight="display" style={styles.head}>Alınacaklar</T>
        <T weight="medium" style={styles.lead}>Kutuya basınca alındı olur ve alışveriş dosyasına geçer. Bu liste yalnız alınacakları gösterir.</T>
        {buyingNeed ? <BuyForm need={buyingNeed} onDone={() => setBuying(null)} /> : null}
        {open.length ? open.map((need) => (
          <Pressable key={need.id} accessibilityRole="checkbox" onPress={() => setBuying(need.id)} style={styles.line}>
            <View style={styles.box} />
            <View style={styles.text}>
              <T weight="semi" style={styles.title}>{need.title}</T>
              {[need.date ? formatShort(need.date) : '', need.notes].filter(Boolean).join(' · ') ? (
                <T weight="medium" style={styles.meta}>{[need.date ? formatShort(need.date) : '', need.notes].filter(Boolean).join(' · ')}</T>
              ) : null}
            </View>
          </Pressable>
        )) : <T weight="medium" style={styles.empty}>Alınacak bir şey kalmadı.</T>}
        <View style={styles.actions}>
          <Button label="Yeni alınacak ekle" onPress={() => { onClose(); editor.open('need'); }} />
          <View style={styles.gap} />
          <Button label="Alışveriş dosyası" tone="quiet" onPress={onOpenFile} />
          <View style={styles.gap} />
              <Button
                label="Raporu PDF paylaş"
                tone="quiet"
                onPress={() => sharePlanPdf(place, { needsOnly: true, mode: 'week' }).catch(() => {})}
              />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={16} onPress={onClose} style={styles.close}><T weight="semi" style={styles.closeText}>Kapat</T></Pressable>
      </ScrollView>
    </Popup>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 36 },
  scroll: { flexGrow: 0, flexShrink: 1 },
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
