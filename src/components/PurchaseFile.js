import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatLong, formatShort, lira, parseAmount, todayISO } from '../logic/dates.js';
import { memberName, openBill, payerFor, purchaseGroups } from '../logic/house.js';
import { useHouse } from '../state/Store.js';
import { colors } from '../theme.js';
import Popup from './Popup.js';
import T from './Type.js';
import { Button, Field, Input, feel } from './ui.js';

export function BuyForm({ need, onDone }) {
  const { buyNeed } = useHouse();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  if (!need) return null;

  const save = (withPrice) => {
    if (!withPrice) {
      buyNeed(need.id, null);
      feel('done');
      onDone();
      return;
    }
    const amount = parseAmount(text);
    if (amount == null) {
      setError('Tutarı 42,50 gibi yaz. Boş bırakacaksan fiyatsız kaydet.');
      return;
    }
    buyNeed(need.id, amount);
    feel('done');
    onDone();
  };

  return (
    <View style={styles.buy}>
      <T weight="serif" style={styles.buyTitle}>{need.title} alındı</T>
      <T weight="medium" style={styles.buyLead}>Fiyat zorunlu değil. Yazarsan dosyada tutar görünür.</T>
      <Field label="Fiyat">
        <Input value={text} onChangeText={setText} placeholder="42,50" keyboardType="decimal-pad" />
      </Field>
      {error ? <T weight="medium" style={styles.error}>{error}</T> : null}
      <Button label="Fiyatsız alındı" tone="quiet" onPress={() => save(false)} />
      <View style={styles.gap} />
      <Button label="Bu fiyatla kaydet" onPress={() => save(true)} />
      <Pressable onPress={onDone} style={styles.link}><T weight="semi" style={styles.linkText}>Vazgeç</T></Pressable>
    </View>
  );
}

