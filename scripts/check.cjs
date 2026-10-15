const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const cache = {};

function load(rel) {
  const file = path.resolve(root, rel);
  if (cache[file]) return cache[file].exports;
  const source = fs.readFileSync(file, 'utf8');
  const { code } = babel.transformSync(source, {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
    sourceMaps: false,
  });
  const module = { exports: {} };
  cache[file] = module;
  const localRequire = (request) => {
    if (request.startsWith('.')) {
      const target = path.resolve(path.dirname(file), request);
      const withExt = target.endsWith('.js') ? target : `${target}.js`;
      return load(path.relative(root, withExt));
    }
    return require(request);
  };
  const runner = new Function('exports', 'require', 'module', code);
  runner(module.exports, localRequire, module);
  return module.exports;
}

const dates = load('src/logic/dates.js');
const house = load('src/logic/house.js');

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const today = '2026-10-15';
assert(dates.weekdayOf(today) === 4, '15 Ekim 2026 perşembe olmalı');
assert(dates.weekdayAfter(today, 6) === '2026-10-17', 'sonraki cumartesi');
assert(dates.weekdayBefore(today, 6) === '2026-10-10', 'geçen cumartesi');
assert(dates.initialWeekly(3, today) === '2026-10-21', 'sonraki çarşamba');
assert(dates.monthDayAfter('2026-10-20', 20) === '2026-11-20', 'ayın 20sinden sonraki');
assert(dates.monthDayAfter(today, 20) === '2026-10-20', 'bu ayın 20si');
assert(dates.addMonths('2026-01-31', 1, 31) === '2026-02-28', 'şubat kısalsın');

const rent = { dueDay: 1, payments: [], memberIds: ['a'], rotate: true, cursor: 0 };
const openRent = house.openBill(rent, today);
assert(openRent.due === '2026-10-01', 'kira gecikmiş görünmeli');
const paid = { ...rent, payments: [{ period: '2026-10' }] };
assert(house.openBill(paid, today).due === '2026-11-01', 'ödenmiş kira sonraki aya geçmeli');
const latePower = { dueDay: 28, payments: [] };
assert(house.openBill(latePower, '2026-11-02').due === '2026-10-28', 'ay değişince yakın gecikme kalsın');
assert(house.openBill({ dueDay: 1, payments: [] }, '2026-11-10').due === '2026-11-01', 'eski ay unutulsun');

const place = house.createPlace({ name: 'Bizim ev', kind: 'ev', myName: 'Ben', others: ['Ela', 'Kerem'] });
assert(place.meId === place.members[0].id, 'ilk kişi sen olmalı');
assert(place.members.length === 3, 'üç kişi');
const [me, ela, kerem] = place.members;

const cleaning = house.prepareTask({
  title: 'Temizlik',
  people: [me.id, ela.id, kerem.id],
  share: 'together',
  repeat: 'weekly',
  weekdays: [0],
  startDate: '2026-10-01',
}, null);
assert((house.expectedIds(cleaning, '2026-10-18') || []).length === 3, 'pazar temizliği üç kişi');
assert(house.expectedIds(cleaning, today) == null, 'perşembe temizlik yok');

const dishes = house.prepareTask({
  title: 'Bulaşık',
  people: [me.id, ela.id, kerem.id],
  share: 'weighted',
  weights: { [me.id]: 2, [ela.id]: 1, [kerem.id]: 2 },
  repeat: 'daily',
  startDate: today,
}, null);
assert(house.expectedOn(dishes, today) === me.id, 'bugün sen');
assert(house.expectedOn(dishes, '2026-10-16') === me.id, 'ikinci gün yine sen');
assert(house.expectedOn(dishes, '2026-10-17') === ela.id, 'üçüncü gün Ela');
assert(house.expectedOn(dishes, '2026-10-18') === kerem.id, 'dördüncü gün Kerem');
assert(house.expectedOn(dishes, '2026-10-19') === kerem.id, 'beşinci gün yine Kerem');
assert(house.ruleLine(dishes, place).includes('2 Ben'), 'sayıyla özet');

const trash = house.prepareTask({
  title: 'Çöp',
  people: [me.id, ela.id, kerem.id],
  share: 'rotate',
  repeat: 'weekly',
  weekdays: [1],
  startDate: '2026-10-12',
}, null);
assert(house.expectedOn(trash, '2026-10-12') === me.id, 'ilk pazartesi sen');
assert(house.expectedOn(trash, '2026-10-19') === ela.id, 'sonraki pazartesi Ela');
assert(house.expectedOn(trash, today) == null, 'perşembe çöp yok');

