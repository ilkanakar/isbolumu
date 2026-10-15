import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../../components/AdBanner.js';
import { Mark } from '../../components/Icons.js';
import ShareSheet from '../../components/ShareSheet.js';
import T from '../../components/Type.js';
import { Button, Field, Input } from '../../components/ui.js';
import { ensurePermission, notificationsAllowed, scheduleHouse } from '../../services/notify.js';
import { useHouse } from '../../state/Store.js';
import { colors } from '../../theme.js';

const KNOWN_BACKUPS = ['İş Bölümü', 'isbolumu', 'sacak', 'sergen', 'sirayla', 'yerarkadasim'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const house = useHouse();
  const { state, place } = house;
  const [name, setName] = useState(place?.name || '');
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const notifyOn = allowed && state?.notify !== false;

  const refreshNotify = useCallback(async () => {
    setAllowed(await notificationsAllowed());
  }, []);

  useFocusEffect(useCallback(() => {
    refreshNotify();
  }, [refreshNotify]));

  useEffect(() => {
    setName(place?.name || '');
  }, [place?.name]);

  const share = async () => {
    try {
      await Share.share({ message: JSON.stringify({ app: 'İş Bölümü', version: 2, state }) });
    } catch {
      setMessage('Paylaşım açılamadı.');
    }
  };

  const loadBackup = () => {
    try {
      const parsed = JSON.parse(backup.trim());
      if (parsed.app && !KNOWN_BACKUPS.includes(parsed.app)) throw new Error('Bu yedek bu uygulamaya ait değil.');
      const next = parsed.state || parsed;
      if (!Array.isArray(next.places) || !next.places.length) throw new Error('Yedekte yer yok.');
      house.importState(next);
      setBackup('');
      setMessage('Yerler yüklendi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Yedek okunamadı.');
    }
  };

  const turnOn = async () => {
    const ok = await ensurePermission(true);
    setAllowed(ok);
    if (!ok) {
      setMessage('Kapalı. Telefon ayarından izin vermen gerekir.');
      return;
    }
    house.setNotify(true);
    await scheduleHouse({ ...state, notify: true });
    setMessage('Açık. Haberler ses ve titreşimle gelir.');
  };

  const turnOff = async () => {
    house.setNotify(false);
    await scheduleHouse({ ...state, notify: false });
    setMessage('Kapalı. Yeni haber kurulmaz.');
  };

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top }}>
        <AdBanner />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}><Mark size={48} /></View>
        <T weight="display" style={styles.title}>Ayarlar</T>

        <Field label="Yerin adı">
          <Input value={name} onChangeText={setName} onEndEditing={() => house.setPlaceName(name)} placeholder="Evimiz" />
        </Field>
        <Button label="Adı kaydet" tone="quiet" onPress={() => house.setPlaceName(name)} />

        <View style={styles.block}>
          <T weight="serif" style={styles.blockTitle}>Bildirim</T>
          <View style={[styles.status, notifyOn ? styles.statusOn : styles.statusOff]}>
            <T weight="semi" style={styles.statusText}>{notifyOn ? 'Açık' : 'Kapalı'}</T>
          </View>
          <T weight="medium" style={styles.copy}>
            {notifyOn
              ? 'Fatura, iş, ders, sınav, alınacak ve özel gün için bu telefona sesli ve titreyen haber gelir.'
              : 'Haber gelmez. Açarsan fatura, iş, ders, sınav ve özel gün için sesli ve titreyen haber kurulur.'}
          </T>
          {notifyOn ? (
            <Button label="Bildirimleri kapat" tone="quiet" onPress={turnOff} />
          ) : (
            <Button label="Bildirimleri aç" onPress={turnOn} />
          )}
          {!allowed ? (
            <>
              <View style={styles.gap} />
              <Button label="Telefon ayarını aç" tone="quiet" onPress={() => Linking.openSettings()} />
            </>
          ) : null}
        </View>

        <View style={styles.block}>
          <T weight="serif" style={styles.blockTitle}>Paylaş</T>
          <T weight="medium" style={styles.copy}>Bu haftanın işleri, alınacaklar, dersler ve özel günler PDF olur. İstersen aynı plan telefonun takvimine yazılır.</T>
          <Button label="İşleri paylaş" onPress={() => setShareOpen(true)} />
          <View style={styles.gap} />
          <T weight="medium" style={styles.copy}>Yedek İş Bölümü yazısıdır. Başka telefona yapıştırınca yerler yüklenir.</T>
          <Button label="Yazı yedeği gönder" tone="quiet" onPress={share} />
          <Field label="Gelen yedeği yapıştır">
            <Input value={backup} onChangeText={setBackup} multiline placeholder="{ ... }" style={styles.area} />
          </Field>
          <Button label="Yedeği yükle" onPress={loadBackup} />
        </View>

        <View style={styles.block}>
          <T weight="serif" style={styles.blockTitle}>Reklam</T>
          <T weight="medium" style={styles.copy}>
            Uygulama ücretsiz. Her sayfanın üstünde ve altında banner, üç iş bitince bir tam ekran reklam var. Reklamı Google AdMob gösterir.
          </T>
        </View>

        <View style={styles.block}>
          <T weight="serif" style={styles.blockTitle}>Gizlilik</T>
          <T weight="medium" style={styles.copy}>
            Hesap yok. Ev, iş, not ve alınacaklar bu telefondan dışarı gitmez. Reklam için Google AdMob cihaz reklam kimliği ve reklam ölçümü kullanabilir. Kişisel veri satılmaz. Kayıtları silmek için aşağıdaki sıfırlamayı kullanırsın.
          </T>
          <Button label="Gizlilik metnini aç" tone="quiet" onPress={() => Linking.openURL('https://ilkanakar.github.io/isbolumu/privacy.html')} />
        </View>

        <View style={styles.block}>
          <Button label="Bu telefonu sıfırla" tone="ink" onPress={() => {
            Alert.alert('Baştan kur', 'Bu telefondaki yerler silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => house.reset() },
            ]);
          }} />
          {state.places.length > 1 ? (
            <>
              <View style={styles.gap} />
              <Button label="Bu yeri sil" tone="quiet" onPress={() => {
                Alert.alert('Yeri sil', `${place?.name || 'Bu yer'} silinsin mi?`, [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => house.deletePlace(place.id) },
                ]);
              }} />
            </>
          ) : null}
        </View>
        {message ? <T weight="medium" style={styles.message}>{message}</T> : null}
        {shareOpen ? <ShareSheet place={place} onClose={() => setShareOpen(false)} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  brand: { marginTop: 12 },
  title: { fontSize: 40, color: colors.ink, marginTop: 10, marginBottom: 16 },
  block: { marginTop: 26 },
  blockTitle: { fontSize: 26, color: colors.ink, marginBottom: 6 },
  status: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 10 },
  statusOn: { backgroundColor: colors.moss },
  statusOff: { backgroundColor: colors.clay },
  statusText: { color: colors.white, fontSize: 16 },
  copy: { color: colors.inkSoft, lineHeight: 21, marginBottom: 12 },
  area: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  gap: { height: 10 },
  message: { marginTop: 16, color: colors.moss },
});
