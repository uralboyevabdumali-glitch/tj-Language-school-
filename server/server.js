/**
 * ============================================================================
 *  TJ LANGUAGE SCHOOL — API SERVER (everything in one file)
 * ============================================================================
 *  Reads and writes server/db.json. Run with:  npm run server
 *
 *  The three systems the app is built around are kept strictly apart:
 *
 *    LOGIN            checks an existing account in db.users
 *    REGISTER         creates a row in db.studentRequests — no account yet
 *    STUDENT REQUEST  admin approves it, and only then is an account created
 *
 *  Sections below, in order:
 *    1. DATABASE HELPERS
 *    2. AUTH MIDDLEWARE
 *    3. LOGIN SYSTEM
 *    4. REGISTER + STUDENT REQUEST SYSTEM
 *    5. GENERIC CRUD (students, teachers, groups, courses, …)
 *    6. GROUPS / ATTENDANCE / PAYMENTS / HOMEWORK extras
 *    7. NOTIFICATIONS
 *    8. LANDING PAGE CMS
 *    9. DASHBOARD STATISTICS
 * ============================================================================
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'tj-language-school-dev-secret';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ==========================================================================
   1. DATABASE HELPERS
   ========================================================================== */

let db = null;
let writeQueue = Promise.resolve();

async function loadDb() {
  if (!db) {
    db = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
    // Top up any collection this version added. Existing rows are never touched.
    if (ensureCollections(db)) {
      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      console.log('  db.json upgraded with the new collections (existing data kept).');
    }
  }
  return db;
}

/** Run a change and save the file. Calls are queued so two requests never clash. */
function saveDb(change) {
  const run = writeQueue.then(async () => {
    const data = await loadDb();
    const result = await change(data);
    const tmp = `${DB_PATH}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, DB_PATH);
    return result;
  });
  writeQueue = run.catch(() => {});
  return run;
}

/** Next id for a collection, e.g. "st-051". */
function nextId(list, prefix) {
  const numbers = list.map((row) => parseInt(String(row.id).replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
  return `${prefix}-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();

const today = () => new Date().toISOString().slice(0, 10);
const hidePassword = ({ password, ...rest }) => rest;

/* ==========================================================================
   2. AUTH MIDDLEWARE
   ========================================================================== */

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

/** Requires a valid token. Puts the account on req.user and the profile on req.profile. */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ code: 'signIn', message: 'Sign in to continue.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const data = await loadDb();
    const user = data.users.find((row) => row.id === payload.sub);
    if (!user) return res.status(401).json({ code: 'accountGone', message: 'This account no longer exists.' });
    if (user.status !== 'active') return res.status(403).json({ code: 'accountInactive', message: 'This account is not active.' });

    req.user = hidePassword(user);
    req.profile =
      user.role === 'student' ? data.students.find((s) => s.id === user.profileId) ?? null
      : user.role === 'teacher' ? data.teachers.find((t) => t.id === user.profileId) ?? null
      : null;
    next();
  } catch {
    res.status(401).json({ code: 'sessionExpired', message: 'Your session expired. Sign in again.' });
  }
}

/** Only the listed roles may continue. Use straight after requireAuth. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource.' });
    }
    next();
  };
}

/* ==========================================================================
   3. LOGIN SYSTEM
   --------------------------------------------------------------------------
   Login only ever reads db.users. It never touches studentRequests, and it
   never creates anything.
   ========================================================================== */

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  if (!email || !password) return res.status(422).json({ code: 'missingCredentials', message: 'Enter your email and password.' });

  const data = await loadDb();
  const user = data.users.find((row) => row.email === email);

  // No account with that email — but maybe there is a registration request,
  // in which case the person is told where their request stands.
  if (!user) {
    const request = data.studentRequests.find((row) => row.email === email);
    if (request?.status === 'pending') {
      return res.status(403).json({ code: 'requestPending', message: 'Your registration request is still pending.' });
    }
    if (request?.status === 'rejected') {
      return res.status(403).json({ code: 'requestRejected', message: 'Your registration request was rejected.' });
    }
    return res.status(404).json({ message: 'Account not found. Please register first.' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ code: 'wrongPassword', message: 'Incorrect password.' });
  if (user.status !== 'active') return res.status(403).json({ message: 'This account is blocked.' });

  res.json({ token: signToken(user), user: hidePassword(user) });
});

/** Current session: the account plus its student or teacher profile. */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user, profile: req.profile });
});

app.patch('/api/auth/me', requireAuth, async (req, res) => {
  const patch = {};
  if (req.body.fullName) patch.fullName = String(req.body.fullName).trim();
  if (req.body.phone) patch.phone = String(req.body.phone).trim();
  // Avatar is a URL, not an upload: there is no file store in this project and
  // inventing one would mean a new dependency and a place to put the bytes.
  // An empty string clears it and falls back to the initials badge.
  if (req.body.avatar !== undefined) {
    const url = String(req.body.avatar).trim();
    if (url && !/^https?:\/\//i.test(url)) {
      return res.status(422).json({ code: 'badAvatarUrl', message: 'Avatar must be a full http(s) URL.' });
    }
    patch.avatar = url;
  }

  const user = await saveDb((data) => {
    const account = data.users.find((row) => row.id === req.user.id);
    Object.assign(account, patch);
    if (patch.fullName) account.initials = initials(patch.fullName);

    const list = account.role === 'student' ? data.students : account.role === 'teacher' ? data.teachers : null;
    const profile = list?.find((row) => row.id === account.profileId);
    if (profile) Object.assign(profile, patch, { initials: account.initials });
    return account;
  });

  res.json(hidePassword(user));
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(422).json({ message: 'Use at least 6 characters.' });

  const data = await loadDb();
  const stored = data.users.find((row) => row.id === req.user.id);
  const ok = await bcrypt.compare(String(currentPassword ?? ''), stored.password);
  if (!ok) return res.status(401).json({ code: 'wrongCurrentPassword', message: 'Your current password is incorrect.' });

  const hash = await bcrypt.hash(newPassword, 10);
  await saveDb((store) => {
    store.users.find((row) => row.id === req.user.id).password = hash;
  });
  res.json({ message: 'Password changed.' });
});

/* ==========================================================================
   4. REGISTER + STUDENT REQUEST SYSTEM
   --------------------------------------------------------------------------
   Register creates a studentRequest with status "pending" and NOTHING else.
   No account, no login, no dashboard until an admin approves it.
   ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/api/auth/register', async (req, res) => {
  const fullName = String(req.body.fullName ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const phone = String(req.body.phone ?? '').trim();
  const { password, confirmPassword } = req.body;

  // Field errors are sent as codes so the client can show them in the chosen
  // language; `errorMessages` keeps readable English for non-browser clients.
  const errors = {};
  if (fullName.length < 3) errors.fullName = 'fullName';
  if (!EMAIL_RE.test(email)) errors.email = 'email';
  if (!/^[+()\d\s-]{7,20}$/.test(phone)) errors.phone = 'phone';
  if (!password || password.length < 6) errors.password = 'password';
  if (password !== confirmPassword) errors.confirmPassword = 'passwordMatch';
  if (Object.keys(errors).length) return res.status(422).json({ code: 'checkForm', message: 'Check the form.', errors });

  const data = await loadDb();
  if (data.users.some((row) => row.email === email)) {
    return res.status(409).json({ code: 'emailTaken', message: 'That email already has an account. Please log in.', errors: { email: 'emailTaken' } });
  }
  if (data.studentRequests.some((row) => row.email === email && row.status === 'pending')) {
    return res.status(409).json({ code: 'requestExists', message: 'A request with this email is already waiting for approval.', errors: { email: 'requestExists' } });
  }

  // The password is hashed now and carried on the request, so approving it later
  // does not need the person to choose a password a second time.
  const hash = await bcrypt.hash(password, 10);

  const request = await saveDb((store) => {
    const row = {
      id: nextId(store.studentRequests, 'req'),
      fullName,
      email,
      phone,
      password: hash,
      status: 'pending',
      requestDate: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      note: '',
    };
    store.studentRequests.push(row);

    // Tell the admin a request came in.
    store.notifications.push({
      id: nextId(store.notifications, 'n'),
      title: 'New registration request',
      message: `${fullName} (${phone}) asked to join.`,
      type: 'info',
      sender: 'Website',
      receiverId: 'u-001',
      date: new Date().toISOString(),
      read: false,
    });
    return row;
  });

  res.status(201).json({
    message: 'Registration request sent successfully. Please wait for admin approval.',
    request: hidePassword(request),
  });
});

/** Anyone can check where their own request stands, by email. No password returned. */
app.get('/api/requests/status', async (req, res) => {
  const email = String(req.query.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(422).json({ message: 'Enter a valid email address.' });

  const data = await loadDb();
  const request = [...data.studentRequests].reverse().find((row) => row.email === email);
  if (!request) return res.status(404).json({ message: 'No registration request found for that email.' });

  res.json({
    fullName: request.fullName,
    email: request.email,
    status: request.status,
    requestDate: request.requestDate,
    reviewedAt: request.reviewedAt,
  });
});

/** Admin list of requests, with filtering and search. */
app.get('/api/requests', requireAuth, requireRole('admin'), async (req, res) => {
  const data = await loadDb();
  let rows = data.studentRequests.map(hidePassword);

  if (req.query.status) rows = rows.filter((row) => row.status === req.query.status);
  if (req.query.search) {
    const needle = String(req.query.search).toLowerCase();
    rows = rows.filter((row) =>
      [row.fullName, row.email, row.phone].some((field) => String(field).toLowerCase().includes(needle))
    );
  }

  rows.sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  res.json({ data: rows, total: rows.length });
});

/**
 * APPROVE — this is the only place a student account is ever created.
 * It writes three rows: students, users, and a welcome notification.
 */
app.post('/api/requests/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await saveDb((data) => {
    const request = data.studentRequests.find((row) => row.id === req.params.id);
    if (!request) return { error: 404, message: 'Request not found.' };
    if (request.status !== 'pending') return { error: 409, message: 'This request was already reviewed.' };
    if (data.users.some((row) => row.email === request.email)) {
      return { error: 409, message: 'An account with that email already exists.' };
    }

    const studentId = nextId(data.students, 'st');
    const userId = nextId(data.users, 'u');
    const now = new Date().toISOString();

    const student = {
      id: studentId,
      fullName: request.fullName,
      initials: initials(request.fullName),
      email: request.email,
      phone: request.phone,
      age: null,
      level: 'Placement pending',
      courseId: null,
      groupId: null,
      groupName: '',
      teacherId: null,
      joinDate: now.slice(0, 10),
      monthlyPayment: 0,
      paymentStatus: 'pending',
      attendanceRate: 0,
      ieltsScore: null,
      status: 'active',
      notes: '',
    };

    data.students.push(student);
    data.users.push({
      id: userId,
      fullName: request.fullName,
      initials: student.initials,
      email: request.email,
      phone: request.phone,
      password: request.password, // already hashed at registration
      role: 'student',
      profileId: studentId,
      status: 'active',
      createdAt: now,
    });

    request.status = 'approved';
    request.reviewedAt = now;
    request.reviewedBy = req.user.fullName;

    data.notifications.push({
      id: nextId(data.notifications, 'n'),
      title: 'Your account is ready',
      message: 'Your registration was approved. You can sign in with the password you chose.',
      type: 'success',
      sender: 'TJ Language School',
      receiverId: userId,
      date: now,
      read: false,
    });

    return { student };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.json({ message: 'Request approved. The student can log in now.', student: result.student });
});

