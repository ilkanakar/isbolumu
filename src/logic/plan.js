import {
  addDays,
  clampDay,
  formatLong,
  iso,
  parseISO,
  reminderDates,
  todayISO,
  weekdayOf,
} from './dates.js';
import {
  expectedIds,
  lessonOn,
  memberName,
  payerFor,
  projectBill,
  statusText,
  tasksOn,
} from './house.js';

export function spanFor(mode, today, customFrom, customTo) {
  if (mode === 'day') return { from: today, to: today, heading: 'Günlük plan' };
  if (mode === 'month') {
    const parsed = parseISO(today);
    return {
      from: iso(parsed.y, parsed.m, 1),
      to: iso(parsed.y, parsed.m, clampDay(parsed.y, parsed.m, 31)),
      heading: 'Aylık plan',
    };
  }
  if (mode === 'custom') {
    const from = customFrom || today;
    const to = customTo && customTo >= from ? customTo : from;
    return { from, to, heading: 'Seçilen günler' };
  }
  const delta = (weekdayOf(today) + 6) % 7;
  const from = addDays(today, -delta);
  return { from, to: addDays(from, 6), heading: 'Haftalık plan' };
}

function row(kind, title, detail, time, endTime) {
  return { kind, title, detail, time: time || '09:00', endTime: endTime || null };
}

