/**
 * ============================================================================
 *  DEMO DATA GENERATOR
 * ============================================================================
 *  Everything written here is INVENTED SAMPLE DATA. The students, teachers,
 *  IELTS scores and testimonials are not real people or real results. Replace
 *  them through the admin panel before publishing.
 *
 *    npm run seed              full demo data
 *    npm run seed -- --empty   admin account + courses + landing page only
 * ============================================================================
 */
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');
const EMPTY = process.argv.includes('--empty');

/* Deterministic random, so re-seeding gives the same database every time. */
let seed = 20260908;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const id = (prefix, n, pad = 3) => `${prefix}-${String(n).padStart(pad, '0')}`;
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const TODAY = new Date('2026-09-08T09:00:00Z');
const day = (offset) => new Date(TODAY.getTime() + offset * 86400000).toISOString().slice(0, 10);
const stamp = (offset) => new Date(TODAY.getTime() + offset * 86400000).toISOString();

const FIRST = ['Azizbek','Madina','Jasur','Mohira','Bekzod','Nilufar','Sardor','Zilola','Diyor','Kamila','Otabek','Sevinch','Javohir','Dilnoza','Islom','Gulnora','Shohruh','Malika','Temur','Nodira','Ulugbek','Zarina','Farrux','Oysha','Muhammad','Robiya','Doston','Shahzoda','Alisher','Nozima','Bobur','Aziza','Rustam','Feruza','Sanjar','Lola','Aybek','Munisa','Jahongir','Sitora','Elyor','Kamola','Nodir','Dildora','Anvar','Marjona','Sherzod','Yulduz','Behruz','Charos'];
const LAST = ['Rahimov','Karimova','Tursunov','Yusupova','Ergashev','Sattorova','Nazarov','Ibragimova','Qodirov','Xolmatova','Umarov','Abdullayeva','Sobirov','Yuldasheva','Mirzayeva','Aliyev','Nurmatova','Hasanov','Sharipova','Toshpulatov'];

/* ----------------------------------------------------------------- COURSES */

const courses = [
  ['General English','A1 – B2','6 months',72,450000,'Mon / Wed / Fri','blue','Grammar, vocabulary and everyday conversation built up level by level.'],
  ['IELTS Preparation','B1 – C1','4 months',48,650000,'Tue / Thu / Sat','indigo','All four bands with weekly mock tests and written examiner-style feedback.'],
  ['IELTS Intensive','B2 – C1','2 months',40,850000,'Daily','violet','A short, demanding course for students who already have a test date booked.'],
  ['Speaking Club','A2 – C1','Ongoing',8,200000,'Saturday','amber','Two hours of discussion, debate and role-play with no textbook in sight.'],
  ['Kids English','Ages 7–12','9 months',96,400000,'Mon / Wed','orange','Songs, games and stories that teach children to use English, not memorise it.'],
  ['Grammar Booster','A2 – B2','3 months',36,380000,'Tue / Thu','emerald','A focused repair course for the tenses and articles that keep slipping.'],
  ['Academic English','B2 – C1','5 months',60,700000,'Mon / Wed / Fri','cyan','Essay writing, seminar language and research reading for university applicants.'],
  ['Beginner English','A0 – A1','4 months',48,350000,'Tue / Thu / Sat','rose','Start from the alphabet and finish able to hold a simple conversation.'],
].map(([name, level, duration, lessonsCount, pricePerMonth, schedule, color, description], index) => ({
  id: id('c', index + 1), name, level, duration, lessonsCount, pricePerMonth, schedule, color, description,
  visible: true, showOnSite: true,
}));

/* ---------------------------------------------------------------- TEACHERS */

const teacherSeeds = [
  ['Jasurbek Toshmatov','Head of IELTS',9,8.5,'IELTS Writing & Speaking'],
  ['Sarah Whitfield','Senior English Instructor',11,9.0,'Academic English'],
  ['Nigora Abdullayeva','IELTS Instructor',7,8.0,'IELTS Reading & Listening'],
  ['Timur Rashidov','General English Instructor',6,7.5,'General English'],
  ['Emily Carter','Speaking Coach',8,9.0,'Conversation & Pronunciation'],
  ['Dilshod Ergashev','Grammar Specialist',10,8.0,'Grammar & Error Correction'],
  ['Kamola Yusupova','Kids English Teacher',5,7.5,'Young Learners'],
  ['Bekzod Nazarov','IELTS Intensive Coach',8,8.5,'Band 7+ Strategy'],
  ['Laura Bennett','Academic Writing Tutor',12,9.0,'Essay & Research Writing'],
  ['Shahnoza Qodirova','Beginner Level Teacher',4,7.0,'Foundation English'],
];