/** REJECT — marks the request rejected. No account is created, so login stays closed. */
app.post('/api/requests/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await saveDb((data) => {
    const request = data.studentRequests.find((row) => row.id === req.params.id);
    if (!request) return { error: 404, message: 'Request not found.' };
    if (request.status !== 'pending') return { error: 409, message: 'This request was already reviewed.' };

    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = req.user.fullName;
    request.note = String(req.body.note ?? '');
    return { ok: true };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.json({ message: 'Request rejected.' });
});

app.delete('/api/requests/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await saveDb((data) => {
    data.studentRequests = data.studentRequests.filter((row) => row.id !== req.params.id);
  });
  res.json({ deleted: true });
});

/* ==========================================================================
   5. GENERIC CRUD
   --------------------------------------------------------------------------
   Every simple collection gets list / read / create / update / delete from
   the same code, with a role check and an optional row filter so a teacher
   only sees their own groups and a student only their own records.
   ========================================================================== */

function crud(collection, options = {}) {
  const {
    prefix = collection.slice(0, 2),
    read = ['admin', 'teacher', 'student'],
    write = ['admin'],
    searchable = ['fullName', 'name', 'title', 'email', 'studentName', 'topic'],
    scope = null,          // (req, row) => boolean, applied to non-admins
    beforeCreate = null,   // (body, req, data) => body
    afterWrite = null,     // (row, data) => void
  } = options;

  const router = express.Router();
  router.use(requireAuth);

  const allowed = (req, rows) =>
    req.user.role === 'admin' || !scope ? rows : rows.filter((row) => scope(req, row));

  router.get('/', requireRole(...read), async (req, res) => {
    const data = await loadDb();
    let rows = allowed(req, data[collection] ?? []);
    const { search, sort, order = 'asc', page, limit, ...filters } = req.query;

    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      rows = rows.filter((row) => (Array.isArray(row[key]) ? row[key].includes(value) : String(row[key]) === value));
    }
    if (search) {
      const needle = String(search).toLowerCase();
      rows = rows.filter((row) => searchable.some((f) => String(row[f] ?? '').toLowerCase().includes(needle)));
    }
    if (sort) {
      const dir = order === 'desc' ? -1 : 1;
      rows = [...rows].sort((a, b) =>
        typeof a[sort] === 'number' && typeof b[sort] === 'number'
          ? (a[sort] - b[sort]) * dir
          : String(a[sort] ?? '').localeCompare(String(b[sort] ?? '')) * dir
      );
    }

    const total = rows.length;
    if (page && limit) rows = rows.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));
    res.json({ data: rows, total, page: Number(page) || 1, limit: Number(limit) || total });
  });

  router.post('/', requireRole(...write), async (req, res) => {
    const data = await loadDb();
    let body = { ...req.body };
    if (beforeCreate) {
      body = beforeCreate(body, req, data);
      if (body?.error) return res.status(body.error).json({ message: body.message });
    }
    const row = await saveDb((store) => {
      const created = { id: nextId(store[collection], prefix), createdAt: new Date().toISOString(), ...body };
      store[collection].push(created);
      if (afterWrite) afterWrite(created, store);
      return created;
    });
    res.status(201).json(row);
  });

  router.patch('/:id', requireRole(...write), async (req, res) => {
    const row = await saveDb((store) => {
      const list = store[collection];
      const index = list.findIndex((item) => item.id === req.params.id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...req.body, id: list[index].id };
      if (afterWrite) afterWrite(list[index], store);
      return list[index];
    });
    if (!row) return res.status(404).json({ message: 'Not found.' });
    res.json(row);
  });

  router.delete('/:id', requireRole(...write), async (req, res) => {
    const removed = await saveDb((store) => {
      const index = store[collection].findIndex((item) => item.id === req.params.id);
      if (index === -1) return null;
      const [row] = store[collection].splice(index, 1);
      if (afterWrite) afterWrite(row, store, true);
      return row;
    });
    if (!removed) return res.status(404).json({ message: 'Not found.' });
    res.json({ deleted: true, id: req.params.id });
  });

  return router;
}

/* Keep group rosters, teacher group lists and student group ids consistent. */
function relink(data) {
  data.teachers.forEach((teacher) => {
    teacher.groups = data.groups.filter((g) => g.teacherId === teacher.id).map((g) => g.id);
  });
  data.students.forEach((student) => {
    const group = data.groups.find((g) => (g.studentIds ?? []).includes(student.id));
    student.groupId = group?.id ?? null;
    student.groupName = group?.name ?? '';
    student.teacherId = group?.teacherId ?? null;
    if (group) student.courseId = group.courseId;
  });
}

// STUDENTS — admins manage them; teachers see only their own groups' students.
app.use('/api/students', crud('students', {
  prefix: 'st',
  read: ['admin', 'teacher'],
  write: ['admin'],
  scope: (req, student) => (req.profile?.groups ?? []).includes(student.groupId),
  afterWrite: (row, data, deleted) => {
    if (deleted) {
      data.users = data.users.filter((u) => u.profileId !== row.id);
      data.groups.forEach((g) => { g.studentIds = (g.studentIds ?? []).filter((id) => id !== row.id); });
    } else {
      const account = data.users.find((u) => u.profileId === row.id);
      if (account) Object.assign(account, { fullName: row.fullName, email: row.email, phone: row.phone });
    }
    relink(data);
  },
}));

// TEACHERS — created by the admin only. This is where a teacher account is born.
app.use('/api/teachers', crud('teachers', {
  prefix: 't',
  read: ['admin', 'teacher', 'student'],
  write: ['admin'],
  beforeCreate: (body, req, data) => {
    if (data.users.some((u) => u.email === body.email)) {
      return { error: 409, code: 'emailTaken', message: 'That email already has an account.' };
    }
    return {
      ...body,
      initials: initials(body.fullName),
      groups: [],
      status: body.status ?? 'active',
      // Hashed synchronously so the account row can be written in the same save.
      passwordHash: bcrypt.hashSync(body.password || 'Teacher123!', 10),
      password: undefined,
    };
  },
  afterWrite: (row, data, deleted) => {
    if (deleted) {
      data.users = data.users.filter((u) => u.profileId !== row.id);
      data.groups.forEach((g) => { if (g.teacherId === row.id) g.teacherId = null; });
    } else {
      const account = data.users.find((u) => u.profileId === row.id);
      if (account) {
        Object.assign(account, { fullName: row.fullName, email: row.email, phone: row.phone, status: row.status });
      } else if (row.passwordHash) {
        data.users.push({
          id: nextId(data.users, 'u'),
          fullName: row.fullName,
          initials: row.initials,
          email: row.email,
          phone: row.phone,
          password: row.passwordHash,
          role: 'teacher',
          profileId: row.id,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
      delete row.passwordHash; // never keep the hash on the profile row
    }
    relink(data);
  },
}));

app.use('/api/groups', crud('groups', {
  prefix: 'grp',
  scope: (req, group) => (req.user.role === 'teacher' ? group.teacherId === req.profile?.id : group.id === req.profile?.groupId),
  beforeCreate: (body) => ({ ...body, studentIds: body.studentIds ?? [], status: body.status ?? 'active', startDate: body.startDate || today() }),
  afterWrite: (row, data) => relink(data),
}));

app.use('/api/courses', crud('courses', { prefix: 'c' }));

app.use('/api/lessons', crud('lessons', {
  prefix: 'l',
  write: ['admin', 'teacher'],
  scope: (req, lesson) =>
    req.user.role === 'teacher' ? (req.profile?.groups ?? []).includes(lesson.groupId) : lesson.groupId === req.profile?.groupId,
  beforeCreate: (body, req, data) => {
    const group = data.groups.find((g) => g.id === body.groupId);
    if (req.user.role === 'teacher' && group?.teacherId !== req.profile.id) {
      return { error: 403, message: 'You can only schedule lessons for your own groups.' };
    }
    return { ...body, groupName: group?.name ?? '', teacherId: group?.teacherId ?? null, status: body.status ?? 'scheduled' };
  },
}));

app.use('/api/homeworks', crud('homeworks', {
  prefix: 'hw',
  write: ['admin', 'teacher'],
  scope: (req, hw) =>
    req.user.role === 'teacher' ? (req.profile?.groups ?? []).includes(hw.groupId) : hw.groupId === req.profile?.groupId,
  beforeCreate: (body, req, data) => {
    const group = data.groups.find((g) => g.id === body.groupId);
    if (req.user.role === 'teacher' && group?.teacherId !== req.profile.id) {
      return { error: 403, message: 'You can only set homework for your own groups.' };
    }
    return { ...body, groupName: group?.name ?? '', teacherId: group?.teacherId ?? null, submissions: [], assignedAt: today() };
  },
}));

app.use('/api/attendance', crud('attendance', {
  prefix: 'att',
  write: ['admin', 'teacher'],
  scope: (req, row) =>
    req.user.role === 'teacher' ? (req.profile?.groups ?? []).includes(row.groupId) : row.studentId === req.profile?.id,
}));

app.use('/api/payments', crud('payments', {
  prefix: 'pay',
  read: ['admin', 'student'],
  scope: (req, row) => row.studentId === req.profile?.id,
}));

app.use('/api/competitions', crud('competitions', { prefix: 'cmp', write: ['admin', 'teacher'] }));
app.use('/api/extra-classes', crud('extraClasses', { prefix: 'ec', write: ['admin', 'teacher'] }));
app.use('/api/results', crud('ieltsResults', { prefix: 'r' }));
app.use('/api/testimonials', crud('testimonials', { prefix: 'tst' }));
app.use('/api/events', crud('events', { prefix: 'ev' }));

/* ==========================================================================
   6. GROUPS / ATTENDANCE / PAYMENTS / HOMEWORK extras
   ========================================================================== */

/** Group with its students, teacher, course and lessons in one call. */
app.get('/api/groups/:id/roster', requireAuth, async (req, res) => {
  const data = await loadDb();
  const group = data.groups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  if (req.user.role === 'teacher' && group.teacherId !== req.profile?.id) {
    return res.status(403).json({ message: 'That is not your group.' });
  }
  if (req.user.role === 'student' && group.id !== req.profile?.groupId) {
    return res.status(403).json({ message: 'That is not your group.' });
  }

  res.json({
    group,
    students: data.students.filter((s) => (group.studentIds ?? []).includes(s.id)),
    teacher: data.teachers.find((t) => t.id === group.teacherId) ?? null,
    course: data.courses.find((c) => c.id === group.courseId) ?? null,
    lessons: data.lessons.filter((l) => l.groupId === group.id),
  });
});

app.post('/api/groups/:id/students', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await saveDb((data) => {
    const group = data.groups.find((g) => g.id === req.params.id);
    if (!group) return null;
    data.groups.forEach((g) => { g.studentIds = (g.studentIds ?? []).filter((id) => id !== req.body.studentId); });
    group.studentIds.push(req.body.studentId);
    relink(data);
    return group;
  });
  if (!result) return res.status(404).json({ message: 'Group not found.' });
  res.json(result);
});

app.delete('/api/groups/:id/students/:studentId', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await saveDb((data) => {
    const group = data.groups.find((g) => g.id === req.params.id);
    if (!group) return null;
    group.studentIds = group.studentIds.filter((id) => id !== req.params.studentId);
    relink(data);
    return group;
  });
  if (!result) return res.status(404).json({ message: 'Group not found.' });
  res.json(result);
});

/** Save a whole attendance register. Saving the same date again replaces it. */
app.post('/api/attendance/register', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { groupId, date, records = [] } = req.body;
  if (!groupId || !date) return res.status(422).json({ message: 'Choose a group and a date.' });

  const data = await loadDb();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  if (req.user.role === 'teacher' && group.teacherId !== req.profile.id) {
    return res.status(403).json({ message: 'You can only mark your own groups.' });
  }

  const saved = await saveDb((store) => {
    store.attendance = store.attendance.filter((row) => !(row.groupId === groupId && row.date === date));
    let counter = parseInt(nextId(store.attendance, 'att').replace(/\D/g, ''), 10);
    const rows = records.map((record) => ({
      id: `att-${String(counter++).padStart(4, '0')}`,
      studentId: record.studentId,
      groupId,
      teacherId: group.teacherId,
      date,
      status: record.status ?? 'present',
    }));
    store.attendance.push(...rows);

    // Recalculate each student's attendance percentage.
    [...new Set(rows.map((r) => r.studentId))].forEach((studentId) => {
      const all = store.attendance.filter((row) => row.studentId === studentId);
      const student = store.students.find((s) => s.id === studentId);
      if (!student || !all.length) return;
      const present = all.filter((row) => row.status === 'present').length;
      const late = all.filter((row) => row.status === 'late').length;
      student.attendanceRate = Math.round(((present + late * 0.5) / all.length) * 100);
    });
    return rows;
  });

  res.status(201).json({ saved: saved.length });
});