export function collectPlan(place, options = {}) {
  const today = options.today || todayISO();
  const span = spanFor(options.mode || 'week', today, options.from, options.to);
  const parts = {
    tasks: true,
    bills: true,
    reminders: true,
    days: true,
    loans: true,
    needs: true,
    lessons: true,
    ...(options.parts || {}),
  };
  const personId = options.personId || null;
  const needsOnly = Boolean(options.needsOnly);
  const days = [];

  if (place && !needsOnly) {
    let cursor = span.from;
    let guard = 0;
    while (cursor <= span.to && guard < 93) {
      const rows = [];
      if (parts.tasks) {
        tasksOn(place, cursor, today).forEach((item) => {
          const ids = item.expectedIds || expectedIds(item.task, cursor) || [];
          if (personId && !ids.includes(personId)) return;
          rows.push(row('İş', item.task.title, statusText(place, item), item.task.reminderTime, null));
        });
      }
      if (parts.bills && !personId) {
        (place.bills || []).forEach((bill) => {
          const projected = projectBill(bill, cursor, cursor, today)[0];
          if (!projected) return;
          const payer = memberName(place, projected.payerId || payerFor(bill, 0));
          rows.push(row('Fatura', bill.title, payer, '10:00', null));
        });
      } else if (parts.bills && personId) {
        (place.bills || []).forEach((bill) => {
          const projected = projectBill(bill, cursor, cursor, today)[0];
          if (!projected) return;
          const payerId = projected.payerId || payerFor(bill, 0);
          if (payerId !== personId) return;
          rows.push(row('Fatura', bill.title, memberName(place, payerId), '10:00', null));
        });
      }
      if (parts.reminders && !personId) {
        (place.reminders || []).forEach((reminder) => {
          if (!reminderDates(reminder, cursor, cursor).length) return;
          rows.push(row('Hatırlatma', reminder.title, reminder.notes || '', reminder.time || '09:00', null));
        });
      }
      if (parts.days) {
        (place.days || []).forEach((day) => {
          const parsed = parseISO(cursor);
          if (parsed.m !== day.month || parsed.d !== clampDay(parsed.y, parsed.m, day.day)) return;
          if (personId && day.memberId !== personId) return;
          rows.push(row('Özel gün', day.title || day.name, day.name || '', '09:00', null));
        });
      }
      if (parts.loans && !personId) {
        (place.loans || []).forEach((loan) => {
          if (loan.settled || loan.due !== cursor) return;
          rows.push(row('Emanet', loan.item, loan.person || '', '09:00', null));
        });
      }
      if (parts.needs) {
        (place.needs || []).forEach((need) => {
          if (need.done || need.date !== cursor) return;
          rows.push(row('Alınacak', need.title, need.notes || '', '18:00', null));
        });
      }
      if (parts.lessons) {
        (place.lessons || []).forEach((lesson) => {
          if (!lessonOn(lesson, cursor)) return;
          if (personId && lesson.memberId !== personId) return;
          const who = lesson.memberId ? memberName(place, lesson.memberId) : '';
          rows.push(row(
            lesson.kind === 'sinav' ? 'Sınav' : 'Ders',
            lesson.title,
            [lesson.room, who].filter(Boolean).join(' · '),
            lesson.time || lesson.reminderTime || '09:00',
            lesson.endTime,
          ));
        });
      }
      if (rows.length) days.push({ date: cursor, label: formatLong(cursor), rows });
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  }

  const needs = (needsOnly || parts.needs)
    ? (place?.needs || []).filter((need) => {
      if (needsOnly) return true;
      if (!need.date) return true;
      return need.date >= span.from && need.date <= span.to;
    })
    : [];

  return {
    heading: needsOnly ? 'Alınacaklar' : span.heading,
    placeName: place?.name || 'İş Bölümü',
    from: span.from,
    to: span.to,
    days: needsOnly ? [] : days,
    needs,
  };
}

export function eventSpan(date, time, endTime) {
  const [hour, minute] = String(time || '09:00').split(':').map(Number);
  const [year, month, day] = String(date).split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, hour || 9, minute || 0, 0, 0);
  let end = new Date(start.getTime() + 60 * 60 * 1000);
  if (endTime) {
    const [endHour, endMinute] = String(endTime).split(':').map(Number);
    const candidate = new Date(year, (month || 1) - 1, day || 1, endHour || hour || 10, endMinute || 0, 0, 0);
    if (candidate.getTime() > start.getTime()) end = candidate;
  }
  return { start, end };
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function htmlForPlan(plan) {
  const range = plan.from === plan.to ? esc(formatLong(plan.from)) : `${esc(formatLong(plan.from))} – ${esc(formatLong(plan.to))}`;
  const dayBlocks = (plan.days || []).map((day) => {
    const lines = day.rows.map((item) => `
      <div class="row">
        <div class="kind">${esc(item.kind)}${item.time ? ` · ${esc(item.time)}` : ''}</div>
        <div class="title">${esc(item.title)}</div>
        ${item.detail ? `<div class="meta">${esc(item.detail)}</div>` : ''}
      </div>`).join('');
    return `<h2>${esc(day.label)}</h2>${lines}`;
  }).join('');
  const openNeeds = (plan.needs || []).filter((need) => !need.done);
  const doneNeeds = (plan.needs || []).filter((need) => need.done);
  const needLine = (need) => `<div class="${need.done ? 'need done' : 'need'}"><span class="box"></span>${esc(need.title)}${need.date ? ` <span class="meta">${esc(formatLong(need.date))}</span>` : ''}${need.notes ? ` <span class="meta">${esc(need.notes)}</span>` : ''}</div>`;
  const needBlock = (plan.needs || []).length
    ? `<h2>Alınacaklar</h2>${openNeeds.map(needLine).join('')}${doneNeeds.length ? `<h2>Alınanlar</h2>${doneNeeds.map(needLine).join('')}` : ''}`
    : '';
  const empty = !dayBlocks && !(plan.needs || []).length ? '<p class="meta">Bu aralıkta paylaşılacak kayıt yok.</p>' : '';
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><style>
    body { font-family: Georgia, serif; color: #1E1A16; margin: 28px; }
    h1 { font-weight: normal; font-size: 28px; margin: 0; }
    h2 { font-weight: normal; font-size: 18px; margin: 22px 0 8px; border-bottom: 1px solid #E4D8C8; padding-bottom: 4px; }
    .sub { color: #5E534A; margin-top: 4px; }
    .kind { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #8E3B24; }
    .title { font-size: 16px; margin-top: 2px; }
    .meta { color: #5E534A; font-size: 13px; }
    .row { margin: 10px 0; }
    .need { margin: 8px 0; font-size: 16px; }
    .box { display: inline-block; width: 13px; height: 13px; border: 1.5px solid #1E1A16; margin-right: 8px; vertical-align: -1px; }
    .done { color: #8A7B6D; text-decoration: line-through; }
    .foot { margin-top: 28px; color: #A89888; font-size: 12px; }
  </style></head><body>
    <h1>${esc(plan.placeName)}</h1>
    <div class="sub">${esc(plan.heading)} · ${range}</div>
    ${dayBlocks}
    ${needBlock}
    ${empty}
    <div class="foot">İş Bölümü</div>
  </body></html>`;
}