const teachers = teacherSeeds.map(([fullName, position, experience, ieltsScore, specialization], index) => ({
  id: id('t', index + 1),
  fullName,
  initials: initials(fullName),
  email: `teacher${index + 1}@tjlanguageschool.uz`,
  phone: `+998 90 ${between(100, 999)} ${between(10, 99)} ${between(10, 99)}`,
  avatar: null,
  position, experience, ieltsScore, specialization,
  bio: `${fullName.split(' ')[0]} has taught ${specialization.toLowerCase()} for ${experience} years and gives written feedback on every essay.`,
  languages: rand() > 0.5 ? ['English', 'Uzbek', 'Russian'] : ['English', 'Uzbek'],
  groups: [],
  status: 'active',
  visible: true,
  showOnSite: true,
}));

/* ------------------------------------------------------------------ GROUPS */

const groups = [
  ['IELTS Intermediate A','c-002','t-001','Room 201','Tue / Thu / Sat · 18:00','B1'],
  ['IELTS Advanced','c-002','t-003','Room 202','Mon / Wed / Fri · 19:30','B2'],
  ['IELTS Intensive Sept','c-003','t-008','Room 305','Daily · 09:00','B2'],
  ['General English B1','c-001','t-004','Room 104','Mon / Wed / Fri · 17:00','B1'],
  ['General English A2','c-001','t-004','Room 105','Tue / Thu · 16:00','A2'],
  ['Kids Explorers','c-005','t-007','Room 101','Mon / Wed · 15:00','A1'],
  ['Academic Writing','c-007','t-002','Room 303','Mon / Wed / Fri · 18:30','B2'],
  ['Beginner Start','c-008','t-010','Room 102','Tue / Thu / Sat · 16:30','A0'],
].map(([name, courseId, teacherId, room, schedule, level], index) => ({
  id: id('grp', index + 1), name, courseId, teacherId, room, schedule, level,
  capacity: 14, startDate: day(-between(30, 180)), studentIds: [], status: 'active',
}));

/* ---------------------------------------------------------------- STUDENTS */

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const students = [];

for (let i = 0; i < 50; i += 1) {
  const fullName = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
  const group = groups[i % groups.length];
  const course = courses.find((c) => c.id === group.courseId);
  const isIelts = ['c-002', 'c-003'].includes(group.courseId);

  const student = {
    id: id('st', i + 1),
    fullName,
    initials: initials(fullName),
    email: `student${i + 1}@tjlanguageschool.uz`,
    phone: `+998 9${between(0, 9)} ${between(100, 999)} ${between(10, 99)} ${between(10, 99)}`,
    avatar: null,
    age: group.courseId === 'c-005' ? between(8, 12) : between(16, 34),
    level: group.courseId === 'c-005' ? 'A1' : pick(LEVELS),
    courseId: group.courseId,
    courseName: course.name,
    groupId: group.id,
    groupName: group.name,
    teacherId: group.teacherId,
    joinDate: day(-between(20, 420)),
    monthlyPayment: course.pricePerMonth,
    paymentStatus: i % 9 === 0 ? 'overdue' : i % 4 === 0 ? 'pending' : 'paid',
    attendanceRate: between(62, 100),
    ieltsScore: isIelts && rand() > 0.45 ? Number((6 + Math.floor(rand() * 7) * 0.5).toFixed(1)) : null,
    status: 'active',
    notes: '',
  };

  students.push(student);
  group.studentIds.push(student.id);
}

teachers.forEach((teacher) => {
  teacher.groups = groups.filter((g) => g.teacherId === teacher.id).map((g) => g.id);
});

/* ------------------------------------------------------------------- USERS */

async function buildUsers() {
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const teacherHash = await bcrypt.hash('Teacher123!', 10);
  const studentHash = await bcrypt.hash('Student123!', 10);

  const users = [{
    id: 'u-001',
    fullName: 'TJ School Administrator',
    initials: 'TJ',
    email: 'admin@tjlanguageschool.uz',
    phone: '+998 71 200 40 40',
    password: adminHash,
    role: 'admin',
    profileId: null,
    status: 'active',
    createdAt: stamp(-720),
  }];

  teachers.forEach((teacher, index) => {
    users.push({
      id: id('u', index + 2),
      fullName: teacher.fullName,
      initials: teacher.initials,
      email: teacher.email,
      phone: teacher.phone,
      password: teacherHash,
      role: 'teacher',
      profileId: teacher.id,
      status: 'active',
      createdAt: stamp(-400),
    });
  });

  students.forEach((student, index) => {
    users.push({
      id: id('u', index + 12),
      fullName: student.fullName,
      initials: student.initials,
      email: student.email,
      phone: student.phone,
      password: studentHash,
      role: 'student',
      profileId: student.id,
      status: 'active',
      createdAt: stamp(-100),
    });
  });

  return users;
}

