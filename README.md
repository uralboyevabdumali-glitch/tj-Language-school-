# TJ Language School

An English and IELTS school platform: a public landing page whose content is edited from the admin
panel, a student registration-request system, and three dashboards (admin, teacher, student).

Everything runs against a real REST API backed by `server/db.json`. Logging in, sending a
registration request, approving it, marking attendance and editing the landing page all write to
that file.

---

## Project structure

The whole front end lives in **one file** so it is easy to read and change.

```
tj-language-school/
├── package.json          one package.json for the client and the server
├── vite.config.js        dev server + /api proxy to port 4000
├── tailwind.config.js    brand colours, fonts, shadows
├── postcss.config.js
├── index.html
├── README.md
├── src/
│   ├── App.jsx           EVERYTHING: landing page, login, register, request status,
│   │                     routing, protected routes, admin/teacher/student dashboards, CRUD,
│   │                     games, tests, gamification, live classes, admin CMS pages
│   ├── i18n.jsx          the three-language dictionary (uz/ru/en) + useLanguage() hook
│   ├── main.jsx          React entry point
│   └── index.css         Tailwind layers and the reusable classes (.btn, .card, .input …)
└── server/
    ├── server.js         the whole API: auth, student requests, CRUD, landing CMS, stats
    ├── seed.js           generates the demo database
    └── db.json           the database
```

`src/App.jsx` is organised with banner comments. Search for any of these to jump straight to it:

```
1. API HELPER              8. REQUEST STATUS PAGE
2. SMALL UI COMPONENTS     9. DASHBOARD SHELL
3. AUTH CONTEXT           10. REUSABLE CRUD PAGE
4. PROTECTED ROUTES       11. ADMIN DASHBOARD
5. LANDING PAGE           12. TEACHER DASHBOARD
6. LOGIN SYSTEM           13. STUDENT DASHBOARD
7. REGISTER SYSTEM        14. ROUTING
                          15. LANGUAGE SWITCHER, GAMIFICATION, GAMES, TESTS,
                              LIVE CLASSES, REVIEWS, ADMIN CMS PAGES
```

`server/server.js` uses the same idea:

```
1. DATABASE HELPERS        6. GROUPS / ATTENDANCE / PAYMENTS / HOMEWORK
2. AUTH MIDDLEWARE         7. NOTIFICATIONS
3. LOGIN SYSTEM            8. LANDING PAGE CMS
4. REGISTER + STUDENT REQUEST SYSTEM
5. GENERIC CRUD            9. DASHBOARD STATISTICS
                          10. BRANCHES, MEDIA, LEADS, ANNOUNCEMENTS, LIVE CLASSES,
                              REVIEWS, QUIZZES, GAMES, PROGRESS, LEADERBOARD
```

## Install and run

Requires Node.js 18 or newer.

```bash
npm install       # installs client and server dependencies
npm run seed      # creates server/db.json with demo data
npm run dev       # starts the API (4000) and the site (5173) together
```

Open **http://localhost:5173**.

Other scripts:

```bash
npm run server              # API only
npm run seed -- --empty     # admin account + courses + landing page, no demo people
npm run build               # production build into dist/
```

## Deploy on Vercel

The site and the API go up together. Vercel builds the Vite app and runs Express
as a serverless function at `/api`.

1. Push the repo (including `server/db.json` — create it with `npm run seed` if it is missing).
2. Import the project on Vercel. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
3. Optional: set `JWT_SECRET` in Project → Settings → Environment Variables.

Writes on Vercel live in the function’s `/tmp` folder, so demo data can reset when a
new instance starts. Local `npm run dev` still uses `server/db.json` as before.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@tjlanguageschool.uz` | `Admin123!` |
| Teacher | `teacher1@tjlanguageschool.uz` | `Teacher123!` |
| Student | `student1@tjlanguageschool.uz` | `Student123!` |

Teachers `teacher1` … `teacher10` all use `Teacher123!`; students `student1` … `student50` all use
`Student123!`.

## The three systems, kept apart

This is the core of the design. **Login, register and student requests never touch each other.**

```
REGISTER  (/register)          LOGIN  (/login)               STUDENT REQUESTS  (/admin/requests)
     │                              │                                  │
     ▼                              ▼                                  ▼
creates a row in            reads db.users only              admin approves or rejects
db.studentRequests          — creates nothing                approving creates the account
status = "pending"          — redirects by role
```

**Student flow**

```
Register  →  request created (pending)  →  admin approves  →  account created
          →  student logs in  →  /student/dashboard