/** Record a payment against an invoice. */
app.post('/api/payments/:id/pay', requireAuth, requireRole('admin'), async (req, res) => {
  const invoice = await saveDb((data) => {
    const row = data.payments.find((p) => p.id === req.params.id);
    if (!row) return null;
    row.paidAmount = Number(req.body.amount ?? row.amount);
    row.method = req.body.method ?? 'cash';
    row.paymentDate = today();
    row.status = row.paidAmount >= row.amount ? 'paid' : 'pending';

    const invoices = data.payments.filter((p) => p.studentId === row.studentId);
    const student = data.students.find((s) => s.id === row.studentId);
    if (student) {
      const overdue = invoices.some((p) => p.status !== 'paid' && p.dueDate < today());
      student.paymentStatus = overdue ? 'overdue' : invoices.some((p) => p.status === 'pending') ? 'pending' : 'paid';
    }
    return row;
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  res.json(invoice);
});

/** Message every student who has an overdue invoice. */
app.post('/api/payments/remind', requireAuth, requireRole('admin'), async (req, res) => {
  const sent = await saveDb((data) => {
    const targets = [...new Set(data.payments.filter((p) => p.status !== 'paid' && p.dueDate < today()).map((p) => p.studentId))];
    let counter = parseInt(nextId(data.notifications, 'n').replace(/\D/g, ''), 10);
    let count = 0;
    targets.forEach((studentId) => {
      const account = data.users.find((u) => u.profileId === studentId);
      if (!account) return;
      data.notifications.push({
        id: `n-${String(counter++).padStart(3, '0')}`,
        title: 'Payment reminder',
        message: 'Hurmatli o‘quvchi, joriy oy uchun oylik to‘lovingizni amalga oshirishingizni so‘raymiz.',
        type: 'warning',
        sender: 'TJ Language School',
        receiverId: account.id,
        date: new Date().toISOString(),
        read: false,
      });
      count += 1;
    });
    return count;
  });
  res.json({ sent });
});

/** Student marks a homework task done. */
app.post('/api/homeworks/:id/complete', requireAuth, requireRole('student'), async (req, res) => {
  const result = await saveDb((data) => {
    const task = data.homeworks.find((h) => h.id === req.params.id);
    if (!task) return null;
    if (task.groupId !== req.profile.groupId) return 'forbidden';

    task.submissions = task.submissions ?? [];
    const entry = {
      studentId: req.profile.id,
      studentName: req.profile.fullName,
      submittedAt: new Date().toISOString(),
      note: req.body.note ?? '',
      link: req.body.link ?? '',
      status: today() > task.deadline ? 'late' : 'submitted',
      grade: null,
    };
    const existing = task.submissions.find((s) => s.studentId === req.profile.id);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      task.submissions.push(entry);
      // XP only on the first hand-in, so re-saving a task cannot farm points.
      awardXp(data, req.profile.id, entry.status === 'late' ? 15 : 40, `submitted ${task.title}`);
      progressOf(data, req.profile.id).daily.homework += 1;
      checkAchievements(data, req.profile.id);
    }
    return task;
  });

  if (result === 'forbidden') return res.status(403).json({ message: 'That task is for another group.' });
  if (!result) return res.status(404).json({ message: 'Homework not found.' });
  res.json(result);
});

/** Teacher grades one submission. */
app.post('/api/homeworks/:id/grade', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const result = await saveDb((data) => {
    const task = data.homeworks.find((h) => h.id === req.params.id);
    if (!task) return null;
    const submission = (task.submissions ?? []).find((s) => s.studentId === req.body.studentId);
    if (!submission) return 'missing';
    submission.grade = req.body.grade;
    submission.status = 'graded';

    const account = data.users.find((u) => u.profileId === req.body.studentId);
    if (account) {
      data.notifications.push({
        id: nextId(data.notifications, 'n'),
        title: 'Homework graded',
        message: `"${task.title}" was graded: ${req.body.grade}.`,
        type: 'success',
        sender: req.user.fullName,
        receiverId: account.id,
        date: new Date().toISOString(),
        read: false,
      });
    }
    return task;
  });

  if (result === 'missing') return res.status(404).json({ message: 'No submission from that student yet.' });
  if (!result) return res.status(404).json({ message: 'Homework not found.' });
  res.json(result);
});

/** Students join competitions and clubs themselves. */
['competitions', 'extraClasses'].forEach((collection) => {
  const route = collection === 'competitions' ? 'competitions' : 'extra-classes';

  app.post(`/api/${route}/:id/join`, requireAuth, requireRole('student'), async (req, res) => {
    const result = await saveDb((data) => {
      const item = data[collection].find((row) => row.id === req.params.id);
      if (!item) return null;
      item.participants = item.participants ?? [];
      if (item.participants.some((p) => p.studentId === req.profile.id)) return 'duplicate';
      if (item.capacity && item.participants.length >= item.capacity) return 'full';
      item.participants.push({ studentId: req.profile.id, studentName: req.profile.fullName, joinedAt: new Date().toISOString() });
      // Signing up is real engagement, so it feeds the same XP pot as everything
      // else. checkAchievements re-runs so the Speaking Star badge can unlock.
      awardXp(data, req.profile.id, 30, `joined ${item.name ?? item.title ?? collection}`);
      checkAchievements(data, req.profile.id);
      return item;
    });
    if (result === 'duplicate') return res.status(409).json({ code: 'alreadyJoined', message: 'You already joined this.' });
    if (result === 'full') return res.status(409).json({ code: 'noPlacesLeft', message: 'All places are taken.' });
    if (!result) return res.status(404).json({ message: 'Not found.' });
    res.json(result);
  });

  app.delete(`/api/${route}/:id/join`, requireAuth, requireRole('student'), async (req, res) => {
    const result = await saveDb((data) => {
      const item = data[collection].find((row) => row.id === req.params.id);
      if (!item) return null;
      item.participants = (item.participants ?? []).filter((p) => p.studentId !== req.profile.id);
      return item;
    });
    if (!result) return res.status(404).json({ message: 'Not found.' });
    res.json(result);
  });
});

/* ==========================================================================
   7. NOTIFICATIONS
   ========================================================================== */

app.get('/api/notifications', requireAuth, async (req, res) => {
  const data = await loadDb();
  const mine = req.user.role === 'admin'
    ? data.notifications.filter((n) => n.receiverId === req.user.id || n.receiverId === 'all')
    : data.notifications.filter((n) => n.receiverId === req.user.id || n.receiverId === 'all');
  const sorted = [...mine].sort((a, b) => b.date.localeCompare(a.date));
  res.json({ data: sorted, total: sorted.length, unread: sorted.filter((n) => !n.read).length });
});

/** Send to one student, a whole group, a role, or everyone. */
app.post('/api/notifications', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { title, message, type = 'info', target = { kind: 'all' } } = req.body;
  if (!title || !message) return res.status(422).json({ message: 'Add a title and a message.' });

  const sent = await saveDb((data) => {
    let receivers = [];
    if (target.kind === 'user') receivers = data.users.filter((u) => u.id === target.id || u.profileId === target.id);
    else if (target.kind === 'group') {
      const ids = data.groups.find((g) => g.id === target.id)?.studentIds ?? [];
      receivers = data.users.filter((u) => ids.includes(u.profileId));
    } else if (target.kind === 'role') receivers = data.users.filter((u) => u.role === target.id);
    else receivers = data.users.filter((u) => u.role !== 'admin');

    if (req.user.role === 'teacher') {
      const myGroups = data.groups.filter((g) => g.teacherId === req.profile.id).map((g) => g.id);
      const allowedIds = data.students.filter((s) => myGroups.includes(s.groupId)).map((s) => s.id);
      receivers = receivers.filter((u) => allowedIds.includes(u.profileId));
    }

    let counter = parseInt(nextId(data.notifications, 'n').replace(/\D/g, ''), 10);
    receivers.forEach((receiver) => {
      data.notifications.push({
        id: `n-${String(counter++).padStart(3, '0')}`,
        title, message, type,
        sender: req.user.fullName,
        receiverId: receiver.id,
        date: new Date().toISOString(),
        read: false,
      });
    });
    return receivers.length;
  });

  res.status(201).json({ sent });
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  await saveDb((data) => {
    const item = data.notifications.find((n) => n.id === req.params.id && n.receiverId === req.user.id);
    if (item) item.read = true;
  });
  res.json({ ok: true });
});

app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
  const updated = await saveDb((data) => {
    let count = 0;
    data.notifications.forEach((n) => {
      if (n.receiverId === req.user.id && !n.read) { n.read = true; count += 1; }
    });
    return count;
  });
  res.json({ updated });
});

app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  await saveDb((data) => {
    data.notifications = data.notifications.filter(
      (n) => !(n.id === req.params.id && (n.receiverId === req.user.id || req.user.role === 'admin'))
    );
  });
  res.json({ deleted: true });
});

