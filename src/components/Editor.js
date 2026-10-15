import { createContext, useContext, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  addDays,
  monthName,
  parseISO,
  todayISO,
  weekdayName,
  weekdayOf,
} from '../logic/dates.js';
import { activePlace, emptyWeek, kindLabel, memberName, ruleLine, statusText, tasksOn } from '../logic/house.js';
import { useHouse } from '../state/Store.js';
import { billCategories, colors, memberColors } from '../theme.js';
import T from './Type.js';
import { Button, Chips, Field, Input } from './ui.js';

const EditorContext = createContext(null);

export function useEditor() {
  const value = useContext(EditorContext);
  if (!value) throw new Error('Düzenleyici yok');
  return value;
}

const weekOptions = [1, 2, 3, 4, 5, 6, 0].map((id) => ({ id, label: weekdayName(id, true) }));
const times = ['08:00', '09:00', '12:30', '18:00', '20:00', '21:30'].map((id) => ({ id, label: id }));
const frequencies = [
  { id: 'daily', label: 'Her gün' },
  { id: 'weekly', label: 'Her hafta' },
  { id: 'monthly', label: 'Her ay' },
];
const repeats = [
  ...frequencies,
  { id: 'yearly', label: 'Her yıl' },
  { id: 'once', label: 'Bir kez' },
];
const dayKinds = [
  { id: 'birthday', label: 'Doğum günü' },
  { id: 'anniversary', label: 'Yıldönümü' },
  { id: 'other', label: 'Özel gün' },
];

