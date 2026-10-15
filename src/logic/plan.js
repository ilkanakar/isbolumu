import {
  addDays,
  clampDay,
  formatLong,
  iso,
  lira,
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
  purchaseGroups,
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
          const detail = [statusText(place, item), item.task.notes].filter(Boolean).join(' · ');
          rows.push(row('İş', item.task.title, detail, item.task.reminderTime, null));
        });
      }
      if (parts.bills && !personId) {
        (place.bills || []).forEach((bill) => {
          const projected = projectBill(bill, cursor, cursor, today)[0];
          if (!projected) return;
          const payer = memberName(place, projected.payerId || payerFor(bill, 0));
          const detail = [payer, bill.amount != null && bill.amount !== '' ? lira(bill.amount) : '', bill.notes].filter(Boolean).join(' · ');
          rows.push(row('Fatura', bill.title, detail, '10:00', null));
        });
      } else if (parts.bills && personId) {
        (place.bills || []).forEach((bill) => {
          const projected = projectBill(bill, cursor, cursor, today)[0];
          if (!projected) return;
          const payerId = projected.payerId || payerFor(bill, 0);
          if (payerId !== personId) return;
          const detail = [memberName(place, payerId), bill.amount != null && bill.amount !== '' ? lira(bill.amount) : '', bill.notes].filter(Boolean).join(' · ');
          rows.push(row('Fatura', bill.title, detail, '10:00', null));
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
          const detail = [need.notes, need.price != null ? lira(need.price) : ''].filter(Boolean).join(' · ');
          rows.push(row('Alınacak', need.title, detail, '18:00', null));
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
            [lesson.room, who, lesson.notes].filter(Boolean).join(' · '),
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

  const includeNeeds = Boolean(place) && (needsOnly || parts.needs);
  const openNeeds = includeNeeds ? (place.needs || []).filter((need) => !need.done) : [];
  const boughtNeeds = includeNeeds
    ? (place.needs || []).filter((need) => need.done && need.boughtAt && need.boughtAt >= span.from && need.boughtAt <= span.to)
    : [];
  const purchases = purchaseGroups(boughtNeeds);
  const purchaseTotal = purchases.reduce((sum, group) => sum + group.total, 0);
  const purchasePriced = purchases.reduce((sum, group) => sum + group.priced, 0);
  const purchaseUnpriced = boughtNeeds.length - purchasePriced;

  return {
    heading: needsOnly ? 'Alışveriş raporu' : span.heading,
    placeName: place?.name || 'İş Bölümü',
    from: span.from,
    to: span.to,
    days: needsOnly ? [] : days,
    needs: openNeeds,
    purchases,
    purchaseTotal,
    purchasePriced,
    purchaseUnpriced,
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
  const openLine = (need) => {
    const extra = [need.date ? formatLong(need.date) : '', need.notes, need.price != null ? lira(need.price) : ''].filter(Boolean).join(' · ');
    return `<div class="need"><span class="box"></span><span class="name">${esc(need.title)}</span>${extra ? `<div class="meta">${esc(extra)}</div>` : ''}</div>`;
  };
  const boughtLine = (need) => {
    const price = need.price != null ? lira(need.price) : 'Fiyat yok';
    return `<div class="need bought"><span class="box on"></span><span class="name">${esc(need.title)}</span><span class="price">${esc(price)}</span>${need.notes ? `<div class="meta">${esc(need.notes)}</div>` : ''}</div>`;
  };
  const purchaseBlocks = (plan.purchases || []).map((group) => `
    <h3>${group.date === 'tarihsiz' ? 'Tarihi yazılmamış' : esc(formatLong(group.date))}</h3>
    ${group.items.map(boughtLine).join('')}
    <div class="meta">${group.items.length} ürün${group.priced ? ` · ${esc(lira(group.total))}` : ''}</div>`).join('');
  const totalLine = (plan.purchases || []).length
    ? `<div class="total"><div>Toplam · ${plan.purchasePriced ? esc(lira(plan.purchaseTotal)) : 'fiyat yazılmamış'}</div>${plan.purchaseUnpriced ? `<div class="meta">${plan.purchaseUnpriced} ürünün fiyatı yazılmamış, toplama girmiyor.</div>` : ''}</div>`
    : '';
  const openBlock = (plan.needs || []).length ? `<h2>Alınacaklar</h2>${plan.needs.map(openLine).join('')}` : '';
  const boughtBlock = (plan.purchases || []).length ? `<h2>Alınanlar</h2>${purchaseBlocks}${totalLine}` : '';
  const empty = !dayBlocks && !openBlock && !boughtBlock ? '<p class="meta">Bu aralıkta paylaşılacak kayıt yok.</p>' : '';
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><style>
    body { font-family: Georgia, serif; color: #1E1A16; margin: 28px; }
    h1 { font-weight: normal; font-size: 28px; margin: 0; }
    h2 { font-weight: normal; font-size: 18px; margin: 22px 0 8px; border-bottom: 1px solid #E4D8C8; padding-bottom: 4px; }
    h3 { font-weight: normal; font-size: 16px; margin: 14px 0 6px; }
    .sub { color: #5E534A; margin-top: 4px; }
    .kind { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #8E3B24; }
    .title { font-size: 16px; margin-top: 2px; }
    .meta { color: #5E534A; font-size: 13px; }
    .row { margin: 10px 0; }
    .need { margin: 8px 0 10px; font-size: 16px; }
    .name { margin-right: 8px; }
    .price { float: right; font-size: 15px; }
    .box { display: inline-block; width: 13px; height: 13px; border: 1.5px solid #1E1A16; margin-right: 8px; vertical-align: -1px; }
    .box.on { background: #1E1A16; }
    .total { margin-top: 12px; padding-top: 8px; border-top: 1px solid #1E1A16; font-size: 18px; }
    .foot { margin-top: 28px; color: #A89888; font-size: 12px; }
  </style></head><body>
    <h1>${esc(plan.placeName)}</h1>
    <div class="sub">${esc(plan.heading)} · ${range}</div>
    ${dayBlocks}
    ${openBlock}
    ${boughtBlock}
    ${empty}
    <div class="foot">İş Bölümü</div>
  </body></html>`;
}
