import { useState } from 'react';
import { View } from 'react-native';
import { dayKindLabel, memberName, openBill, payerFor, repeatLabel, shareAmount, turningAge } from '../logic/house.js';
import { formatShort, lira, nextSpecialDate, relative, weekdayName } from '../logic/dates.js';
import { billCategories } from '../theme.js';
import { useEditor } from './Editor.js';
import { BuyForm } from './PurchaseFile.js';
import Popup from './Popup.js';
import { Item } from './ui.js';
import { useHouse } from '../state/Store.js';

export function BillItem({ bill }) {
  const { place, payBill } = useHouse();
  const editor = useEditor();
  const open = openBill(bill);
  const payer = memberName(place, payerFor(bill, 0));
  const kind = billCategories.find((item) => item.id === bill.category)?.label;
  const money = bill.amount ? lira(bill.amount) : '';
  return (
    <Item
      tone="bill"
      title={bill.title}
      meta={[relative(open.due), money, payer].filter(Boolean).join(' · ')}
      extra={[kind, shareAmount(bill), bill.notes].filter(Boolean).join(' · ')}
      action="Ödendi"
      onAction={() => payBill(bill.id)}
      onPress={() => editor.open('bill', bill)}
    />
  );
}

export function ReminderItem({ reminder }) {
  const editor = useEditor();
  const when = reminder.repeat === 'weekly'
    ? weekdayName(reminder.weekday)
    : reminder.repeat === 'monthly'
      ? `Ayın ${reminder.dayOfMonth}. günü`
      : reminder.repeat === 'yearly'
        ? `${reminder.day} / ${reminder.month}`
        : reminder.repeat === 'once'
          ? formatShort(reminder.date)
          : 'Her gün';
  return (
    <Item
      tone="reminder"
      title={reminder.title}
      meta={`${repeatLabel(reminder.repeat)} · ${when} · ${reminder.time || ''}`}
      extra={reminder.notes}
      onPress={() => editor.open('reminder', reminder)}
    />
  );
}

export function DayItem({ entry }) {
  const editor = useEditor();
  const date = nextSpecialDate(entry);
  const age = turningAge(entry, date);
  return (
    <Item
      tone="day"
      title={entry.title || entry.name}
      meta={[dayKindLabel(entry.kind), entry.title && entry.name && entry.title !== entry.name ? entry.name : '', formatShort(date), relative(date)].filter(Boolean).join(' · ')}
      extra={[age ? `${age} yaşına giriyor` : '', entry.notes].filter(Boolean).join(' · ')}
      onPress={() => editor.open('day', entry)}
    />
  );
}

export function LoanItem({ loan }) {
  const { settleLoan } = useHouse();
  const editor = useEditor();
  const direction = loan.direction === 'borrowed' ? 'Aldım' : 'Verdim';
  return (
    <Item
      tone="loan"
      title={loan.item}
      meta={`${direction} · ${loan.person}${loan.due ? ` · ${relative(loan.due)}` : ''}`}
      extra={loan.settled ? 'Kapandı' : loan.notes}
      action={loan.settled ? undefined : 'Kapandı'}
      onAction={() => settleLoan(loan.id)}
      onPress={() => editor.open('loan', loan)}
    />
  );
}

export function NoteItem({ note }) {
  const editor = useEditor();
  return (
    <Item
      tone="reminder"
      title={note.title}
      meta={note.showOnHome || note.pinned ? 'Ana sayfada' : formatShort(note.updatedAt)}
      extra={note.body}
      onPress={() => editor.open('note', note)}
    />
  );
}

export function NeedItem({ need }) {
  const editor = useEditor();
  const [buying, setBuying] = useState(false);
  return (
    <View>
      <Item
        tone="shop"
        title={need.title}
        meta={[need.date ? formatShort(need.date) : 'Günü yok', need.showOnHome ? 'Ana sayfada' : ''].filter(Boolean).join(' · ')}
        extra={need.notes}
        action="Alındı"
        onAction={() => setBuying(true)}
        onPress={() => editor.open('need', need)}
      />
      {buying ? (
        <Popup onClose={() => setBuying(false)}>
          <View style={{ padding: 16 }}>
            <BuyForm need={need} onDone={() => setBuying(false)} />
          </View>
        </Popup>
      ) : null}
    </View>
  );
}

export function LessonItem({ lesson }) {
  const { place } = useHouse();
  const editor = useEditor();
  const days = (lesson.weekdays || []).map((day) => weekdayName(day, true)).join(' ');
  const who = lesson.memberId ? memberName(place, lesson.memberId) : '';
  return (
    <Item
      tone="class"
      title={lesson.title}
      meta={[lesson.kind === 'sinav' ? 'Sınav' : days, lesson.time, lesson.room, who].filter(Boolean).join(' · ')}
      extra={lesson.notes}
      onPress={() => editor.open('lesson', lesson)}
    />
  );
}
