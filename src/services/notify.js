import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  addDays,
  dayDistance,
  formatShort,
  lira,
  nextSpecialDate,
  reminderDates,
  todayISO,
} from '../logic/dates.js';
import { memberName, openBill, payerFor, expectedIds } from '../logic/house.js';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Bildirim kurulamazsa defter yine açılır.
}

let asked = false;

export async function ensurePermission(force = false) {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (asked && !force) return false;
    asked = true;
    const next = await Notifications.requestPermissionsAsync();
    return Boolean(next.granted);
  } catch {
    return false;
  }
}

function atTime(value, time) {
  const [hour, minute] = String(time || '09:00').split(':').map(Number);
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, hour || 9, minute || 0, 0, 0);
}

function triggerFor(date) {
  if (Notifications.SchedulableTriggerInputTypes?.DATE) {
    return { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
  }
  return date;
}

export async function scheduleHouse(state) {
  if (!state?.onboardingDone) return;
  try {
    const granted = await ensurePermission(false);
    if (!granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('sacak', {
        name: 'Sergen',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const today = todayISO();
    const queued = [];
    (state.places || []).forEach((place) => {
      const prefix = (state.places || []).length > 1 ? `${place.name}: ` : '';
      (place.tasks || []).forEach((task) => {
        if (!task.reminderTime) return;
        let cursor = today;
        for (let i = 0; i < 14; i += 1) {
          const who = expectedIds(task, cursor);
          if (who?.length) {
            queued.push({
              date: atTime(cursor, task.reminderTime),
              title: `${prefix}${task.title}`,
              body: who.length > 1 ? `Birlikte: ${who.map((id) => memberName(place, id)).join(', ')}` : `Sıradaki: ${memberName(place, who[0])}`,
            });
          }
          cursor = addDays(cursor, 1);
        }
      });

      (place.bills || []).forEach((bill) => {
        const open = openBill(bill, today);
        if (dayDistance(open.due, today) > 14) return;
        const payer = memberName(place, payerFor(bill, 0));
        const amount = bill.amount ? lira(bill.amount) : '';
        const when = open.due < today ? today : open.due;
        queued.push({
          date: atTime(when, '10:00'),
          title: `${prefix}${bill.title}`,
          body: [formatShort(open.due), amount, payer].filter(Boolean).join(' · '),
        });
      });

      (place.reminders || []).forEach((reminder) => {
        const dates = reminderDates(reminder, today, addDays(today, reminder.repeat === 'daily' ? 6 : 30)).slice(0, reminder.repeat === 'daily' ? 5 : 2);
        dates.forEach((date) => {
          queued.push({
            date: atTime(date, reminder.time || '09:00'),
            title: `${prefix}${reminder.title}`,
            body: reminder.notes || 'Sergen hatırlatması',
          });
        });
      });

      (place.days || []).forEach((day) => {
        const date = nextSpecialDate(day, today);
        if (dayDistance(date, today) > 14 || dayDistance(date, today) < 0) return;
        queued.push({
          date: atTime(date, '09:00'),
          title: `${prefix}${day.title || day.name}`,
          body: day.kind === 'birthday' ? 'Bugün doğum günü.' : 'Bugün özel bir gün.',
        });
      });

      (place.loans || []).forEach((loan) => {
        if (loan.settled || !loan.due) return;
        if (loan.due < today || dayDistance(loan.due, today) > 14) return;
        queued.push({
          date: atTime(loan.due, '09:00'),
          title: `${prefix}${loan.item}`,
          body: loan.direction === 'lent' ? `${loan.person} kişisindeki eşyanın günü geldi.` : `${loan.person} kişisine geri verme günü.`,
        });
      });
    });

    const upcoming = queued
      .filter((item) => item.date.getTime() > Date.now() + 5000)
      .sort((a, b) => a.date - b.date)
      .slice(0, 40);

    for (const item of upcoming) {
      await Notifications.scheduleNotificationAsync({
        content: { title: item.title, body: item.body, sound: true },
        trigger: triggerFor(item.date),
      });
    }
  } catch {
    // Expo Go veya izin yoksa defter yine çalışır.
  }
}
