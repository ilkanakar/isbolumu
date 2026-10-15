import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../../components/AdBanner.js';
import { useEditor } from '../../components/Editor.js';
import T from '../../components/Type.js';
import { Avatar, Button, Empty } from '../../components/ui.js';
import { didCount, kindLabel, ruleLine } from '../../logic/house.js';
import { useHouse } from '../../state/Store.js';
import { colors } from '../../theme.js';

export default function WorkScreen() {
  const insets = useSafeAreaInsets();
  const { place } = useHouse();
  const editor = useEditor();
  if (!place) return null;
  const rows = didCount(place);
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <View style={styles.fill}>
      <View style={{ paddingTop: insets.top }}>
        <AdBanner />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      <T weight="semi" style={styles.kicker}>{kindLabel(place.kind)}</T>
      <T weight="display" style={styles.title}>İşler</T>
      <T weight="medium" style={styles.lead}>
        {place.kind === 'is'
          ? 'İş bölümü ya da tek kişiye bağlı iş. Tanımı notta durur.'
          : 'Haftanın günlerine kişi koy. Sıra her hafta aynı düzende döner.'}
      </T>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
        {place.members.map((member) => (
          <Pressable key={member.id} accessibilityRole="button" onPress={() => editor.open('member', member)} style={styles.person}>
            <Avatar member={member} size={46} />
            <T weight="semi" style={styles.personName}>{member.id === place.meId ? `${member.name}` : member.name}</T>
            {member.id === place.meId ? <T weight="medium" style={styles.you}>sen</T> : null}
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={() => editor.open('member')} style={styles.person}>
          <View style={styles.plus}><T weight="bold" style={styles.plusText}>+</T></View>
          <T weight="semi" style={styles.personName}>Kişi</T>
        </Pressable>
      </ScrollView>

      {place.tasks.length ? place.tasks.map((task) => (
        <Pressable key={task.id} onPress={() => editor.open('task', task)} style={styles.card}>
          <T weight="semi" style={styles.cardTitle}>{task.title}</T>
          <T weight="medium" style={styles.cardMeta}>{ruleLine(task, place)}</T>
          {task.notes ? <T weight="medium" style={styles.cardNote}>{task.notes}</T> : null}
          {task.reminderTime ? <T weight="medium" style={styles.cardNote}>Hatırlatma {task.reminderTime}</T> : null}
        </Pressable>
      )) : <Empty text="Henüz iş yok. Takvimde bir güne basıp iş ekle, günlere kişileri yerleştir." />}

      <T weight="serif" style={styles.month}>Bu ay kim yaptı</T>
      {rows.every((row) => row.count === 0) ? <Empty text="Bu ay işaretlenmiş iş yok." /> : rows.map((row) => (
        <View key={row.member.id} style={styles.barRow}>
          <View style={styles.barHead}>
            <T weight="semi">{row.member.name}</T>
            <T weight="medium" style={styles.count}>{row.count}</T>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.max(8, (row.count / max) * 100)}%`, backgroundColor: row.member.color }]} />
          </View>
        </View>
      ))}

      <View style={styles.add}>
        <Button label="İş ekle" onPress={() => editor.open('task')} />
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
  people: { gap: 14, paddingBottom: 16 },
  person: { alignItems: 'center', width: 68 },
  personName: { marginTop: 6, fontSize: 12, color: colors.ink },
  you: { fontSize: 11, color: colors.faint },
  plus: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  plusText: { fontSize: 22, color: colors.ink },
  card: {
    backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line,
    padding: 14, marginBottom: 8,
  },
  cardTitle: { fontSize: 17, color: colors.ink },
  cardMeta: { color: colors.inkSoft, marginTop: 4 },
  cardNote: { color: colors.faint, marginTop: 4 },
  month: { fontSize: 26, color: colors.ink, marginTop: 18, marginBottom: 10 },
  barRow: { marginBottom: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  count: { color: colors.inkSoft },
  track: { height: 10, borderRadius: 6, backgroundColor: colors.paperDeep, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 6 },
  add: { marginTop: 8 },
});