/* -------------------------------------------------------- STUDENT REQUESTS */
/* Pending rows so the admin has something to approve on the first run.      */

async function buildRequests() {
  const hash = await bcrypt.hash('Student123!', 10);
  return [
    ['Nodirbek Aliyev', 'nodirbek.aliyev@example.uz', '+998 90 111 22 33', 'pending', -1],
    ['Sevara Mirzayeva', 'sevara.mirzayeva@example.uz', '+998 93 444 55 66', 'pending', -2],
    ['Otabek Rasulov', 'otabek.rasulov@example.uz', '+998 97 777 88 99', 'pending', -3],
    ['Gulbahor Sodiqova', 'gulbahor.sodiqova@example.uz', '+998 91 222 33 44', 'approved', -12],
    ['Islom Xolmatov', 'islom.xolmatov@example.uz', '+998 94 555 66 77', 'rejected', -15],
  ].map(([fullName, email, phone, status, offset], index) => ({
    id: id('req', index + 1),
    fullName, email, phone,
    password: hash,
    status,
    requestDate: stamp(offset),
    reviewedAt: status === 'pending' ? null : stamp(offset + 1),
    reviewedBy: status === 'pending' ? null : 'TJ School Administrator',
    note: status === 'rejected' ? 'Duplicate application.' : '',
  }));
}

/* ---------------------------------------------------- LESSONS AND HOMEWORK */

const TOPICS = ['Present Perfect vs Past Simple','IELTS Writing Task 2: opinion essays','Describing graphs and trends','Conditionals in conversation','Reading: True / False / Not Given','Speaking Part 2 long turn','Phrasal verbs for daily life','Listening: map and diagram tasks','Academic vocabulary: education','Passive voice in reports','Relative clauses','Pronunciation: word stress'];

const lessons = [];
groups.forEach((group, groupIndex) => {
  for (let i = 0; i < 4; i += 1) {
    const offset = -6 + i * 4;
    lessons.push({
      id: id('l', groupIndex * 4 + i + 1),
      topic: pick(TOPICS),
      description: 'Warm-up, target language, controlled practice, free practice, homework briefing.',
      groupId: group.id,
      groupName: group.name,
      teacherId: group.teacherId,
      date: day(offset),
      time: group.schedule.split('· ')[1] ?? '18:00',
      duration: 90,
      room: group.room,
      status: offset < 0 ? 'completed' : 'scheduled',
    });
  }
});

const HW = [
  ['Writing Task 2 — opinion essay','Write 250 words on whether university education should be free.'],
  ['Grammar workbook pages 42–45','Complete the present perfect exercises and bring your questions.'],
  ['Listening practice — Section 3','One full section under exam timing, then note every mistake.'],
  ['Speaking Part 2 recording','Record two minutes on "Describe a place you would like to visit".'],
];

const homeworks = [];
groups.forEach((group, groupIndex) => {
  for (let i = 0; i < 4; i += 1) {
    const [title, description] = HW[i % HW.length];
    const offset = -4 + i * 3;
    homeworks.push({
      id: id('hw', groupIndex * 4 + i + 1),
      title, description,
      groupId: group.id,
      groupName: group.name,
      teacherId: group.teacherId,
      assignedAt: day(offset - 5),
      deadline: day(offset),
      link: 'https://learnenglish.britishcouncil.org/',
      submissions: group.studentIds.filter(() => rand() > 0.4).map((studentId) => ({
        studentId,
        studentName: students.find((s) => s.id === studentId)?.fullName ?? '',
        submittedAt: stamp(offset - 1),
        note: 'Done, thank you.',
        link: '',
        status: rand() > 0.6 ? 'graded' : 'submitted',
        grade: rand() > 0.6 ? `${between(6, 10)}/10` : null,
      })),
    });
  }
});

/* -------------------------------------------------- ATTENDANCE AND PAYMENTS */

const attendance = [];
let attCounter = 1;

lessons.filter((l) => l.status === 'completed').forEach((lesson) => {
  const group = groups.find((g) => g.id === lesson.groupId);
  group.studentIds.forEach((studentId) => {
    const roll = rand();
    attendance.push({
      id: id('att', attCounter++, 4),
      studentId, groupId: group.id, teacherId: group.teacherId, date: lesson.date,
      status: roll > 0.16 ? 'present' : roll > 0.07 ? 'late' : 'absent',
    });
  });
});

