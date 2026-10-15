import { memberColors } from '../theme.js';
import {
  addDays,
  addMonths,
  clampDay,
  dayDistance,
  formatShort,
  iso,
  nextSpecialDate,
  parseISO,
  reminderDates,
  shiftMonth,
  todayISO,
  uid,
  weekdayName,
  weekdayOf,
  ym,
} from './dates.js';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function emptyWeek() {
  return { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}

export function blankState() {
  return {
    onboardingDone: false,
    activePlaceId: null,
    places: [],
    completions: 0,
  };
}

export function activePlace(state) {
  if (!state?.places?.length) return null;
  return state.places.find((place) => place.id === state.activePlaceId) || state.places[0];
}

export function kindLabel(kind) {
  return kind === 'is' ? 'İş yeri' : 'Ev';
}

export function createPlace({ name, kind, myName, others }) {
  const cleanOthers = [];
  (others || []).forEach((item) => {
    const text = String(item || '').trim();
    if (!text) return;
    const exists = text.toLocaleLowerCase('tr') === String(myName || '').trim().toLocaleLowerCase('tr')
      || cleanOthers.some((row) => row.toLocaleLowerCase('tr') === text.toLocaleLowerCase('tr'));
    if (!exists) cleanOthers.push(text);
  });
  const me = { id: uid(), name: String(myName || '').trim(), color: memberColors[0] };
  const members = [
    me,
    ...cleanOthers.map((person, index) => ({
      id: uid(),
      name: person,
      color: memberColors[(index + 1) % memberColors.length],
    })),
  ];
  return {
    id: uid(),
    name: String(name || '').trim() || (kind === 'is' ? 'İş yeri' : 'Ev'),
    kind: kind === 'is' ? 'is' : 'ev',
    meId: me.id,
    members,
    tasks: [],
    bills: [],
    reminders: [],
    days: [],
    loans: [],
    notes: [],
    needs: [],
  };
}

export function memberName(place, id) {
  return place?.members?.find((member) => member.id === id)?.name || 'Birisi';
}

function clock(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const h = ((hour % 24) + 24) % 24;
  const m = ((minute % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function legacyIds(task, date) {
  if (task.onceDate) return task.onceDate === date && task.assigneeId ? [task.assigneeId] : null;
  const id = task.week?.[String(weekdayOf(date))] || null;
  return id ? [id] : null;
}

function occursOn(task, date) {
  if (task.repeat === 'none') return task.onceDate === date;
  if (!task.startDate || date < task.startDate) return false;
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekly') return (task.weekdays || []).map(Number).includes(weekdayOf(date));
  if (task.repeat === 'monthly') {
    const parsed = parseISO(date);
    return parsed.d === clampDay(parsed.y, parsed.m, task.monthDay || 1);
  }
  return false;
}

function occurrenceIndex(task, date) {
  if (task.repeat === 'daily') return Math.max(0, dayDistance(date, task.startDate));
  if (task.repeat === 'monthly') {
    const start = parseISO(task.startDate);
    const end = parseISO(date);
    return Math.max(0, (end.y - start.y) * 12 + (end.m - start.m));
  }
  const days = (task.weekdays || []).map(Number);
  const span = Math.max(0, dayDistance(date, task.startDate));
  const full = Math.floor(span / 7) * days.length;
  const startDay = weekdayOf(task.startDate);
  let extra = 0;
  for (let i = 0; i <= span % 7; i += 1) {
    if (days.includes((startDay + i) % 7)) extra += 1;
  }
  return Math.max(0, full + extra - 1);
}

function turnId(task, date) {
  const people = task.people || [];
  if (people.length < 2 || task.share === 'together' || task.repeat === 'none') return null;
  const sequence = task.share === 'weighted'
    ? people.flatMap((id) => Array(Math.max(1, Number(task.weights?.[id]) || 1)).fill(id))
    : people;
  if (!sequence.length) return null;
  const index = occurrenceIndex(task, date);
  return sequence[((index % sequence.length) + sequence.length) % sequence.length];
}

export function expectedIds(task, date) {
  if (!task) return null;
  if (!Array.isArray(task.people)) return legacyIds(task, date);
  if (!occursOn(task, date)) return null;
  const people = task.people.filter(Boolean);
  if (!people.length) return null;
  const turn = turnId(task, date);
  return turn ? [turn] : people;
}

export function expectedOn(task, date) {
  return expectedIds(task, date)?.[0] || null;
}

export function dayState(task, date, today = todayISO()) {
  const ids = expectedIds(task, date);
  if (!ids?.length) return null;
  const entry = task.log?.[date];
  const expectedId = ids[0];
  if (date > today) return { expectedIds: ids, expectedId, state: 'plan', doneById: null };
  if (entry?.done) {
    const doneById = entry.doneById || expectedId;
    return { expectedIds: ids, expectedId, state: ids.includes(doneById) ? 'done' : 'covered', doneById };
  }
  if (date < today || entry?.done === false) return { expectedIds: ids, expectedId, state: 'missed', doneById: null };
  return { expectedIds: ids, expectedId, state: 'open', doneById: null };
}

export function tasksOn(place, date, today = todayISO()) {
  if (!place) return [];
  return (place.tasks || []).map((task) => {
    const row = dayState(task, date, today);
    return row ? { task, ...row } : null;
  }).filter(Boolean);
}

function peopleLabel(place, ids) {
  return (ids || []).map((id) => memberName(place, id)).join(', ');
}

export function statusText(place, row) {
  const ids = row.expectedIds || (row.expectedId ? [row.expectedId] : []);
  const expected = peopleLabel(place, ids);
  const together = ids.length > 1;
  if (row.state === 'plan' || row.state === 'open') return together ? `Birlikte: ${expected}` : `Sıradaki: ${expected}`;
  if (row.state === 'done') return `${memberName(place, row.doneById)} yaptı`;
  if (row.state === 'covered') {
    return together
      ? `Birlikte ${expected} idi, ${memberName(place, row.doneById)} yaptı`
      : `Sıradaki ${expected} idi, ${memberName(place, row.doneById)} yaptı`;
  }
  return `Yapılmadı · ${together ? 'birlikte' : 'sıradaki'} ${expected} idi`;
}

export function ruleLine(task, place) {
  const who = (task.people || []).map((id) => memberName(place, id));
  let when = 'Tek gün';
  if (task.repeat === 'daily') when = 'Her gün';
  if (task.repeat === 'weekly') {
    when = (task.weekdays || []).map((day) => weekdayName(Number(day), true)).join(', ') || 'Gün seçilmedi';
  }
  if (task.repeat === 'monthly') when = `Her ayın ${task.monthDay}. günü`;
  if (task.repeat === 'none') when = task.onceDate ? formatShort(task.onceDate) : 'Gün seçilmedi';
  if (who.length > 1 && task.share === 'weighted' && task.repeat !== 'none') {
    const counts = (task.people || []).map((id) => `${task.weights?.[id] || 1} ${memberName(place, id)}`).join(', ');
    return `${when} · ${counts}`;
  }
  if (who.length > 1 && task.share === 'rotate' && task.repeat !== 'none') return `${when} · sırayla ${who.join(', ')}`;
  if (who.length > 1) return `${when} · birlikte ${who.join(', ')}`;
  return `${when} · ${who[0] || 'kişi yok'}`;
}

export function weekLine(task, place) {
  if (Array.isArray(task.people)) return ruleLine(task, place);
  if (task.onceDate) return `${formatShort(task.onceDate)} · ${memberName(place, task.assigneeId)}`;
  const chunks = [];
  let runStart = null;
  let runEnd = null;
  let runId = null;
  const flush = () => {
    if (!runId) {
      runStart = null;
      runEnd = null;
      return;
    }
    const who = memberName(place, runId);
    chunks.push(runStart === runEnd
      ? `${weekdayName(runStart, true)} ${who}`
      : `${weekdayName(runStart, true)}–${weekdayName(runEnd, true)} ${who}`);
    runStart = null;
    runEnd = null;
    runId = null;
  };
  WEEK_ORDER.forEach((day) => {
    const id = task.week?.[String(day)] || null;
    if (id && id === runId) {
      runEnd = day;
      return;
    }
    flush();
    if (id) {
      runStart = day;
      runEnd = day;
      runId = id;
    }
  });
  flush();
  return chunks.join(' · ') || 'Gün seçilmedi';
}

export function didCount(place, today = todayISO()) {
  const month = today.slice(0, 7);
  return (place?.members || []).map((member) => ({
    member,
    count: (place.tasks || []).reduce((sum, task) => (
      sum + Object.entries(task.log || {}).filter(([date, entry]) => date.startsWith(month) && entry.done && entry.doneById === member.id).length
    ), 0),
  }));
}

export function prepareTask(draft, previous) {
  const people = [...new Set((draft.people || []).filter(Boolean))];
  const repeat = ['daily', 'weekly', 'monthly', 'none'].includes(draft.repeat) ? draft.repeat : 'none';
  const weights = {};
  people.forEach((id) => {
    weights[id] = Math.min(12, Math.max(1, Number(draft.weights?.[id]) || 1));
  });
  let share = draft.share;
  if (people.length < 2 || repeat === 'none') share = 'together';
  if (!['together', 'rotate', 'weighted'].includes(share)) share = 'together';
  const weekdays = [...new Set((draft.weekdays || []).map(Number).filter((day) => day >= 0 && day <= 6))];
  return {
    id: draft.id,
    title: String(draft.title || '').trim(),
    notes: String(draft.notes || '').trim(),
    people,
    share,
    weights,
    repeat,
    weekdays,
    monthDay: Math.min(31, Math.max(1, Number(draft.monthDay) || 1)),
    onceDate: repeat === 'none' ? (draft.onceDate || null) : null,
    startDate: draft.startDate || draft.onceDate || todayISO(),
    reminderTime: clock(draft.reminderTime),
    log: previous?.log || {},
  };
}

function isPaid(bill, key) {
  return (bill.payments || []).some((payment) => payment.period === key);
}

export function openBill(bill, today = todayISO()) {
  const parsed = parseISO(today);
  const previous = shiftMonth(parsed.y, parsed.m, -1);
  const previousDue = iso(previous.y, previous.m, clampDay(previous.y, previous.m, bill.dueDay || 1));
  const previousKey = ym(previous.y, previous.m);
  if (!isPaid(bill, previousKey) && previousDue < today && dayDistance(previousDue, today) >= -20) {
    return { key: previousKey, due: previousDue };
  }
  const currentKey = ym(parsed.y, parsed.m);
  if (!isPaid(bill, currentKey)) {
    return { key: currentKey, due: iso(parsed.y, parsed.m, clampDay(parsed.y, parsed.m, bill.dueDay || 1)) };
  }
  const next = shiftMonth(parsed.y, parsed.m, 1);
  return { key: ym(next.y, next.m), due: iso(next.y, next.m, clampDay(next.y, next.m, bill.dueDay || 1)) };
}

export function payerFor(bill, index) {
  const members = bill.memberIds || [];
  if (!members.length) return bill.payerId || null;
  if (!bill.rotate) return bill.payerId || members[bill.cursor] || members[0];
  return members[(bill.cursor + index) % members.length];
}

export function projectBill(bill, from, to, today = todayISO()) {
  const open = openBill(bill, today);
  const items = [];
  let index = 0;
  let date = open.due;
  while (date <= to && index < 18) {
    if (date >= from) {
      items.push({
        date,
        period: index === 0 ? open.key : date.slice(0, 7),
        payerId: payerFor(bill, index),
        index,
      });
    }
    index += 1;
    date = addMonths(open.due, index, bill.dueDay || 1);
  }
  return items;
}

export function shareAmount(bill) {
  const count = (bill.memberIds || []).length;
  if (!bill.amount || count < 2) return '';
  const each = Math.round((Number(bill.amount) / count) * 100) / 100;
  const whole = Math.round(each) === each;
  return `kişi başı ${whole ? each : each.toFixed(2)} TL`;
}

export function dayKindLabel(kind) {
  if (kind === 'birthday') return 'Doğum günü';
  if (kind === 'anniversary') return 'Yıldönümü';
  return 'Özel gün';
}

export function repeatLabel(repeat) {
  if (repeat === 'daily') return 'Her gün';
  if (repeat === 'weekly') return 'Her hafta';
  if (repeat === 'monthly') return 'Her ay';
  if (repeat === 'yearly') return 'Her yıl';
  return 'Bir kez';
}

export function monthMarks(place, year, month, today = todayISO()) {
  const marks = {};
  if (!place) return marks;
  const add = (date, kind) => {
    if (!date) return;
    if (!marks[date]) marks[date] = [];
    if (!marks[date].includes(kind)) marks[date].push(kind);
  };
  const start = iso(year, month, 1);
  const end = iso(year, month, clampDay(year, month, 31));
  let cursor = start;
  while (cursor <= end) {
    if ((place.tasks || []).some((task) => expectedIds(task, cursor))) add(cursor, 'chore');
    cursor = addDays(cursor, 1);
  }
  (place.bills || []).forEach((bill) => {
    projectBill(bill, start, end, today).forEach((item) => add(item.date, 'bill'));
  });
  (place.reminders || []).forEach((reminder) => {
    reminderDates(reminder, start, end).forEach((date) => add(date, 'reminder'));
  });
  (place.days || []).forEach((day) => {
    add(iso(year, day.month, clampDay(year, day.month, day.day)), 'day');
  });
  (place.loans || []).forEach((loan) => {
    if (!loan.settled) add(loan.due, 'loan');
  });
  (place.needs || []).forEach((need) => {
    if (!need.done) add(need.date, 'shop');
  });
  return marks;
}

export function agendaFor(place, date, today = todayISO()) {
  if (!place) return [];
  const items = [];
  tasksOn(place, date, today).forEach((row) => {
    items.push({
      key: `task-${row.task.id}-${date}`,
      kind: 'chore',
      title: row.task.title,
      meta: statusText(place, row),
      edit: date > today
        ? { type: 'task', item: row.task }
        : { type: 'mark', item: { taskId: row.task.id, date } },
    });
  });
  (place.bills || []).forEach((bill) => {
    const projected = projectBill(bill, date, date, today)[0];
    if (!projected) return;
    items.push({
      key: `bill-${bill.id}-${date}`,
      kind: 'bill',
      title: bill.title,
      meta: [memberName(place, projected.payerId), shareAmount(bill)].filter(Boolean).join(' · '),
      edit: { type: 'bill', item: bill },
    });
  });
  (place.reminders || []).forEach((reminder) => {
    if (!reminderDates(reminder, date, date).length) return;
    items.push({
      key: `reminder-${reminder.id}-${date}`,
      kind: 'reminder',
      title: reminder.title,
      meta: reminder.time || '',
      edit: { type: 'reminder', item: reminder },
    });
  });
  (place.days || []).forEach((day) => {
    const parsed = parseISO(date);
    if (parsed.m !== day.month || parsed.d !== clampDay(parsed.y, parsed.m, day.day)) return;
    items.push({
      key: `day-${day.id}-${date}`,
      kind: 'day',
      title: day.title || day.name,
      meta: [dayKindLabel(day.kind), day.title && day.name && day.title !== day.name ? day.name : ''].filter(Boolean).join(' · '),
      edit: { type: 'day', item: day },
    });
  });
  (place.loans || []).forEach((loan) => {
    if (loan.settled || loan.due !== date) return;
    items.push({
      key: `loan-${loan.id}`,
      kind: 'loan',
      title: loan.item,
      meta: loan.person,
      edit: { type: 'loan', item: loan },
    });
  });
  (place.needs || []).forEach((need) => {
    if (need.done || need.date !== date) return;
    items.push({
      key: `need-${need.id}`,
      kind: 'shop',
      title: need.title,
      meta: need.notes || 'Alınacak',
      edit: { type: 'need', item: need },
    });
  });
  return items;
}

export function prepareBill(draft, previous) {
  return {
    id: draft.id,
    title: draft.title.trim(),
    category: draft.category || 'diger',
    amount: draft.amount,
    dueDay: draft.dueDay || 1,
    notes: (draft.notes || '').trim(),
    memberIds: draft.memberIds || [],
    rotate: Boolean(draft.rotate),
    payerId: draft.payerId || (draft.memberIds || [])[0] || null,
    cursor: previous?.cursor || 0,
    payments: previous?.payments || [],
  };
}

export function turningAge(day, date) {
  if (!day.year) return null;
  const year = parseISO(date).y;
  const age = year - Number(day.year);
  return age > 0 && age < 130 ? age : null;
}
