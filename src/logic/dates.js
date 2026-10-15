export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const WEEKDAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function iso(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseISO(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return {
    y: year,
    m: month,
    d: day,
    date: new Date(year, month - 1, day),
  };
}

export function todayISO(now = new Date()) {
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function clampDay(year, month, day) {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

export function addDays(value, count) {
  const { y, m, d } = parseISO(value);
  const date = new Date(y, m - 1, d + count);
  return iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function shiftMonth(year, month, count) {
  const date = new Date(year, month - 1 + count, 1);
  return { y: date.getFullYear(), m: date.getMonth() + 1 };
}

export function addMonths(value, count, day) {
  const parsed = parseISO(value);
  const next = shiftMonth(parsed.y, parsed.m, count);
  return iso(next.y, next.m, clampDay(next.y, next.m, day ?? parsed.d));
}

export function ym(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function weekdayOf(value) {
  return parseISO(value).date.getDay();
}

export function dayDistance(value, today = todayISO()) {
  const a = parseISO(value).date.getTime();
  const b = parseISO(today).date.getTime();
  return Math.round((a - b) / 86400000);
}

export function initialWeekly(weekday, today = todayISO()) {
  const delta = (weekday - weekdayOf(today) + 7) % 7;
  return addDays(today, delta);
}

export function weekdayAfter(today, weekday) {
  const delta = (weekday - weekdayOf(today) + 7) % 7;
  return addDays(today, delta === 0 ? 7 : delta);
}

export function weekdayBefore(today, weekday) {
  const delta = (weekdayOf(today) - weekday + 7) % 7;
  return addDays(today, delta === 0 ? -7 : -delta);
}

export function monthDayOnOrAfter(today, dayOfMonth) {
  const parsed = parseISO(today);
  const candidate = iso(parsed.y, parsed.m, clampDay(parsed.y, parsed.m, dayOfMonth));
  if (candidate >= today) return candidate;
  const next = shiftMonth(parsed.y, parsed.m, 1);
  return iso(next.y, next.m, clampDay(next.y, next.m, dayOfMonth));
}

export function monthDayAfter(today, dayOfMonth) {
  const parsed = parseISO(today);
  const candidate = iso(parsed.y, parsed.m, clampDay(parsed.y, parsed.m, dayOfMonth));
  if (candidate > today) return candidate;
  const next = shiftMonth(parsed.y, parsed.m, 1);
  return iso(next.y, next.m, clampDay(next.y, next.m, dayOfMonth));
}

export function initialChoreDate(chore, today = todayISO()) {
  if (chore.frequency === 'weekly') return initialWeekly(chore.weekday ?? 1, today);
  if (chore.frequency === 'monthly') return monthDayOnOrAfter(today, chore.dayOfMonth ?? 1);
  return today;
}

export function advanceChore(chore, today = todayISO()) {
  if (chore.frequency === 'weekly') return weekdayAfter(today, chore.weekday ?? 1);
  if (chore.frequency === 'monthly') return monthDayAfter(today, chore.dayOfMonth ?? 1);
  return addDays(today, 1);
}

export function monthName(month, short = false) {
  return (short ? MONTHS_SHORT : MONTHS)[(month || 1) - 1];
}

export function weekdayName(day, short = false) {
  return (short ? WEEKDAYS_SHORT : WEEKDAYS)[day] || '';
}

export function formatLong(value) {
  const parsed = parseISO(value);
  return `${parsed.d} ${monthName(parsed.m)} ${weekdayName(parsed.date.getDay())}`;
}

export function formatShort(value) {
  const parsed = parseISO(value);
  return `${parsed.d} ${monthName(parsed.m, true)}`;
}

export function formatMonthYear(year, month) {
  return `${monthName(month)} ${year}`;
}

export function relative(value, today = todayISO()) {
  const distance = dayDistance(value, today);
  if (distance === 0) return 'Bugün';
  if (distance === 1) return 'Yarın';
  if (distance === -1) return 'Dün';
  if (distance < 0) return `${-distance} gün gecikti`;
  if (distance < 21) return `${distance} gün kaldı`;
  return formatShort(value);
}

export function lira(amount) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return '';
  const value = Number(amount);
  const whole = Math.round(value) === value;
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: whole ? 0 : 2,
    }).format(value);
  } catch {
    return `${whole ? value : value.toFixed(2)} TL`;
  }
}

export function parseAmount(text) {
  const clean = String(text ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!clean) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function monthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  let lead = first.getDay() - 1;
  if (lead < 0) lead = 6;
  const count = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) {
    cells.push({ day, iso: iso(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function matchesReminder(reminder, value) {
  const parsed = parseISO(value);
  if (reminder.repeat === 'once') return reminder.date === value;
  if (reminder.repeat === 'weekly') return parsed.date.getDay() === reminder.weekday;
  if (reminder.repeat === 'monthly') return parsed.d === clampDay(parsed.y, parsed.m, reminder.dayOfMonth || 1);
  if (reminder.repeat === 'yearly') {
    return parsed.m === reminder.month && parsed.d === clampDay(parsed.y, parsed.m, reminder.day || 1);
  }
  return true;
}

export function reminderDates(reminder, from, to) {
  if (reminder.enabled === false) return [];
  if (reminder.repeat === 'once') {
    return reminder.date && reminder.date >= from && reminder.date <= to ? [reminder.date] : [];
  }
  const dates = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    if (matchesReminder(reminder, cursor)) dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export function nextSpecialDate(day, today = todayISO()) {
  const parsed = parseISO(today);
  let date = iso(parsed.y, day.month, clampDay(parsed.y, day.month, day.day));
  if (date < today) {
    date = iso(parsed.y + 1, day.month, clampDay(parsed.y + 1, day.month, day.day));
  }
  return date;
}