for (let week = 1; week <= 8; week += 1) {
  groups.forEach((group) => {
    group.studentIds.forEach((studentId) => {
      if (rand() > 0.5) return;
      const roll = rand();
      attendance.push({
        id: id('att', attCounter++, 4),
        studentId, groupId: group.id, teacherId: group.teacherId, date: day(-7 * week - between(0, 3)),
        status: roll > 0.18 ? 'present' : roll > 0.08 ? 'late' : 'absent',
      });
    });
  });
}

students.forEach((student) => {
  const rows = attendance.filter((a) => a.studentId === student.id);
  if (!rows.length) return;
  const present = rows.filter((r) => r.status === 'present').length;
  const late = rows.filter((r) => r.status === 'late').length;
  student.attendanceRate = Math.round(((present + late * 0.5) / rows.length) * 100);
});

const payments = [];
let payCounter = 1;
['2026-07', '2026-08', '2026-09'].forEach((period, index) => {
  students.forEach((student) => {
    const isCurrent = index === 2;
    const isPrevious = index === 1;
    // Students marked overdue have an unpaid invoice from last month, so the
    // admin dashboard has genuinely late payments to warn about.
    const status = isCurrent ? student.paymentStatus
      : isPrevious && student.paymentStatus === 'overdue' ? 'overdue' : 'paid';
    payments.push({
      id: id('pay', payCounter++, 4),
      studentId: student.id,
      studentName: student.fullName,
      groupId: student.groupId,
      period,
      amount: student.monthlyPayment,
      paidAmount: status === 'paid' ? student.monthlyPayment : 0,
      method: status === 'paid' ? pick(['cash', 'card', 'transfer']) : null,
      paymentDate: status === 'paid' ? `${period}-${String(between(3, 12)).padStart(2, '0')}` : null,
      dueDate: `${period}-10`,
      status,
    });
  });
});

/* ------------------------------------------- RESULTS, STORIES, EVENTS, CLUBS */
/* DEMO SCORES — replace through Admin → Landing page and the results table.   */

const ieltsResults = [
  ['st-001',9.0,9.0,9.0,8.5,8.5,'2026-08-15'],['st-002',8.5,8.5,9.0,8.0,8.5,'2026-08-15'],
  ['st-003',8.5,9.0,8.5,8.0,8.0,'2026-07-18'],['st-009',8.0,8.5,8.0,7.5,8.0,'2026-07-18'],
  ['st-010',8.0,8.0,8.5,7.5,7.5,'2026-06-20'],['st-011',7.5,8.0,7.5,7.0,7.5,'2026-06-20'],
  ['st-017',7.5,7.5,8.0,7.0,7.0,'2026-05-16'],['st-019',8.5,8.5,8.5,8.0,8.5,'2026-08-15'],
  ['st-025',7.0,7.0,7.5,6.5,7.0,'2026-04-11'],['st-026',7.5,7.5,7.5,7.0,7.5,'2026-04-11'],
].map(([studentId, overall, listening, reading, writing, speaking, session], index) => {
  const student = students.find((s) => s.id === studentId);
  if (student) student.ieltsScore = overall;
  return {
    id: id('r', index + 1),
    studentId,
    studentName: student?.fullName ?? 'Student',
    initials: student?.initials ?? 'TJ',
    overall, listening, reading, writing, speaking, session,
    startLevel: overall >= 8 ? 'B1' : 'A2',
    monthsStudied: between(4, 11),
    featured: index < 8,
    visible: true,
    isDemoData: true,
  };
});

const testimonials = [
  ['st-001','IELTS Preparation','B1',9.0,'I came in able to read but not speak. By August the real exam felt like another practice test.'],
  ['st-002','IELTS Preparation','B1',8.5,'The written feedback on every essay changed everything. I could see exactly which sentence lost me marks.'],
  ['st-003','IELTS Intensive','B2',8.5,'Eight weeks, five days a week, and a teacher who refused to let me repeat the same mistakes.'],
  ['st-009','IELTS Preparation','B1',8.0,'Speaking used to make me freeze. The Saturday club fixed that faster than any grammar book.'],
  ['st-010','Academic English','B1',8.0,'I needed essays for a university application. My tutor rebuilt how I structure an argument.'],
  ['st-017','General English','A2',7.5,'A year ago I could not order coffee in English. Last month I interviewed in English and got the job.'],
].map(([studentId, course, levelBefore, ieltsScore, quote], index) => {
  const student = students.find((s) => s.id === studentId);
  return {
    id: id('tst', index + 1),
    studentId,
    name: student?.fullName ?? 'Student',
    initials: student?.initials ?? 'TJ',
    course, levelBefore, ieltsScore, quote,
    rating: 5, visible: true, isDemoData: true,
  };
});

