import { collectPlan, eventSpan, htmlForPlan } from '../logic/plan.js';

export async function sharePlanPdf(place, options) {
  const plan = collectPlan(place, options);
  const html = htmlForPlan(plan);
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const file = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Bu telefonda paylaşım açılamadı.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: plan.heading,
  });
}

async function writableCalendar(Calendar) {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) throw new Error('Takvim izni verilmedi.');
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);
  const current = writable.find((calendar) => calendar.isPrimary) || writable[0];
  if (current) return current.id;
  if (Calendar.getDefaultCalendarAsync) {
    try {
      const fallback = await Calendar.getDefaultCalendarAsync();
      if (fallback?.id) return fallback.id;
    } catch {
      // Android'de varsayılan takvim olmayabilir.
    }
  }
  const source = calendars.find((calendar) => calendar.source)?.source;
  return Calendar.createCalendarAsync({
    title: 'İş Bölümü',
    color: '#C65A3A',
    entityType: Calendar.EntityTypes.EVENT,
    source: source || { isLocalAccount: true, name: 'İş Bölümü', type: 'local' },
    name: 'isbolumu',
    ownerAccount: 'isbolumu',
    accessLevel: Calendar.CalendarAccessLevel?.OWNER,
  });
}

export async function exportPlanToCalendar(place, options) {
  const Calendar = await import('expo-calendar');
  const plan = collectPlan(place, options);
  const calendarId = await writableCalendar(Calendar);
  const events = [];
  (plan.days || []).forEach((day) => {
    day.rows.forEach((item) => {
      const span = eventSpan(day.date, item.time, item.endTime);
      events.push({
        title: `${item.kind}: ${item.title}`,
        notes: item.detail || '',
        start: span.start,
        end: span.end,
      });
    });
  });
  (plan.needs || []).forEach((need) => {
    if (need.done || !need.date) return;
    const span = eventSpan(need.date, '18:00', null);
    events.push({
      title: `Alınacak: ${need.title}`,
      notes: need.notes || '',
      start: span.start,
      end: span.end,
    });
  });
  if (!events.length) throw new Error('Aktarılacak tarihli kayıt yok.');
  const start = events.reduce((min, item) => (item.start < min ? item.start : min), events[0].start);
  const end = events.reduce((max, item) => (item.end > max ? item.end : max), events[0].end);
  const existing = await Calendar.getEventsAsync([calendarId], new Date(start.getTime() - 86400000), new Date(end.getTime() + 86400000));
  const seen = new Set(existing.map((item) => `${item.title}|${new Date(item.startDate).getTime()}`));
  let added = 0;
  for (const item of events) {
    const key = `${item.title}|${item.start.getTime()}`;
    if (seen.has(key)) continue;
    await Calendar.createEventAsync(calendarId, {
      title: item.title,
      notes: item.notes,
      startDate: item.start,
      endDate: item.end,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    seen.add(key);
    added += 1;
  }
  return added;
}