```

While a request is pending, that person **cannot log in**. Login answers with a clear reason:

- no account and no request → `Account not found. Please register first.`
- request still pending → `Your registration request is still pending.`
- request rejected → `Your registration request was rejected.`
- account exists, wrong password → `Incorrect password.`

Anyone can check their own request at **`/request-status`** by email. Only the name, status and
dates come back — never a password or another person's details.

**Teacher flow** — teachers cannot register. An admin adds them in Admin → Teachers, and that form
creates both the teacher profile and the login account in one step.

**Admin flow** — the admin account is seeded in `db.json`. There is no admin registration anywhere.

## Roles

```js
{ id, fullName, email, phone, password, role, status }   // role: admin | teacher | student
```

The registration form has **no role selector**. The server ignores a `role` field in the request
body and always creates a student request — sending `"role": "admin"` changes nothing.

## Protected routes

| Situation | Result |
| --- | --- |
| Not signed in, opens `/admin/dashboard` | redirected to `/login`, then back after signing in |
| Student opens `/admin/*` or `/teacher/*` | `/403` page |
| Teacher opens `/admin/*` | `/403` page |
| Admin opens any `/admin/*` | allowed |

The client checks are for usability; the server enforces the same rules on every request, and a
teacher's data is scoped to their own groups (a teacher sees 7 of the 50 students, not all of them).

## Database

`server/db.json` holds these collections:

```
users            studentRequests   admins       students     teachers
groups           courses           lessons      homeworks    attendance
payments         notifications     competitions extraClasses ieltsResults
testimonials     events            leads        landingPage
```

`users` is the only authentication collection. `studentRequests` is separate and is never used for
login.

Demo data: 61 accounts · 5 student requests · 50 students · 10 teachers · 8 groups · 8 courses ·
32 lessons · 32 homework tasks · 309 attendance records · 150 invoices · 9 competitions ·
5 clubs · 10 IELTS results · 6 testimonials · 10 events.

## About the demo data

The students, teachers, IELTS band scores, testimonials, payments and attendance in `db.json` are
**invented sample data** — not real people and not real exam results. This is stated at the top of
`server/seed.js`, in the `_meta` block of `db.json`, on the public results section and in
Admin → Settings.

Run `npm run seed -- --empty` for a clean database with only the admin account, the courses and the
landing page structure.

## Tests that were run against this build

| # | Test | Result |
| --- | --- | --- |
| 1 | Admin login | role `admin` → `/admin/dashboard` |
| 2 | Teacher login | role `teacher` → `/teacher/dashboard` |
| 3 | Student login | role `student` → `/student/dashboard` |
| 4 | Unknown email / wrong password | 404 and 401 with the right messages |
| 5 | New registration | request created with status `pending`; that user cannot log in |
| 6 | Admin → Student Requests | the new request is listed; no password hash in the response |
| 7 | Approve | student `st-051` and their account created |
| 8 | Approved student login | 200, role `student` |
| 9 | Rejected student login | 403 `Your registration request was rejected.` |
| 10 | Student opens admin data | 403 |
| 11 | Teacher opens admin data | 403 |
| — | Teacher student list | 7 of 50 students (their own groups only) |
| — | `"role":"admin"` sent to `/register` | ignored |

## Languages

Uzbek is the default. Russian and English are switched from the header (public site) or
the dashboard topbar. The choice is stored in `localStorage` under `tj.lang` and applied to
`<html lang>` so screen readers and search engines see the right language.

Every visible string comes from `src/i18n.jsx` through `t('some.key')`. Nothing in `App.jsx`
holds a translated sentence. A missing key falls back to Uzbek, then to the key itself, and
warns in the console in development, so a gap is visible rather than blank.

Database ids, emails, currency codes and CEFR level names (A1, B2, IELTS) are technical
values and are deliberately **not** translated.

## What the upgrade added

**Students**

- XP, levels (250 XP each), daily streaks and eight badges, all awarded from real records —
  attendance, homework hand-ins, game rounds, quiz attempts and IELTS results.
- A daily goal with a stored progress count, and a learning path with recommendations that
  are computed from the student's own data rather than picked at random.
- Four language games: Vocabulary Match, Grammar Drag & Drop, Word Builder and
  Quick Quiz. Every round is saved and the XP is worked out on the server.
- A tests module with a countdown timer and a per-question review of what was right or wrong.
- A leaderboard, ranked by XP, that includes students who have not scored yet.
- Daily and weekly streaks, and XP for joining a competition or club.
- A course catalogue where a student can request a different course; approving
  the request actually moves them onto it.
- A live-class banner, lesson reminders (24h / 1h / 15m) and a lesson rating form.

**Teachers**

- Start and end a live class from the dashboard or the dedicated Live page. Starting one
  notifies the whole group; ending it asks them to rate the lesson.
- See who has joined, the average rating and recent written feedback.

**Admins**

- New CMS pages: Branches, Media, Leads, Announcements, Tests and Analytics.
- The landing editor now has a live preview and only publishes when you press Publish.
- Site settings: brand name, section headings and social links.

### Scores are calculated on the server

Quiz marking and game XP are worked out in `server.js`, never sent by the browser, and
`GET /api/quizzes/:id/play` strips `correctIndex` and `explanation` before responding. A
student cannot post their own score.

### Branches

Three Olmaliq branches are created on first boot with **empty** address and map fields and a
`needsSetup` flag. No coordinates are invented. The Google Maps and Yandex Maps buttons only
appear once an administrator fills in a real link; until then the card shows a short notice.

## Admin content in three languages

The interface is translated from `src/i18n.jsx`. Content an administrator types
is different: it lives in `db.json`, so it is translated per record.

Each text field keeps its original key as the **base** value and gains optional
`_ru` / `_en` siblings:

```json
{ "title": "Ingliz tilini o'rganing", "title_ru": "Изучайте английский", "title_en": "Learn English" }
```

`cmsText(row, 'title', language)` reads the right one and falls back to the base
value when a translation is blank. That means a half-translated page still
renders, and a database written before this change keeps working untouched.

In Admin → Landing Page and in the Branches, Media, Courses, Teachers and
Announcements editors there is a language tab strip. The dot next to each flag is
green when every translatable field on that record has been filled in for that
language.

## Draft and publish

Saving a landing section has two buttons. **Save draft** parks the change in
`landingDrafts` — the public site does not change. **Publish** writes it to
`landingPage` and clears the draft. A section with a waiting draft shows a banner
offering to load or discard it.

## Upgrading an existing database

`ensureCollections()` runs once when the API boots. It only **adds** what is missing:
the new collections, the `live` block on each lesson, `status`/`notes` on existing leads, and
one progress row per student. It never rewrites or deletes an existing record, and running it
again changes nothing.

This was verified by diffing the upgraded `server/db.json` against the original: all sixteen
pre-existing collections (users, students, teachers, groups, courses, homeworks, attendance,
payments, notifications, competitions, extraClasses, ieltsResults, testimonials, events,
studentRequests, landingPage) stayed byte-identical.

So you can drop this build on top of a live database without a migration step.

## Performance

`src/Charts.jsx` holds every chart and is loaded with `React.lazy`. Recharts is
the heaviest dependency in the project (~420 kB before gzip) and most visits
never draw a chart — the public site, a student checking homework, a teacher
marking a register. Keeping it out of the first download means those people no
longer pay for it; it arrives only when a page with a chart opens.

The rest is split into cached vendor chunks (React, Framer Motion, icons,
toasts) so a deploy does not invalidate everything at once.

## Accessibility

- Decorative overlays are `aria-hidden`; Escape and a real close button are the
  routes out of a dialog.
- Every control has a label, every icon-only button an `aria-label`, and images
  have alt text.
- `prefers-reduced-motion` is honoured globally in `index.css`, and the
  decorative `Float` and `Reveal` components skip their animation entirely
  rather than merely shortening it.
- Status is never carried by colour alone — badges and charts carry text too.

## Avatars

Profile photos are stored as a URL, not an upload: there is no file store in
this project and adding one would mean a new dependency and somewhere to keep
the bytes. The API only accepts a full `http(s)` link, and an empty value falls
back to the initials badge. A broken link also falls back, because a broken
image icon next to someone's name looks careless.

## Route smoke test

`tools/route-smoke-test.mjs` mounts **every** dashboard route, for every role,
against a running API, and fails on a blank page, a render error, or a raw
translation key left on screen.

```bash
npm run dev                 # API on :4000
node tools/route-smoke-test.mjs           # one language
LANGS=uz,ru,en node tools/route-smoke-test.mjs   # all three
API_PORT=4000 node tools/route-smoke-test.mjs    # if the API is elsewhere
```

It needs `jsdom` and `esbuild`, which are dev-only:

```bash
npm install --no-save jsdom esbuild
```

This exists because an earlier smoke test only mounted the public page. Three
components were calling `t()` without taking it from `useLanguage()`, which
threw at render and turned Attendance, Homework and every page with a modal or
pagination into a blank screen — on all three dashboards. A test that only
checks the landing page cannot see that.

## Before going to production

- Set a real `JWT_SECRET` (environment variable read by `server/server.js`).
- Reseed with `--empty` and enter real content through the admin panel.
- Replace the JSON file store with a database — only the helpers at the top of `server/server.js`
  need to change; the routes stay the same.
- Serve `dist/` from a static host or from Express.