/* ==========================================================================
   8. LANDING PAGE CMS
   --------------------------------------------------------------------------
   The public site renders whatever this returns, so nothing on it is
   hard-coded in React. The admin edits one section at a time.
   ========================================================================== */

const isVisible = (item) => item.visible !== false;

app.get('/api/landing', async (req, res) => {
  const data = await loadDb();
  const page = data.landingPage;

  res.json({
    ...page,
    nav: page.nav.filter(isVisible),
    stats: page.stats.filter(isVisible),
    benefits: page.benefits.filter(isVisible),
    steps: page.steps.filter(isVisible),
    faq: page.faq.filter(isVisible),
    // Course cards carry figures worked out from real records: how many
    // students are actually enrolled, how many sessions a week the schedule
    // implies, and the average rating of that course's lessons. A rating is
    // only sent once reviews exist — no placeholder star counts.
    courses: data.courses.filter((c) => isVisible(c) && c.showOnSite !== false).map((course) => {
      const groupIds = data.groups.filter((g) => g.courseId === course.id).map((g) => g.id);
      const reviews = (data.lessonReviews ?? []).filter((r) => groupIds.includes(r.groupId));
      return {
        ...course,
        studentsCount: data.students.filter((st) => st.courseId === course.id && st.status === 'active').length,
        lessonsPerWeek: String(course.schedule ?? '').split('/').filter((part) => part.trim()).length || null,
        rating: reviews.length ? Number(average(reviews.map((r) => r.rating)).toFixed(1)) : null,
        reviewCount: reviews.length,
        teachers: [...new Set(data.groups.filter((g) => g.courseId === course.id).map((g) => g.teacherName).filter(Boolean))],
      };
    }),
    teachers: data.teachers
      .filter((t) => isVisible(t) && t.showOnSite !== false && t.status === 'active')
      .map(({ email, phone, ...rest }) => {
        const reviews = (data.lessonReviews ?? []).filter((r) => r.teacherId === rest.id);
        return {
          ...rest,
          studentsCount: data.students.filter((st) => (rest.groups ?? []).includes(st.groupId)).length,
          rating: reviews.length ? Number(average(reviews.map((r) => r.rating)).toFixed(1)) : null,
          reviewCount: reviews.length,
        };
      }), // contact details stay internal
    results: data.ieltsResults.filter((r) => isVisible(r) && r.featured),
    testimonials: data.testimonials.filter(isVisible),
    events: data.events.filter(isVisible),
    branches: (data.branches ?? []).filter(isVisible).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    media: (data.mediaPosts ?? []).filter(isVisible).sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
    announcements: (data.announcements ?? [])
      .filter((a) => isVisible(a) && (a.audience?.kind ?? 'all') === 'all')
      .slice(-3),
    settings: data.websiteSettings ?? {},
  });
});

/** Site-wide settings (brand, social links, section headings). */
app.patch('/api/settings', requireAuth, requireRole('admin'), async (req, res) => {
  const settings = await saveDb((data) => {
    data.websiteSettings = { ...data.websiteSettings, ...req.body, social: { ...data.websiteSettings.social, ...(req.body.social ?? {}) } };
    return data.websiteSettings;
  });
  res.json(settings);
});

app.get('/api/landing/raw', requireAuth, requireRole('admin'), async (req, res) => {
  const data = await loadDb();
  res.json(data.landingPage);
});

/**
 * Save a section. `?draft=1` parks the change in landingDrafts instead of
 * publishing it, so an admin can stop half-way and pick it up later. The public
 * page only ever reads landingPage, never the drafts.
 */
app.patch('/api/landing/:section', requireAuth, requireRole('admin'), async (req, res) => {
  const section = req.params.section;
  const asDraft = req.query.draft === '1' || req.body.__draft === true;

  const updated = await saveDb((data) => {
    const page = data.landingPage;
    if (!(section in page)) return null;
    const body = { ...req.body };
    delete body.__draft;

    const next = Array.isArray(page[section])
      ? body.items ?? page[section]
      : { ...page[section], ...body };

    if (asDraft) {
      data.landingDrafts = data.landingDrafts ?? {};
      data.landingDrafts[section] = { data: next, savedAt: new Date().toISOString(), savedBy: req.user.fullName };
      return next;
    }

    page[section] = next;
    // Publishing clears any draft for that section — they are now the same.
    if (data.landingDrafts?.[section]) delete data.landingDrafts[section];
    return page[section];
  });

  if (!updated) return res.status(404).json({ code: 'notFound', message: 'No such section.' });
  res.json({ section, data: updated, draft: asDraft });
});

/** Drafts waiting to be published. */
app.get('/api/landing/drafts', requireAuth, requireRole('admin'), async (req, res) => {
  const data = await loadDb();
  res.json({ data: data.landingDrafts ?? {} });
});

/** Throw a draft away and go back to what is live. */
app.delete('/api/landing/drafts/:section', requireAuth, requireRole('admin'), async (req, res) => {
  await saveDb((data) => {
    if (data.landingDrafts) delete data.landingDrafts[req.params.section];
  });
  res.json({ discarded: true, section: req.params.section });
});