const events = [
  ['IELTS Mock Exam — September',6,'Full four-part mock under real exam timing, band scores in three days.','Main hall','exam'],
  ['Speaking Competition',13,'A prepared two-minute talk and an unseen discussion topic.','Room 305','competition'],
  ['English Olympiad 2026',27,'Grammar, reading and listening rounds across three age categories.','Main hall','competition'],
  ['Debate Night: AI in classrooms',20,'Teams of three argue for and against.','Room 303','club'],
  ['Vocabulary Challenge',9,'Speed rounds on 500 academic words. B1 and above.','Room 201','competition'],
  ['Quiz Night',16,'Mixed teams, six rounds, everything in English.','Cafeteria','social'],
  ['Open Lesson for parents',11,'Sit in on a Kids Explorers lesson.','Room 101','open'],
  ['Free Placement Test Day',3,'Forty-minute written test plus a short interview.','Room 104','open'],
  ['Writing Workshop: Task 1 graphs',24,'Two hours on describing trends.','Room 202','club'],
  ['Graduation Ceremony',34,'Certificates for students finishing their courses.','Main hall','ceremony'],
].map(([title, offset, description, location, type], index) => ({
  id: id('ev', index + 1), title, date: day(offset), time: pick(['10:00', '14:00', '17:00', '18:30']),
  description, location, type, visible: true,
}));

const competitions = events
  .filter((event) => ['competition', 'exam'].includes(event.type))
  .concat([
    { title: 'Reading Sprint', date: day(18), description: 'Three passages, sixty minutes, highest accuracy wins.', location: 'Room 202', time: '15:00' },
    { title: 'Essay Marathon', date: day(30), description: 'Two Task 2 essays in one sitting, marked by two teachers.', location: 'Room 303', time: '10:00' },
    { title: 'Kids Spelling Bee', date: day(15), description: 'For Kids Explorers and Beginner Start groups.', location: 'Room 101', time: '15:00' },
    { title: 'Pronunciation Cup', date: day(22), description: 'Minimal pairs, word stress and a short reading round.', location: 'Room 305', time: '17:00' },
    { title: 'Grammar Grand Prix', date: day(26), description: 'Team quiz on tenses, articles and conditionals.', location: 'Room 201', time: '15:00' },
  ])
  .map((event, index) => ({
    id: id('cmp', index + 1),
    title: event.title, date: event.date, time: event.time,
    description: event.description, location: event.location,
    prize: pick(['One free month of tuition', 'Free IELTS mock package', 'Certificate and bookshop voucher']),
    capacity: between(20, 60),
    participants: students.slice(0, 40).filter(() => rand() > 0.86).map((s) => ({ studentId: s.id, studentName: s.fullName, joinedAt: stamp(-between(1, 20)) })),
    status: 'open', visible: true,
  }));

const extraClasses = [
  ['Speaking Club','Saturday · 15:00','t-005','Discussion, debate and role-play. No textbook.',24],
  ['Grammar Club','Wednesday · 17:00','t-006','One tricky structure per week, with instant correction.',20],
  ['IELTS Writing Lab','Friday · 18:00','t-001','Bring a draft, leave with it marked and rewritten.',16],
  ['IELTS Speaking Lab','Thursday · 18:00','t-008','Part 2 and Part 3 practice with recorded feedback.',16],
  ['Vocabulary Club','Tuesday · 16:00','t-002','Academic word list in context, not in flashcard isolation.',25],
].map(([name, schedule, teacherId, description, capacity], index) => ({
  id: id('ec', index + 1),
  name, title: name, schedule, teacherId,
  teacherName: teachers.find((t) => t.id === teacherId)?.fullName ?? '',
  description, capacity, price: 0,
  participants: students.slice(0, 30).filter(() => rand() > 0.8).map((s) => ({ studentId: s.id, studentName: s.fullName, joinedAt: stamp(-between(2, 30)) })),
  status: 'open', visible: true,
}));

/* ------------------------------------------------------------ LANDING PAGE */

