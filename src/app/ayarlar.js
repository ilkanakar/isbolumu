import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../components/AdBanner.js';
import { Mark } from '../components/Icons.js';
import T from '../components/Type.js';
import { Button, Field, Input } from '../components/ui.js';
import { ensurePermission, scheduleHouse } from '../services/notify.js';
import { useHouse } from '../state/Store.js';
import { colors } from '../theme.js';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const house = useHouse();
  const { state, place } = house;
  const [name, setName] = useState(place?.name || '');
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(place?.name || '');
  }, [place?.name]);

  const share = async () => {
    try {
      await Share.share({ message: JSON.stringify({ app: 'sacak', version: 2, state }) });
    } catch {
      setMessage('Paylaşım açılamadı.');
    }
  };

  const loadBackup = () => {
    try {
      const parsed = JSON.parse(backup.trim());
      if (parsed.app && !['sacak', 'sergen', 'sirayla', 'yerarkadasim'].includes(parsed.app)) throw new Error('Bu yedek bu uygulamaya ait değil.');
      const next = parsed.state || parsed;
      if (!Array.isArray(next.places) || !next.places.length) throw new Error('Yedekte yer yok.');
      house.importState(next);
      setBackup('');
      setMessage('Yerler yüklendi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Yedek okunamadı.');
    }
  };

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top }}>
        <AdBanner />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}><T weight="semi" style={styles.back}>‹ Geri</T></Pressable>
      <View style={styles.brand}><Mark size={48} /></View>
      <T weight="display" style={styles.title}>Ayarlar</T>

      <Field label="Yerin adı">
        <Input value={name} onChangeText={setName} onEndEditing={() => house.setPlaceName(name)} placeholder="Evimiz" />
      </Field>
      <Button label="Adı kaydet" tone="quiet" onPress={() => house.setPlaceName(name)} />

      <View style={styles.block}>
        <T weight="serif" style={styles.blockTitle}>Bildirim</T>
        <T weight="medium" style={styles.copy}>Fatura, iş, doğum günü ve emanet için bu telefona haber gelir.</T>
        <Button label="Bildirimleri aç" tone="quiet" onPress={async () => {
          const ok = await ensurePermission(true);
          if (ok) {
            await scheduleHouse(state);
            setMessage('Bildirimler açık.');
          } else setMessage('İzin verilmedi. Telefon ayarından açabilirsin.');
        }} />
      </View>

      <View style={styles.block}>
        <T weight="serif" style={styles.blockTitle}>Bu telefonda</T>
        <T weight="medium" style={styles.copy}>Hesap yok. Evler ve iş yerleri bu telefonda durur. İstersen yedeği yazı olarak gönderir, başka telefona yapıştırırsın.</T>
        <Button label="Yedeği gönder" tone="quiet" onPress={share} />
        <Field label="Gelen yedeği yapıştır">
          <Input value={backup} onChangeText={setBackup} multiline placeholder="{ ... }" style={styles.area} />
        </Field>
        <Button label="Yedeği yükle" onPress={loadBackup} />
      </View>

      <View style={styles.block}>
        <T weight="serif" style={styles.blockTitle}>Reklam</T>
        <T weight="medium" style={styles.copy}>
          Uygulama ücretsiz. Her sayfanın üstünde ve altında banner, üç iş bitince bir tam ekran reklam var. Reklamı Google AdMob gösterir. Expo Go gerçek reklamı oynatamaz; yerini kutuda gösterir.
        </T>
      </View>

      <View style={styles.block}>
        <T weight="serif" style={styles.blockTitle}>Gizlilik</T>
        <T weight="medium" style={styles.copy}>
          Hesap yok. Ev, iş, not ve alınacaklar bu telefondan dışarı gitmez. Reklam için Google AdMob cihaz reklam kimliği ve reklam ölçümü kullanabilir. Kişisel veri satılmaz. Kayıtları silmek için aşağıdaki sıfırlamayı kullanırsın.
        </T>
        <Button label="Gizlilik metnini aç" tone="quiet" onPress={() => Linking.openURL('https://ilkanakar.github.io/yerarkadasim/privacy.html')} />
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
      <AdBanner />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20 },
  back: { color: colors.inkSoft, fontSize: 16 },
  brand: { marginTop: 16 },
  title: { fontSize: 40, color: colors.ink, marginTop: 10, marginBottom: 16 },
  block: { marginTop: 26 },
  blockTitle: { fontSize: 26, color: colors.ink, marginBottom: 6 },
  copy: { color: colors.inkSoft, lineHeight: 21, marginBottom: 12 },
  area: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  gap: { height: 10 },
  message: { marginTop: 16, color: colors.moss },
});