/** Contact form on the public page. Creates an enquiry, not an account. */
app.post('/api/landing/contact', async (req, res) => {
  const { fullName, phone, email = '', course = '', message = '' } = req.body;
  if (!fullName || !phone) return res.status(422).json({ message: 'Add your name and phone number.' });

  await saveDb((data) => {
    data.leads.push({
      id: nextId(data.leads, 'lead'),
      fullName, phone, email, course, message,
      status: 'new',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
  });
  res.status(201).json({ message: 'Thanks — we will call you back within one working day.' });
});

app.get('/api/leads', requireAuth, requireRole('admin'), async (req, res) => {
  const data = await loadDb();
  let rows = [...data.leads].reverse();
  if (req.query.status) rows = rows.filter((row) => (row.status ?? 'new') === req.query.status);
  if (req.query.search) {
    const needle = String(req.query.search).toLowerCase();
    rows = rows.filter((row) =>
      [row.fullName, row.phone, row.email, row.course, row.message].some((f) => String(f ?? '').toLowerCase().includes(needle))
    );
  }
  res.json({
    data: rows,
    total: rows.length,
    counts: ['new', 'contacted', 'in-progress', 'converted', 'rejected'].reduce(
      (acc, status) => ({ ...acc, [status]: data.leads.filter((l) => (l.status ?? 'new') === status).length }), {}
    ),
  });
});

/* ==========================================================================
   9. DASHBOARD STATISTICS
   ========================================================================== */

const average = (numbers) => (numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0);

app.get('/api/stats/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const data = await loadDb();
  const now = today();
  const overdue = data.payments.filter((p) => p.status !== 'paid' && p.dueDate < now);

  const monthly = {};
  data.payments.filter((p) => p.status === 'paid').forEach((p) => {
    monthly[p.period] = (monthly[p.period] ?? 0) + p.paidAmount;
  });

  const growth = {};
  data.students.forEach((s) => {
    const month = (s.joinDate ?? '').slice(0, 7);
    if (month) growth[month] = (growth[month] ?? 0) + 1;
  });
  let running = 0;
  const studentGrowth = Object.keys(growth).sort().map((month) => {
    running += growth[month];
    return { month, total: running };
  });

  const bands = {};
  data.ieltsResults.forEach((r) => {
    const key = r.overall.toFixed(1);
    bands[key] = (bands[key] ?? 0) + 1;
  });

  res.json({
    cards: {
      totalStudents: data.students.length,
      activeStudents: data.students.filter((s) => s.status === 'active').length,
      totalTeachers: data.teachers.filter((t) => t.status === 'active').length,
      activeGroups: data.groups.filter((g) => g.status === 'active').length,
      pendingRequests: data.studentRequests.filter((r) => r.status === 'pending').length,
      monthlyRevenue: data.payments.filter((p) => p.status === 'paid' && p.period === now.slice(0, 7)).reduce((sum, p) => sum + p.paidAmount, 0),
      overdueStudents: new Set(overdue.map((p) => p.studentId)).size,
      attendanceRate: Math.round(average(data.students.map((s) => s.attendanceRate))),
      ieltsAverage: Number(average(data.ieltsResults.map((r) => r.overall)).toFixed(1)),
      upcomingEvents: data.events.filter((e) => e.date >= now).length,
      newLeads: (data.leads ?? []).filter((l) => (l.status ?? 'new') === 'new').length,
      totalLeads: (data.leads ?? []).length,
      homeworkCompletion: (() => {
        const slots = data.homeworks.reduce((sum, hw) => {
          const size = data.groups.find((g) => g.id === hw.groupId)?.studentIds?.length ?? 0;
          return sum + size;
        }, 0);
        const done = data.homeworks.reduce((sum, hw) => sum + (hw.submissions ?? []).length, 0);
        return slots ? Math.round((done / slots) * 100) : 0;
      })(),
      averageLessonRating: Number(average((data.lessonReviews ?? []).map((r) => r.rating)).toFixed(2)),
      totalReviews: (data.lessonReviews ?? []).length,
      liveNow: data.lessons.filter((l) => l.live?.status === 'live').length,
      quizAttempts: (data.quizAttempts ?? []).length,
    },
    charts: {
      studentGrowth,
      revenueByMonth: Object.keys(monthly).sort().map((period) => ({ period, amount: monthly[period] })),
      ieltsBands: Object.keys(bands).sort().map((band) => ({ band, count: bands[band] })),
      // Course popularity — how many students actually sit in each course's groups.
      coursePopularity: data.courses.map((course) => ({
        name: course.name,
        students: data.students.filter((s) => s.courseId === course.id).length,
      })).sort((a, b) => b.students - a.students),
      // Lead pipeline, for the conversion funnel.
      leadFunnel: ['new', 'contacted', 'in-progress', 'converted', 'rejected'].map((status) => ({
        status,
        count: (data.leads ?? []).filter((l) => (l.status ?? 'new') === status).length,
      })),
      // Attendance by group, so a struggling group is visible at a glance.
      attendanceByGroup: data.groups.map((group) => ({
        name: group.name,
        rate: Math.round(average(data.students.filter((s) => s.groupId === group.id).map((s) => s.attendanceRate))),
      })),
    },
    recentRequests: [...data.studentRequests].filter((r) => r.status === 'pending').slice(0, 5).map(hidePassword),
    recentStudents: [...data.students].sort((a, b) => (b.joinDate ?? '').localeCompare(a.joinDate ?? '')).slice(0, 6),
    upcomingLessons: data.lessons.filter((l) => l.date >= now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6),
  });
});

app.get('/api/stats/teacher', requireAuth, requireRole('teacher'), async (req, res) => {
  const data = await loadDb();
  const now = today();
  const myGroups = data.groups.filter((g) => g.teacherId === req.profile.id);
  const groupIds = myGroups.map((g) => g.id);
  const myStudents = data.students.filter((s) => groupIds.includes(s.groupId));
  const myHomework = data.homeworks.filter((h) => groupIds.includes(h.groupId));

  res.json({
    cards: {
      groups: myGroups.length,
      students: myStudents.length,
      lessonsToday: data.lessons.filter((l) => groupIds.includes(l.groupId) && l.date === now).length,
      openHomework: myHomework.filter((h) => h.deadline >= now).length,
      toGrade: myHomework.reduce((sum, h) => sum + (h.submissions ?? []).filter((s) => s.status !== 'graded').length, 0),
      attendanceRate: Math.round(average(myStudents.map((s) => s.attendanceRate))),
      averageRating: Number(average((data.lessonReviews ?? []).filter((r) => r.teacherId === req.profile.id).map((r) => r.rating)).toFixed(2)),
      totalReviews: (data.lessonReviews ?? []).filter((r) => r.teacherId === req.profile.id).length,
    },
    liveLesson: data.lessons.find((l) => groupIds.includes(l.groupId) && l.live?.status === 'live') ?? null,
    todayLessons: data.lessons
      .filter((l) => groupIds.includes(l.groupId) && l.date === now)
      .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    recentReviews: (data.lessonReviews ?? [])
      .filter((r) => r.teacherId === req.profile.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    groups: myGroups,
    students: myStudents.slice(0, 8),
    upcomingLessons: data.lessons
      .filter((l) => groupIds.includes(l.groupId) && l.date >= now)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 6),
  });
});

app.get('/api/stats/student', requireAuth, requireRole('student'), async (req, res) => {
  const data = await loadDb();
  const now = today();
  const me = req.profile;
  const myAttendance = data.attendance.filter((a) => a.studentId === me.id);
  const myHomework = data.homeworks.filter((h) => h.groupId === me.groupId);
  const myPayments = data.payments.filter((p) => p.studentId === me.id);
  const total = myAttendance.length || 1;
  const rate = (status) => Math.round((myAttendance.filter((a) => a.status === status).length / total) * 100);

  res.json({
    profile: me,
    group: data.groups.find((g) => g.id === me.groupId) ?? null,
    teacher: data.teachers.find((t) => t.id === me.teacherId) ?? null,
    course: data.courses.find((c) => c.id === me.courseId) ?? null,
    cards: {
      attendanceRate: me.attendanceRate,
      homeworkDone: myHomework.filter((h) => (h.submissions ?? []).some((s) => s.studentId === me.id)).length,
      homeworkTotal: myHomework.length,
      paymentStatus: me.paymentStatus,
      nextPayment: myPayments.filter((p) => p.status !== 'paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null,
      ieltsScore: me.ieltsScore,
    },
    attendance: { present: rate('present'), late: rate('late'), absent: rate('absent'), records: myAttendance.slice(-30).reverse() },
    upcomingLessons: data.lessons.filter((l) => l.groupId === me.groupId && l.date >= now).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    openHomework: myHomework.filter((h) => h.deadline >= now && !(h.submissions ?? []).some((s) => s.studentId === me.id)).slice(0, 5),
    results: data.ieltsResults.filter((r) => r.studentId === me.id),
    // Lessons that finished and are still waiting for this student's rating.
    pendingReviews: data.lessons
      .filter((l) => l.groupId === me.groupId && l.status === 'completed' && l.date <= now)
      .filter((l) => !(data.lessonReviews ?? []).some((r) => r.lessonId === l.id && r.studentId === me.id))
      .slice(-3),
  });
});

/* ==========================================================================
   10. UPGRADE — NEW COLLECTIONS (added without touching existing data)
   --------------------------------------------------------------------------
   ensureCollections() runs once at boot. It only ADDS keys that are missing,
   so an existing db.json keeps every student, payment and notification it
   already had. Nothing here deletes or rewrites old rows.
   ========================================================================== */

/** Catalogue of achievements. Conditions are checked deterministically below. */
const ACHIEVEMENTS = [
  { id: 'ach-first-lesson', code: 'firstLesson', icon: 'BookOpen', xp: 50 },
  { id: 'ach-streak-7', code: 'streak7', icon: 'Flame', xp: 150 },
  { id: 'ach-homework-hero', code: 'homeworkHero', icon: 'ClipboardCheck', xp: 200 },
  { id: 'ach-vocab-master', code: 'vocabMaster', icon: 'Languages', xp: 150 },
  { id: 'ach-quiz-champion', code: 'quizChampion', icon: 'Trophy', xp: 200 },
  { id: 'ach-speaking-star', code: 'speakingStar', icon: 'Mic', xp: 100 },
  { id: 'ach-ielts-progress', code: 'ieltsProgress', icon: 'TrendingUp', xp: 250 },
  { id: 'ach-perfect-month', code: 'perfectAttendance', icon: 'CalendarCheck', xp: 200 },
];

/** Word bank used by the vocabulary games. Kept in the database so an admin can grow it. */
const SEED_VOCABULARY = [
  ['achieve', 'erishmoq', 'достигать', 'B1', 'general'],
  ['improve', 'yaxshilamoq', 'улучшать', 'A2', 'general'],
  ['research', 'tadqiqot', 'исследование', 'B2', 'academic'],
  ['opinion', 'fikr', 'мнение', 'A2', 'general'],
  ['increase', 'oshmoq', 'увеличиваться', 'B1', 'academic'],
  ['decrease', 'kamaymoq', 'уменьшаться', 'B1', 'academic'],
  ['environment', 'atrof-muhit', 'окружающая среда', 'B1', 'ielts'],
  ['government', 'hukumat', 'правительство', 'B1', 'ielts'],
  ['education', 'ta\u2019lim', 'образование', 'A2', 'ielts'],
  ['experience', 'tajriba', 'опыт', 'B1', 'general'],
  ['available', 'mavjud', 'доступный', 'B1', 'general'],
  ['difficult', 'qiyin', 'трудный', 'A1', 'general'],
  ['important', 'muhim', 'важный', 'A1', 'general'],
  ['language', 'til', 'язык', 'A1', 'general'],
  ['knowledge', 'bilim', 'знание', 'B1', 'academic'],
  ['confident', 'ishonchli', 'уверенный', 'B1', 'speaking'],
  ['neighbour', 'qo\u2018shni', 'сосед', 'A2', 'general'],
  ['weather', 'ob-havo', 'погода', 'A1', 'general'],
  ['journey', 'sayohat', 'путешествие', 'A2', 'general'],
  ['decision', 'qaror', 'решение', 'B1', 'general'],
  ['advantage', 'afzallik', 'преимущество', 'B2', 'ielts'],
  ['pollution', 'ifloslanish', 'загрязнение', 'B2', 'ielts'],
  ['society', 'jamiyat', 'общество', 'B2', 'ielts'],
  ['develop', 'rivojlantirmoq', 'развивать', 'B1', 'academic'],
  ['explain', 'tushuntirmoq', 'объяснять', 'A2', 'general'],
  ['remember', 'eslamoq', 'помнить', 'A1', 'general'],
  ['possible', 'mumkin', 'возможный', 'A2', 'general'],
  ['dangerous', 'xavfli', 'опасный', 'A2', 'general'],
  ['healthy', 'sog\u2018lom', 'здоровый', 'A1', 'general'],
  ['expensive', 'qimmat', 'дорогой', 'A1', 'general'],
];

/** Sentences used by Word Builder and the drag & drop grammar game. */
const SEED_SENTENCES = [
  { id: 'sn-001', level: 'A1', text: 'I go to school every day', hint: 'Present simple' },
  { id: 'sn-002', level: 'A2', text: 'She has lived here since 2019', hint: 'Present perfect' },
  { id: 'sn-003', level: 'B1', text: 'If I had more time I would travel', hint: 'Second conditional' },
  { id: 'sn-004', level: 'B1', text: 'The essay was written by my student', hint: 'Passive voice' },
  { id: 'sn-005', level: 'B2', text: 'Despite the rain we finished the lesson', hint: 'Linking words' },
  { id: 'sn-006', level: 'A2', text: 'They are going to open a new branch', hint: 'Future plans' },
  { id: 'sn-007', level: 'B2', text: 'Not only did he pass but he scored eight', hint: 'Inversion' },
  { id: 'sn-008', level: 'B1', text: 'I wish I had studied harder last year', hint: 'Wish + past perfect' },
];

function ensureCollections(data) {
  let changed = false;
  const add = (key, value) => {
    if (data[key] === undefined) { data[key] = value; changed = true; }
  };

  add('branches', []);
  add('mediaPosts', []);
  add('quizzes', []);
  add('quizAttempts', []);
  add('achievements', []);
  add('studentAchievements', []);
  add('gameResults', []);
  add('lessonReviews', []);
  add('announcements', []);
  add('studentProgress', []);
  add('vocabulary', []);
  add('sentences', []);
  add('courseRequests', []);
  add('landingDrafts', {});
  add('websiteSettings', {});

  // Achievement catalogue — replaced only if a code is missing, never wiped.
  ACHIEVEMENTS.forEach((item) => {
    if (!data.achievements.some((row) => row.code === item.code)) {
      data.achievements.push({ ...item, visible: true });
      changed = true;
    }
  });

  if (!data.vocabulary.length) {
    data.vocabulary = SEED_VOCABULARY.map(([en, uz, ru, level, category], index) => ({
      id: `voc-${String(index + 1).padStart(3, '0')}`, en, uz, ru, level, category, visible: true,
    }));
    changed = true;
  }

  if (!data.sentences.length) { data.sentences = SEED_SENTENCES.map((s) => ({ ...s, visible: true })); changed = true; }

  // Three Olmaliq branches. Addresses and map links are placeholders the admin
  // replaces in Admin → Branches — no invented coordinates are hard-coded.
  if (!data.branches.length) {
    data.branches = [1, 2, 3].map((n) => ({
      id: `br-${String(n).padStart(3, '0')}`,
      name: `TJ Language School — Filial ${n}`,
      address: '',
      landmark: '',
      phone: data.landingPage?.contact?.phone ?? '',
      workingHours: data.landingPage?.contact?.workingHours ?? '',
      image: '',
      video: '',
      googleMaps: '',
      yandexMaps: '',
      order: n,
      visible: true,
      needsSetup: true,
    }));
    changed = true;
  }

  // Existing leads predate the pipeline fields — top them up in place.
  data.leads.forEach((lead) => {
    if (lead.status === undefined) { lead.status = 'new'; changed = true; }
    if (lead.notes === undefined) { lead.notes = ''; changed = true; }
  });

  // Lessons gain a live-class block. Existing lesson rows keep every other field.
  data.lessons.forEach((lesson) => {
    if (lesson.live === undefined) {
      lesson.live = { status: 'idle', startedAt: null, endedAt: null, joinUrl: '', attendees: [] };
      changed = true;
    }
  });

  // One progress row per student, created lazily but seeded here for existing students.
  data.students.forEach((student) => {
    if (!data.studentProgress.some((row) => row.studentId === student.id)) {
      data.studentProgress.push(blankProgress(student.id));
      changed = true;
    }
  });

  if (!Object.keys(data.websiteSettings).length) {
    data.websiteSettings = {
      brandName: 'TJ Language School',
      city: 'Olmaliq',
      country: 'Uzbekistan',
      social: { instagram: '', telegram: '', youtube: '', facebook: '' },
      mediaTitle: 'Maktab hayoti',
      mediaSubtitle: '',
      branchesTitle: 'Filiallar',
      branchesSubtitle: '',
    };
    changed = true;
  }

  return changed;
}

function blankProgress(studentId) {
  return {
    studentId,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    weeklyStreak: 0,
    longestWeeklyStreak: 0,
    lastActiveDate: null,
    lastActiveWeek: null,
    dailyGoal: { vocabulary: 20, grammar: 10, minutes: 15 },
    daily: { date: null, vocabulary: 0, grammar: 0, minutes: 0, homework: 0 },
    history: [],
  };
}

const levelFromXp = (xp) => Math.floor(xp / 250) + 1;
const xpForNextLevel = (xp) => levelFromXp(xp) * 250;

/** Find or create the progress row for a student. Always called inside saveDb. */
function progressOf(data, studentId) {
  let row = data.studentProgress.find((p) => p.studentId === studentId);
  if (!row) { row = blankProgress(studentId); data.studentProgress.push(row); }
  return row;
}

/** Add XP, roll the daily streak forward, and record the day. */
function awardXp(data, studentId, amount, reason) {
  const row = progressOf(data, studentId);
  const day = today();
  row.xp += Math.max(0, Math.round(amount));

  // Weekly streak: count consecutive ISO weeks with at least one active day.
  const weekOf = (iso) => {
    const d = new Date(`${iso}T00:00:00Z`);
    const thursday = new Date(d);
    thursday.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
    const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((thursday - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  };
  const thisWeek = weekOf(day);
  if (row.lastActiveWeek !== thisWeek) {
    const lastWeek = row.lastActiveDate ? weekOf(row.lastActiveDate) : null;
    const consecutive = lastWeek && lastWeek !== thisWeek
      && weekOf(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)) === lastWeek;
    row.weeklyStreak = consecutive ? (row.weeklyStreak ?? 0) + 1 : 1;
    row.longestWeeklyStreak = Math.max(row.longestWeeklyStreak ?? 0, row.weeklyStreak);
    row.lastActiveWeek = thisWeek;
  }

  if (row.lastActiveDate !== day) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    row.streak = row.lastActiveDate === yesterday ? row.streak + 1 : 1;
    row.longestStreak = Math.max(row.longestStreak, row.streak);
    row.lastActiveDate = day;
    row.daily = { date: day, vocabulary: 0, grammar: 0, minutes: 0, homework: 0 };
  }
  if (row.daily.date !== day) row.daily = { date: day, vocabulary: 0, grammar: 0, minutes: 0, homework: 0 };

  // One history entry per day, so the dashboard chart has 60 real data points.
  row.history = row.history ?? [];
  const entry = row.history.find((h) => h.date === day);
  if (entry) {
    entry.xp += Math.max(0, Math.round(amount));
    entry.reason = reason;
  } else {
    row.history.push({ date: day, xp: Math.max(0, Math.round(amount)), reason });
  }
  row.history = row.history.slice(-60);
  return row;
}

/**
 * Re-check every achievement for one student against real records.
 * Nothing is stored twice, and nothing is awarded that the data does not support.
 */
function checkAchievements(data, studentId) {
  const owned = new Set(data.studentAchievements.filter((a) => a.studentId === studentId).map((a) => a.achievementId));
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return [];

  const attendance = data.attendance.filter((a) => a.studentId === studentId);
  const submissions = data.homeworks.reduce(
    (sum, hw) => sum + (hw.submissions ?? []).filter((s) => s.studentId === studentId).length, 0
  );
  const games = data.gameResults.filter((g) => g.studentId === studentId);
  const attempts = data.quizAttempts.filter((q) => q.studentId === studentId);
  const progress = progressOf(data, studentId);
  const joinedSpeaking = data.extraClasses.some(
    (ec) => /speaking/i.test(ec.name ?? ec.title ?? '') && (ec.participants ?? []).some((p) => p.studentId === studentId)
  );

  const tests = {
    firstLesson: attendance.length >= 1,
    streak7: progress.streak >= 7 || progress.longestStreak >= 7,
    homeworkHero: submissions >= 10,
    vocabMaster: games.filter((g) => g.game === 'vocabulary-match' && g.accuracy >= 80).length >= 5,
    quizChampion: attempts.some((a) => a.percentage >= 90),
    speakingStar: joinedSpeaking,
    ieltsProgress: data.ieltsResults.some((r) => r.studentId === studentId),
    perfectAttendance: attendance.length >= 8 && attendance.every((a) => a.status !== 'absent'),
  };

  const earned = [];
  data.achievements.forEach((achievement) => {
    if (owned.has(achievement.id) || !tests[achievement.code]) return;
    data.studentAchievements.push({
      id: `sa-${Date.now()}-${achievement.code}`,
      studentId,
      achievementId: achievement.id,
      code: achievement.code,
      earnedAt: new Date().toISOString(),
    });
    progressOf(data, studentId).xp += achievement.xp ?? 0;
    earned.push(achievement);

    const account = data.users.find((u) => u.profileId === studentId);
    if (account) {
      data.notifications.push({
        id: nextId(data.notifications, 'n'),
        title: 'Achievement unlocked',
        message: `You earned a new badge (+${achievement.xp} XP).`,
        type: 'success',
        sender: 'TJ Language School',
        receiverId: account.id,
        date: new Date().toISOString(),
        read: false,
        meta: { kind: 'achievement', code: achievement.code },
      });
    }
  });
  return earned;
}

/* --------------------------------------------------------------------------
   BRANCHES / MEDIA / ANNOUNCEMENTS / VOCABULARY — admin-managed collections
   -------------------------------------------------------------------------- */

app.use('/api/branches', crud('branches', { prefix: 'br', searchable: ['name', 'address', 'landmark'] }));
app.use('/api/media', crud('mediaPosts', { prefix: 'mp', searchable: ['title', 'description', 'category'] }));
app.use('/api/vocabulary', crud('vocabulary', { prefix: 'voc', searchable: ['en', 'uz', 'ru', 'category'] }));

app.use('/api/announcements', crud('announcements', {
  prefix: 'ann',
  write: ['admin'],
  searchable: ['title', 'message'],
  // A student only sees announcements aimed at everyone, at students, or at their group.
  scope: (req, row) => {
    const audience = row.audience ?? { kind: 'all' };
    if (audience.kind === 'all') return true;
    if (audience.kind === 'role') return audience.id === req.user.role;
    if (audience.kind === 'group') return audience.id === req.profile?.groupId || (req.profile?.groups ?? []).includes(audience.id);
    return false;
  },
  beforeCreate: (body, req) => ({
    ...body,
    audience: body.audience ?? { kind: body.audienceKind ?? 'all', id: body.audienceId ?? null },
    authorName: req.user.fullName,
    publishedAt: new Date().toISOString(),
    visible: body.visible !== false,
  }),
  // Publishing also drops a notification in every matching inbox.
  afterWrite: (row, data, deleted) => {
    if (deleted || row.notified) return;
    const audience = row.audience ?? { kind: 'all' };
    let receivers = data.users.filter((u) => u.role !== 'admin');
    if (audience.kind === 'role') receivers = data.users.filter((u) => u.role === audience.id);
    if (audience.kind === 'group') {
      const ids = data.groups.find((g) => g.id === audience.id)?.studentIds ?? [];
      receivers = data.users.filter((u) => ids.includes(u.profileId));
    }
    let counter = parseInt(nextId(data.notifications, 'n').replace(/\D/g, ''), 10);
    receivers.forEach((receiver) => {
      data.notifications.push({
        id: `n-${String(counter++).padStart(3, '0')}`,
        title: row.title,
        message: row.message,
        type: 'announcement',
        sender: row.authorName ?? 'TJ Language School',
        receiverId: receiver.id,
        date: new Date().toISOString(),
        read: false,
      });
    });
    row.notified = true;
  },
}));

/* --------------------------------------------------------------------------
   LEADS — the contact form pipeline
   -------------------------------------------------------------------------- */

const LEAD_STATUSES = ['new', 'contacted', 'in-progress', 'converted', 'rejected'];

app.patch('/api/leads/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const patch = {};
  if (req.body.status !== undefined) {
    if (!LEAD_STATUSES.includes(req.body.status)) return res.status(422).json({ code: 'unknownStatus', message: 'Unknown lead status.' });
    patch.status = req.body.status;
  }
  if (req.body.notes !== undefined) patch.notes = String(req.body.notes);

  const lead = await saveDb((data) => {
    const row = data.leads.find((l) => l.id === req.params.id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString(), handledBy: req.user.fullName });
    return row;
  });
  if (!lead) return res.status(404).json({ code: 'leadNotFound', message: 'Lead not found.' });
  res.json(lead);
});