const landingPage = {
  meta: {
    title: 'TJ Language School | English & IELTS Education',
    description: 'TJ Language School teaches English and prepares students for IELTS in Tashkent. Small groups, essays marked by hand, progress you can read every month.',
    keywords: 'english school tashkent, ielts preparation, ingliz tili kurslari',
  },
  nav: [
    { id: 'nav-1', label: 'Home', href: '#top', visible: true },
    { id: 'nav-2', label: 'About', href: '#about', visible: true },
    { id: 'nav-3', label: 'Courses', href: '#courses', visible: true },
    { id: 'nav-4', label: 'Teachers', href: '#teachers', visible: true },
    { id: 'nav-5', label: 'Results', href: '#results', visible: true },
    { id: 'nav-6', label: 'Students', href: '#stories', visible: true },
    { id: 'nav-7', label: 'Events', href: '#events', visible: true },
    { id: 'nav-8', label: 'FAQ', href: '#faq', visible: true },
    { id: 'nav-9', label: 'Contact', href: '#contact', visible: true },
  ],
  hero: {
    eyebrow: 'Tashkent · since 2018',
    title: 'Your English. Your future.',
    subtitle: 'English, IELTS and the confidence to actually speak. Small groups, teachers who mark every essay by hand, and a progress report you can read every month.',
    primaryCta: 'Start learning',
    secondaryCta: 'Book a free lesson',
    floatingCards: [
      { id: 'f1', value: '9.0', label: 'Highest IELTS band', tone: 'gold' },
      { id: 'f2', value: '95%', label: 'Reach their target band', tone: 'blue' },
    ],
  },
  stats: [
    { id: 's1', value: 1000, suffix: '+', label: 'Students taught', visible: true },
    { id: 's2', value: 50, suffix: '+', label: 'Studying right now', visible: true },
    { id: 's3', value: 10, suffix: '', label: 'Full-time teachers', visible: true },
    { id: 's4', value: 500, suffix: '+', label: 'IELTS graduates', visible: true },
    { id: 's5', value: 7.5, suffix: '+', label: 'Average IELTS band', decimals: 1, visible: true },
    { id: 's6', value: 95, suffix: '%', label: 'Student satisfaction', visible: true },
  ],
  about: {
    eyebrow: 'About the school',
    title: 'A school built around one question: can you use it?',
    body: 'TJ Language School opened in Tashkent with eight students and one classroom. We teach General English, IELTS preparation, Academic English and Kids English — but the method behind all of them is the same. Every lesson ends with students producing language, not recognising it. Every essay comes back marked by the teacher who set it. Every month, students get a written report of what improved and what did not.',
    mission: 'Har bir o‘quvchiga xalqaro darajadagi English bilimini berish va uning kelajakdagi imkoniyatlarini kengaytirish.',
    highlights: [
      { id: 'a1', label: 'Group size', value: 'Never more than 14' },
      { id: 'a2', label: 'Teacher feedback', value: 'Written, every week' },
      { id: 'a3', label: 'Progress reports', value: 'Monthly' },
      { id: 'a4', label: 'Placement test', value: 'Free, 40 minutes' },
    ],
  },
  benefits: [
    { id: 'b1', title: 'Groups of 14, not 30', text: 'Small enough that every student speaks in every lesson.', visible: true },
    { id: 'b2', title: 'Teachers with band 8+', text: 'Every IELTS teacher has taken the exam themselves.', visible: true },
    { id: 'b3', title: 'Essays marked by hand', text: 'Written feedback on every submission, not a tick.', visible: true },
    { id: 'b4', title: 'Progress you can read', text: 'Attendance, homework and bands tracked in your account.', visible: true },
    { id: 'b5', title: 'Speaking from day one', text: 'A free Saturday speaking club at every level.', visible: true },
    { id: 'b6', title: 'Real mock exams', text: 'Full mocks under exam timing, scored in three days.', visible: true },
    { id: 'b7', title: 'Everything in one account', text: 'Timetable, homework and payments in one place.', visible: true },
    { id: 'b8', title: 'Certificate on completion', text: 'A level certificate stating what you can do.', visible: true },
  ],
  steps: [
    { id: 'h1', title: 'Register', text: 'Send a registration request. It takes two minutes and costs nothing.', visible: true },
    { id: 'h2', title: 'Wait for approval', text: 'The school reviews your request, usually within one working day.', visible: true },
    { id: 'h3', title: 'Take the placement test', text: 'Forty minutes of writing plus a short interview. It decides your group.', visible: true },
    { id: 'h4', title: 'Start learning', text: 'You get a timetable, a teacher and a target band.', visible: true },
  ],
  resultsBlock: {
    eyebrow: 'IELTS results',
    title: 'Where our students finished',
    subtitle: 'Band scores from recent sessions. These are sample records in the demo database — replace them from the admin panel before publishing.',
  },
  faq: [
    { id: 'q1', question: 'IELTS kursi qancha davom etadi?', answer: 'Standart IELTS kursi 4 oy (48 dars), intensiv kurs esa 2 oy davom etadi.', visible: true },
    { id: 'q2', question: 'Darslar qachon bo‘ladi?', answer: 'Guruhlar ertalab 09:00 dan kechqurun 19:30 gacha ishlaydi, haftada 3 marta, 90 daqiqadan.', visible: true },
    { id: 'q3', question: 'Beginner o‘quvchilar qabul qilinadimi?', answer: 'Ha. Beginner Start kursi alifbodan boshlanadi va oldingi bilim talab qilinmaydi.', visible: true },
    { id: 'q4', question: 'Ro‘yxatdan o‘tgach nima bo‘ladi?', answer: 'So‘rovingiz administratorga yuboriladi. Tasdiqlangach, o‘zingiz tanlagan parol bilan login qilasiz.', visible: true },
    { id: 'q5', question: 'Oylik to‘lov qancha?', answer: 'Kursga qarab 350 000 so‘mdan 850 000 so‘mgacha. Aniq narx har bir kurs kartasida.', visible: true },
    { id: 'q6', question: 'Trial lesson bormi?', answer: 'Ha, bitta bepul sinov darsi va bepul joylashuv testi bor.', visible: true },
    { id: 'q7', question: 'Sertifikat beriladimi?', answer: 'Kursni yakunlagan va davomati 80% dan yuqori o‘quvchilarga sertifikat beriladi.', visible: true },
    { id: 'q8', question: 'Homework qanday beriladi?', answer: 'Har bir vazifa shaxsiy kabinetingizda chiqadi: matn, havola va muddat bilan.', visible: true },
  ],
  cta: {
    title: 'Ready to improve your English?',
    subtitle: 'Send a registration request and we will tell you honestly which group you belong in.',
    buttonLabel: 'Start your journey',
  },
  contact: {
    title: 'Talk to us',
    subtitle: 'Leave your number and we will call back within one working day.',
    address: 'Amir Temur ko‘chasi 108, Tashkent, Uzbekistan',
    phone: '+998 71 200 40 40',
    email: 'hello@tjlanguageschool.uz',
    workingHours: 'Mon – Sat, 09:00 – 20:00',
  },
  footer: {
    tagline: 'English and IELTS teaching in Tashkent since 2018.',
    copyright: '© 2026 TJ Language School. All rights reserved.',
  },
};