const once = house.prepareTask({
  title: 'Market',
  people: [me.id, ela.id],
  share: 'rotate',
  repeat: 'none',
  onceDate: today,
}, null);
assert(once.share === 'together', 'tek günde birlikte');
assert((house.expectedIds(once, today) || []).length === 2, 'tek günde iki kişi');
assert(house.expectedIds(once, '2026-10-16') == null, 'tek gün taşmasın');

const open = house.dayState(dishes, today, today);
assert(open.state === 'open', 'bugün açık');
const covered = house.dayState({ ...dishes, log: { [today]: { done: true, doneById: ela.id } } }, today, today);
assert(covered.state === 'covered', 'sırası sende Ela yaptı');
assert(house.statusText(place, covered).includes('Ela yaptı'), 'kim yaptığı yazılsın');
const missed = house.dayState(dishes, '2026-10-14', today);
assert(missed == null, 'başlangıçtan önce iş yok');

const legacy = { week: { 1: me.id, 2: me.id, 3: ela.id, 4: ela.id, 5: kerem.id, 6: kerem.id } };
assert(house.expectedOn(legacy, today) === ela.id, 'eski düzen perşembe Ela');
assert(house.weekLine(legacy, place).includes('Pzt'), 'eski hafta özeti');

const marks = house.monthMarks({ ...place, tasks: [dishes], bills: [], reminders: [], days: [], loans: [], needs: [] }, 2026, 10, today);
assert((marks[today] || []).includes('chore'), 'takvimde iş izi');
const agenda = house.agendaFor({ ...place, tasks: [dishes], bills: [], reminders: [], days: [], loans: [], needs: [{ id: 's', title: 'Süt', date: '2026-10-16', done: false, notes: '' }] }, '2026-10-16', today);
assert(agenda.some((item) => item.edit.type === 'task'), 'yarın iş düzeni');
assert(agenda.some((item) => item.kind === 'shop'), 'yarın alınacak');

const math = house.prepareLesson({
  title: 'Matematik',
  kind: 'ders',
  memberId: me.id,
  weekdays: [4],
  startDate: today,
  time: '09:00',
  endTime: '10:30',
  reminderTime: '08:45',
});
assert(house.lessonOn(math, today), 'perşembe ders var');
assert(!house.lessonOn(math, '2026-10-16'), 'cuma ders yok');
const exam = house.prepareLesson({ title: 'Vize', kind: 'sinav', onceDate: '2026-10-20', time: '13:00', memberId: me.id });
assert(house.lessonOn(exam, '2026-10-20'), 'sınav günü');
const plan = load('src/logic/plan.js');
const printed = plan.collectPlan({
  ...place,
  tasks: [dishes],
  bills: [],
  reminders: [],
  days: [],
  loans: [],
  needs: [{ id: 's', title: 'Süt', date: '', done: false, notes: '' }],
  lessons: [math],
}, { mode: 'day', today, parts: { tasks: true, lessons: true, needs: true, bills: false, reminders: false, days: false, loans: false } });
assert(printed.days.some((day) => day.rows.some((item) => item.kind === 'Ders')), 'planda ders');
assert(printed.needs.some((need) => need.title === 'Süt'), 'planda alınacak');
assert(plan.htmlForPlan(printed).includes('Süt'), 'pdfte süt');
const shop = plan.collectPlan({
  ...place,
  tasks: [],
  bills: [],
  reminders: [],
  days: [],
  loans: [],
  lessons: [],
  needs: [
    { title: 'Süt', done: false, notes: 'iki kutu', date: '' },
    { title: 'Ekmek', done: true, boughtAt: today, price: 15, notes: 'fırın' },
    { title: 'Peynir', done: true, boughtAt: '2026-09-01', price: 90, notes: '' },
  ],
}, { mode: 'week', today, needsOnly: true });
assert(shop.needs.some((need) => need.title === 'Süt'), 'raporda alınacak');
assert(shop.purchases.some((group) => group.items.some((need) => need.title === 'Ekmek')), 'bu hafta alınan');
assert(!shop.purchases.some((group) => group.items.some((need) => need.title === 'Peynir')), 'eski ay rapora girmez');
assert(shop.purchaseTotal === 15, 'haftanın toplamı');
const report = plan.htmlForPlan(shop);
assert(report.includes('Ekmek') && report.includes('Toplam') && report.includes('fırın'), 'pdfte ürün ve toplam');
const groups = house.purchaseGroups([
  { title: 'Süt', done: true, boughtAt: today, price: 40 },
  { title: 'Ekmek', done: true, boughtAt: today, price: 15 },
  { title: 'Deterjan', done: false, price: 80 },
]);
assert(groups.length === 1 && groups[0].items.length === 2, 'aynı günün alışverişi');
assert(groups[0].total === 55, 'günün tutarı');

console.log('İş Bölümü mantığı tamam');
