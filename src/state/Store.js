import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AD_EVERY } from '../constants/ads.js';
import { todayISO, uid } from '../logic/dates.js';
import {
  activePlace,
  blankState,
  createPlace,
  expectedIds,
  openBill,
  payerFor,
  prepareBill,
  prepareLesson,
  prepareTask,
} from '../logic/house.js';
import { scheduleHouse } from '../services/notify.js';

const KEY = 'sacak.v2';
const listeners = new Set();

export function onAdBreak(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const HouseContext = createContext(null);

export function useHouse() {
  const value = useContext(HouseContext);
  if (!value) throw new Error('Depo yok');
  return value;
}

function bump(prev, next) {
  if ((next.completions || 0) > (prev.completions || 0)) {
    const before = Math.floor((prev.completions || 0) / AD_EVERY);
    const after = Math.floor(next.completions / AD_EVERY);
    if (after > before) queueMicrotask(() => listeners.forEach((fn) => fn()));
  }
  return next;
}

function upsert(list, item) {
  const exists = (list || []).some((entry) => entry.id === item.id);
  return exists ? list.map((entry) => (entry.id === item.id ? item : entry)) : [...(list || []), item];
}

function withPlace(prev, recipe) {
  const current = activePlace(prev);
  if (!current) return prev;
  const nextPlace = recipe(current);
  return {
    ...prev,
    places: prev.places.map((place) => (place.id === current.id ? nextPlace : place)),
  };
}

export function HouseProvider({ children }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        if (!raw) {
          setState(blankState());
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          setState({ ...blankState(), ...parsed, places: parsed.places || [] });
        } catch {
          setState(blankState());
        }
      })
      .catch(() => {
        if (alive) setState(blankState());
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    const timer = setTimeout(() => scheduleHouse(state), 500);
    return () => clearTimeout(timer);
  }, [state]);

  const api = useMemo(() => {
    const update = (recipe) => {
      setState((prev) => (prev ? bump(prev, recipe(prev)) : prev));
    };

    return {
      finishOnboarding(payload) {
        const place = createPlace(payload);
        update(() => ({
          onboardingDone: true,
          activePlaceId: place.id,
          places: [place],
          completions: 0,
        }));
      },
      addPlace(payload) {
        const place = createPlace(payload);
        update((prev) => ({
          ...prev,
          activePlaceId: place.id,
          places: [...prev.places, place],
        }));
      },
      switchPlace(id) {
        update((prev) => ({ ...prev, activePlaceId: id }));
      },
      deletePlace(id) {
        update((prev) => {
          if (prev.places.length <= 1) return prev;
          const places = prev.places.filter((place) => place.id !== id);
          const activePlaceId = prev.activePlaceId === id ? places[0].id : prev.activePlaceId;
          return { ...prev, places, activePlaceId };
        });
      },
      reset() {
        update(() => blankState());
      },
      setPlaceName(name) {
        const clean = name.trim();
        if (!clean) return;
        update((prev) => withPlace(prev, (place) => ({ ...place, name: clean })));
      },
      saveMember(draft) {
        const name = draft.name.trim();
        if (!name) return;
        update((prev) => withPlace(prev, (place) => {
          if (draft.id) {
            return {
              ...place,
              members: place.members.map((member) => (
                member.id === draft.id ? { ...member, name, color: draft.color || member.color } : member
              )),
            };
          }
          return {
            ...place,
            members: [...place.members, { id: uid(), name, color: draft.color }],
          };
        }));
      },
      deleteMember(id) {
        update((prev) => withPlace(prev, (place) => {
          if (place.members.length <= 1 || id === place.meId) return place;
          const members = place.members.filter((member) => member.id !== id);
          const strip = (ids) => (ids || []).filter((item) => item !== id);
          return {
            ...place,
            members,
            tasks: place.tasks.map((task) => ({
              ...task,
              assigneeId: task.assigneeId === id ? place.meId : task.assigneeId,
              week: Object.fromEntries(Object.entries(task.week || {}).map(([day, who]) => [day, who === id ? null : who])),
            })),
            bills: place.bills.map((bill) => {
              const memberIds = strip(bill.memberIds);
              return {
                ...bill,
                memberIds,
                payerId: bill.payerId === id ? (memberIds[0] || null) : bill.payerId,
                cursor: 0,
              };
            }),
          };
        }));
      },
      saveTask(draft) {
        update((prev) => withPlace(prev, (place) => {
          const previous = place.tasks.find((task) => task.id === draft.id);
          const task = prepareTask({ ...draft, id: draft.id || uid() }, previous);
          const scheduled = task.repeat === 'none'
            ? Boolean(task.onceDate)
            : task.repeat === 'weekly'
              ? task.weekdays.length > 0
              : true;
          if (!task.title || !(task.people || []).length || !scheduled) return place;
          return { ...place, tasks: upsert(place.tasks, task) };
        }));
      },
      deleteTask(id) {
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          tasks: place.tasks.filter((task) => task.id !== id),
        })));
      },
      markTask(taskId, date, done, doneById) {
        update((prev) => {
          const next = withPlace(prev, (place) => ({
            ...place,
            tasks: place.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const log = { ...(task.log || {}) };
              log[date] = { done: Boolean(done), doneById: done ? doneById : null, expectedIds: expectedIds(task, date) };
              return { ...task, log };
            }),
          }));
          if (done) next.completions = (prev.completions || 0) + 1;
          return next;
        });
      },
      saveBill(draft) {
        update((prev) => withPlace(prev, (place) => {
          const previous = place.bills.find((bill) => bill.id === draft.id);
          const bill = prepareBill({ ...draft, id: draft.id || uid() }, previous);
          if (!bill.title) return place;
          return { ...place, bills: upsert(place.bills, bill) };
        }));
      },
      deleteBill(id) {
        update((prev) => withPlace(prev, (place) => ({ ...place, bills: place.bills.filter((bill) => bill.id !== id) })));
      },
      payBill(id) {
        const today = todayISO();
        update((prev) => {
          const next = withPlace(prev, (place) => ({
            ...place,
            bills: place.bills.map((bill) => {
              if (bill.id !== id) return bill;
              const open = openBill(bill, today);
              const members = bill.memberIds || [];
              const payments = [
                ...(bill.payments || []).filter((item) => item.period !== open.key),
                { period: open.key, memberId: payerFor(bill, 0), paidAt: new Date().toISOString() },
              ];
              return {
                ...bill,
                payments: payments.slice(-36),
                cursor: bill.rotate && members.length ? (bill.cursor + 1) % members.length : bill.cursor,
              };
            }),
          }));
          next.completions = (prev.completions || 0) + 1;
          return next;
        });
      },
      saveReminder(draft) {
        const title = draft.title.trim();
        if (!title) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          reminders: upsert(place.reminders, {
            id: draft.id || uid(),
            title,
            notes: (draft.notes || '').trim(),
            repeat: draft.repeat,
            weekday: draft.weekday ?? 1,
            dayOfMonth: draft.dayOfMonth ?? 1,
            month: draft.month ?? 1,
            day: draft.day ?? 1,
            date: draft.date,
            time: draft.time || '09:00',
            enabled: draft.enabled !== false,
          }),
        })));
      },
      deleteReminder(id) {
        update((prev) => withPlace(prev, (place) => ({ ...place, reminders: place.reminders.filter((item) => item.id !== id) })));
      },
      saveDay(draft) {
        const name = (draft.name || draft.title || '').trim();
        if (!name) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          days: upsert(place.days, {
            id: draft.id || uid(),
            kind: draft.kind || 'birthday',
            name,
            title: (draft.title || '').trim() || name,
            memberId: draft.memberId || null,
            month: draft.month,
            day: draft.day,
            year: draft.year || null,
            notes: (draft.notes || '').trim(),
          }),
        })));
      },
      deleteDay(id) {
        update((prev) => withPlace(prev, (place) => ({ ...place, days: place.days.filter((item) => item.id !== id) })));
      },
      saveLoan(draft) {
        const item = (draft.item || '').trim();
        const person = (draft.person || '').trim();
        if (!item || !person) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          loans: upsert(place.loans, {
            id: draft.id || uid(),
            direction: draft.direction === 'borrowed' ? 'borrowed' : 'lent',
            item,
            person,
            due: draft.due || '',
            notes: (draft.notes || '').trim(),
            settled: Boolean(draft.settled),
            createdAt: draft.createdAt || todayISO(),
          }),
        })));
      },
      deleteLoan(id) {
        update((prev) => withPlace(prev, (place) => ({ ...place, loans: place.loans.filter((item) => item.id !== id) })));
      },
      settleLoan(id) {
        update((prev) => {
          const next = withPlace(prev, (place) => ({
            ...place,
            loans: place.loans.map((loan) => (loan.id === id ? { ...loan, settled: true } : loan)),
          }));
          next.completions = (prev.completions || 0) + 1;
          return next;
        });
      },
      saveNote(draft) {
        const body = (draft.body || '').trim();
        const title = (draft.title || '').trim() || 'Not';
        if (!body && !(draft.title || '').trim()) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          notes: upsert(place.notes, {
            id: draft.id || uid(),
            title,
            body,
            pinned: Boolean(draft.showOnHome || draft.pinned),
            showOnHome: Boolean(draft.showOnHome || draft.pinned),
            updatedAt: todayISO(),
          }),
        })));
      },
      deleteNote(id) {
        update((prev) => withPlace(prev, (place) => ({ ...place, notes: place.notes.filter((item) => item.id !== id) })));
      },
      saveNeed(draft) {
        const title = (draft.title || '').trim();
        if (!title) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          needs: upsert(place.needs, {
            id: draft.id || uid(),
            title,
            notes: (draft.notes || '').trim(),
            date: draft.date || '',
            showOnHome: Boolean(draft.showOnHome),
            done: Boolean(draft.done),
          }),
        })));
      },
      saveNeeds(drafts) {
        const rows = (drafts || [])
          .map((draft) => ({
            id: draft.id || uid(),
            title: (draft.title || '').trim(),
            notes: (draft.notes || '').trim(),
            date: draft.date || '',
            showOnHome: Boolean(draft.showOnHome),
            done: Boolean(draft.done),
          }))
          .filter((draft) => draft.title);
        if (!rows.length) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          needs: rows.reduce((list, row) => upsert(list, row), place.needs || []),
        })));
      },
      saveLesson(draft) {
        const lesson = prepareLesson({ ...draft, id: draft.id || uid() });
        if (!lesson.title) return;
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          lessons: upsert(place.lessons || [], lesson),
        })));
      },
      deleteLesson(id) {
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          lessons: (place.lessons || []).filter((item) => item.id !== id),
        })));
      },
      deleteNeed(id) {
        update((prev) => withPlace(prev, (place) => ({ ...place, needs: (place.needs || []).filter((item) => item.id !== id) })));
      },
      toggleNeed(id) {
        update((prev) => withPlace(prev, (place) => ({
          ...place,
          needs: (place.needs || []).map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
        })));
      },
      importState(next) {
        update((prev) => ({
          ...blankState(),
          ...next,
          onboardingDone: true,
          completions: prev.completions || 0,
        }));
      },
    };
  }, []);

  const value = useMemo(() => ({
    ready: Boolean(state),
    state,
    place: state ? activePlace(state) : null,
    ...api,
  }), [api, state]);

  return <HouseContext.Provider value={value}>{children}</HouseContext.Provider>;
}