export default function PurchaseFile({ onClose }) {
  const { place, deleteNeed, restoreNeed, setNeedPrice } = useHouse();
  const [priceId, setPriceId] = useState(null);
  const [priceText, setPriceText] = useState('');
  const [priceError, setPriceError] = useState('');
  const needs = place?.needs || [];
  const groups = purchaseGroups(needs);
  const month = todayISO().slice(0, 7);
  const shopTotal = groups.reduce((sum, group) => sum + (String(group.date).startsWith(month) ? group.total : 0), 0);
  const bills = (place?.bills || []).filter((bill) => bill.amount != null && bill.amount !== '');
  const paidBills = bills.flatMap((bill) => (bill.payments || [])
    .filter((payment) => String(payment.period || '') === month)
    .map((payment) => ({ bill, payment })));
  const paidTotal = paidBills.reduce((sum, item) => sum + Number(item.bill.amount || 0), 0);

  const savePrice = (id) => {
    if (!priceText.trim()) {
      setNeedPrice(id, null);
      setPriceId(null);
      setPriceError('');
      return;
    }
    const amount = parseAmount(priceText);
    if (amount == null) {
      setPriceError('Tutarı 42,50 gibi yaz.');
      return;
    }
    setNeedPrice(id, amount);
    setPriceId(null);
    setPriceError('');
  };

  const remove = (need) => {
    Alert.alert('Dosyadan sil', `${need.title} silinsin mi? Listeye geri dönmez.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteNeed(need.id) },
    ]);
  };

  return (
    <Popup onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            <T weight="display" style={styles.head}>Alışveriş dosyası</T>
            <T weight="medium" style={styles.lead}>Alınanlar bu dosyada, tarih tarih durur. Alınacaklar listesi sade kalır.</T>
            <View style={styles.totals}>
              <T weight="semi" style={styles.totalLine}>Bu ay alışveriş · {shopTotal ? lira(shopTotal) : 'fiyat yok'}</T>
              <T weight="semi" style={styles.totalLine}>Bu ay ödenen işler · {paidTotal ? lira(paidTotal) : 'ödeme yok'}</T>
            </View>

            {groups.length ? groups.map((group) => (
              <View key={group.date} style={styles.group}>
                <T weight="serif" style={styles.day}>
                  {group.date === 'tarihsiz' ? 'Tarihi yazılmamış' : formatLong(group.date)}
                </T>
                <T weight="medium" style={styles.dayMeta}>
                  {group.items.length} ürün{group.priced ? ` · ${lira(group.total)}` : ''}
                </T>
                {group.items.map((need) => (
                  <View key={need.id} style={styles.item}>
                    <View style={styles.itemText}>
                      <T weight="semi" style={styles.itemTitle}>{need.title}</T>
                      <T weight="medium" style={styles.itemMeta}>
                        {[need.price != null ? lira(need.price) : 'Fiyat yok', need.notes].filter(Boolean).join(' · ')}
                      </T>
                    </View>
                    {priceId === need.id ? (
                      <View style={styles.priceBox}>
                        <Input value={priceText} onChangeText={setPriceText} placeholder="42,50" keyboardType="decimal-pad" />
                        {priceError ? <T weight="medium" style={styles.error}>{priceError}</T> : null}
                        <Button label="Fiyatı kaydet" onPress={() => savePrice(need.id)} />
                      </View>
                    ) : (
                      <View style={styles.actions}>
                        <Pressable onPress={() => { setPriceId(need.id); setPriceText(need.price == null ? '' : String(need.price)); setPriceError(''); }}>
                          <T weight="semi" style={styles.action}>Fiyat</T>
                        </Pressable>
                        <Pressable onPress={() => restoreNeed(need.id)}>
                          <T weight="semi" style={styles.action}>Geri al</T>
                        </Pressable>
                        <Pressable onPress={() => remove(need)}>
                          <T weight="semi" style={styles.danger}>Sil</T>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )) : <T weight="medium" style={styles.empty}>Henüz dosyaya geçen bir alışveriş yok.</T>}

            <T weight="serif" style={styles.section}>Ücretli işler</T>
            <T weight="medium" style={styles.lead}>Faturası olan işler burada. Tutar, işi kaydederken yazdığın fiyattır.</T>
            {bills.length ? bills.map((bill) => {
              const open = openBill(bill);
              const payment = (bill.payments || []).find((item) => item.period === month);
              const who = memberName(place, payment?.memberId || payerFor(bill, 0));
              return (
                <View key={bill.id} style={styles.item}>
                  <View style={styles.itemText}>
                    <T weight="semi" style={styles.itemTitle}>{bill.title}</T>
                    <T weight="medium" style={styles.itemMeta}>
                      {[lira(bill.amount), payment ? `Bu ay ödendi · ${who}` : `Açık · ${formatShort(open.due)} · ${who}`].filter(Boolean).join(' · ')}
                    </T>
                  </View>
                </View>
              );
            }) : <T weight="medium" style={styles.empty}>Tutarı yazılmış bir iş yok.</T>}

            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={16} onPress={onClose} style={styles.link}><T weight="semi" style={styles.linkText}>Kapat</T></Pressable>
          </ScrollView>
    </Popup>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 36 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  head: { fontSize: 32, color: colors.ink },
  lead: { color: colors.inkSoft, marginTop: 4, marginBottom: 12, lineHeight: 20 },
  totals: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  totalLine: { color: colors.ink, marginBottom: 4 },
  group: { marginTop: 16 },
  day: { fontSize: 22, color: colors.ink },
  dayMeta: { color: colors.inkSoft, marginBottom: 6 },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  itemText: { marginBottom: 6 },
  itemTitle: { color: colors.ink, fontSize: 17 },
  itemMeta: { color: colors.inkSoft, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 16 },
  action: { color: colors.clayDeep },
  danger: { color: colors.clayDeep },
  priceBox: { marginTop: 4 },
  section: { fontSize: 26, color: colors.ink, marginTop: 26 },
  empty: { color: colors.inkSoft, marginBottom: 8 },
  buy: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 14 },
  buyTitle: { fontSize: 24, color: colors.ink },
  buyLead: { color: colors.inkSoft, marginTop: 4, marginBottom: 8, lineHeight: 20 },
  error: { color: colors.clayDeep, marginBottom: 8 },
  gap: { height: 8 },
  link: { alignItems: 'center', marginTop: 14 },
  linkText: { color: colors.inkSoft },
});