/* ------------------------------------------------------------------- WRITE */

async function main() {
  const users = await buildUsers();
  const studentRequests = await buildRequests();

  const notifications = [];
  let noteCounter = 1;
  users.filter((u) => u.role === 'student').slice(0, 10).forEach((user, index) => {
    notifications.push({
      id: id('n', noteCounter++),
      title: 'Timetable update',
      message: 'Saturday lessons move to 16:30 from next week. The room stays the same.',
      type: 'info', sender: 'TJ Language School', receiverId: user.id,
      date: stamp(-index - 1), read: index > 5,
    });
  });
  studentRequests.filter((r) => r.status === 'pending').forEach((request) => {
    notifications.push({
      id: id('n', noteCounter++),
      title: 'New registration request',
      message: `${request.fullName} (${request.phone}) asked to join.`,
      type: 'info', sender: 'Website', receiverId: 'u-001',
      date: request.requestDate, read: false,
    });
  });


/* --------------------------------------------------------------------------
   UPGRADE SEED DATA — tests and media posts
   The remaining new collections (branches, vocabulary, sentences, achievements,
   progress) are created by ensureCollections() in server.js on first boot, so
   they exist whether the database was seeded or upgraded in place.
   -------------------------------------------------------------------------- */

const quizzes = [
  {
    id: 'qz-001',
    title: 'Present Perfect vs Past Simple',
    category: 'Grammar',
    level: 'B1',
    description: 'Ten minutes on the tense pair that costs the most marks in Writing Task 1.',
    timeLimit: 10,
    visible: true,
    createdBy: 'TJ School Administrator',
    questions: [
      { id: 'q1', prompt: 'I ___ in Olmaliq since 2019.', options: ['live', 'have lived', 'lived', 'am living'], correctIndex: 1,
        explanation: '"Since" with an unfinished period takes the present perfect.' },
      { id: 'q2', prompt: 'She ___ her essay yesterday.', options: ['has finished', 'finishes', 'finished', 'had finish'], correctIndex: 2,
        explanation: '"Yesterday" is a finished time, so the past simple is correct.' },
      { id: 'q3', prompt: 'We ___ that film three times.', options: ['saw', 'have seen', 'were seeing', 'see'], correctIndex: 1,
        explanation: 'Repeated experience up to now takes the present perfect.' },
      { id: 'q4', prompt: '___ you ever been to Tashkent?', options: ['Did', 'Have', 'Are', 'Were'], correctIndex: 1,
        explanation: '"Ever" in a life-experience question takes the present perfect.' },
      { id: 'q5', prompt: 'He ___ the exam last June.', options: ['has passed', 'passes', 'passed', 'has pass'], correctIndex: 2,
        explanation: '"Last June" is a finished time reference.' },
    ],
  },
  {
    id: 'qz-002',
    title: 'IELTS Academic Vocabulary',
    category: 'Vocabulary',
    level: 'B2',
    description: 'Word choice that examiners reward in Task 2 essays.',
    timeLimit: 8,
    visible: true,
    createdBy: 'TJ School Administrator',
    questions: [
      { id: 'q1', prompt: 'Choose the closest meaning of "significant".', options: ['tiny', 'considerable', 'unclear', 'rare'], correctIndex: 1,
        explanation: '"Significant" means large enough to matter.' },
      { id: 'q2', prompt: 'A "drawback" is a ___.', options: ['benefit', 'disadvantage', 'summary', 'solution'], correctIndex: 1,
        explanation: 'A drawback is a negative aspect.' },
      { id: 'q3', prompt: '"To mitigate" a problem means to ___ it.', options: ['reduce', 'ignore', 'cause', 'repeat'], correctIndex: 0,
        explanation: 'Mitigate means to make something less severe.' },
      { id: 'q4', prompt: 'Which word best replaces "a lot of" in academic writing?', options: ['loads of', 'substantial', 'tons of', 'plenty'], correctIndex: 1,
        explanation: '"Substantial" fits an academic register.' },
    ],
  },
];

const mediaPosts = [
  { id: 'mp-001', title: 'Speaking Club: Friday session', description: 'Our weekly Speaking Club, where students practise Part 2 long turns in pairs.', category: 'Students', image: '', video: '', date: day(-6), visible: true },
  { id: 'mp-002', title: 'IELTS results morning', description: 'Band scores from the latest session, shared with the groups.', category: 'Achievements', image: '', video: '', date: day(-13), visible: true },
  { id: 'mp-003', title: 'Teacher workshop', description: 'Our teaching team reviewing Writing Task 2 marking criteria together.', category: 'Teachers', image: '', video: '', date: day(-20), visible: true },
];


  const db = {
    _meta: {
      generatedAt: new Date().toISOString(),
      demoData: !EMPTY,
      notice: 'Students, teachers, IELTS scores, testimonials and payments here are invented sample data, not real people or real results.',
    },
    users: EMPTY ? users.slice(0, 1) : users,
    studentRequests: EMPTY ? [] : studentRequests,
    admins: [{ id: 'a-001', userId: 'u-001', fullName: 'TJ School Administrator', email: 'admin@tjlanguageschool.uz' }],
    students: EMPTY ? [] : students,
    teachers: EMPTY ? [] : teachers,
    groups: EMPTY ? [] : groups,
    courses,
    lessons: EMPTY ? [] : lessons,
    homeworks: EMPTY ? [] : homeworks,
    attendance: EMPTY ? [] : attendance,
    payments: EMPTY ? [] : payments,
    notifications: EMPTY ? [] : notifications,
    competitions: EMPTY ? [] : competitions,
    extraClasses: EMPTY ? [] : extraClasses,
    ieltsResults: EMPTY ? [] : ieltsResults,
    testimonials: EMPTY ? [] : testimonials,
    events: EMPTY ? [] : events,
    leads: [],
    landingPage,
    // New in this version. ensureCollections() fills in anything left out here.
    quizzes: EMPTY ? [] : quizzes,
    quizAttempts: [],
    mediaPosts: EMPTY ? [] : mediaPosts,
    branches: [],
    announcements: [],
    achievements: [],
    studentAchievements: [],
    gameResults: [],
    lessonReviews: [],
    studentProgress: [],
    vocabulary: [],
    sentences: [],
    websiteSettings: {},
  };

  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  const counts = Object.entries(db).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}: ${v.length}`).join('\n  ');
  console.log(`\n  db.json written\n  ${counts}\n`);
  console.log('  Demo accounts:');
  console.log('    admin@tjlanguageschool.uz    / Admin123!');
  console.log('    teacher1@tjlanguageschool.uz / Teacher123!');
  console.log('    student1@tjlanguageschool.uz / Student123!\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
