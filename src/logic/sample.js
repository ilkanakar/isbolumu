import { memberColors, chorePresets } from '../theme.js';
import {
  addDays,
  initialWeekly,
  parseISO,
  todayISO,
  uid,
  weekdayBefore,
  ym,
} from './dates.js';

export function buildSample(today = todayISO()) {
  const ela = uid();
  const kerem = uid();
  const deniz = uid();
  const members = [
    { id: ela, name: 'Ela', color: memberColors[0] },
    { id: kerem, name: 'Kerem', color: memberColors[1] },
    { id: deniz, name: 'Deniz', color: memberColors[2] },
  ];
  const all = [ela, kerem, deniz];
  const soon = parseISO(addDays(today, 3));
  const birthday = parseISO(addDays(today, 8));
  const laterBirthday = parseISO(addDays(today, 36));
  const insurance = parseISO(addDays(today, 18));

  const history = [];
  [ela, kerem, deniz, ela, kerem].forEach((memberId, index) => {
    const date = addDays(today, -((index + 1) * 2));
    if (date.slice(0, 7) === today.slice(0, 7)) {
      history.push({ memberId, date, at: `${date}T09:00:00` });
    }
  });

  return {
    onboardingDone: true,
    demo: true,
    houseName: '3. kat',
    members,
    completions: 0,
    chores: [
      {
        id: uid(),
        title: 'Çöp',
        notes: 'Kapının önündeki kova.',
        frequency: 'daily',
        weekday: 1,
        dayOfMonth: 1,
        memberIds: all,
        cursor: 0,
        nextDate: today,
        history,
      },
      {
        id: uid(),
        title: 'Bulaşık',
        notes: '',
        frequency: 'daily',
        weekday: 1,
        dayOfMonth: 1,
        memberIds: all,
        cursor: 1,
        nextDate: today,
        history: [],
      },
      {
        id: uid(),
        title: 'Market',
        notes: 'Ortak liste defterde.',
        frequency: 'weekly',
        weekday: 6,
        dayOfMonth: 1,
        memberIds: all,
        cursor: 2,
        nextDate: weekdayBefore(today, 6),
        history: [],
      },
      {
        id: uid(),
        title: 'Mutfak',
        notes: '',
        frequency: 'weekly',
        weekday: 3,
        dayOfMonth: 1,
        memberIds: all,
        cursor: 0,
        nextDate: initialWeekly(3, today),
        history: [],
      },
      {
        id: uid(),
        title: 'Banyo',
        notes: '',
        frequency: 'weekly',
        weekday: 0,
        dayOfMonth: 1,
        memberIds: all,
        cursor: 1,
        nextDate: initialWeekly(0, today),
        history: [],
      },
    ],
    bills: [
      {
        id: uid(),
        title: 'Kira',
        category: 'kira',
        amount: 18000,
        dueDay: 1,
        notes: 'Ev sahibine havale.',
        memberIds: all,
        rotate: true,
        payerId: ela,
        cursor: 0,
        payments: [],
      },
      {
        id: uid(),
        title: 'İnternet',
        category: 'internet',
        amount: 450,
        dueDay: soon.d,
        notes: '',
        memberIds: all,
        rotate: true,
        payerId: kerem,
        cursor: 1,
        payments: [],
      },
      {
        id: uid(),
        title: 'Elektrik',
        category: 'elektrik',
        amount: 820,
        dueDay: 28,
        notes: '',
        memberIds: all,
        rotate: true,
        payerId: deniz,
        cursor: 2,
        payments: [],
      },
      {
        id: uid(),
        title: 'Aidat',
        category: 'aidat',
        amount: 350,
        dueDay: 5,
        notes: '',
        memberIds: all,
        rotate: false,
        payerId: ela,
        cursor: 0,
        payments: [{ period: ym(parseISO(today).y, parseISO(today).m), memberId: ela, paidAt: today }],
      },
    ],
    reminders: [
      {
        id: uid(),
        title: 'Aile araması',
        notes: '',
        repeat: 'weekly',
        weekday: 0,
        dayOfMonth: 1,
        month: 1,
        day: 1,
        date: today,
        time: '20:00',
        enabled: true,
      },
      {
        id: uid(),
        title: 'Ev sigortası',
        notes: 'Poliçeyi yenile.',
        repeat: 'yearly',
        weekday: 1,
        dayOfMonth: insurance.d,
        month: insurance.m,
        day: insurance.d,
        date: addDays(today, 18),
        time: '10:00',
        enabled: true,
      },
    ],
    days: [
      {
        id: uid(),
        kind: 'birthday',
        name: 'Ela',
        title: 'Ela',
        month: birthday.m,
        day: birthday.d,
        year: birthday.y - 23,
        notes: 'Çikolatalı pasta.',
      },
      {
        id: uid(),
        kind: 'birthday',
        name: 'Kerem',
        title: 'Kerem',
        month: laterBirthday.m,
        day: laterBirthday.d,
        year: null,
        notes: '',
      },
    ],
    loans: [
      {
        id: uid(),
        direction: 'lent',
        item: 'Şarj aleti',
        person: 'Selin',
        due: addDays(today, 2),
        notes: '',
        settled: false,
        createdAt: today,
      },
      {
        id: uid(),
        direction: 'borrowed',
        item: 'Ütü',
        person: 'Komşu Ayşe',
        due: '',
        notes: '',
        settled: false,
        createdAt: today,
      },
    ],
    notes: [
      {
        id: uid(),
        title: 'Market',
        body: 'Süt\nYumurta\nEkmek\nDeterjan\nÇöp poşeti',
        pinned: true,
        updatedAt: today,
      },
      {
        id: uid(),
        title: 'Wi-Fi',
        body: 'Ağ: 3kat\nŞifre örnek ev içindir.',
        pinned: false,
        updatedAt: today,
      },
    ],
  };
}

export function buildHouse({ houseName, myName, roommates, presetIds }) {
  const names = [myName, ...roommates].map((name) => name.trim()).filter(Boolean);
  const members = names.map((name, index) => ({
    id: uid(),
    name,
    color: memberColors[index % memberColors.length],
  }));
  const memberIds = members.map((member) => member.id);
  const today = todayISO();
  const chosen = chorePresets.filter((preset) => presetIds.includes(preset.id));
  return {
    ...buildEmpty(houseName, members),
    chores: chosen.map((preset, index) => ({
      id: uid(),
      title: preset.title,
      notes: '',
      frequency: preset.frequency,
      weekday: preset.weekday ?? 1,
      dayOfMonth: 1,
      memberIds,
      cursor: index % Math.max(memberIds.length, 1),
      nextDate: preset.frequency === 'daily'
        ? today
        : requireInitial(preset, today),
      history: [],
    })),
  };
}

function buildEmpty(houseName, members) {
  return {
    onboardingDone: true,
    demo: false,
    houseName: houseName.trim() || 'Evimiz',
    members,
    completions: 0,
    chores: [],
    bills: [],
    reminders: [],
    days: [],
    loans: [],
    notes: [],
  };
}

function requireInitial(preset, today) {
  if (preset.frequency === 'weekly') return initialWeekly(preset.weekday ?? 1, today);
  return today;
}