app.delete('/api/leads/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await saveDb((data) => { data.leads = data.leads.filter((l) => l.id !== req.params.id); });
  res.json({ deleted: true, id: req.params.id });
});

/* --------------------------------------------------------------------------
   LIVE CLASSES
   --------------------------------------------------------------------------
   A lesson carries its own live block in the database. The teacher flips it,
   students poll /api/lessons/live. The state is real, not UI-only, so a
   refresh or a second device shows the same thing.
   -------------------------------------------------------------------------- */

app.post('/api/lessons/:id/start', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const result = await saveDb((data) => {
    const lesson = data.lessons.find((l) => l.id === req.params.id);
    if (!lesson) return { error: 404, code: 'lessonNotFound', message: 'Lesson not found.' };
    if (req.user.role === 'teacher' && !(req.profile?.groups ?? []).includes(lesson.groupId)) {
      return { error: 403, code: 'notYourGroup', message: 'You can only start lessons for your own groups.' };
    }

    lesson.live = {
      status: 'live',
      startedAt: new Date().toISOString(),
      endedAt: null,
      joinUrl: String(req.body.joinUrl ?? lesson.live?.joinUrl ?? ''),
      attendees: [],
    };
    lesson.status = 'in-progress';

    const ids = data.groups.find((g) => g.id === lesson.groupId)?.studentIds ?? [];
    let counter = parseInt(nextId(data.notifications, 'n').replace(/\D/g, ''), 10);
    data.users.filter((u) => ids.includes(u.profileId)).forEach((receiver) => {
      data.notifications.push({
        id: `n-${String(counter++).padStart(3, '0')}`,
        title: 'Your class has started',
        message: `${lesson.topic} — join now.`,
        type: 'live',
        sender: req.user.fullName,
        receiverId: receiver.id,
        date: new Date().toISOString(),
        read: false,
        meta: { kind: 'live', lessonId: lesson.id },
      });
    });
    return { lesson, notified: ids.length };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.json(result);
});

app.post('/api/lessons/:id/end', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const result = await saveDb((data) => {
    const lesson = data.lessons.find((l) => l.id === req.params.id);
    if (!lesson) return { error: 404, code: 'lessonNotFound', message: 'Lesson not found.' };
    if (req.user.role === 'teacher' && !(req.profile?.groups ?? []).includes(lesson.groupId)) {
      return { error: 403, code: 'notYourLesson', message: 'That is not your lesson.' };
    }
    lesson.live = { ...(lesson.live ?? {}), status: 'ended', endedAt: new Date().toISOString() };
    lesson.status = 'completed';

    // Ask the group to rate the lesson they just finished.
    const ids = data.groups.find((g) => g.id === lesson.groupId)?.studentIds ?? [];
    let counter = parseInt(nextId(data.notifications, 'n').replace(/\D/g, ''), 10);
    data.users.filter((u) => ids.includes(u.profileId)).forEach((receiver) => {
      data.notifications.push({
        id: `n-${String(counter++).padStart(3, '0')}`,
        title: 'Rate your lesson',
        message: `How was "${lesson.topic}"?`,
        type: 'info',
        sender: 'TJ Language School',
        receiverId: receiver.id,
        date: new Date().toISOString(),
        read: false,
        meta: { kind: 'review', lessonId: lesson.id },
      });
    });
    return { lesson };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.json(result);
});

/** What is live for me right now, plus reminders for what is coming. */
app.get('/api/lessons/live', requireAuth, async (req, res) => {
  const data = await loadDb();
  const groupIds = req.user.role === 'teacher' ? (req.profile?.groups ?? [])
    : req.user.role === 'student' ? [req.profile?.groupId]
    : data.groups.map((g) => g.id);

  const mine = data.lessons.filter((l) => groupIds.includes(l.groupId));
  const live = mine.find((l) => l.live?.status === 'live') ?? null;

  // Reminder windows are worked out from the lesson timestamp, on the server.
  const now = Date.now();
  const reminders = mine
    .map((lesson) => {
      const start = new Date(`${lesson.date}T${lesson.time || '00:00'}:00`).getTime();
      const minutes = Math.round((start - now) / 60000);
      if (Number.isNaN(minutes) || minutes < 0) return null;
      const window = minutes <= 15 ? '15m' : minutes <= 60 ? '1h' : minutes <= 1440 ? '24h' : null;
      return window ? { lessonId: lesson.id, topic: lesson.topic, groupName: lesson.groupName, room: lesson.room, date: lesson.date, time: lesson.time, minutesUntil: minutes, window } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);

  res.json({ live, reminders, serverTime: new Date().toISOString() });
});

app.post('/api/lessons/:id/join', requireAuth, requireRole('student'), async (req, res) => {
  const result = await saveDb((data) => {
    const lesson = data.lessons.find((l) => l.id === req.params.id);
    if (!lesson) return { error: 404, code: 'lessonNotFound', message: 'Lesson not found.' };
    if (lesson.groupId !== req.profile.groupId) return { error: 403, code: 'otherGroupLesson', message: 'That lesson is for another group.' };
    if (lesson.live?.status !== 'live') return { error: 409, code: 'notLive', message: 'That class is not live.' };

    lesson.live.attendees = lesson.live.attendees ?? [];
    if (!lesson.live.attendees.some((a) => a.studentId === req.profile.id)) {
      lesson.live.attendees.push({ studentId: req.profile.id, studentName: req.profile.fullName, joinedAt: new Date().toISOString() });
      awardXp(data, req.profile.id, 20, 'joined a live class');
      checkAchievements(data, req.profile.id);
    }
    return { lesson };
  });
  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.json(result);
});

/* --------------------------------------------------------------------------
   LESSON REVIEWS — one per student per lesson
   -------------------------------------------------------------------------- */

app.post('/api/lessons/:id/review', requireAuth, requireRole('student'), async (req, res) => {
  const rating = Number(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(422).json({ code: 'ratingRange', message: 'Give the lesson between 1 and 5 stars.' });

  const result = await saveDb((data) => {
    const lesson = data.lessons.find((l) => l.id === req.params.id);
    if (!lesson) return { error: 404, code: 'lessonNotFound', message: 'Lesson not found.' };
    if (lesson.groupId !== req.profile.groupId) return { error: 403, code: 'otherGroupLesson', message: 'That lesson is for another group.' };
    if (data.lessonReviews.some((r) => r.lessonId === lesson.id && r.studentId === req.profile.id)) {
      return { error: 409, code: 'alreadyReviewed', message: 'You have already rated this lesson.' };
    }

    const review = {
      id: nextId(data.lessonReviews, 'rev'),
      lessonId: lesson.id,
      lessonTopic: lesson.topic,
      groupId: lesson.groupId,
      studentId: req.profile.id,
      studentName: req.profile.fullName,
      teacherId: lesson.teacherId,
      rating,
      teacherRating: Number(req.body.teacherRating) || rating,
      clarity: Number(req.body.clarity) || rating,
      homeworkUsefulness: Number(req.body.homeworkUsefulness) || rating,
      comment: String(req.body.comment ?? '').slice(0, 1000),
      createdAt: new Date().toISOString(),
    };
    data.lessonReviews.push(review);
    awardXp(data, req.profile.id, 15, 'reviewed a lesson');
    return { review };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.status(201).json(result.review);
});

/** Reviews: a student sees their own, a teacher sees their lessons', an admin sees all. */
app.get('/api/lesson-reviews', requireAuth, async (req, res) => {
  const data = await loadDb();
  let rows = data.lessonReviews;
  if (req.user.role === 'student') rows = rows.filter((r) => r.studentId === req.profile?.id);
  if (req.user.role === 'teacher') rows = rows.filter((r) => r.teacherId === req.profile?.id);
  if (req.query.lessonId) rows = rows.filter((r) => r.lessonId === req.query.lessonId);

  const scores = rows.map((r) => r.rating);
  res.json({
    data: [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    total: rows.length,
    average: Number(average(scores).toFixed(2)),
    breakdown: [1, 2, 3, 4, 5].map((star) => ({ star, count: scores.filter((s) => s === star).length })),
  });
});

/* --------------------------------------------------------------------------
   QUIZZES AND TESTS
   -------------------------------------------------------------------------- */

app.use('/api/quizzes', crud('quizzes', {
  prefix: 'qz',
  write: ['admin', 'teacher'],
  searchable: ['title', 'category'],
  beforeCreate: (body, req) => ({
    ...body,
    questions: body.questions ?? [],
    createdBy: req.user.fullName,
    visible: body.visible !== false,
  }),
}));

/** The playable version of a quiz — correct answers are stripped out. */
app.get('/api/quizzes/:id/play', requireAuth, async (req, res) => {
  const data = await loadDb();
  const quiz = data.quizzes.find((q) => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ code: 'quizNotFound', message: 'Test not found.' });
  if (quiz.visible === false && req.user.role === 'student') return res.status(403).json({ code: 'quizUnpublished', message: 'This test is not published.' });

  res.json({
    id: quiz.id,
    title: quiz.title,
    category: quiz.category,
    level: quiz.level,
    description: quiz.description,
    timeLimit: quiz.timeLimit ?? 0,
    questions: (quiz.questions ?? []).map(({ correctIndex, explanation, ...rest }) => rest),
  });
});

/** Marking happens on the server, so a student cannot post their own score. */
app.post('/api/quizzes/:id/attempt', requireAuth, requireRole('student'), async (req, res) => {
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

  const result = await saveDb((data) => {
    const quiz = data.quizzes.find((q) => q.id === req.params.id);
    if (!quiz) return { error: 404, code: 'quizNotFound', message: 'Test not found.' };
    const questions = quiz.questions ?? [];
    if (!questions.length) return { error: 409, code: 'quizEmpty', message: 'This test has no questions yet.' };

    const marked = questions.map((question, index) => {
      const given = answers[index];
      const correct = given === question.correctIndex;
      return {
        questionId: question.id ?? `q${index}`,
        prompt: question.prompt,
        options: question.options,
        given: given ?? null,
        correctIndex: question.correctIndex,
        correct,
        explanation: question.explanation ?? '',
      };
    });

    const score = marked.filter((m) => m.correct).length;
    const percentage = Math.round((score / questions.length) * 100);
    const xpEarned = score * 10 + (percentage >= 90 ? 50 : 0);

    const attempt = {
      id: nextId(data.quizAttempts, 'qa'),
      quizId: quiz.id,
      quizTitle: quiz.title,
      category: quiz.category,
      studentId: req.profile.id,
      studentName: req.profile.fullName,
      score,
      total: questions.length,
      percentage,
      timeSpent: Number(req.body.timeSpent) || 0,
      answers: marked,
      xpEarned,
      createdAt: new Date().toISOString(),
    };
    data.quizAttempts.push(attempt);

    awardXp(data, req.profile.id, xpEarned, `completed ${quiz.title}`);
    const progress = progressOf(data, req.profile.id);
    progress.daily.grammar = (progress.daily.grammar ?? 0) + questions.length;
    const earned = checkAchievements(data, req.profile.id);

    return { attempt, earned, xp: progress.xp };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.status(201).json(result);
});

app.get('/api/quiz-attempts', requireAuth, async (req, res) => {
  const data = await loadDb();
  let rows = data.quizAttempts;
  if (req.user.role === 'student') rows = rows.filter((a) => a.studentId === req.profile?.id);
  if (req.user.role === 'teacher') {
    const ids = data.students.filter((s) => (req.profile?.groups ?? []).includes(s.groupId)).map((s) => s.id);
    rows = rows.filter((a) => ids.includes(a.studentId));
  }
  if (req.query.quizId) rows = rows.filter((a) => a.quizId === req.query.quizId);
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ data: sorted, total: sorted.length, average: Number(average(sorted.map((a) => a.percentage)).toFixed(1)) });
});

/* --------------------------------------------------------------------------
   LANGUAGE GAMES
   -------------------------------------------------------------------------- */

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** Word pairs and sentences for the five games. */
app.get('/api/games/content', requireAuth, requireRole('student'), async (req, res) => {
  const data = await loadDb();
  const count = Math.min(Number(req.query.count) || 8, 20);
  let words = data.vocabulary.filter((w) => w.visible !== false);
  if (req.query.level) words = words.filter((w) => w.level === req.query.level);
  if (req.query.category) words = words.filter((w) => w.category === req.query.category);
  if (!words.length) words = data.vocabulary;

  res.json({
    words: shuffle(words).slice(0, count),
    sentences: shuffle(data.sentences.filter((s) => s.visible !== false)).slice(0, count),
    levels: [...new Set(data.vocabulary.map((w) => w.level))].sort(),
    categories: [...new Set(data.vocabulary.map((w) => w.category))].sort(),
  });
});

const GAMES = ['vocabulary-match', 'grammar-drag', 'word-builder', 'quick-quiz'];

/** Save a game round. XP is derived from the result, not sent by the client. */
app.post('/api/games/result', requireAuth, requireRole('student'), async (req, res) => {
  const game = String(req.body.game ?? '');
  if (!GAMES.includes(game)) return res.status(422).json({ code: 'unknownGame', message: 'Unknown game.' });

  const correct = Math.max(0, Number(req.body.correct) || 0);
  const wrong = Math.max(0, Number(req.body.wrong) || 0);
  const totalAnswers = correct + wrong;
  const accuracy = totalAnswers ? Math.round((correct / totalAnswers) * 100) : 0;
  const durationMs = Math.max(0, Number(req.body.durationMs) || 0);
  const xpEarned = correct * 5 + (accuracy === 100 && totalAnswers >= 5 ? 25 : 0);

  const result = await saveDb((data) => {
    const row = {
      id: nextId(data.gameResults, 'gr'),
      studentId: req.profile.id,
      studentName: req.profile.fullName,
      game,
      correct,
      wrong,
      score: correct * 10,
      accuracy,
      durationMs,
      xpEarned,
      createdAt: new Date().toISOString(),
    };
    data.gameResults.push(row);

    awardXp(data, req.profile.id, xpEarned, `played ${game}`);
    const progress = progressOf(data, req.profile.id);
    if (game === 'vocabulary-match') progress.daily.vocabulary = (progress.daily.vocabulary ?? 0) + correct;
    else progress.daily.grammar = (progress.daily.grammar ?? 0) + correct;
    progress.daily.minutes = (progress.daily.minutes ?? 0) + Math.round(durationMs / 60000);

    const earned = checkAchievements(data, req.profile.id);
    return { result: row, earned, xp: progress.xp, level: levelFromXp(progress.xp) };
  });

  res.status(201).json(result);
});

app.get('/api/games/results', requireAuth, requireRole('student'), async (req, res) => {
  const data = await loadDb();
  const rows = data.gameResults.filter((g) => g.studentId === req.profile.id);
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({
    data: sorted.slice(0, 50),
    total: rows.length,
    best: GAMES.map((game) => ({
      game,
      plays: rows.filter((r) => r.game === game).length,
      bestScore: Math.max(0, ...rows.filter((r) => r.game === game).map((r) => r.score)),
      bestAccuracy: Math.max(0, ...rows.filter((r) => r.game === game).map((r) => r.accuracy)),
    })),
  });
});

/* --------------------------------------------------------------------------
   PROGRESS, LEADERBOARD AND RECOMMENDATIONS
   -------------------------------------------------------------------------- */

app.get('/api/leaderboard', requireAuth, async (req, res) => {
  const data = await loadDb();
  // Driven by the student list, not by studentProgress: a student who has not
  // earned any XP yet still belongs on the board, sitting at zero.
  const rows = data.students
    .map((student) => {
      if (student.status !== 'active') return null;
      const progress = data.studentProgress.find((p) => p.studentId === student.id) ?? blankProgress(student.id);
      return {
        studentId: student.id,
        name: student.fullName,
        initials: student.initials,
        groupName: student.groupName,
        level: student.level,
        xp: progress.xp,
        streak: progress.streak,
        badges: data.studentAchievements.filter((a) => a.studentId === student.id).length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.xp - a.xp || b.streak - a.streak)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const me = req.user.role === 'student' ? rows.find((r) => r.studentId === req.profile?.id) ?? null : null;
  res.json({ data: rows.slice(0, 50), me, total: rows.length });
});

/** Everything the student dashboard needs for the learning path and daily goal. */
app.get('/api/progress/me', requireAuth, requireRole('student'), async (req, res) => {
  const data = await loadDb();
  const me = req.profile;
  const progress = data.studentProgress.find((p) => p.studentId === me.id) ?? blankProgress(me.id);
  const day = today();
  const daily = progress.daily?.date === day ? progress.daily : { date: day, vocabulary: 0, grammar: 0, minutes: 0, homework: 0 };

  const badges = data.studentAchievements
    .filter((a) => a.studentId === me.id)
    .map((a) => ({ ...a, ...(data.achievements.find((x) => x.id === a.achievementId) ?? {}) }));

  const myHomework = data.homeworks.filter((h) => h.groupId === me.groupId);
  const openTasks = myHomework.filter((h) => h.deadline >= day && !(h.submissions ?? []).some((s) => s.studentId === me.id));
  const completedLessons = data.lessons.filter((l) => l.groupId === me.groupId && l.status === 'completed').length;
  const totalLessons = data.lessons.filter((l) => l.groupId === me.groupId).length;
  const attempts = data.quizAttempts.filter((a) => a.studentId === me.id);
  const vocabGames = data.gameResults.filter((g) => g.studentId === me.id && g.game === 'vocabulary-match');
  const results = data.ieltsResults.filter((r) => r.studentId === me.id).sort((a, b) => a.session.localeCompare(b.session));

  // Deterministic recommendations built from the student's own records.
  const recommendations = [];
  if (me.attendanceRate < 75) recommendations.push({ code: 'attendance', tone: 'warning', value: me.attendanceRate });
  if (openTasks.length) recommendations.push({ code: 'homework', tone: 'warning', value: openTasks.length });
  if (vocabGames.length && average(vocabGames.slice(-3).map((g) => g.accuracy)) < 70) recommendations.push({ code: 'vocabulary', tone: 'info', value: 10 });
  if (!attempts.length) recommendations.push({ code: 'firstQuiz', tone: 'info', value: 0 });
  if (results.length >= 2 && results.at(-1).overall > results.at(-2).overall) {
    recommendations.push({ code: 'ieltsUp', tone: 'success', value: results.at(-1).overall });
  }
  if (progress.streak >= 3) recommendations.push({ code: 'streak', tone: 'success', value: progress.streak });
  if (!recommendations.length) recommendations.push({ code: 'allGood', tone: 'success', value: 0 });

  const nextLesson = data.lessons
    .filter((l) => l.groupId === me.groupId && l.date >= day)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0] ?? null;

  res.json({
    xp: progress.xp,
    level: levelFromXp(progress.xp),
    xpForNextLevel: xpForNextLevel(progress.xp),
    xpIntoLevel: progress.xp % 250,
    streak: progress.streak,
    longestStreak: progress.longestStreak,
    weeklyStreak: progress.weeklyStreak ?? 0,
    longestWeeklyStreak: progress.longestWeeklyStreak ?? 0,
    dailyGoal: progress.dailyGoal ?? { vocabulary: 20, grammar: 10, minutes: 15 },
    daily,
    history: progress.history ?? [],
    badges,
    allAchievements: data.achievements,
    path: {
      currentLevel: me.level,
      course: data.courses.find((c) => c.id === me.courseId)?.name ?? null,
      completedLessons,
      totalLessons,
      progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      nextGoal: results.length ? `IELTS ${(Math.min(9, results.at(-1).overall + 0.5)).toFixed(1)}` : me.level,
      nextLesson,
      openTasks: openTasks.length,
    },
    recommendations,
    quizAttempts: attempts.length,
    averageQuizScore: Number(average(attempts.map((a) => a.percentage)).toFixed(1)),
  });
});

/* --------------------------------------------------------------------------
   COURSE ENROLMENT REQUESTS
   --------------------------------------------------------------------------
   A student asks to move onto another course. This does not change their
   record — an admin decides, and only then is the student moved.
   -------------------------------------------------------------------------- */

app.post('/api/course-requests', requireAuth, requireRole('student'), async (req, res) => {
  const result = await saveDb((data) => {
    const course = data.courses.find((c) => c.id === req.body.courseId);
    if (!course) return { error: 404, code: 'notFound', message: 'Course not found.' };
    if (course.id === req.profile.courseId) return { error: 409, code: 'alreadyOnCourse', message: 'You are already on this course.' };
    if (data.courseRequests.some((r) => r.studentId === req.profile.id && r.courseId === course.id && r.status === 'pending')) {
      return { error: 409, code: 'requestExists', message: 'You already asked about this course.' };
    }

    const row = {
      id: nextId(data.courseRequests, 'cr'),
      studentId: req.profile.id,
      studentName: req.profile.fullName,
      courseId: course.id,
      courseName: course.name,
      currentCourseId: req.profile.courseId ?? null,
      message: String(req.body.message ?? '').slice(0, 500),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    data.courseRequests.push(row);

    data.users.filter((u) => u.role === 'admin').forEach((adminUser, index) => {
      data.notifications.push({
        id: `n-${Date.now()}-${index}`,
        title: 'Course request',
        message: `${req.profile.fullName} asked about ${course.name}.`,
        type: 'info',
        sender: req.profile.fullName,
        receiverId: adminUser.id,
        date: new Date().toISOString(),
        read: false,
        meta: { kind: 'courseRequest', id: row.id },
      });
    });
    return { row };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.status(201).json(result.row);
});

app.get('/api/course-requests', requireAuth, async (req, res) => {
  const data = await loadDb();
  let rows = data.courseRequests ?? [];
  if (req.user.role === 'student') rows = rows.filter((r) => r.studentId === req.profile?.id);
  if (req.user.role === 'teacher') return res.status(403).json({ code: 'forbidden', message: 'Not available for teachers.' });
  res.json({ data: [...rows].reverse(), total: rows.length });
});

/** Approving actually moves the student onto the course. */
app.patch('/api/course-requests/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const decision = req.body.status;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(422).json({ code: 'unknownStatus', message: 'Status must be approved or rejected.' });
  }

  const result = await saveDb((data) => {
    const row = data.courseRequests.find((r) => r.id === req.params.id);
    if (!row) return { error: 404, code: 'notFound', message: 'Request not found.' };
    row.status = decision;
    row.decidedAt = new Date().toISOString();
    row.decidedBy = req.user.fullName;

    if (decision === 'approved') {
      const student = data.students.find((st) => st.id === row.studentId);
      const course = data.courses.find((c) => c.id === row.courseId);
      if (student && course) { student.courseId = course.id; student.courseName = course.name; }
    }

    const account = data.users.find((u) => u.profileId === row.studentId);
    if (account) {
      data.notifications.push({
        id: `n-${Date.now()}`,
        title: decision === 'approved' ? 'Course request approved' : 'Course request declined',
        message: `${row.courseName}`,
        type: decision === 'approved' ? 'success' : 'info',
        sender: 'TJ Language School',
        receiverId: account.id,
        date: new Date().toISOString(),
        read: false,
      });
    }
    return { row };
  });

  if (result.error) return res.status(result.error).json({ code: result.code, message: result.message });
  res.json(result.row);
});

/** Student sets their own daily target. */
app.patch('/api/progress/goal', requireAuth, requireRole('student'), async (req, res) => {
  const goal = await saveDb((data) => {
    const row = progressOf(data, req.profile.id);
    row.dailyGoal = {
      vocabulary: Math.max(1, Number(req.body.vocabulary) || row.dailyGoal.vocabulary),
      grammar: Math.max(1, Number(req.body.grammar) || row.dailyGoal.grammar),
      minutes: Math.max(1, Number(req.body.minutes) || row.dailyGoal.minutes),
    };
    return row.dailyGoal;
  });
  res.json(goal);
});

/* ==========================================================================
   START
   ========================================================================== */

app.get('/api/health', async (req, res) => {
  const data = await loadDb();
  res.json({ status: 'ok', collections: Object.keys(data).length });
});

app.use('/api', (req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` }));

loadDb()
  .then(() => app.listen(PORT, () => console.log(`\n  TJ Language School API → http://localhost:${PORT}/api\n`)))
  .catch((error) => {
    console.error('Could not read server/db.json. Run "npm run seed" first.\n', error.message);
    process.exit(1);
  });
