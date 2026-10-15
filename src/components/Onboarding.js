import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouse } from '../state/Store.js';
import { colors } from '../theme.js';
import { Mark } from './Icons.js';
import T from './Type.js';
import { Button, Field, Input } from './ui.js';
import AdBanner from './AdBanner.js';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { finishOnboarding } = useHouse();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('ev');
  const [myName, setMyName] = useState('');
  const [person, setPerson] = useState('');
  const [others, setOthers] = useState([]);
  const [error, setError] = useState('');

  const addPerson = () => {
    const text = person.trim();
    if (!text) return;
    const taken = text.toLocaleLowerCase('tr') === myName.trim().toLocaleLowerCase('tr')
      || others.some((item) => item.toLocaleLowerCase('tr') === text.toLocaleLowerCase('tr'));
    setPerson('');
    if (taken || others.length >= 8) return;
    setOthers([...others, text]);
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <AdBanner />
        <Mark size={64} />
        <T weight="display" style={styles.title}>Yer Arkadaşım</T>
        <T weight="medium" style={styles.lead}>Evini ya da iş yerini kur. İşleri sonra takvimden eklersin.</T>

        <View style={styles.kinds}>
          {[{ id: 'ev', label: 'Ev' }, { id: 'is', label: 'İş yeri' }].map((item) => {
            const on = kind === item.id;
            return (
              <Pressable key={item.id} onPress={() => setKind(item.id)} style={[styles.kind, on && styles.kindOn]}>
                <T weight="semi" style={{ color: on ? colors.white : colors.ink }}>{item.label}</T>
              </Pressable>
            );
          })}
        </View>

        <Field label={kind === 'is' ? 'İş yerinin adı' : 'Evin adı'}>
          <Input value={name} onChangeText={setName} placeholder={kind === 'is' ? 'Atölye, ofis, dükkan' : 'Bizim ev'} />
        </Field>
        <Field label="Senin adın">
          <Input value={myName} onChangeText={setMyName} placeholder="Adın" />
        </Field>
        <Field label="Birlikte oldukların">
          <View style={styles.row}>
            <Input value={person} onChangeText={setPerson} placeholder="Ad" onSubmitEditing={addPerson} style={styles.flex} />
            <Pressable accessibilityRole="button" onPress={addPerson} style={styles.add}>
              <T weight="semi" style={styles.addText}>Ekle</T>
            </Pressable>
          </View>
          <View style={styles.people}>
            {others.map((item) => (
              <Pressable key={item} onPress={() => setOthers(others.filter((row) => row !== item))} style={styles.person}>
                <T weight="semi">{item} ×</T>
              </Pressable>
            ))}
          </View>
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label={kind === 'is' ? 'İş yerini kur' : 'Evini kur'} onPress={() => {
          if (!myName.trim()) {
            setError('Önce kendi adını yaz.');
            return;
          }
          finishOnboarding({ name, kind, myName, others });
        }} />
        <T weight="medium" style={styles.note}>Hesap yok. Kayıtlar bu telefonda kalır.</T>
        <AdBanner />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 24 },
  title: { fontSize: 52, color: colors.ink, marginTop: 18 },
  lead: { fontSize: 17, lineHeight: 24, color: colors.inkSoft, marginTop: 8, marginBottom: 20 },
  kinds: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  kind: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 12,
  },
  kindOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  add: { borderRadius: 14, backgroundColor: colors.ink, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.white },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  person: { borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 },
  error: { color: colors.clayDeep, marginBottom: 10 },
  note: { color: colors.faint, fontSize: 13, lineHeight: 19, marginTop: 14 },
});