function shiftPart(value, part, delta) {
  const parsed = parseISO(value);
  if (part === 'd') return addDays(value, delta);
  if (part === 'm') {
    const date = new Date(parsed.y, parsed.m - 1 + delta, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = Math.min(parsed.d, new Date(year, month, 0).getDate());
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const year = parsed.y + delta;
  const day = Math.min(parsed.d, new Date(year, parsed.m, 0).getDate());
  return `${year}-${String(parsed.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function Stepper({ label, text, onMinus, onPlus }) {
  return (
    <View style={styles.step}>
      <Pressable accessibilityRole="button" onPress={onMinus} style={styles.stepBtn}><T weight="bold" style={styles.stepSign}>−</T></Pressable>
      <View style={styles.stepMid}>
        <T weight="serif" style={styles.stepValue}>{text}</T>
        <T weight="medium" style={styles.stepLabel}>{label}</T>
      </View>
      <Pressable accessibilityRole="button" onPress={onPlus} style={styles.stepBtn}><T weight="bold" style={styles.stepSign}>+</T></Pressable>
    </View>
  );
}

function DateSteppers({ value, onChange, withYear = true }) {
  const parsed = parseISO(value);
  return (
    <View style={styles.stepRow}>
      <Stepper label="Gün" text={String(parsed.d)} onMinus={() => onChange(shiftPart(value, 'd', -1))} onPlus={() => onChange(shiftPart(value, 'd', 1))} />
      <Stepper label="Ay" text={monthName(parsed.m, true)} onMinus={() => onChange(shiftPart(value, 'm', -1))} onPlus={() => onChange(shiftPart(value, 'm', 1))} />
      {withYear ? <Stepper label="Yıl" text={String(parsed.y)} onMinus={() => onChange(shiftPart(value, 'y', -1))} onPlus={() => onChange(shiftPart(value, 'y', 1))} /> : null}
    </View>
  );
}

function WeekPlan({ members, meId, week, onChange }) {
  const [painter, setPainter] = useState(meId);
  const days = [1, 2, 3, 4, 5, 6, 0];
  const assign = (day) => {
    const key = String(day);
    const next = { ...emptyWeek(), ...week, [key]: week?.[key] === painter ? null : painter };
    onChange(next);
  };
  return (
    <View>
      <T weight="medium" style={styles.hint}>Önce kişiyi seç, sonra gününe bas. Aynı güne tekrar basarsan boşalır.</T>
      <View style={styles.chips}>
        {members.map((member) => {
          const on = painter === member.id;
          return (
            <Pressable key={member.id} onPress={() => setPainter(member.id)} style={[styles.person, on && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
              <T weight="semi" style={{ color: on ? colors.white : colors.ink }}>
                {member.id === meId ? `${member.name} (sen)` : member.name}
              </T>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.days}>
        {days.map((day) => {
          const who = week?.[String(day)];
          const person = members.find((member) => member.id === who);
          return (
            <Pressable key={day} onPress={() => assign(day)} style={[styles.day, person && { borderColor: person.color }]}>
              <T weight="semi" style={styles.dayName}>{weekdayName(day, true)}</T>
              <T weight="medium" style={styles.dayWho}>{person ? person.name : 'boş'}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MemberPick({ members, value, onChange }) {
  return (
    <View style={styles.chips}>
      {members.map((member) => {
        const index = value.indexOf(member.id);
        const on = index >= 0;
        return (
          <Pressable
            key={member.id}
            onPress={() => onChange(on ? value.filter((id) => id !== member.id) : [...value, member.id])}
            style={[styles.person, on && { backgroundColor: colors.ink, borderColor: colors.ink }]}
          >
            <T weight="semi" style={{ color: on ? colors.white : colors.ink }}>
              {on ? `${index + 1} ${member.name}` : member.name}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Sheet({ title, children, onClose }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <T weight="serif" style={styles.sheetTitle}>{title}</T>
            <Pressable accessibilityRole="button" onPress={onClose}><T weight="semi" style={styles.close}>Kapat</T></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ClockField({ value, onChange, allowOff = false }) {
  const on = Boolean(value);
  const [hour, minute] = String(value || '09:00').split(':').map((part) => Number(part) || 0);
  const write = (nextHour, nextMinute) => {
    const h = (nextHour + 24) % 24;
    const m = (nextMinute + 60) % 60;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };
  return (
    <View>
      {allowOff ? (
        <Chips
          options={[{ id: 'off', label: 'Kapalı' }, { id: 'on', label: 'Saat seç' }]}
          value={on ? 'on' : 'off'}
          onChange={(mode) => onChange(mode === 'on' ? (value || '09:00') : null)}
        />
      ) : null}
      {!allowOff || on ? (
        <View style={[styles.stepRow, allowOff && styles.clockGap]}>
          <Stepper label="Saat" text={String(hour).padStart(2, '0')} onMinus={() => write(hour - 1, minute)} onPlus={() => write(hour + 1, minute)} />
          <Stepper label="Dakika" text={String(minute).padStart(2, '0')} onMinus={() => write(hour, minute - 5)} onPlus={() => write(hour, minute + 5)} />
        </View>
      ) : null}
    </View>
  );
}

function taskDraft(item, place, seed = {}) {
  const today = todayISO();
  const me = place?.meId || place?.members?.[0]?.id || null;
  const date = seed.date || item?.onceDate || today;
  if (item?.people) {
    return { ...item, weights: item.weights || {}, weekdays: item.weekdays || [], reminderTime: item.reminderTime || null };
  }
  if (item?.id && item.week && item.mode !== 'once') {
    const people = [];
    Object.values(item.week).forEach((id) => {
      if (id && !people.includes(id)) people.push(id);
    });
    const chosen = people.length ? people : [me].filter(Boolean);
    return {
      ...item,
      people: chosen,
      share: chosen.length > 1 ? 'rotate' : 'together',
      weights: Object.fromEntries(chosen.map((id) => [id, 1])),
      repeat: 'weekly',
      weekdays: Object.entries(item.week).filter(([, id]) => id).map(([day]) => Number(day)),
      monthDay: parseISO(date).d,
      onceDate: date,
      startDate: today,
      reminderTime: item.reminderTime || null,
    };
  }
  if (item?.id) {
    const person = item.assigneeId || me;
    return {
      ...item,
      people: [person].filter(Boolean),
      share: 'together',
      weights: {},
      repeat: 'none',
      weekdays: [],
      monthDay: parseISO(date).d,
      onceDate: item.onceDate || date,
      startDate: item.onceDate || date,
      reminderTime: item.reminderTime || null,
    };
  }
  return {
    id: null,
    title: '',
    notes: '',
    people: [me].filter(Boolean),
    share: 'together',
    weights: {},
    repeat: seed.date ? 'none' : 'weekly',
    weekdays: seed.date ? [] : [parseISO(date).date.getDay()],
    monthDay: parseISO(date).d,
    onceDate: date,
    startDate: seed.date || today,
    reminderTime: null,
  };
}

function blankFor(type, place, seed = {}) {
  if (type === 'create') return { date: seed.date || '' };
  if (type === 'mark') return { taskId: seed.taskId, date: seed.date };
  if (type === 'places') return {};
  if (type === 'place') return { name: '', kind: seed.kind || 'ev', myName: '', person: '', others: [] };
  const today = todayISO();
  const extra = { ...seed };
  if (!extra.date) delete extra.date;
  const members = (place?.members || []).map((member) => member.id);
  const me = place?.meId || members[0] || null;
  const date = seed.date || addDays(today, 1);
  const parsed = parseISO(date);
  if (type === 'task') return taskDraft(null, place, seed);
  if (type === 'need') {
    return { id: null, title: '', lines: [''], notes: '', date: seed.date || '', showOnHome: true };
  }
  if (type === 'lesson') {
    return {
      id: null,
      title: '',
      kind: 'ders',
      memberId: me,
      weekdays: [weekdayOf(seed.date || today)],
      onceDate: seed.date || today,
      startDate: seed.date || today,
      time: '09:00',
      endTime: '10:00',
      room: '',
      notes: '',
      reminderTime: '09:00',
    };
  }
  if (type === 'bill') {
    return {
      id: null,
      title: '',
      category: 'diger',
      amount: null,
      dueDay: parsed.d,
      notes: '',
      memberIds: members,
      rotate: true,
      payerId: members[0] || null,
      ...extra,
    };
  }
  if (type === 'reminder') {
    return {
      id: null,
      title: '',
      notes: '',
      repeat: seed.date ? 'once' : 'weekly',
      weekday: parsed.date.getDay(),
      dayOfMonth: parsed.d,
      month: parsed.m,
      day: parsed.d,
      date,
      time: '09:00',
      enabled: true,
      ...extra,
    };
  }
  if (type === 'day') {
    return {
      id: null,
      kind: 'birthday',
      title: '',
      name: '',
      memberId: null,
      month: parsed.m,
      day: parsed.d,
      year: '',
      notes: '',
      ...extra,
    };
  }
  if (type === 'loan') {
    return {
      id: null,
      direction: 'lent',
      item: '',
      person: '',
      due: seed.date || '',
      notes: '',
      settled: false,
      ...extra,
    };
  }
  if (type === 'note') {
    return { id: null, title: '', body: '', pinned: false, showOnHome: false, ...extra };
  }
  return {
    id: null,
    name: '',
    color: memberColors[(place?.members || []).length % memberColors.length],
    ...extra,
  };
}

function draftFor(type, place, item) {
  if (type === 'task') return taskDraft(item?.id ? item : null, place, item || {});
  if (item?.id) return { ...item, year: item.year || '', showOnHome: Boolean(item.showOnHome || item.pinned) };
  return blankFor(type, place, item || {});
}

export function EditorProvider({ children }) {
  const house = useHouse();
  const [session, setSession] = useState(null);

  const api = useMemo(() => ({
    open(type, item) {
      const place = activePlace(house.state);
      setSession({ type, draft: draftFor(type, place, item) });
    },
  }), [house.state]);

  return (
    <EditorContext.Provider value={api}>
      {children}
      {session ? (
        <EditorBody
          session={session}
          onChange={(draft) => setSession({ ...session, draft })}
          onClose={() => setSession(null)}
          onPick={(type, seed) => {
            const place = activePlace(house.state);
            setSession({ type, draft: draftFor(type, place, seed) });
          }}
        />
      ) : null}
    </EditorContext.Provider>
  );
}

function EditorBody({ session, onChange, onClose, onPick }) {
  const house = useHouse();
  const { state, place } = house;
  const members = place?.members || [];
  const { type, draft } = session;
  const [error, setError] = useState('');
  const [amountText, setAmountText] = useState(draft.amount != null ? String(draft.amount) : '');
  const lineRefs = useRef([]);

  const set = (patch) => onChange({ ...draft, ...patch });

  const remove = (label, run) => {
    Alert.alert(label, 'Bu kayıt silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => { run(); onClose(); } },
    ]);
  };

  if (type === 'create') {
    const seed = draft?.date ? { date: draft.date } : {};
    const rows = [
      ['task', 'İş'],
      ['need', 'Alınacak'],
      ['lesson', 'Ders'],
      ['bill', 'Fatura'],
      ['reminder', 'Hatırlatma'],
      ['day', 'Özel gün'],
      ['loan', 'Emanet'],
      ['note', 'Not'],
    ];
    return (
      <Sheet title="Ne ekleyelim?" onClose={onClose}>
        {rows.map(([kind, label]) => (
          <Pressable key={kind} onPress={() => onPick(kind, seed)} style={styles.menuRow}>
            <T weight="semi" style={styles.menuText}>{label}</T>
          </Pressable>
        ))}
      </Sheet>
    );
  }

  if (type === 'member') {
    return (
      <Sheet title={draft.id ? 'Kişi' : 'Yeni kişi'} onClose={onClose}>
        <Field label="Ad">
          <Input value={draft.name} onChangeText={(name) => set({ name })} placeholder="Ece" />
        </Field>
        <Field label="Renk">
          <View style={styles.colors}>
            {memberColors.map((color) => (
              <Pressable key={color} onPress={() => set({ color })} style={[styles.color, { backgroundColor: color }, draft.color === color && styles.colorOn]} />
            ))}
          </View>
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.name || '').trim()) {
            setError('Bir ad yaz.');
            return;
          }
          house.saveMember(draft);
          onClose();
        }} />
        {draft.id ? (
          <Pressable onPress={() => {
            if (members.length <= 1 || draft.id === place?.meId) {
              Alert.alert(draft.id === place?.meId ? 'Sen kal' : 'Son kişi', draft.id === place?.meId ? 'Kendi adın bu yerde kalsın.' : 'En az bir kişi kalsın.');
              return;
            }
            remove('Kişiyi çıkar', () => house.deleteMember(draft.id));
          }} style={styles.deleteWrap}>
            <T weight="semi" style={styles.delete}>Çıkar</T>
          </Pressable>
        ) : null}
      </Sheet>
    );
  }

  if (type === 'places') {
    return (
      <Sheet title="Yerler" onClose={onClose}>
        {(state.places || []).map((item) => {
          const open = item.id === state.activePlaceId;
          return (
            <Pressable key={item.id} onPress={() => { house.switchPlace(item.id); onClose(); }} style={[styles.menuRow, open && styles.menuOn]}>
              <T weight="medium" style={styles.placeKind}>{kindLabel(item.kind)}</T>
              <T weight="semi" style={styles.menuText}>{item.name}</T>
              {open ? <T weight="medium" style={styles.placeOpen}>açık</T> : null}
            </Pressable>
          );
        })}
        <View style={styles.gap} />
        <Button label="Yeni ev" onPress={() => onPick('place', { kind: 'ev' })} />
        <View style={styles.gap} />
        <Button label="Yeni iş yeri" tone="quiet" onPress={() => onPick('place', { kind: 'is' })} />
      </Sheet>
    );
  }

  if (type === 'place') {
    const addPerson = () => {
      const text = (draft.person || '').trim();
      if (!text) return;
      const taken = text.toLocaleLowerCase('tr') === (draft.myName || '').trim().toLocaleLowerCase('tr')
        || (draft.others || []).some((item) => item.toLocaleLowerCase('tr') === text.toLocaleLowerCase('tr'));
      if (taken) {
        set({ person: '' });
        return;
      }
      set({ person: '', others: [...(draft.others || []), text] });
    };
    return (
      <Sheet title={draft.kind === 'is' ? 'Yeni iş yeri' : 'Yeni ev'} onClose={onClose}>
        <Field label={draft.kind === 'is' ? 'İş yerinin adı' : 'Evin adı'}>
          <Input value={draft.name} onChangeText={(name) => set({ name })} placeholder={draft.kind === 'is' ? 'Atölye' : 'Bizim ev'} />
        </Field>
        <Field label="Senin adın">
          <Input value={draft.myName} onChangeText={(myName) => set({ myName })} placeholder="Adın" />
        </Field>
        <Field label="Birlikte oldukların">
          <View style={styles.row}>
            <Input value={draft.person || ''} onChangeText={(person) => set({ person })} placeholder="Ad" onSubmitEditing={addPerson} style={styles.flex} />
            <Pressable onPress={addPerson} style={styles.add}><T weight="semi" style={styles.addText}>Ekle</T></Pressable>
          </View>
          <View style={styles.chips}>
            {(draft.others || []).map((item) => (
              <Pressable key={item} onPress={() => set({ others: draft.others.filter((row) => row !== item) })} style={styles.person}>
                <T weight="semi">{item} ×</T>
              </Pressable>
            ))}
          </View>
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kur" onPress={() => {
          if (!(draft.myName || '').trim()) return setError('Kendi adını yaz.');
          house.addPlace(draft);
          onClose();
        }} />
      </Sheet>
    );
  }

  if (type === 'mark') {
    const task = (place?.tasks || []).find((item) => item.id === draft.taskId);
    const row = task ? tasksOn(place, draft.date).find((item) => item.task.id === task.id) : null;
    return (
      <Sheet title={task?.title || 'İş'} onClose={onClose}>
        <T weight="medium" style={styles.hint}>Kim yaptı? Sıra başkasındaysa ve sen yaptıysan kendini seç. Onun işini de o işin üzerinden işaretlersin.</T>
        {row ? <T weight="semi" style={styles.status}>{statusText(place, row)}</T> : null}
        {members.map((member) => (
          <Pressable
            key={member.id}
            onPress={() => { house.markTask(draft.taskId, draft.date, true, member.id); onClose(); }}
            style={styles.menuRow}
          >
            <T weight="semi" style={styles.menuText}>{member.id === place?.meId ? 'Ben yaptım' : `${member.name} yaptı`}</T>
          </Pressable>
        ))}
        <Pressable onPress={() => { house.markTask(draft.taskId, draft.date, false, null); onClose(); }} style={styles.menuRow}>
          <T weight="semi" style={styles.menuText}>Yapılmadı</T>
        </Pressable>
        {task ? (
          <Pressable onPress={() => onPick('task', task)} style={styles.deleteWrap}>
            <T weight="semi" style={styles.delete}>Düzeni değiştir</T>
          </Pressable>
        ) : null}
      </Sheet>
    );
  }

  if (type === 'task') {
    const noteLabel = place?.kind === 'is' ? 'İş tanımı' : 'Not';
    const people = draft.people || [];
    const repeat = draft.repeat || 'none';
    const togglePerson = (id) => {
      const next = people.includes(id) ? people.filter((item) => item !== id) : [...people, id];
      set({ people: next });
    };
    const ready = people.length > 0 && (repeat === 'none'
      ? Boolean(draft.onceDate)
      : repeat !== 'weekly' || (draft.weekdays || []).length > 0);
    return (
      <Sheet title={draft.id ? 'İşi düzenle' : 'Yeni iş'} onClose={onClose}>
        <Field label="İş">
          <Input value={draft.title} onChangeText={(title) => set({ title })} placeholder="Temizlik, bulaşık, kasa" />
        </Field>
        <Field label="Kim yapsın">
          <T weight="medium" style={styles.hint}>Birden fazla seçersen aynı işi birlikte yapabilirler.</T>
          <View style={styles.chips}>
            {members.map((member) => {
              const on = people.includes(member.id);
              return (
                <Pressable key={member.id} onPress={() => togglePerson(member.id)} style={[styles.person, on && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                  <T weight="semi" style={{ color: on ? colors.white : colors.ink }}>
                    {member.id === place?.meId ? `${member.name} (sen)` : member.name}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </Field>
        <Field label="Tekrar etsin mi">
          <Chips
            options={[
              { id: 'none', label: 'Tek sefer' },
              { id: 'daily', label: 'Her gün' },
              { id: 'weekly', label: 'Haftanın günleri' },
              { id: 'monthly', label: 'Her ay' },
            ]}
            value={repeat}
            onChange={(next) => set({ repeat: next, startDate: draft.startDate || todayISO() })}
          />
        </Field>
        {repeat === 'none' ? (
          <Field label="Gün">
            <DateSteppers value={draft.onceDate || todayISO()} onChange={(onceDate) => set({ onceDate, startDate: onceDate })} />
          </Field>
        ) : null}
        {repeat === 'weekly' ? (
          <Field label="Hangi günler">
            <Chips multiple options={weekOptions} value={draft.weekdays || []} onChange={(weekdays) => set({ weekdays })} />
          </Field>
        ) : null}
        {repeat === 'monthly' ? (
          <Field label="Ayın günü">
            <Stepper
              label="Gün"
              text={String(draft.monthDay || 1)}
              onMinus={() => set({ monthDay: Math.max(1, (draft.monthDay || 1) - 1) })}
              onPlus={() => set({ monthDay: Math.min(31, (draft.monthDay || 1) + 1) })}
            />
          </Field>
        ) : null}
        {people.length > 1 && repeat !== 'none' ? (
          <Field label="Tekrarlarda kim">
            <Chips
              options={[
                { id: 'together', label: 'Hep birlikte' },
                { id: 'rotate', label: 'Sırayla birer' },
                { id: 'weighted', label: 'Sayıyla' },
              ]}
              value={draft.share || 'together'}
              onChange={(share) => set({ share })}
            />
            {draft.share === 'weighted' ? (
              <View style={styles.weights}>
                {people.map((id) => {
                  const count = draft.weights?.[id] || 1;
                  const name = members.find((member) => member.id === id)?.name || 'Kişi';
                  return (
                    <Stepper
                      key={id}
                      label={name}
                      text={String(count)}
                      onMinus={() => set({ weights: { ...draft.weights, [id]: Math.max(1, count - 1) } })}
                      onPlus={() => set({ weights: { ...draft.weights, [id]: Math.min(12, count + 1) } })}
                    />
                  );
                })}
              </View>
            ) : null}
            <T weight="medium" style={styles.plan}>{ruleLine({ ...draft, people }, place)}</T>
          </Field>
        ) : <T weight="medium" style={styles.plan}>{ruleLine({ ...draft, people }, place)}</T>}
        <Field label="Hatırlatma saati">
          <ClockField allowOff value={draft.reminderTime} onChange={(reminderTime) => set({ reminderTime })} />
        </Field>
        <Field label={noteLabel}>
          <Input value={draft.notes || ''} onChangeText={(notes) => set({ notes })} placeholder={place?.kind === 'is' ? 'Ne yapılacak, nasıl bitecek' : 'İsteğe bağlı'} />
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.title || '').trim()) return setError('İşin adını yaz.');
          if (!people.length) return setError('En az bir kişi seç.');
          if (!ready) return setError(repeat === 'weekly' ? 'En az bir gün seç.' : 'Günü seç.');
          house.saveTask({ ...draft, people, startDate: draft.startDate || draft.onceDate || todayISO() });
          onClose();
        }} />
        {draft.id ? <Pressable onPress={() => remove('İşi sil', () => house.deleteTask(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  if (type === 'bill') {
    return (
      <Sheet title={draft.id ? 'Faturayı düzenle' : 'Yeni fatura'} onClose={onClose}>
        <Field label="Ad">
          <Input value={draft.title} onChangeText={(title) => set({ title })} placeholder="Kira, elektrik, internet" />
        </Field>
        <Field label="Tür">
          <Chips options={billCategories} value={draft.category} onChange={(category) => set({ category })} />
        </Field>
        <Field label="Tutar">
          <Input
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="18000"
          />
        </Field>
        <Field label="Ayın günü">
          <Stepper
            label="Son gün"
            text={String(draft.dueDay || 1)}
            onMinus={() => set({ dueDay: Math.max(1, (draft.dueDay || 1) - 1) })}
            onPlus={() => set({ dueDay: Math.min(31, (draft.dueDay || 1) + 1) })}
          />
        </Field>
        <Field label="Kimler bölüşür">
          <MemberPick members={members} value={draft.memberIds || []} onChange={(memberIds) => set({ memberIds, payerId: memberIds.includes(draft.payerId) ? draft.payerId : memberIds[0] })} />
        </Field>
        <Field label="Ödeme">
          <Chips
            options={[{ id: 'rotate', label: 'Sırayla' }, { id: 'fixed', label: 'Tek kişi' }]}
            value={draft.rotate ? 'rotate' : 'fixed'}
            onChange={(mode) => set({ rotate: mode === 'rotate' })}
          />
        </Field>
        {!draft.rotate ? (
          <Field label="Ödeyen">
            <Chips
              options={(draft.memberIds || []).map((id) => ({ id, label: members.find((member) => member.id === id)?.name || 'Kişi' }))}
              value={draft.payerId}
              onChange={(payerId) => set({ payerId })}
            />
          </Field>
        ) : null}
        <Field label="Not">
          <Input value={draft.notes} onChangeText={(notes) => set({ notes })} placeholder="IBAN, abone no" />
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.title || '').trim()) return setError('Faturanın adını yaz.');
          const amount = amountText.trim() ? Number(amountText.replace(',', '.')) : null;
          if (amountText.trim() && !Number.isFinite(amount)) return setError('Tutarı 18000 gibi yaz.');
          house.saveBill({ ...draft, amount: amountText.trim() ? Math.round(amount * 100) / 100 : null });
          onClose();
        }} />
        {draft.id ? <View style={styles.gap} /> : null}
        {draft.id ? <Button label="Ödendi" tone="quiet" onPress={() => { house.payBill(draft.id); onClose(); }} /> : null}
        {draft.id ? <Pressable onPress={() => remove('Faturayı sil', () => house.deleteBill(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  if (type === 'reminder') {
    return (
      <Sheet title={draft.id ? 'Hatırlatmayı düzenle' : 'Yeni hatırlatma'} onClose={onClose}>
        <Field label="Ne">
          <Input value={draft.title} onChangeText={(title) => set({ title })} placeholder="Sigorta, aile araması" />
        </Field>
        <Field label="Tekrar">
          <Chips options={repeats} value={draft.repeat} onChange={(repeat) => set({ repeat })} />
        </Field>
        {draft.repeat === 'weekly' ? (
          <Field label="Gün"><Chips options={weekOptions} value={draft.weekday} onChange={(weekday) => set({ weekday })} /></Field>
        ) : null}
        {draft.repeat === 'monthly' ? (
          <Field label="Ayın günü">
            <Stepper label="Gün" text={String(draft.dayOfMonth || 1)} onMinus={() => set({ dayOfMonth: Math.max(1, (draft.dayOfMonth || 1) - 1) })} onPlus={() => set({ dayOfMonth: Math.min(31, (draft.dayOfMonth || 1) + 1) })} />
          </Field>
        ) : null}
        {draft.repeat === 'yearly' ? (
          <Field label="Tarih">
            <DateSteppers
              withYear={false}
              value={`2024-${String(draft.month || 1).padStart(2, '0')}-${String(draft.day || 1).padStart(2, '0')}`}
              onChange={(value) => {
                const parsed = parseISO(value);
                set({ month: parsed.m, day: parsed.d });
              }}
            />
          </Field>
        ) : null}
        {draft.repeat === 'once' ? (
          <Field label="Tarih">
            <DateSteppers value={draft.date || addDays(todayISO(), 1)} onChange={(date) => set({ date })} />
          </Field>
        ) : null}
        <Field label="Saat">
          <ClockField value={draft.time || '09:00'} onChange={(time) => set({ time })} />
        </Field>
        <Field label="Not">
          <Input value={draft.notes} onChangeText={(notes) => set({ notes })} placeholder="İsteğe bağlı" />
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.title || '').trim()) return setError('Ne hatırlatılacağını yaz.');
          house.saveReminder(draft);
          onClose();
        }} />
        {draft.id ? <Pressable onPress={() => remove('Hatırlatmayı sil', () => house.deleteReminder(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  if (type === 'day') {
    const anchor = `2024-${String(draft.month || 1).padStart(2, '0')}-${String(draft.day || 1).padStart(2, '0')}`;
    return (
      <Sheet title={draft.id ? 'Günü düzenle' : 'Özel gün'} onClose={onClose}>
        <Field label="Tür">
          <Chips options={dayKinds} value={draft.kind} onChange={(kind) => set({ kind })} />
        </Field>
        <Field label="Başlık">
          <Input value={draft.title || ''} onChangeText={(title) => set({ title })} placeholder="Doğum günü, yıldönümü, ziyaret" />
        </Field>
        <Field label="Kim">
          <View style={styles.chips}>
            {members.map((member) => {
              const on = draft.memberId === member.id;
              return (
                <Pressable key={member.id} onPress={() => set({ memberId: member.id, name: member.name })} style={[styles.person, on && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                  <T weight="semi" style={{ color: on ? colors.white : colors.ink }}>{member.id === place?.meId ? `${member.name} (sen)` : member.name}</T>
                </Pressable>
              );
            })}
            <Pressable onPress={() => set({ memberId: null })} style={[styles.person, !draft.memberId && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
              <T weight="semi" style={{ color: !draft.memberId ? colors.white : colors.ink }}>Başka biri</T>
            </Pressable>
          </View>
          {!draft.memberId ? <Input value={draft.name || ''} onChangeText={(name) => set({ name })} placeholder="Ela" style={styles.clockGap} /> : null}
        </Field>
        <Field label="Tarih">
          <DateSteppers withYear={false} value={anchor} onChange={(value) => {
            const parsed = parseISO(value);
            set({ month: parsed.m, day: parsed.d });
          }} />
        </Field>
        <Field label="Doğum yılı, isteğe bağlı">
          <Input value={draft.year ? String(draft.year) : ''} onChangeText={(year) => set({ year: year.replace(/[^0-9]/g, '').slice(0, 4) })} keyboardType="number-pad" placeholder="2003" />
        </Field>
        <Field label="Not">
          <Input value={draft.notes} onChangeText={(notes) => set({ notes })} placeholder="Pasta, hediye" />
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.name || '').trim() && !(draft.title || '').trim()) return setError('Başlık ya da kişi yaz.');
          const year = draft.year ? Number(draft.year) : null;
          if (year && (year < 1920 || year > new Date().getFullYear())) return setError('Yılı kontrol et.');
          house.saveDay({ ...draft, year });
          onClose();
        }} />
        {draft.id ? <Pressable onPress={() => remove('Günü sil', () => house.deleteDay(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  if (type === 'loan') {
    const hasDue = Boolean(draft.due);
    return (
      <Sheet title={draft.id ? 'Emaneti düzenle' : 'Yeni emanet'} onClose={onClose}>
        <Field label="Yön">
          <Chips
            options={[{ id: 'lent', label: 'Ben verdim' }, { id: 'borrowed', label: 'Ben aldım' }]}
            value={draft.direction}
            onChange={(direction) => set({ direction })}
          />
        </Field>
        <Field label="Ne">
          <Input value={draft.item} onChangeText={(item) => set({ item })} placeholder="Şarj aleti, kitap" />
        </Field>
        <Field label="Kim">
          <Input value={draft.person} onChangeText={(person) => set({ person })} placeholder="Selin" />
        </Field>
        <Field label="Gün">
          <Chips
            options={[{ id: 'none', label: 'Günü yok' }, { id: 'date', label: 'Gün var' }]}
            value={hasDue ? 'date' : 'none'}
            onChange={(mode) => set({ due: mode === 'date' ? (draft.due || addDays(todayISO(), 3)) : '' })}
          />
        </Field>
        {hasDue ? <DateSteppers value={draft.due} onChange={(due) => set({ due })} /> : null}
        <Field label="Not">
          <Input value={draft.notes} onChangeText={(notes) => set({ notes })} placeholder="İsteğe bağlı" />
        </Field>
        {draft.id ? (
          <Field label="Durum">
            <Chips
              options={[{ id: 'open', label: 'Açık' }, { id: 'shut', label: 'Kapandı' }]}
              value={draft.settled ? 'shut' : 'open'}
              onChange={(mode) => set({ settled: mode === 'shut' })}
            />
          </Field>
        ) : null}
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.item || '').trim() || !(draft.person || '').trim()) return setError('Eşyayı ve kişiyi yaz.');
          house.saveLoan(draft);
          onClose();
        }} />
        {draft.id ? <Pressable onPress={() => remove('Emaneti sil', () => house.deleteLoan(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  if (type === 'lesson') {
    const kind = draft.kind === 'sinav' ? 'sinav' : 'ders';
    const weekdays = draft.weekdays || [];
    return (
      <Sheet title={draft.id ? 'Dersi düzenle' : 'Ders veya sınav'} onClose={onClose}>
        <Field label="Ad">
          <Input value={draft.title || ''} onChangeText={(title) => set({ title })} placeholder="Matematik, vize, laboratuvar" />
        </Field>
        <Field label="Tür">
          <Chips
            options={[{ id: 'ders', label: 'Haftalık ders' }, { id: 'sinav', label: 'Sınav' }]}
            value={kind}
            onChange={(next) => set({ kind: next })}
          />
        </Field>
        <Field label="Kim">
          <Chips
            options={(members || []).map((member) => ({ id: member.id, label: member.id === place?.meId ? `${member.name} (sen)` : member.name }))}
            value={draft.memberId}
            onChange={(memberId) => set({ memberId })}
          />
        </Field>
        {kind === 'ders' ? (
          <Field label="Günler">
            <Chips
              multiple
              options={[1, 2, 3, 4, 5, 6, 0].map((day) => ({ id: day, label: weekdayName(day, true) }))}
              value={weekdays}
              onChange={(next) => set({ weekdays: next })}
            />
          </Field>
        ) : (
          <Field label="Sınav günü">
            <DateSteppers value={draft.onceDate || todayISO()} onChange={(onceDate) => set({ onceDate })} />
          </Field>
        )}
        {kind === 'ders' ? (
          <Field label="Başlangıç">
            <DateSteppers value={draft.startDate || todayISO()} onChange={(startDate) => set({ startDate })} />
          </Field>
        ) : null}
        <Field label="Başlangıç saati">
          <ClockField value={draft.time || '09:00'} onChange={(time) => set({ time })} />
        </Field>
        <Field label="Bitiş saati">
          <ClockField allowOff value={draft.endTime} onChange={(endTime) => set({ endTime })} />
        </Field>
        <Field label="Yer">
          <Input value={draft.room || ''} onChangeText={(room) => set({ room })} placeholder="Amfi, B-204" />
        </Field>
        <Field label="Hatırlatma">
          <ClockField allowOff value={draft.reminderTime} onChange={(reminderTime) => set({ reminderTime })} />
        </Field>
        <Field label="Not">
          <Input value={draft.notes || ''} onChangeText={(notes) => set({ notes })} placeholder="Kitap, slayt" />
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          if (!(draft.title || '').trim()) return setError('Dersin adını yaz.');
          if (kind === 'ders' && !(draft.weekdays || []).length) return setError('En az bir gün seç.');
          if (kind === 'sinav' && !draft.onceDate) return setError('Sınav gününü seç.');
          house.saveLesson(draft);
          onClose();
        }} />
        {draft.id ? <Pressable onPress={() => remove('Dersi sil', () => house.deleteLesson(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  if (type === 'need') {
    const hasDate = Boolean(draft.date);
    const lines = Array.isArray(draft.lines) && draft.lines.length ? draft.lines : [draft.title || ''];
    const setLine = (index, title) => {
      const next = lines.slice();
      next[index] = title;
      set({ lines: next, title: next[0] || '' });
    };
    const goNext = (index) => {
      if (!String(lines[index] || '').trim() && index === lines.length - 1) return;
      if (index < lines.length - 1) {
        lineRefs.current[index + 1]?.focus();
        return;
      }
      const next = [...lines, ''];
      set({ lines: next, title: next[0] || '' });
      setTimeout(() => lineRefs.current[next.length - 1]?.focus(), 40);
    };
    return (
      <Sheet title={draft.id ? 'Alınacak' : 'Alınacak ekle'} onClose={onClose}>
        <Field label="Ne lazım">
          <T weight="medium" style={styles.hint}>Geç tuşu bir alt satırı açar. Her satır ayrı bir madde olur.</T>
          {lines.map((line, index) => (
            <Input
              key={`line-${index}`}
              ref={(node) => { lineRefs.current[index] = node; }}
              value={line}
              onChangeText={(title) => setLine(index, title)}
              placeholder={index === 0 ? 'Süt' : 'Sonraki madde'}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => goNext(index)}
              style={index ? styles.lineGap : null}
            />
          ))}
        </Field>
        <Field label="Not">
          <Input value={draft.notes || ''} onChangeText={(notes) => set({ notes })} placeholder="Markette, iki kutu" />
        </Field>
        <Field label="Hangi gün alınsın">
          <Chips
            options={[{ id: 'none', label: 'Günü yok' }, { id: 'date', label: 'Gün seç' }]}
            value={hasDate ? 'date' : 'none'}
            onChange={(mode) => set({ date: mode === 'date' ? (draft.date || addDays(todayISO(), 1)) : '' })}
          />
        </Field>
        {hasDate ? <DateSteppers value={draft.date} onChange={(date) => set({ date })} /> : null}
        <Field label="Ana sayfa">
          <Chips
            options={[{ id: 'no', label: 'Sadece listede' }, { id: 'yes', label: 'Ana sayfada dursun' }]}
            value={draft.showOnHome ? 'yes' : 'no'}
            onChange={(mode) => set({ showOnHome: mode === 'yes' })}
          />
        </Field>
        {error ? <T style={styles.error}>{error}</T> : null}
        <Button label="Kaydet" onPress={() => {
          const titles = lines.map((line) => line.trim()).filter(Boolean);
          if (!titles.length) return setError('Ne alınacağını yaz.');
          house.saveNeeds(titles.map((title, index) => ({
            id: index === 0 ? draft.id : null,
            title,
            notes: draft.notes,
            date: draft.date,
            showOnHome: draft.showOnHome,
            done: index === 0 ? draft.done : false,
          })));
          onClose();
        }} />
        {draft.id ? <Pressable onPress={() => remove('Listeden sil', () => house.deleteNeed(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
      </Sheet>
    );
  }

  return (
    <Sheet title={draft.id ? 'Notu düzenle' : 'Yeni not'} onClose={onClose}>
      <Field label="Başlık">
        <Input value={draft.title} onChangeText={(title) => set({ title })} placeholder="Market, Wi-Fi, kargo" />
      </Field>
      <Field label="Yaz">
        <Input
          value={draft.body}
          onChangeText={(body) => set({ body })}
          placeholder="Satır satır yazabilirsin"
          multiline
          style={styles.area}
        />
      </Field>
      <Field label="Ana sayfa">
        <Chips
          options={[{ id: 'no', label: 'Sadece defterde' }, { id: 'yes', label: 'Ana sayfada dursun' }]}
          value={draft.showOnHome || draft.pinned ? 'yes' : 'no'}
          onChange={(mode) => set({ showOnHome: mode === 'yes', pinned: mode === 'yes' })}
        />
      </Field>
      {error ? <T style={styles.error}>{error}</T> : null}
      <Button label="Kaydet" onPress={() => {
        if (!(draft.title || '').trim() && !(draft.body || '').trim()) return setError('Bir şey yaz.');
        house.saveNote(draft);
        onClose();
      }} />
      {draft.id ? <Pressable onPress={() => remove('Notu sil', () => house.deleteNote(draft.id))} style={styles.deleteWrap}><T weight="semi" style={styles.delete}>Sil</T></Pressable> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,26,22,0.35)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 8 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  sheetTitle: { fontSize: 28, color: colors.ink },
  close: { color: colors.inkSoft, fontSize: 15 },
  sheetBody: { padding: 20, paddingBottom: 36 },
  menuRow: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuText: { fontSize: 17, color: colors.ink },
  menuOn: { borderColor: colors.ink },
  placeKind: { color: colors.faint, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  placeOpen: { color: colors.clayDeep, marginTop: 4 },
  hint: { color: colors.inkSoft, lineHeight: 20, marginBottom: 12 },
  lineGap: { marginTop: 8 },
  status: { color: colors.ink, marginBottom: 12 },
  plan: { color: colors.inkSoft, marginTop: 10 },
  weights: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  clockGap: { marginTop: 10 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  day: {
    width: '30%',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dayName: { color: colors.ink, fontSize: 13 },
  dayWho: { color: colors.inkSoft, fontSize: 12, marginTop: 2 },
  gap: { height: 10 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  add: { borderRadius: 14, backgroundColor: colors.ink, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.white },
  error: { color: colors.clayDeep, marginBottom: 10 },
  deleteWrap: { alignItems: 'center', marginTop: 16 },
  delete: { color: colors.clayDeep },
  stepRow: { flexDirection: 'row', gap: 8 },
  step: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  stepBtn: { padding: 6 },
  stepSign: { fontSize: 18, color: colors.ink },
  stepMid: { alignItems: 'center' },
  stepValue: { fontSize: 18, color: colors.ink },
  stepLabel: { fontSize: 11, color: colors.faint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  person: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  colors: { flexDirection: 'row', gap: 10 },
  color: { width: 32, height: 32, borderRadius: 16 },
  colorOn: { borderWidth: 3, borderColor: colors.ink },
  area: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
  hidden: { display: 'none' },
});
