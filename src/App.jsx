/**
 * ============================================================================
 *  TJ LANGUAGE SCHOOL — THE WHOLE FRONT END, IN ONE FILE
 * ============================================================================
 *  Jump to a section by searching for its banner comment:
 *
 *    1. API HELPER
 *    2. SMALL UI COMPONENTS
 *    3. AUTH CONTEXT
 *    4. PROTECTED ROUTES
 *    5. LANDING PAGE
 *    6. LOGIN SYSTEM
 *    7. REGISTER SYSTEM        (creates a request, never an account)
 *    8. REQUEST STATUS PAGE
 *    9. DASHBOARD SHELL
 *   10. REUSABLE CRUD PAGE
 *   11. ADMIN DASHBOARD
 *   12. TEACHER DASHBOARD
 *   13. STUDENT DASHBOARD
 *   14. ROUTING
 *   15. UPGRADE — language switcher, gamification, games, tests, live class,
 *       lesson reviews, branches, media, leads, announcements
 *
 *  Every visible string comes from src/i18n.jsx through t('key'). Nothing in
 *  this file holds a translated sentence.
 *
 *  The three systems the app is built around are deliberately separate:
 *    LOGIN checks an existing account · REGISTER sends a request ·
 *    STUDENT REQUESTS are approved by an admin, which is what creates accounts.
 * ============================================================================
 */
import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate,
} from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Award, BarChart3, Bell, BellRing, BookOpen, Boxes, Calendar,
  CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, ClipboardList,
  Clock, Compass, Flame, Gamepad2, GraduationCap, Languages, Layout, LayoutDashboard, Link2, Loader2, Lock,
  LogOut, Mail, MapPin, Megaphone, Menu, Mic, Navigation, Pencil, Phone, PlayCircle, Plus, Radio, Save, Search,
  Send, Settings as SettingsIcon, Shuffle, Sparkles, Star, Target, Timer, TrendingUp, Trash2,
  Trophy, UserCheck, UserRound, Users, Video, Wallet, X, XCircle, Zap,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LanguageProvider, useLanguage, LANGUAGES, DEFAULT_LANGUAGE as DEFAULT_LANG, translate, currentLanguage, cmsText, cmsField } from './i18n';

/* ==========================================================================
   1. API HELPER
   --------------------------------------------------------------------------
   One axios instance. The token lives in localStorage and is attached to
   every request; a 401 clears it and sends the person back to /login.
   ========================================================================== */

const api = axios.create({ baseURL: '/api' });

/** Public homepage: live API first, then the static snapshot Vercel always ships. */
async function loadPublicLanding() {
  try {
    const { data } = await api.get('/landing');
    if (data?.hero && data?.nav) return data;
  } catch {
    /* API is missing on static hosts — use the snapshot instead. */
  }
  const response = await fetch('/landing.json');
  if (!response.ok) throw new Error('Serverga ulanib bo\u2018lmadi.');
  return response.json();
}

const tokenStore = {
  get: () => localStorage.getItem('tj.token'),
  set: (token) => localStorage.setItem('tj.token', token),
  clear: () => localStorage.removeItem('tj.token'),
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // The API sends a stable `code` with every user-facing error. Translate it
    // here so toasts and inline errors follow the chosen language. The English
    // `message` is only a fallback for codes this build does not know yet.
    const lang = currentLanguage();
    const code = error.response?.data?.code;
    const translated = code ? translate(`err.${code}`, lang) : null;
    const message = (translated && translated !== `err.${code}` ? translated : null)
      ?? error.response?.data?.message
      ?? translate('err.network', lang);
    const status = error.response?.status;
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(Object.assign(error, { message, fieldErrors: error.response?.data?.errors }));
  }
);

/* Formatting helpers used all over the app. */
const money = (value) => (value == null ? '—' : `${Number(value).toLocaleString('en-US')} UZS`);
const shortMoney = (value) => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(value ?? 0));
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const formatMonth = (period) => {
  if (!period) return '—';
  const [year, month] = period.split('-');
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]} ${year.slice(2)}`;
};
const relativeTime = (value) => {
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(value);
};
const today = () => new Date().toISOString().slice(0, 10);
const cn = (...values) => values.flat().filter(Boolean).join(' ');

const DASHBOARD_HOME = { admin: '/admin/dashboard', teacher: '/teacher/dashboard', student: '/student/dashboard' };
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const STATUS_STYLE = {
  paid: 'bg-emerald-50 text-emerald-700', approved: 'bg-emerald-50 text-emerald-700',
  active: 'bg-emerald-50 text-emerald-700', present: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700', graded: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700', late: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700', rejected: 'bg-rose-50 text-rose-700',
  absent: 'bg-rose-50 text-rose-700', blocked: 'bg-rose-50 text-rose-700',
  open: 'bg-electric-50 text-electric-700', scheduled: 'bg-electric-50 text-electric-700',
  submitted: 'bg-electric-50 text-electric-700',
};

/* ==========================================================================
   2. SMALL UI COMPONENTS
   ========================================================================== */

function Button({ variant = 'primary', size, loading, icon: Icon, className, children, ...props }) {
  const styles = {
    primary: 'btn-primary', secondary: 'btn-secondary', light: 'btn-light', danger: 'btn-danger',
    subtle: 'btn bg-navy-50 text-navy-700 hover:bg-navy-100',
  };
  return (
    <button {...props} disabled={props.disabled || loading} className={cn(styles[variant], size === 'sm' && 'btn-sm', className)}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function Field({ label, error, hint, as = 'input', options, className, ...props }) {
  const Tag = as;
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={props.name}>{label}</label>}
      {as === 'select' ? (
        <select id={props.name} className={cn('input', error && 'input-error')} {...props}>
          {options?.map((option) =>
            typeof option === 'string'
              ? <option key={option} value={option}>{option}</option>
              : <option key={option.value} value={option.value}>{option.label}</option>
          )}
        </select>
      ) : (
        <Tag id={props.name} className={cn('input', as === 'textarea' && 'resize-y', error && 'input-error')} {...props} />
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-navy-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

function Badge({ status, children, className }) {
  const { t } = useLanguage();
  // Falls back to the raw value, so an unknown status still renders something.
  const label = children ?? (status ? t(`status.${status === 'in-progress' ? 'inProgress' : status}`) : '');
  const text = typeof label === 'string' && label.startsWith('status.') ? status : label;
  return <span className={cn('badge', STATUS_STYLE[status] ?? 'bg-navy-100 text-navy-700', className)}>{text}</span>;
}

function Avatar({ name = '', src = '', size = 'h-10 w-10 text-sm' }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
  const [broken, setBroken] = useState(false);

  // A photo when there is one; initials when there is not, or when the link is
  // dead — a broken image icon next to someone's name looks careless.
  if (src && !broken) {
    return (
      <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-full object-cover', size)} />
    );
  }
  return (
    <span aria-hidden={Boolean(name)}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-action-gradient font-semibold text-white', size)}>
      {letters || 'TJ'}
    </span>
  );
}

function Modal({ open, onClose, title, description, size = 'md', footer, children }) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      {/* Click-outside to close. Hidden from assistive tech: Escape and the
          close button are the accessible ways out of the dialog. */}
      <div aria-hidden="true" className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel bg-white shadow-lift sm:rounded-panel', widths[size])}>
        <header className="flex items-start justify-between gap-4 border-b border-navy-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-navy-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('msg.closeLabel')} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50">
            <X size={18} />
          </button>
        </header>
        <div className="scroll-slim flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-3 border-t border-navy-100 bg-mist px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

/** Confirmation before anything destructive or irreversible. */
function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel, variant = 'danger', loading }) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant={variant} size="sm" loading={loading} onClick={onConfirm}>{confirmLabel ?? t('common.delete')}</Button>
      </>}>
      <p className="text-sm leading-relaxed text-navy-600">{message}</p>
    </Modal>
  );
}

function Panel({ title, description, action, className, bodyClassName = 'p-5', children }) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-navy-100 px-5 py-4">
          <div>
            {title && <h2 className="font-display text-base font-semibold text-navy-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-navy-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function PageTitle({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-navy-500">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function StatCard({ icon: Icon = BarChart3, label, value, note, tone = 'blue' }) {
  const tones = {
    blue: 'bg-electric-50 text-electric-600', violet: 'bg-violet-500/10 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600', navy: 'bg-navy-100 text-navy-700',
  };
  return (
    <div className="card flex items-start gap-4 p-5">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}><Icon size={19} /></span>
      <div className="min-w-0">
        <p className="text-sm text-navy-500">{label}</p>
        <p className="mt-1 truncate font-display text-2xl font-bold text-navy-900">{value}</p>
        {note && <p className="mt-1 text-xs text-navy-400">{note}</p>}
      </div>
    </div>
  );
}

function Loading({ label }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-navy-400" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-electric-600" />
      <p className="text-sm">{label ?? t('state.loadingLabel')}…</p>
    </div>
  );
}

function Empty({ title, description, actionLabel, onAction }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-navy-900">{title ?? t('state.emptyTitle')}</h3>
      {description && <p className="max-w-sm text-sm text-navy-500">{description}</p>}
      {actionLabel && <Button size="sm" className="mt-2" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

/** Table with a horizontal scroll on small screens. */
function Table({ columns, rows, loading, empty }) {
  if (loading) return <Loading />;
  if (!rows.length) return <Empty {...empty} />;

  return (
    <div className="scroll-slim overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left">
        <thead>
          <tr className="border-b border-navy-100 bg-mist">
            {columns.map((column) => (
              <th key={column.key} className={cn('px-5 py-3 text-xs font-semibold uppercase tracking-wide text-navy-500', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-50">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-mist/70">
              {columns.map((column) => (
                <td key={column.key} className={cn('px-5 py-3.5 align-middle text-sm text-navy-700', column.className)}>
                  {column.render ? column.render(row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, total, limit, onChange }) {
  const { t } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4 border-t border-navy-100 px-5 py-4" aria-label={t('msg.pagination')}>
      <p className="text-sm text-navy-500">{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label={t('field.previousPage')}
          className="rounded-lg p-2 text-navy-500 hover:bg-navy-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium text-navy-700">{page} / {pages}</span>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages} aria-label={t('field.nextPage')}
          className="rounded-lg p-2 text-navy-500 hover:bg-navy-50 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </nav>
  );
}

/** Search box plus dropdown filters, sitting above a table. */
function Toolbar({ search, onSearch, placeholder, filters = [], children }) {
  const { t } = useLanguage();
  const hint = placeholder ?? t('common.search');
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-navy-100 px-5 py-4">
      {onSearch && (
        <div className="relative min-w-[12rem] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={hint}
            aria-label={hint}
            className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-electric-400" />
        </div>
      )}
      {filters.map((filter) => (
        <select key={filter.key} value={filter.value} onChange={(event) => filter.onChange(event.target.value)}
          aria-label={filter.label}
          className="rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-700 outline-none focus:border-electric-400">
          <option value="">{filter.label}</option>
          {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ))}
      {children}
    </div>
  );
}

/** Fetch on mount, with loading / error state and a manual refetch. */
function useFetch(request, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useRef(request);
  load.current = request;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    load.current()
      .then((result) => alive && (setData(result), setError(null)))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refetch: () => setTick((value) => value + 1) };
}

/* ==========================================================================
   3. AUTH CONTEXT
   --------------------------------------------------------------------------
   Holds the signed-in account. On load it swaps the stored token for a fresh
   user record, so a deleted or blocked account cannot keep browsing.
   ========================================================================== */

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => { setUser(data.user); setProfile(data.profile); })
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // LOGIN — the only place a session is created.
  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    tokenStore.set(data.token);
    setUser(data.user);
    const session = await api.get('/auth/me');
    setProfile(session.data.profile);
    return data.user;
  };

  // LOGOUT — clears the token, the state, and (via the caller) sends to /login.
  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setProfile(data.profile);
  };

  const value = useMemo(
    () => ({ user, profile, loading, role: user?.role ?? null, isAuthenticated: Boolean(user), login, logout, refreshProfile }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ==========================================================================
   4. PROTECTED ROUTES
   --------------------------------------------------------------------------
   Not signed in  → /login (and back to where you were afterwards)
   Wrong role     → /403, so the boundary is visible rather than silent
   ========================================================================== */

function ProtectedRoute({ allow }) {
  const { isAuthenticated, role, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) return <Loading label={t('auth.checkingSession')} />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allow.includes(role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

/** Keeps signed-in people away from /login and /register. */
function GuestOnlyRoute() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <Loading />;
  if (isAuthenticated) return <Navigate to={DASHBOARD_HOME[role]} replace />;
  return <Outlet />;
}

function ForbiddenPage() {
  const { isAuthenticated, role } = useAuth();
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6 text-center">
      <Lock size={32} className="text-rose-400" />
      <h1 className="mt-6 text-display-sm text-white">{t('auth.forbiddenTitle')}</h1>
      <p className="mt-4 max-w-[46ch] text-navy-300">{t('auth.forbiddenBody')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {isAuthenticated && <Link to={DASHBOARD_HOME[role]} className="btn-primary">{t('auth.backToDashboard')}</Link>}
        <Link to="/" className="btn-light">{t('auth.goHome')}</Link>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6 text-center">
      <p className="font-display text-[7rem] font-extrabold leading-none text-white/10">404</p>
      <h1 className="-mt-6 text-display-sm text-white">{t('auth.notFound')}</h1>
      <Link to="/" className="btn-primary mt-8">{t('auth.goHome')}</Link>
    </div>
  );
}

/* ==========================================================================
   5. LANDING PAGE
   --------------------------------------------------------------------------
   Every word here comes from GET /api/landing, which is what the admin edits
   in Admin → Landing page. Nothing on this page is hard-coded.
   ========================================================================== */

/** Fades a block in the first time it scrolls into view. */
/**
 * Fades content in as it scrolls into view.
 *
 * `delay` staggers a grid so cards arrive one after another rather than all at
 * once. If the reader has asked their system for less motion we render the
 * content already in place — no fade, no travel.
 */
/**
 * A slow vertical drift for a single decorative element. Because it is purely
 * decorative it is the first thing dropped when the reader has asked their
 * system for less motion.
 */
function Float({ children, className, distance = 10, duration = 6 }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}>
      {children}
    </motion.div>
  );
}

function Reveal({ children, className, delay = 0 }) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to a number once it is on screen. */
function CountUp({ value, decimals = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 1400, 1);
        setShown(value * (1 - (1 - progress) ** 3));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{shown.toFixed(decimals)}</span>;
}

/** The big hero word: "salom" in a new language every 1.6 seconds, each in its own colour. */
const HERO_GREETINGS = [
  ['Salom', 'var(--cream)'], ['Hello', 'var(--yellow)'], ['Привет', 'var(--coral)'], ['안녕하세요', 'var(--mint)'],
  ['Merhaba', 'var(--yellow)'], ['Hallo', 'var(--coral)'], ['مرحبا', 'var(--violet)'],
];

function GreetingCycler() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % HERO_GREETINGS.length), 1600);
    return () => clearInterval(timer);
  }, [reduced]);
  const [word, color] = HERO_GREETINGS[index];
  return (
    <p className="lp-hero-word" aria-hidden="true">
      <span key={index} className="lp-pop" style={{ color }}>{word}</span>
    </p>
  );
}

function LandingPage() {
  const { data: page, loading, error } = useFetch(() => loadPublicLanding());
  const { isAuthenticated, role } = useAuth();
  const { t, language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaPost, setMediaPost] = useState(null);
  // Admin-typed content: read the field for the visitor's language, falling
  // back to the base text when a translation has not been filled in.
  const c = (row, field) => cmsText(row, field, language);
  const [contactForm, setContactForm] = useState({ fullName: '', phone: '', email: '', course: '', message: '' });
  const [sending, setSending] = useState(false);

  // The admin owns the page title and meta description, so apply them here.
  useEffect(() => {
    if (!page?.meta) return;
    document.title = page.meta.title;
    const set = (selector, attribute, value) => {
      const node = document.querySelector(selector);
      if (node && value) node.setAttribute(attribute, value);
    };
    set('meta[name="description"]', 'content', page.meta.description);
    set('meta[name="keywords"]', 'content', page.meta.keywords);
    set('meta[property="og:title"]', 'content', page.meta.title);
    set('meta[property="og:description"]', 'content', page.meta.description);
  }, [page?.meta]);

  if (loading) return <Loading />;
  if (error || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">{t('landing.apiDown')}</h1>
          <p className="mt-2 max-w-md text-navy-500">{error} — {t('landing.apiDownHint')}</p>
        </div>
      </div>
    );
  }

  const sendContact = async (event) => {
    event.preventDefault();
    if (!contactForm.fullName.trim() || !contactForm.phone.trim()) {
      toast.error(t('landing.contactRequired'));
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/landing/contact', contactForm);
      toast.success(data.message);
      setContactForm({ fullName: '', phone: '', email: '', course: '', message: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  // Picking a course card fills the sign-up form and takes the visitor there.
  const pickCourse = (name) => {
    setContactForm((form) => ({ ...form, course: name }));
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  // "General English" → "GE": the big two-letter mark on each course card.
  const courseCode = (name = '') =>
    name.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();

  // The hero title splits at its first full stop: the first half cream, the rest coral.
  const heroTitle = c(page.hero, 'title') ?? '';
  const splitAt = heroTitle.indexOf('. ');
  const [titleLead, titleTail] = splitAt > 0
    ? [heroTitle.slice(0, splitAt + 1), heroTitle.slice(splitAt + 2)]
    : [heroTitle, ''];

  // Three price cards from the real courses: the most-enrolled one in the
  // middle, the cheapest and the dearest of the rest either side.
  const priced = page.courses.filter((course) => course.pricePerMonth);
  const popular = [...priced].sort((a, b) => (b.studentsCount ?? 0) - (a.studentsCount ?? 0))[0];
  const others = priced.filter((course) => course !== popular).sort((a, b) => a.pricePerMonth - b.pricePerMonth);
  const plans = popular ? [others[0], popular, others[others.length - 1]].filter(Boolean) : [];

  const greetings = ['Hello', 'Привет', '안녕하세요', 'Merhaba', 'Hallo', 'Salom', 'Bonjour', 'مرحبا', 'Hola', 'Ciao'];
  const ribbonWords = page.benefits.map((benefit) => c(benefit, 'title'));
  const [headStat, ...restStats] = page.stats;
  const benefitTones = ['lp-tone-coral', 'lp-tone-white', 'lp-tone-yellow', 'lp-tone-white'];

  return (
    <div className="landing flex min-h-screen flex-col">
      {/* ---------- NAVBAR ---------- */}
      <header className="lp-header">
        <div className="lp-wrap flex h-[4.75rem] items-center justify-between gap-6">
          <a href="#top" className="flex min-w-0 items-center gap-3 whitespace-nowrap">
            <span className="lp-logo">TJ</span>
            <span className="truncate font-heavy text-xs uppercase tracking-wide sm:text-sm">{page.settings?.brandName || 'TJ Language School'}</span>
          </a>

          <nav aria-label={t('msg.mainNav')} className="hidden items-center xl:flex">
            {page.nav.map((item) => (
              <a key={item.id} href={item.href} className="lp-navlink">{c(item, 'label')}</a>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 whitespace-nowrap xl:flex">
            <LanguageSwitcher tone="dark" />
            {isAuthenticated ? (
              <Link to={DASHBOARD_HOME[role]} className="lp-btn lp-btn-yellow lp-btn-sm"><LayoutDashboard size={16} />{t('nav.dashboard')}</Link>
            ) : (
              <>
                <Link to="/login" className="lp-navlink font-bold">{t('nav.login')}</Link>
                <a href="#contact" className="lp-btn lp-btn-yellow lp-btn-sm">{t('landing.freeLesson')}</a>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <LanguageSwitcher tone="dark" compact />
            <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[color:var(--line)] text-[color:var(--cream)]">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[color:var(--line)] bg-[color:var(--ink)] xl:hidden">
            <nav aria-label={t('msg.mobileNav')} className="lp-wrap flex flex-col gap-1 py-5">
              {page.nav.map((item) => (
                <a key={item.id} href={item.href} onClick={() => setMenuOpen(false)}
                  className="rounded-2xl px-3 py-3 font-bold text-[color:var(--cream)] hover:bg-[color:var(--ink-2)]">{c(item, 'label')}</a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link to="/login" className="lp-btn lp-btn-ghost">{t('nav.login')}</Link>
                <Link to="/register" className="lp-btn lp-btn-yellow">{t('nav.register')}</Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="top" className="w-full min-w-0">
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden pb-14 pt-14 sm:pb-20 sm:pt-20">
          <div className="lp-wrap relative">
            {/* Rotating "first lesson free" seal, links to the sign-up form. */}
            <a href="#contact" aria-label={t('landing.freeSeal')} className="lp-seal">
              <svg viewBox="0 0 100 100" className="lp-seal-ring" aria-hidden="true">
                <defs><path id="seal-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
                <text fill="currentColor" fontSize="9" textLength="234" lengthAdjust="spacing" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 800 }}>
                  <textPath href="#seal-circle">{`${t('landing.freeSeal').toUpperCase()} • `}</textPath>
                </text>
              </svg>
              <span className="lp-seal-dot"><ArrowUpRight size={22} /></span>
            </a>

            <Reveal>
              <p className="lp-eyebrow">{c(page.hero, 'eyebrow')}</p>
              <GreetingCycler />
              <h1 className="lp-hero-title">
                {titleLead}{titleTail && <> <span className="text-[color:var(--coral)]">{titleTail}</span></>}
              </h1>
              <p className="mt-3 text-sm text-[color:var(--muted-2)]">{t('landing.helloNote')}</p>
              <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-[color:var(--muted)]">{c(page.hero, 'subtitle')}</p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a href="#contact" className="lp-btn lp-btn-cta">{c(page.hero, 'secondaryCta')}</a>
                <a href="#courses" className="lp-btn lp-btn-ghost">{t('landing.viewCourses')}</a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- RIBBONS ---------- */}
        <div aria-hidden="true" className="overflow-hidden py-10">
          <div className="lp-ribbon lp-ribbon-yellow">
            <div className="lp-marquee">
              {[...greetings, ...greetings].map((word, index) => (
                <span key={index} className="flex items-center gap-8">{word}<span className="text-[0.6em]">✦</span></span>
              ))}
            </div>
          </div>
          <div className="lp-ribbon lp-ribbon-coral">
            <div className="lp-marquee lp-marquee-reverse">
              {[...ribbonWords, ...ribbonWords].map((word, index) => <span key={index}>{word}</span>)}
            </div>
          </div>
        </div>

        {/* ---------- COURSES ---------- */}
        <section id="courses" className="lp-section">
          <div className="lp-wrap">
            <Reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <h2 className="lp-h2 max-w-2xl">{t('landing.coursesTitle')}</h2>
              <p className="max-w-xs text-[0.95rem] text-[color:var(--muted)]">{t('landing.pickCourse')}</p>
            </Reveal>

            <div className="lp-grid mt-12">
              {page.courses.map((course, index) => {
                const chosen = contactForm.course === course.name;
                return (
                  <Reveal key={course.id} delay={(index % 4) * 0.05}>
                    <button type="button" onClick={() => pickCourse(course.name)} aria-pressed={chosen}
                      className={cn('lp-card flex h-full min-h-[15rem] w-full flex-col text-left', chosen && 'lp-card-active')}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="lp-code">{courseCode(course.name)}</span>
                        <span className="lp-tag">{course.level}</span>
                      </div>
                      <h3 className="mt-auto pt-8 font-heavy text-lg">{c(course, 'name')}</h3>
                      <p className="lp-card-muted mt-2 text-sm leading-relaxed">{c(course, 'description')}</p>
                      <p className="lp-card-accent mt-4 text-sm font-bold">
                        {money(course.pricePerMonth)} {t('common.perMonth')} · {course.duration}
                      </p>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- WHY US (cream) ---------- */}
        <section id="about" className="lp-section lp-cream">
          <div className="lp-wrap">
            <Reveal>
              <h2 className="lp-h2">
                {t('landing.whyLead')} <span className="lp-mark">{t('landing.whyMark')}</span>
              </h2>
              <p className="mt-6 max-w-[68ch] text-lg leading-relaxed lp-text-soft">{c(page.about, 'body')}</p>
            </Reveal>

            <div className="lp-grid lp-bento mt-12">
              {headStat && (
                <Reveal className="lp-bento-tall">
                  <div className="lp-card lp-tone-ink flex h-full min-h-[18rem] flex-col">
                    <p className="lp-code text-[color:var(--yellow)]">
                      <CountUp value={headStat.value} decimals={headStat.decimals ?? 0} />{headStat.suffix}
                    </p>
                    <p className="mt-auto pt-8 font-heavy text-xl">{c(headStat, 'label')}</p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{c(page.about, 'mission')}</p>
                  </div>
                </Reveal>
              )}
              {page.benefits.slice(0, 5).map((benefit, index) => (
                <Reveal key={benefit.id} delay={index * 0.05}>
                  <div className={cn('lp-card h-full', benefitTones[index % benefitTones.length])}>
                    <h3 className="font-heavy text-lg">{c(benefit, 'title')}</h3>
                    <p className="mt-3 text-[0.95rem] leading-relaxed opacity-80">{c(benefit, 'text')}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {Boolean(restStats.length) && (
              <Reveal>
                <dl className="lp-grid lp-grid-sm mt-5">
                  {restStats.map((stat) => (
                    <div key={stat.id} className="lp-card lp-tone-white">
                      <dd className="font-heavy text-3xl"><CountUp value={stat.value} decimals={stat.decimals ?? 0} />{stat.suffix}</dd>
                      <dt className="mt-2 text-sm opacity-75">{c(stat, 'label')}</dt>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>
        </section>

        {/* ---------- PRICES (cream, continued) ---------- */}
        {Boolean(plans.length) && (
          <section id="prices" className="lp-section lp-cream-flat border-t-2 border-[rgba(14,15,44,0.12)]">
            <div className="lp-wrap">
              <Reveal><h2 className="lp-h2">{t('landing.pricesTitle')}</h2></Reveal>
              <div className="lp-grid mt-12">
                {plans.map((plan) => {
                  const featured = plan === popular;
                  return (
                    <Reveal key={plan.id}>
                      <article className={cn('lp-card relative flex h-full flex-col', featured ? 'lp-tone-ink' : 'lp-tone-white')}>
                        {featured && <span className="lp-flag">{t('landing.mostPopular')}</span>}
                        <p className={cn('text-[0.95rem] font-bold', featured && 'text-[color:var(--yellow)]')}>{c(plan, 'name')}</p>
                        <p className="lp-code mt-4">{Number(plan.pricePerMonth).toLocaleString('en-US')}</p>
                        <p className="mt-1 text-sm opacity-75">{t('landing.sumPerMonth')}</p>
                        <ul className="mt-6 flex-1 space-y-2.5 text-[0.95rem]">
                          {plan.lessonsPerWeek && <li>{t('landing.timesPerWeek', { count: plan.lessonsPerWeek })}</li>}
                          <li>{plan.schedule}</li>
                          <li>{plan.duration} · {plan.lessonsCount} {t('landing.lessonsLabel').toLowerCase()}</li>
                          <li>{plan.level}</li>
                        </ul>
                        <button type="button" onClick={() => pickCourse(plan.name)}
                          className={cn('lp-btn mt-7', featured ? 'lp-btn-yellow' : 'lp-btn-ink')}>{t('landing.joinCourse')}</button>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------- IELTS RESULTS ---------- */}
        <section id="results" className="lp-section">
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <p className="lp-eyebrow">{page.resultsBlock.eyebrow}</p>
              <h2 className="lp-h2 mt-5">{page.resultsBlock.title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-[color:var(--muted)]">{page.resultsBlock.subtitle}</p>
            </Reveal>

            <div className="lp-grid mt-12">
              {page.results.map((result, index) => (
                <Reveal key={result.id} delay={(index % 4) * 0.05}>
                  <article className="lp-card h-full">
                    <div className="flex items-start justify-between">
                      <Avatar name={result.studentName} size="h-12 w-12 text-sm" />
                      <p className="lp-code text-[color:var(--yellow)]">{result.overall.toFixed(1)}</p>
                    </div>
                    <h3 className="mt-5 font-heavy text-base">{result.studentName}</h3>
                    <p className="lp-card-muted text-sm">{result.startLevel} → {result.overall.toFixed(1)} · {result.monthsStudied} {t('landing.monthsLabel')}</p>
                    <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
                      {[['listening', 'L'], ['reading', 'R'], ['writing', 'W'], ['speaking', 'S']].map(([key, label]) => (
                        <div key={key} className="rounded-xl border-2 border-[color:var(--line)] py-2">
                          <dt className="text-xs text-[color:var(--muted-2)]">{label}</dt>
                          <dd className="text-sm font-bold">{result[key].toFixed(1)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- TEACHERS (cream) ---------- */}
        <section id="teachers" className="lp-section lp-cream">
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <p className="lp-eyebrow lp-eyebrow-dark">{t('landing.teachersEyebrow')}</p>
              <h2 className="lp-h2 mt-5">{t('landing.teachersTitle')}</h2>
            </Reveal>
            <div className="lp-grid mt-12">
              {page.teachers.map((teacher, index) => (
                <Reveal key={teacher.id} delay={(index % 4) * 0.05}>
                  <article className="lp-card lp-tone-white group relative h-full overflow-hidden">
                    <div className="flex items-start justify-between">
                      <Avatar name={teacher.fullName} src={teacher.avatar} size="h-16 w-16 text-lg" />
                      <span className="lp-tag bg-[color:var(--yellow)]">IELTS {teacher.ieltsScore.toFixed(1)}</span>
                    </div>
                    <h3 className="mt-5 font-heavy text-base">{teacher.fullName}</h3>
                    <p className="text-sm font-bold text-[#B23A1E]">{c(teacher, 'position')}</p>
                    <p className="mt-3 text-sm opacity-75">{teacher.experience} {t('landing.yearsTeaching')} · {teacher.studentsCount ?? 0} {t('landing.studentsEnrolled')}</p>
                    {teacher.rating ? (
                      <p className="mt-1 flex items-center gap-1 text-sm font-bold">
                        <Star size={13} fill="currentColor" />{teacher.rating}<span className="opacity-60">({teacher.reviewCount})</span>
                      </p>
                    ) : null}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-[color:var(--yellow)] p-6 text-sm leading-relaxed text-[color:var(--ink)] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="font-bold">{teacher.specialization}</p>
                      <p className="mt-1.5">{c(teacher, 'bio')}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- STUDENT STORIES ---------- */}
        <section id="stories" className="lp-section">
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <h2 className="lp-h2">{t('landing.storiesTitle')}</h2>
              <p className="mt-4 text-sm text-[color:var(--muted-2)]">{t('landing.demoNotice')}</p>
            </Reveal>
            <div className="lp-grid mt-12">
              {page.testimonials.map((item, index) => (
                <Reveal key={item.id} delay={(index % 3) * 0.05}>
                  <article className={cn('lp-card flex h-full flex-col', index % 3 === 1 && 'lp-tone-yellow')}>
                    <p className="font-heavy text-5xl leading-none text-[color:var(--coral)]">“</p>
                    <blockquote className="mt-2 flex-1 text-[1.02rem] leading-relaxed">{c(item, 'quote')}</blockquote>
                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 pt-4" style={{ borderColor: 'color-mix(in srgb, currentColor 18%, transparent)' }}>
                      <Avatar name={item.name} size="h-11 w-11 text-sm" />
                      <div className="min-w-[9rem] flex-1">
                        <p className="font-bold">{item.name}</p>
                        <p className="lp-card-muted truncate text-sm">{item.course}</p>
                      </div>
                      <span className="lp-tag">{item.levelBefore} → {Number(item.ieltsScore).toFixed(1)}</span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- HOW IT WORKS (cream) ---------- */}
        <section className="lp-section lp-cream">
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <h2 className="lp-h2">{t('landing.stepsTitle')}</h2>
            </Reveal>
            <div className="lp-grid mt-12">
              {page.steps.map((step, index) => (
                <Reveal key={step.id} delay={index * 0.05}>
                  <div className={cn('lp-card h-full', ['lp-tone-ink', 'lp-tone-coral', 'lp-tone-yellow', 'lp-tone-white'][index % 4])}>
                    <span className="lp-code">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="mt-6 font-heavy text-lg">{c(step, 'title')}</h3>
                    <p className="mt-2 text-[0.95rem] leading-relaxed opacity-80">{c(step, 'text')}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- EVENTS ---------- */}
        <section id="events" className="lp-section">
          <div className="lp-wrap">
            <Reveal className="max-w-3xl">
              <h2 className="lp-h2">{t('landing.eventsTitle')}</h2>
            </Reveal>
            <div className="lp-grid lp-grid-wide mt-12">
              {page.events.slice(0, 6).map((event, index) => (
                <Reveal key={event.id} delay={(index % 3) * 0.05}>
                  <article className="lp-card flex h-full gap-5">
                    <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-[color:var(--coral)] text-[color:var(--ink)]">
                      <span className="font-heavy text-2xl leading-none">{event.date.slice(8, 10)}</span>
                      <span className="text-xs font-bold">{event.date.slice(5, 7)}.{event.date.slice(2, 4)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="lp-tag">{event.type}</span>
                      <h3 className="mt-3 font-heavy text-base">{event.title}</h3>
                      <p className="lp-card-muted mt-2 text-sm leading-relaxed">{event.description}</p>
                      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-[color:var(--muted-2)]">
                        <Clock size={13} />{event.time}<span className="mx-1">·</span><MapPin size={13} />{event.location}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- BRANCHES (Olmaliq) ---------- */}
        {Boolean(page.branches?.length) && (
          <section id="branches" className="lp-section lp-yellow">
            <div className="lp-wrap">
              <Reveal className="max-w-3xl">
                <p className="lp-eyebrow lp-eyebrow-dark">{page.settings?.branchesTitle || t('landing.branchesEyebrow')}</p>
                <h2 className="lp-h2 mt-5">{t('landing.branchesTitle')}</h2>
                <p className="mt-5 text-lg leading-relaxed">{page.settings?.branchesSubtitle || t('landing.branchesSubtitle')}</p>
              </Reveal>

              <div className="lp-grid lp-grid-wide mt-12">
                {page.branches.map((branch, index) => (
                  <Reveal key={branch.id} delay={index * 0.08}>
                    <article className="lp-card lp-tone-ink flex h-full flex-col overflow-hidden !p-0">
                      {branch.image && (
                        <img src={branch.image} alt={c(branch, 'name')} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                      )}
                      <div className="flex flex-1 flex-col p-7">
                        <span className="lp-code text-[color:var(--yellow)]">{String(index + 1).padStart(2, '0')}</span>
                        <h3 className="mt-4 font-heavy text-xl">{c(branch, 'name')}</h3>

                        {c(branch, 'address') ? (
                          <p className="mt-3 flex gap-2.5 text-[0.95rem] leading-relaxed text-[color:var(--muted)]">
                            <MapPin size={16} className="mt-0.5 shrink-0 text-[color:var(--coral)]" />
                            <span>{c(branch, 'address')}</span>
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-[color:var(--yellow)]">{t('landing.branchSetup')}</p>
                        )}

                        <dl className="mt-3 flex-1 space-y-2 text-sm text-[color:var(--muted)]">
                          {c(branch, 'landmark') && (
                            <div className="flex gap-2.5"><Navigation size={14} className="mt-0.5 shrink-0" /><dd>{c(branch, 'landmark')}</dd></div>
                          )}
                          {branch.phone && (
                            <div className="flex gap-2.5"><Phone size={14} className="mt-0.5 shrink-0" />
                              <dd><a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="hover:text-[color:var(--yellow)]">{branch.phone}</a></dd>
                            </div>
                          )}
                          {c(branch, 'workingHours') && (
                            <div className="flex gap-2.5"><Clock size={14} className="mt-0.5 shrink-0" /><dd>{c(branch, 'workingHours')}</dd></div>
                          )}
                        </dl>

                        {branch.video && (
                          <a href={branch.video} target="_blank" rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[color:var(--yellow)]">
                            <PlayCircle size={15} />{t('landing.watchVideo')}
                          </a>
                        )}

                        {(branch.googleMaps || branch.yandexMaps) && (
                          <div className="mt-6 flex flex-wrap gap-3 border-t-2 border-[color:var(--line)] pt-6">
                            {branch.googleMaps && (
                              <a href={branch.googleMaps} target="_blank" rel="noreferrer" className="lp-btn lp-btn-yellow lp-btn-sm">
                                <MapPin size={15} />{t('landing.googleMaps')}
                              </a>
                            )}
                            {branch.yandexMaps && (
                              <a href={branch.yandexMaps} target="_blank" rel="noreferrer" className="lp-btn lp-btn-ghost lp-btn-sm">
                                <Navigation size={15} />{t('landing.yandexMaps')}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- MEDIA / SCHOOL LIFE ---------- */}
        {Boolean(page.media?.length) && (
          <section id="media" className="lp-section">
            <div className="lp-wrap">
              <Reveal className="max-w-3xl">
                <p className="lp-eyebrow">{page.settings?.mediaTitle || t('landing.mediaEyebrow')}</p>
                <h2 className="lp-h2 mt-5">{t('landing.mediaTitle')}</h2>
                {page.settings?.mediaSubtitle && <p className="mt-5 text-lg leading-relaxed text-[color:var(--muted)]">{page.settings.mediaSubtitle}</p>}
              </Reveal>

              <div className="lp-grid mt-12">
                {page.media.slice(0, 9).map((post, index) => (
                  <Reveal key={post.id} delay={(index % 3) * 0.08}>
                    <button type="button" onClick={() => setMediaPost(post)} className="lp-card block h-full w-full overflow-hidden !p-0 text-left">
                      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--ink)]">
                        {post.image ? (
                          <img src={post.image} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-[color:var(--coral)]" aria-hidden="true"><Video size={28} className="text-[color:var(--ink)]" /></span>
                        )}
                        {post.video && (
                          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                            <PlayCircle size={48} className="text-[color:var(--cream)]" />
                          </span>
                        )}
                        <span className="lp-tag absolute left-4 top-4 border-[color:var(--ink)] bg-[color:var(--yellow)] text-[color:var(--ink)]">{post.category}</span>
                      </div>
                      <div className="p-7">
                        <h3 className="font-heavy text-base">{c(post, 'title')}</h3>
                        <p className="lp-card-muted mt-2 line-clamp-2 text-sm leading-relaxed">{c(post, 'description')}</p>
                        <p className="mt-3 text-sm text-[color:var(--muted-2)]">{formatDate(post.date)}</p>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- FAQ (cream) ---------- */}
        <section id="faq" className="lp-section lp-cream">
          <div className="lp-wrap grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <Reveal className="lg:sticky lg:top-28">
              <h2 className="lp-h2">{t('landing.faqTitle')}</h2>
              <p className="mt-6 max-w-[42ch] text-lg leading-relaxed lp-text-soft">{t('landing.faqHelp')}</p>
            </Reveal>
            <Reveal>
              <div className="space-y-3">
                {page.faq.map((item, index) => (
                  <details key={item.id} className="lp-faq group" open={index === 0}>
                    <summary className="flex min-h-[3.5rem] cursor-pointer items-center justify-between gap-6 px-6 py-4">
                      <span className="font-heavy text-sm sm:text-base">{c(item, 'question')}</span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--yellow)] transition group-open:rotate-45">
                        <Plus size={18} />
                      </span>
                    </summary>
                    <p className="max-w-[62ch] px-6 pb-6 leading-relaxed">{c(item, 'answer')}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- FIRST LESSON FREE + SIGN-UP ---------- */}
        <section id="contact" className="lp-section">
          <div className="lp-wrap grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <Reveal>
              <h2 className="lp-h2 !text-[clamp(44px,6.5vw,88px)] !leading-[1]">
                {t('landing.finalLead')}<br /><span className="text-[color:var(--yellow)]">{t('landing.finalMark')}</span>
              </h2>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-[color:var(--muted)]">{t('landing.finalHint')}</p>
              <dl className="mt-10 space-y-4">
                {[[MapPin, t('common.address'), page.contact.address], [Phone, t('common.phone'), page.contact.phone],
                  [Mail, t('common.email'), page.contact.email], [Clock, t('common.workingHours'), page.contact.workingHours]].map(([Icon, label, value]) => (
                  <div key={label} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:var(--line)] text-[color:var(--yellow)]"><Icon size={18} /></span>
                    <div><dt className="text-sm text-[color:var(--muted-2)]">{label}</dt><dd className="mt-0.5 font-bold">{value}</dd></div>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal>
              <form onSubmit={sendContact} noValidate className="lp-form">
                <label className="block">
                  <span className="lp-label">{t('common.fullName')}</span>
                  <input className="lp-input" name="fullName" placeholder={t('form.egName')} value={contactForm.fullName}
                    onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })} />
                </label>
                <label className="mt-5 block">
                  <span className="lp-label">{t('common.phone')}</span>
                  <input className="lp-input" name="phone" type="tel" placeholder="+998 90 123 45 67" value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                </label>
                <fieldset className="mt-5">
                  <legend className="lp-label">{t('landing.chosenCourse')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {page.courses.map((course) => {
                      const chosen = contactForm.course === course.name;
                      return (
                        <button key={course.id} type="button" aria-pressed={chosen}
                          onClick={() => setContactForm({ ...contactForm, course: chosen ? '' : course.name })}
                          className={cn('lp-chip', chosen && 'lp-chip-on')}>
                          {c(course, 'name')}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="mt-5 block">
                  <span className="lp-label">{t('common.message')}</span>
                  <textarea className="lp-input lp-textarea" name="message" rows={2} value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
                </label>
                <button type="submit" disabled={sending} className="lp-submit mt-7">
                  {sending && <Loader2 size={18} className="animate-spin" />}{t('landing.signUp')}
                </button>
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="lp-footer">
        <div className="lp-wrap flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="font-heavy text-sm uppercase tracking-wide text-[color:var(--cream)]">{page.settings?.brandName || 'TJ Language School'}</span>
            <p className="mt-2 max-w-[40ch] leading-relaxed">{c(page.footer, 'tagline')}</p>
          </div>
          <nav aria-label={t('field.links')} className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#courses">{t('landing.coursesEyebrow')}</a>
            <a href="#branches">{t('landing.branchesEyebrow')}</a>
            <Link to="/register">{t('nav.register')}</Link>
            <Link to="/login">{t('nav.login')}</Link>
            <Link to="/request-status">{t('landing.checkRequest')}</Link>
            {['telegram', 'instagram', 'youtube', 'facebook'].filter((key) => page.settings?.social?.[key]).map((key) => (
              <a key={key} href={page.settings.social[key]} target="_blank" rel="noreferrer" className="capitalize">{key}</a>
            ))}
          </nav>
        </div>
        <div className="lp-wrap mt-8 flex flex-col gap-2 border-t border-[#2A2B5C] pt-5 sm:flex-row sm:justify-between">
          <p>{c(page.footer, 'copyright')}</p>
          <p>{page.contact.address} · {page.contact.phone}</p>
        </div>
      </footer>

      {/* Media preview */}
      {mediaPost && (
        <Modal open onClose={() => setMediaPost(null)} title={mediaPost.title} description={mediaPost.category} size="lg">
          {mediaPost.image && (
            <img src={mediaPost.image} alt={mediaPost.title} className="mb-5 w-full rounded-card object-cover" />
          )}
          <p className="leading-relaxed text-navy-600">{mediaPost.description}</p>
          <p className="mt-3 text-sm text-navy-400">{formatDate(mediaPost.date)}</p>
          {mediaPost.video && (
            <a href={mediaPost.video} target="_blank" rel="noreferrer" className="btn-primary btn-sm mt-5">
              <PlayCircle size={16} />{t('landing.watchVideo')}
            </a>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   AUTH PAGE SHELL — shared frame for login, register and request status
   ========================================================================== */

function AuthShell({ title, subtitle, aside, children, footer }) {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-gradient font-display text-lg font-bold text-white shadow-glow">TJ</span>
            <span className="font-display text-[0.95rem] font-bold text-navy-900">TJ Language School</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-900">
              <ArrowLeft size={15} />{t('common.back')}
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="text-display-sm text-navy-900">{title}</h1>
          <p className="mt-3 text-navy-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-navy-500">{footer}</div>}
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid opacity-60" style={{ backgroundSize: '64px 64px' }} />
          <div className="absolute -left-16 top-16 h-96 w-96 animate-drift rounded-full bg-electric-600/25 blur-[110px]" />
          <div className="absolute -right-10 bottom-0 h-96 w-96 animate-drift rounded-full bg-violet-600/25 blur-[110px]" style={{ animationDelay: '-7s' }} />
        </div>
        <div className="relative flex h-full flex-col justify-center px-16">{aside}</div>
      </aside>
    </div>
  );
}

/* ==========================================================================
   6. LOGIN SYSTEM
   --------------------------------------------------------------------------
   Login is completely independent of registration. It only checks an existing
   account and redirects by role. It never creates anything.
   ========================================================================== */

function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form);
      toast.success(`${t('auth.welcomeBack')}, ${user.fullName.split(' ')[0]}.`);
      // Role decides the destination: admin, teacher and student each get their own.
      const from = location.state?.from?.pathname;
      navigate(from?.startsWith(`/${user.role}`) ? from : DASHBOARD_HOME[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.welcomeBack')}
      subtitle={t('auth.loginSubtitle')}
      footer={<>{t('auth.noAccount')} <Link to="/register" className="font-semibold text-electric-600 hover:underline">{t('nav.register')}</Link></>}
      aside={
        <>
          <p className="eyebrow-dark">{t('nav.login')}</p>
          <h2 className="mt-6 max-w-[18ch] text-display-sm text-white">{t('auth.loginTitle')}</h2>
          <ul className="mt-10 space-y-4">
            {[t('menu.lessons'), t('menu.homework'), t('menu.payments')].map((item) => (
              <li key={item} className="flex items-start gap-3 text-navy-200">
                <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-electric-400" />{item}
              </li>
            ))}
          </ul>
          <div className="glass mt-12 max-w-sm rounded-panel p-6">
            <p className="text-sm font-medium text-white">Demo</p>
            <dl className="mt-3 space-y-2 text-sm text-navy-300">
              {[['admin@tjlanguageschool.uz', 'Admin123!'], ['teacher1@tjlanguageschool.uz', 'Teacher123!'], ['student1@tjlanguageschool.uz', 'Student123!']].map(([email, password]) => (
                <div key={email} className="flex justify-between gap-4"><dt>{email}</dt><dd className="font-mono text-navy-200">{password}</dd></div>
              ))}
            </dl>
          </div>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label={t('common.email')} name="email" type="email" autoComplete="email" placeholder="you@example.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label={t('common.password')} name="password" type="password" autoComplete="current-password" placeholder="••••••••"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">{t('auth.loginButton')}</Button>
      </form>

      <p className="mt-6 rounded-xl bg-mist px-4 py-3 text-xs leading-relaxed text-navy-500">
        {t('auth.loginSubtitle')}{' '}
        <Link to="/request-status" className="font-semibold text-electric-600 hover:underline">{t('auth.checkStatus')}</Link>.
      </p>
    </AuthShell>
  );
}

/* ==========================================================================
   7. REGISTER SYSTEM
   --------------------------------------------------------------------------
   Register does ONE thing: it sends a student registration request. It never
   creates an account, never signs anyone in, and has no role selector — the
   role is always "student", decided on the server.
   ========================================================================== */

function RegisterPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});

    // Client-side checks first, so obvious mistakes never reach the server.
    const found = {};
    if (form.fullName.trim().length < 3) found.fullName = t('valid.fullName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) found.email = t('valid.email');
    if (!/^[+()\d\s-]{7,20}$/.test(form.phone)) found.phone = t('valid.phone');
    if (form.password.length < 6) found.password = t('valid.password');
    if (form.password !== form.confirmPassword) found.confirmPassword = t('valid.passwordMatch');
    if (Object.keys(found).length) { setErrors(found); return; }

    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', form);
      toast.success(t('auth.requestSent'));
      setSent(true);
    } catch (err) {
      // Server field errors arrive as codes; turn them into the chosen language.
      const raw = err.fieldErrors ?? {};
      setErrors(Object.fromEntries(Object.entries(raw).map(([field, code]) => {
        const text = t(`valid.${code}`);
        return [field, text === `valid.${code}` ? code : text];
      })));
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const aside = (
    <>
      <p className="eyebrow-dark">{t('register.asideEyebrow')}</p>
      <h2 className="mt-6 max-w-[20ch] text-display-sm text-white">{t('register.asideTitle')}</h2>
      <ol className="mt-10 space-y-4">
        {[t('register.step1'), t('register.step2'), t('register.step3'), t('register.step4')].map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-navy-200">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-10 max-w-sm text-sm text-navy-400">{t('register.asideNote')}</p>
    </>
  );

  // After a successful request there is nothing more to fill in — show what happens next.
  if (sent) {
    return (
      <AuthShell title={t('register.sentTitle')} subtitle={t('register.sentSubtitle')} aside={aside}>
        <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-6">
          <CheckCircle2 size={26} className="text-emerald-600" />
          <p className="mt-3 font-semibold text-emerald-900">{t('auth.requestSent')}</p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-800">{t('register.sentBody')}</p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link to="/request-status" className="btn-secondary">{t('auth.checkStatus')}</Link>
          <Link to="/login" className="btn-primary">{t('register.goToLogin')}</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      aside={aside}
      footer={<>{t('auth.haveAccount')} <Link to="/login" className="font-semibold text-electric-600 hover:underline">{t('nav.login')}</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label={t('common.fullName')} name="fullName" autoComplete="name" placeholder={t('form.egName')}
          value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('common.email')} name="email" type="email" autoComplete="email" placeholder="you@example.com"
            value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label={t('common.phone')} name="phone" autoComplete="tel" placeholder="+998 90 123 45 67"
            value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <Field label={t('common.password')} name="password" type="password" autoComplete="new-password" placeholder={t('valid.atLeast6')}
          value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Field label={t('auth.confirmPassword')} name="confirmPassword" type="password" autoComplete="new-password" placeholder={t('valid.repeatPassword')}
          value={form.confirmPassword} error={errors.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />

        <Button type="submit" loading={busy} className="w-full">{t('auth.registerButton')}</Button>
      </form>

      <p className="mt-6 rounded-xl bg-mist px-4 py-3 text-xs leading-relaxed text-navy-500">{t('register.noRoleNote')}</p>
    </AuthShell>
  );
}

/* ==========================================================================
   8. REQUEST STATUS PAGE
   --------------------------------------------------------------------------
   Anyone can look up their own request by email. Only the status and dates are
   returned — never a password or another person's details.
   ========================================================================== */

function RequestStatusPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const { data } = await api.get('/requests/status', { params: { email } });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const explain = {
    pending: 'Your registration request is still pending. An admin will review it shortly.',
    approved: 'Your request was approved. You can log in with the password you chose when registering.',
    rejected: 'Your registration request was rejected. Contact the school if you think this is a mistake.',
  };

  return (
    <AuthShell
      title={t('page.checkRequestTitle')}
      subtitle={t('page.checkRequestHint')}
      footer={<>{t('msg.approvedAlready')} <Link to="/login" className="font-semibold text-electric-600 hover:underline">{t('nav.login')}</Link></>}
      aside={
        <>
          <p className="eyebrow-dark">{t('auth.statusTitle')}</p>
          <h2 className="mt-6 max-w-[18ch] text-display-sm text-white">{t('msg.noAccountYet')}</h2>
          <p className="mt-6 max-w-sm text-navy-300">
            Most requests are reviewed within one working day. You will also get a notification in your
            account as soon as it is approved.
          </p>
        </>
      }
    >
      <form onSubmit={check} noValidate className="space-y-5">
        <Field label={t('common.email')} name="email" type="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" loading={busy} className="w-full">{t('btn.checkStatus')}</Button>
      </form>

      {error && (
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-panel border border-navy-100 bg-mist p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-navy-900">{result.fullName}</p>
            <Badge status={result.status} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-navy-600">{explain[result.status]}</p>
          <p className="mt-3 text-xs text-navy-400">Requested {formatDate(result.requestDate)}
            {result.reviewedAt ? ` · reviewed ${formatDate(result.reviewedAt)}` : ''}</p>
          {result.status === 'approved' && <Link to="/login" className="btn-primary btn-sm mt-4">{t('btn.loginNow')}</Link>}
        </div>
      )}
    </AuthShell>
  );
}

/* ==========================================================================
   9. DASHBOARD SHELL
   --------------------------------------------------------------------------
   Sidebar + topbar shared by the admin, teacher and student panels. The menu
   for each role is defined right here.
   ========================================================================== */

const ADMIN_MENU = [
  ['/admin/dashboard', 'menu.dashboard', LayoutDashboard],
  ['/admin/analytics', 'menu.analytics', BarChart3],
  ['/admin/students', 'menu.students', GraduationCap],
  ['/admin/requests', 'menu.requests', UserCheck],
  ['/admin/teachers', 'menu.teachers', Users],
  ['/admin/groups', 'menu.groups', Boxes],
  ['/admin/courses', 'menu.courses', BookOpen],
  ['/admin/payments', 'menu.payments', Wallet],
  ['/admin/attendance', 'menu.attendance', CalendarCheck],
  ['/admin/homework', 'menu.homework', ClipboardList],
  ['/admin/lessons', 'menu.lessons', CalendarDays],
  ['/admin/quizzes', 'menu.quizzes', ClipboardCheck],
  ['/admin/reviews', 'menu.reviews', Star],
  ['/admin/leads', 'menu.leads', Send],
  ['/admin/course-requests', 'enrol.adminTitle', BookOpen],
  ['/admin/announcements', 'menu.announcements', Megaphone],
  ['/admin/notifications', 'menu.notifications', Bell],
  ['/admin/competitions', 'menu.competitions', Trophy],
  ['/admin/branches', 'menu.branches', MapPin],
  ['/admin/media', 'menu.media', Video],
  ['/admin/landing-page', 'menu.landingPage', Layout],
  ['/admin/settings', 'menu.settings', SettingsIcon],
];

const TEACHER_MENU = [
  ['/teacher/dashboard', 'menu.dashboard', LayoutDashboard],
  ['/teacher/live', 'live.liveNow', Radio],
  ['/teacher/groups', 'menu.myGroups', Boxes],
  ['/teacher/students', 'menu.students', GraduationCap],
  ['/teacher/lessons', 'menu.lessons', CalendarDays],
  ['/teacher/homework', 'menu.homework', ClipboardList],
  ['/teacher/attendance', 'menu.attendance', CalendarCheck],
  ['/teacher/quizzes', 'menu.quizzes', ClipboardCheck],
  ['/teacher/reviews', 'menu.reviews', Star],
  ['/teacher/competitions', 'menu.competitions', Trophy],
  ['/teacher/notifications', 'menu.notifications', Bell],
  ['/teacher/profile', 'menu.profile', UserRound],
];

const STUDENT_MENU = [
  ['/student/dashboard', 'menu.dashboard', LayoutDashboard],
  ['/student/discover', 'menu.discover', Compass],
  ['/student/group', 'menu.myGroup', Boxes],
  ['/student/lessons', 'menu.myLessons', CalendarDays],
  ['/student/homework', 'menu.homework', ClipboardList],
  ['/student/attendance', 'menu.attendance', CalendarCheck],
  ['/student/payments', 'menu.payments', Wallet],
  ['/student/tests', 'menu.tests', ClipboardCheck],
  ['/student/games', 'menu.games', Gamepad2],
  ['/student/leaderboard', 'menu.leaderboard', Trophy],
  ['/student/results', 'menu.results', BarChart3],
  ['/student/competitions', 'menu.competitions', Award],
  ['/student/extra-classes', 'menu.extraClasses', Sparkles],
  ['/student/notifications', 'menu.notifications', Bell],
  ['/student/profile', 'menu.profile', UserRound],
];

const MENU_BY_ROLE = { admin: ADMIN_MENU, teacher: TEACHER_MENU, student: STUDENT_MENU };
const ROLE_LABEL = { admin: 'menu.adminPanel', teacher: 'menu.teacherPanel', student: 'menu.studentPanel' };
const ROLE_SHORT = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' };

function DashboardLayout() {
  const { user, profile, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inbox, setInbox] = useState({ data: [], unread: 0 });

  const menu = MENU_BY_ROLE[user.role];

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setInbox(data)).catch(() => {});
  }, [location.pathname]);

  // LOGOUT — clears state and token, then goes to /login.
  const signOut = () => {
    logout();
    toast.info(t('auth.signedOut'));
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-mist">
      {sidebarOpen && <div aria-hidden="true" className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col bg-navy-950 transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-action-gradient font-display text-lg font-bold text-white">TJ</span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-white">TJ Language School</span>
              <span className="block text-[0.7rem] text-navy-400">{t(ROLE_LABEL[user.role])}</span>
            </span>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label={t('nav.closeMenu')}
            className="rounded-lg p-1.5 text-navy-300 hover:bg-white/10 lg:hidden"><X size={18} /></button>
        </div>

        <nav aria-label={t('menu.dashboard')} className="scroll-slim flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {menu.map(([to, labelKey, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
              <Icon size={17} />{t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={signOut} className="nav-item w-full text-rose-300 hover:text-rose-200">
            <LogOut size={17} />{t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label={t('nav.openMenu')}
              className="rounded-xl border border-navy-200 p-2 text-navy-700 lg:hidden"><Menu size={18} /></button>

            <p className="hidden text-sm text-navy-500 sm:block">
              {t(menu.find(([to]) => to === location.pathname)?.[1] ?? 'menu.dashboard')}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher />
              <Link to={`/${user.role}/notifications`} aria-label={`${t('menu.notifications')}: ${inbox.unread}`}
                className="relative rounded-xl border border-navy-200 p-2.5 text-navy-700 hover:bg-mist">
                <Bell size={18} />
                {inbox.unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold text-white">
                    {inbox.unread > 9 ? '9+' : inbox.unread}
                  </span>
                )}
              </Link>
              <Link to={`/${user.role}/profile`} className="flex items-center gap-2.5 rounded-xl border border-navy-200 py-1.5 pl-1.5 pr-3 hover:bg-mist">
                <Avatar name={user.fullName} src={profile?.avatar ?? user.avatar} size="h-8 w-8 text-xs" />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-semibold text-navy-900">{user.fullName.split(' ')[0]}</span>
                  <span className="block text-[0.68rem] text-navy-400">{ROLE_SHORT[user.role]}</span>
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">
          <LiveClassBanner />
          <Outlet />
        </main>

        {/* Mobile bottom navigation. The sidebar is hidden on phones, so these
            are the five destinations people reach for most. */}
        <nav aria-label={t('msg.mobileNav')}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <ul className="mx-auto flex max-w-lg items-stretch">
            {menu.slice(0, 4).map(([to, labelKey, Icon]) => (
              <li key={to} className="flex-1">
                <NavLink to={to}
                  className={({ isActive }) => cn(
                    'flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[0.65rem] font-medium transition',
                    isActive ? 'text-electric-600' : 'text-navy-500'
                  )}>
                  <Icon size={20} />
                  <span className="max-w-full truncate">{t(labelKey)}</span>
                </NavLink>
              </li>
            ))}
            <li className="flex-1">
              <button type="button" onClick={() => setSidebarOpen(true)} aria-label={t('nav.openMenu')}
                className="flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[0.65rem] font-medium text-navy-500">
                <Menu size={20} />
                <span>{t('common.all')}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

/* ==========================================================================
   10. REUSABLE CRUD PAGE
   --------------------------------------------------------------------------
   Most admin sections are the same shape: a searchable table, an add/edit
   modal and a delete confirmation. They all use this one component, so a new
   section is a list of columns plus a list of form fields.
   ========================================================================== */

function CrudPage({
  title, description, resource, label, columns, fields,
  filters = [], canWrite = true, limit = 10, defaults = {}, transform = (values) => values,
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);   // null = closed, {} = new row
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(defaults);
  // Fields marked { i18n: true } get one value per language. The base language
  // writes `name`; the others write `name_ru` / `name_en`.
  const [editLang, setEditLang] = useState(DEFAULT_LANG);
  const hasTranslatable = fields.some((field) => field.i18n);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/${resource}`, { params: { ...activeFilters, search: search || undefined, page, limit } });
      setRows(data.data);
      setTotal(data.total);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever the query changes; searching is debounced so typing is not chatty.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, JSON.stringify(activeFilters)]);

  useEffect(() => setPage(1), [search, JSON.stringify(activeFilters)]);

  const openNew = () => { setForm(defaults); setEditLang(DEFAULT_LANG); setEditing({}); };
  const openEdit = (row) => { setForm({ ...defaults, ...row }); setEditLang(DEFAULT_LANG); setEditing(row); };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = transform(form);
      if (editing.id) await api.patch(`/${resource}/${editing.id}`, body);
      else await api.post(`/${resource}`, body);
      toast.success(t('common.saved'));
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/${resource}/${deleting.id}`);
      toast.success(t('msg.deleted'));
      setDeleting(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const actionColumn = {
    key: 'actions', header: '', className: 'text-right',
    render: (row) => (
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => openEdit(row)} aria-label={t('common.edit')} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-800"><Pencil size={15} /></button>
        <button type="button" onClick={() => setDeleting(row)} aria-label={t('common.delete')} className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
      </div>
    ),
  };

  return (
    <>
      <PageTitle title={title} description={description ?? `${total} in total.`}>
        {canWrite && <Button size="sm" icon={Plus} onClick={openNew}>{t('common.add')}</Button>}
      </PageTitle>

      <Panel bodyClassName="">
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder={t('common.search')}
          filters={filters.map((filter) => ({
            ...filter,
            value: activeFilters[filter.key] ?? '',
            onChange: (value) => setActiveFilters((current) => ({ ...current, [filter.key]: value })),
          }))}
        />
        <Table
          columns={canWrite ? [...columns, actionColumn] : columns}
          rows={rows}
          loading={loading}
          empty={{ title: t('state.noResults'), actionLabel: canWrite ? t('common.add') : undefined, onAction: openNew }}
        />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} />
      </Panel>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)}
        title={`${editing?.id ? t('common.edit') : t('common.add')} — ${label}`}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={saving} onClick={save}>{t('common.save')}</Button>
        </>}>
        <form onSubmit={save} noValidate className="grid gap-5 sm:grid-cols-2">
          {hasTranslatable && (
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 border-b border-navy-100 pb-4">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-navy-400">{t('cms.editingIn')}</span>
              {LANGUAGES.map((item) => {
                const filled = fields.filter((f) => f.i18n).every((f) => String(cmsText(form, f.name, item.code) ?? '').trim());
                return (
                  <button key={item.code} type="button" onClick={() => setEditLang(item.code)} aria-pressed={editLang === item.code}
                    className={cn('flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition',
                      editLang === item.code ? 'border-electric-400 bg-electric-50 text-electric-800' : 'border-navy-200 bg-white text-navy-600 hover:bg-mist')}>
                    <span aria-hidden="true">{item.flag}</span>{item.short}
                    <span className={cn('h-1.5 w-1.5 rounded-full', filled ? 'bg-emerald-500' : 'bg-navy-200')}
                      title={filled ? t('cms.translated') : t('cms.untranslated')} />
                  </button>
                );
              })}
              {editLang !== DEFAULT_LANG && <span className="text-xs text-navy-400">{t('cms.fallbackNote')}</span>}
            </div>
          )}

          {fields
            .filter((field) => !field.onlyOnCreate || !editing?.id)
            .map((field) => {
              const name = field.i18n ? cmsField(field.name, editLang) : field.name;
              return (
                <Field
                  key={name}
                  className={field.full ? 'sm:col-span-2' : ''}
                  label={field.label}
                  name={name}
                  as={field.as}
                  type={field.type}
                  rows={field.rows}
                  options={field.options}
                  hint={field.hint}
                  placeholder={field.i18n && editLang !== DEFAULT_LANG ? (form[field.name] ?? '') : field.placeholder}
                  value={form[name] ?? ''}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                />
              );
            })}
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={saving}
        title={`${t('common.delete')} — ${label}`}
        message={`${deleting?.fullName ?? deleting?.name ?? deleting?.title ?? ''}?`}
      />
    </>
  );
}

/* ==========================================================================
   11. ADMIN DASHBOARD
   ========================================================================== */

/* --------------------------------------------------------------------------
   CHARTS — pulled in only when a page actually draws one
   --------------------------------------------------------------------------
   Recharts is ~420 kB. Loading it lazily keeps it out of the first download
   for everyone who never opens a page with a chart on it.
   -------------------------------------------------------------------------- */
const AreaTrend = lazy(() => import('./Charts').then((m) => ({ default: m.AreaTrend })));
const Bars = lazy(() => import('./Charts').then((m) => ({ default: m.Bars })));
const Donut = lazy(() => import('./Charts').then((m) => ({ default: m.Donut })));

/** Reserves the chart's height while the chunk downloads, so nothing jumps. */
function ChartFrame({ height = 250, children }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center" style={{ height }} role="status" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin text-electric-500" />
      </div>
    }>
      {children}
    </Suspense>
  );
}

function AdminDashboard() {
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/stats/admin').then((r) => r.data));

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const { cards, charts, recentRequests, recentStudents, upcomingLessons } = data;

  const remind = async () => {
    try {
      const { data: result } = await api.post('/payments/remind');
      toast.success(result.sent ? `Reminder sent to ${result.sent} students.` : 'Nobody has an overdue invoice.');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageTitle title={t('page.adminDashboard')} description={t('page.adminDashboardHint')}>
        <Link to="/admin/requests" className="btn-secondary btn-sm"><UserCheck size={16} />{t('btn.studentRequests')}</Link>
        <Link to="/admin/landing-page" className="btn-primary btn-sm">{t('btn.editLanding')}</Link>
      </PageTitle>

      {/* Pending registration requests are the thing an admin most needs to see. */}
      {cards.pendingRequests > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-electric-200 bg-electric-50 px-5 py-4">
          <p className="flex items-center gap-2.5 text-sm font-medium text-electric-900">
            <UserCheck size={18} />
            {cards.pendingRequests} student registration request{cards.pendingRequests === 1 ? '' : 's'} waiting for review.
          </p>
          <Link to="/admin/requests" className="btn-secondary btn-sm">{t('btn.reviewNow')}</Link>
        </div>
      )}

      {cards.overdueStudents > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="flex items-center gap-2.5 text-sm font-medium text-amber-900">
            <AlertTriangle size={18} />{cards.overdueStudents} students have overdue payments.
          </p>
          <Button size="sm" variant="secondary" icon={BellRing} onClick={remind}>{t('btn.sendReminders')}</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={GraduationCap} label={t('field.totalStudents')} value={cards.totalStudents} note={`${cards.activeStudents} ${t('status.active').toLowerCase()}`} />
        <StatCard icon={UserCheck} label={t('field.pendingRequests')} value={cards.pendingRequests} tone="violet" />
        <StatCard icon={Users} label={t('menu.teachers')} value={cards.totalTeachers} note={`${cards.activeGroups} ${t('field.activeGroups')}`} tone="navy" />
        <StatCard icon={Wallet} label={t('field.revenueThisMonth')} value={money(cards.monthlyRevenue)} tone="emerald" />
        <StatCard icon={CalendarCheck} label={t('student.attendanceRate')} value={`${cards.attendanceRate}%`} tone="amber" />
        <StatCard icon={BarChart3} label={t('field.averageIelts')} value={cards.ieltsAverage.toFixed(1)} />
        <StatCard icon={AlertTriangle} label={t('field.overduePayments')} value={cards.overdueStudents} note={t('common.students').toLowerCase()} tone="rose" />
        <StatCard icon={CalendarDays} label={t('field.upcomingEvents')} value={cards.upcomingEvents} tone="violet" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Panel title={t('msg.studentGrowth')} description={t('msg.studentGrowthHint')} className="xl:col-span-2">
          <ChartFrame height={250}>
            <AreaTrend data={charts.studentGrowth} xKey="month" yKey="total" gradientId="growth"
              tickFormatter={formatMonth} labelFormatter={formatMonth} />
          </ChartFrame>
        </Panel>

        <Panel title={t('admin.ieltsBands')} description={t('page.ieltsBandsHint')}>
          <ChartFrame height={250}>
            <Bars data={charts.ieltsBands} xKey="band" yKey="count" multicolour allowDecimals={false} />
          </ChartFrame>
        </Panel>

        <Panel title={t('msg.revenueCollected')} description={t('msg.revenueHint')} className="xl:col-span-3">
          <ChartFrame height={220}>
            <Bars data={charts.revenueByMonth} xKey="period" yKey="amount" color="#7C3AED" height={220}
              xTickFormatter={formatMonth} yTickFormatter={shortMoney} yWidth={44}
              labelFormatter={formatMonth} valueFormatter={(value) => [money(value), t('msg.revenueCollected')]} />
          </ChartFrame>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Panel title={t('page.waitingApproval')} bodyClassName="divide-y divide-navy-50"
          action={<Link to="/admin/requests" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}>
          {recentRequests.length ? recentRequests.map((request) => (
            <div key={request.id} className="flex items-center gap-3 px-5 py-3.5">
              <Avatar name={request.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy-900">{request.fullName}</p>
                <p className="truncate text-xs text-navy-500">{relativeTime(request.requestDate)}</p>
              </div>
              <Badge status="pending" />
            </div>
          )) : <Empty title={t('page.noPending')} />}
        </Panel>

        <Panel title={t('page.newestStudents')} bodyClassName="divide-y divide-navy-50"
          action={<Link to="/admin/students" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}>
          {recentStudents.map((student) => (
            <div key={student.id} className="flex items-center gap-3 px-5 py-3.5">
              <Avatar name={student.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy-900">{student.fullName}</p>
                <p className="truncate text-xs text-navy-500">{student.groupName || 'No group'}</p>
              </div>
              <Badge status={student.paymentStatus} />
            </div>
          ))}
        </Panel>

        <Panel title={t('student.nextLessons')} bodyClassName="divide-y divide-navy-50"
          action={<Link to="/admin/lessons" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}>
          {upcomingLessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-16 shrink-0 rounded-lg bg-mist px-2 py-1.5 text-center">
                <p className="text-xs text-navy-500">{formatDate(lesson.date).slice(0, 6)}</p>
                <p className="text-sm font-semibold text-navy-900">{lesson.time}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{lesson.topic}</p>
                <p className="truncate text-xs text-navy-500">{lesson.groupName}</p>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   STUDENT REQUESTS — its own page, deliberately kept apart from Students.
   Approving is the only thing that creates a student account.
   -------------------------------------------------------------------------- */

function AdminStudentRequests() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // { request, action }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/requests', { params: { status: status || undefined, search: search || undefined } });
      setRows(data.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  const review = async () => {
    const { request, action } = confirming;
    setBusy(true);
    try {
      const { data } = await api.post(`/requests/${request.id}/${action}`);
      toast.success(data.message);
      setConfirming(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = {
    pending: rows.filter((row) => row.status === 'pending').length,
    approved: rows.filter((row) => row.status === 'approved').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
  };

  const columns = [
    {
      key: 'fullName', header: t('page.applicant'),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.fullName} />
          <div className="min-w-0">
            <p className="truncate font-medium text-navy-900">{row.fullName}</p>
            <p className="truncate text-xs text-navy-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: t('common.phone') },
    { key: 'requestDate', header: t('page.requestDate'), render: (row) => `${formatDate(row.requestDate)} · ${relativeTime(row.requestDate)}` },
    { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (row) => row.status === 'pending' ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" icon={Check} onClick={() => setConfirming({ request: row, action: 'approve' })}>{t('btn.approve')}</Button>
          <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setConfirming({ request: row, action: 'reject' })}>{t('btn.reject')}</Button>
        </div>
      ) : (
        <span className="text-xs text-navy-400">
          {row.reviewedBy ? `Reviewed by ${row.reviewedBy}` : 'Reviewed'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageTitle title={t('menu.requests')} description={t('page.requestsHint')} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label={t('status.pending')} value={counts.pending} tone="amber" />
        <StatCard icon={CheckCircle2} label={t('status.approved')} value={counts.approved} tone="emerald" />
        <StatCard icon={XCircle} label={t('status.rejected')} value={counts.rejected} tone="rose" />
      </div>

      <Panel bodyClassName="">
        <Toolbar
          search={search} onSearch={setSearch} placeholder={t('page.searchRequests')}
          filters={[{
            key: 'status', label: t('opt.allStatuses'), value: status, onChange: setStatus,
            options: [
              { value: 'pending', label: t('status.pending') },
              { value: 'approved', label: t('status.approved') },
              { value: 'rejected', label: t('status.rejected') },
            ],
          }]}
        />
        <Table columns={columns} rows={rows} loading={loading}
          empty={{ title: t('msg.noRequests'), description: t('msg.noRequestsHint') }} />
      </Panel>

      <ConfirmModal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={review}
        loading={busy}
        variant={confirming?.action === 'approve' ? 'primary' : 'danger'}
        confirmLabel={confirming?.action === 'approve' ? 'Approve request' : 'Reject request'}
        title={confirming?.action === 'approve' ? 'Approve this request?' : 'Reject this request?'}
        message={confirming?.action === 'approve'
          ? `A student account will be created for ${confirming?.request.fullName}. They will be able to log in straight away with the password they chose.`
          : `${confirming?.request.fullName} will not get an account and will not be able to log in.`}
      />
    </>
  );
}

/* --------------------------------------------------------------------------
   ADMIN — STUDENTS, TEACHERS, COURSES, LESSONS (all through CrudPage)
   -------------------------------------------------------------------------- */

function AdminStudents() {
  const { t } = useLanguage();
  const { data: groupData } = useFetch(() => api.get('/groups', { params: { limit: 100 } }).then((r) => r.data));
  const groups = groupData?.data ?? [];

  return (
    <CrudPage
      title={t('menu.students')} label={t('common.student')} resource="students"
      description={t('page.studentsHint')}
      defaults={{ fullName: '', email: '', phone: '', age: '', level: 'A1', groupId: '', monthlyPayment: 0, paymentStatus: 'pending', status: 'active' }}
      transform={(values) => ({
        ...values,
        age: values.age ? Number(values.age) : null,
        monthlyPayment: Number(values.monthlyPayment || 0),
        groupId: values.groupId || null,
      })}
      filters={[
        { key: 'groupId', label: t('opt.allGroups'), options: groups.map((g) => ({ value: g.id, label: g.name })) },
        { key: 'level', label: t('opt.allLevels'), options: LEVELS.map((level) => ({ value: level, label: level })) },
        { key: 'paymentStatus', label: t('opt.anyPayment'), options: [
          { value: 'paid', label: t('status.paid') }, { value: 'pending', label: t('status.pending') }, { value: 'overdue', label: t('status.overdue') }] },
      ]}
      columns={[
        { key: 'fullName', header: t('common.student'), render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.fullName} />
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">{row.fullName}</p>
              <p className="truncate text-xs text-navy-500">{row.email}</p>
            </div>
          </div>
        ) },
        { key: 'level', header: t('common.level') },
        { key: 'groupName', header: t('common.group'), render: (row) => row.groupName || t('page.noGroup') },
        { key: 'attendanceRate', header: t('menu.attendance'), render: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-navy-100">
              <span className="block h-full rounded-full bg-action-gradient" style={{ width: `${row.attendanceRate}%` }} />
            </div>
            <span className="text-xs font-semibold">{row.attendanceRate}%</span>
          </div>
        ) },
        { key: 'paymentStatus', header: t('field.payment'), render: (row) => <Badge status={row.paymentStatus} /> },
        { key: 'ieltsScore', header: 'IELTS', render: (row) => (row.ieltsScore ? row.ieltsScore.toFixed(1) : '—') },
        { key: 'joinDate', header: t('page.joined'), render: (row) => formatDate(row.joinDate) },
      ]}
      fields={[
        { name: 'fullName', label: t('common.fullName'), full: true },
        { name: 'email', label: t('common.email'), type: 'email' },
        { name: 'phone', label: t('common.phone') },
        { name: 'age', label: t('form.age'), type: 'number' },
        { name: 'level', label: t('common.level'), as: 'select', options: LEVELS },
        { name: 'groupId', label: t('common.group'), as: 'select', options: [{ value: '', label: t('opt.noGroup') }, ...groups.map((g) => ({ value: g.id, label: g.name }))] },
        { name: 'monthlyPayment', label: t('form.monthlyPayment'), type: 'number' },
        { name: 'paymentStatus', label: t('form.paymentStatus'), as: 'select', options: [
          { value: 'paid', label: t('status.paid') }, { value: 'pending', label: t('status.pending') }, { value: 'overdue', label: t('status.overdue') }] },
        { name: 'status', label: t('common.status'), as: 'select', options: [{ value: 'active', label: t('status.active') }, { value: 'inactive', label: t('status.inactive') }] },
        { name: 'notes', label: t('form.notes'), as: 'textarea', rows: 3, full: true },
      ]}
    />
  );
}

function AdminTeachers() {
  const { t } = useLanguage();
  return (
    <CrudPage
      title={t('menu.teachers')} label={t('common.teacher')} resource="teachers"
      description={t('page.teachersHint')}
      defaults={{ fullName: '', email: '', phone: '', password: '', position: 'English Instructor', experience: 1, ieltsScore: 7, specialization: '', bio: '', status: 'active' }}
      transform={(values) => ({
        ...values,
        experience: Number(values.experience || 0),
        ieltsScore: Number(values.ieltsScore || 0),
      })}
      columns={[
        { key: 'fullName', header: t('common.teacher'), render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.fullName} />
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">{row.fullName}</p>
              <p className="truncate text-xs text-navy-500">{row.email}</p>
            </div>
          </div>
        ) },
        { key: 'position', header: t('page.position') },
        { key: 'specialization', header: t('page.specialism') },
        { key: 'experience', header: t('page.experience'), render: (row) => `${row.experience} ${t('page.years')}` },
        { key: 'ieltsScore', header: 'IELTS', render: (row) => (row.ieltsScore ? row.ieltsScore.toFixed(1) : '—') },
        { key: 'groups', header: t('menu.groups'), render: (row) => (row.groups ?? []).length },
        { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
      ]}
      fields={[
        { name: 'fullName', label: t('common.fullName'), full: true },
        { name: 'email', label: t('common.email'), type: 'email' },
        { name: 'phone', label: t('common.phone') },
        { name: 'password', label: t('form.accountPassword'), onlyOnCreate: true, full: true, hint: 'Leave empty to use Teacher123!' },
        { name: 'position', label: t('page.position'), i18n: true },
        { name: 'specialization', label: t('page.specialism'), placeholder: t('form.egSpecialism') },
        { name: 'experience', label: t('form.yearsExperience'), type: 'number' },
        { name: 'ieltsScore', label: t('form.ownIelts'), type: 'number', step: '0.5' },
        { name: 'status', label: t('common.status'), as: 'select', options: [{ value: 'active', label: t('status.active') }, { value: 'inactive', label: t('status.inactive') }] },
        { name: 'bio', label: t('form.shortBio'), as: 'textarea', rows: 3, full: true, i18n: true },
      ]}
    />
  );
}

function AdminCourses() {
  const { t } = useLanguage();
  return (
    <CrudPage
      title={t('menu.courses')} label={t('common.course')} resource="courses"
      description={t('page.coursesHint')}
      defaults={{ name: '', level: '', duration: '', lessonsCount: 48, pricePerMonth: 450000, schedule: '', description: '', showOnSite: 'true' }}
      transform={(values) => ({
        ...values,
        lessonsCount: Number(values.lessonsCount || 0),
        pricePerMonth: Number(values.pricePerMonth || 0),
        showOnSite: String(values.showOnSite) === 'true',
      })}
      columns={[
        { key: 'name', header: t('common.course'), render: (row) => (
          <div><p className="font-medium text-navy-900">{row.name}</p><p className="line-clamp-1 text-xs text-navy-500">{row.description}</p></div>
        ) },
        { key: 'level', header: t('common.level') },
        { key: 'duration', header: t('common.duration') },
        { key: 'lessonsCount', header: t('menu.lessons') },
        { key: 'pricePerMonth', header: t('page.pricePerMonth'), render: (row) => money(row.pricePerMonth) },
        { key: 'showOnSite', header: t('field.onWebsite'), render: (row) => <Badge status={row.showOnSite ? 'active' : 'inactive'}>{row.showOnSite ? t('common.visible') : t('common.hidden')}</Badge> },
      ]}
      fields={[
        { name: 'name', label: t('form.courseName'), full: true, i18n: true },
        { name: 'level', label: t('form.levelRange'), placeholder: 'B1 – C1' },
        { name: 'duration', label: t('common.duration'), placeholder: t('form.egDuration') },
        { name: 'lessonsCount', label: t('form.lessonCount'), type: 'number' },
        { name: 'pricePerMonth', label: t('form.pricePerMonthUzs'), type: 'number' },
        { name: 'schedule', label: t('common.schedule'), placeholder: t('form.egSchedule') },
        { name: 'showOnSite', label: t('form.showOnWebsite'), as: 'select', options: [{ value: 'true', label: t('common.visible') }, { value: 'false', label: t('common.hidden') }] },
        { name: 'description', label: t('common.description'), as: 'textarea', rows: 3, full: true, i18n: true },
      ]}
    />
  );
}

function LessonsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: groupData } = useFetch(() => api.get('/groups', { params: { limit: 100 } }).then((r) => r.data));
  const groups = groupData?.data ?? [];

  return (
    <CrudPage
      title={t('menu.lessons')} label={t('menu.lessons')} resource="lessons"
      description={user.role === 'student' ? 'Your timetable.' : 'Plan the timetable and record what each lesson covers.'}
      canWrite={user.role !== 'student'}
      defaults={{ topic: '', description: '', groupId: '', date: today(), time: '18:00', duration: 90, room: '', status: 'scheduled' }}
      transform={(values) => ({ ...values, duration: Number(values.duration || 90) })}
      filters={[{ key: 'groupId', label: t('opt.allGroups'), options: groups.map((g) => ({ value: g.id, label: g.name })) }]}
      columns={[
        { key: 'date', header: t('page.when'), render: (row) => (
          <div><p className="font-medium text-navy-900">{formatDate(row.date)}</p><p className="text-xs text-navy-500">{row.time} · {row.duration} min</p></div>
        ) },
        { key: 'topic', header: t('common.topic'), render: (row) => (
          <div className="max-w-sm"><p className="font-medium text-navy-900">{row.topic}</p><p className="line-clamp-1 text-xs text-navy-500">{row.description}</p></div>
        ) },
        { key: 'groupName', header: t('common.group') },
        { key: 'room', header: t('common.room') },
        { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
      ]}
      fields={[
        { name: 'topic', label: t('common.topic'), full: true, placeholder: t('form.egTopic') },
        { name: 'groupId', label: t('common.group'), as: 'select', options: groups.map((g) => ({ value: g.id, label: g.name })) },
        { name: 'room', label: t('common.room') },
        { name: 'date', label: t('common.date'), type: 'date' },
        { name: 'time', label: t('common.time'), type: 'time' },
        { name: 'duration', label: t('form.lessonLength'), type: 'number' },
        { name: 'status', label: t('common.status'), as: 'select', options: [
          { value: 'scheduled', label: t('status.scheduled') }, { value: 'completed', label: t('status.completed') }, { value: 'cancelled', label: t('status.cancelled') }] },
        { name: 'description', label: t('form.lessonPlan'), as: 'textarea', rows: 3, full: true },
      ]}
    />
  );
}

/* --------------------------------------------------------------------------
   ADMIN — GROUPS with roster management
   -------------------------------------------------------------------------- */

function AdminGroups() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rosterId, setRosterId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const { data: teacherData } = useFetch(() => api.get('/teachers', { params: { limit: 100 } }).then((r) => r.data));
  const { data: courseData } = useFetch(() => api.get('/courses', { params: { limit: 100 } }).then((r) => r.data));
  const teachers = teacherData?.data ?? [];
  const courses = courseData?.data ?? [];

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/groups', { params: { limit: 100 } });
    setGroups(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const blank = { name: '', courseId: '', teacherId: '', room: '', schedule: '', level: 'B1', capacity: 14, startDate: today(), status: 'active' };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, capacity: Number(form.capacity || 14) };
      if (editing.id) await api.patch(`/groups/${editing.id}`, body);
      else await api.post('/groups', body);
      toast.success(editing.id ? 'Group updated.' : 'Group created.');
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle title={t('menu.groups')} description={`${groups.length} ${t('page.groupsRunning')}`}>
        <Button size="sm" icon={Plus} onClick={() => { setForm(blank); setEditing({}); }}>{t('btn.createGroup')}</Button>
      </PageTitle>

      {loading ? <Loading /> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const teacher = teachers.find((t) => t.id === group.teacherId);
            const course = courses.find((c) => c.id === group.courseId);
            const filled = Math.round((group.studentIds.length / (group.capacity || 14)) * 100);

            return (
              <article key={group.id} className="flex flex-col rounded-card border border-navy-100 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold text-navy-900">{group.name}</h3>
                    <p className="truncate text-sm text-navy-500">{course?.name ?? 'No course'}</p>
                  </div>
                  <Badge status={group.status} />
                </div>

                <dl className="mt-4 space-y-1.5 text-sm text-navy-600">
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">{t('common.teacher')}</dt><dd className="truncate font-medium">{teacher?.fullName ?? t('opt.unassigned')}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">{t('common.schedule')}</dt><dd className="truncate">{group.schedule}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">{t('common.room')}</dt><dd>{group.room}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">{t('student.started')}</dt><dd>{formatDate(group.startDate)}</dd></div>
                </dl>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-navy-500">
                    <span>{group.studentIds.length} of {group.capacity} places</span><span>{filled}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-100">
                    <span className="block h-full rounded-full bg-action-gradient" style={{ width: `${Math.min(filled, 100)}%` }} />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button size="sm" variant="secondary" icon={Users} className="flex-1" onClick={() => setRosterId(group.id)}>{t('btn.roster')}</Button>
                  <button type="button" onClick={() => { setForm({ ...blank, ...group }); setEditing(group); }} aria-label={t('field.editGroup')}
                    className="rounded-full border border-navy-200 p-2.5 text-navy-500 hover:bg-navy-50"><Pencil size={15} /></button>
                  <button type="button" onClick={() => setDeleting(group)} aria-label={t('field.deleteGroup')}
                    className="rounded-full border border-navy-200 p-2.5 text-navy-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit group' : 'Create group'}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={saving} onClick={save}>{t('btn.saveGroup')}</Button>
        </>}>
        <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" label={t('form.groupName')} name="name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label={t('common.course')} name="courseId" as="select" value={form.courseId ?? ''} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            options={[{ value: '', label: t('opt.chooseCourse') }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
          <Field label={t('common.teacher')} name="teacherId" as="select" value={form.teacherId ?? ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            options={[{ value: '', label: t('opt.unassigned') }, ...teachers.map((t) => ({ value: t.id, label: t.fullName }))]} />
          <Field label={t('common.room')} name="room" value={form.room ?? ''} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <Field label={t('common.schedule')} name="schedule" placeholder={t('form.egScheduleLong')} value={form.schedule ?? ''} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
          <Field label={t('common.level')} name="level" as="select" options={LEVELS} value={form.level ?? 'B1'} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          <Field label={t('field.capacity')} name="capacity" type="number" value={form.capacity ?? 14} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <Field label={t('field.startDate')} name="startDate" type="date" value={form.startDate ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Field label={t('common.status')} name="status" as="select" value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[{ value: 'active', label: t('status.active') }, { value: 'closed', label: t('opt.closed') }]} />
        </form>
      </Modal>

      <RosterModal groupId={rosterId} onClose={() => setRosterId(null)} onChanged={load} />

      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={saving}
        title={t('page.deleteGroup')} message={`${deleting?.name} — ${t('page.deleteGroupBody')}`}
        onConfirm={async () => {
          await api.delete(`/groups/${deleting.id}`);
          toast.success(t('msg.groupDeleted'));
          setDeleting(null);
          load();
        }} />
    </>
  );
}

/** Two lists side by side: who is in the group, and who can be added. */
function RosterModal({ groupId, onClose, onChanged }) {
  const { t } = useLanguage();
  const [roster, setRoster] = useState(null);
  const [available, setAvailable] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!groupId) return;
    const [rosterResponse, allStudents] = await Promise.all([
      api.get(`/groups/${groupId}/roster`),
      api.get('/students', { params: { limit: 500 } }),
    ]);
    setRoster(rosterResponse.data);
    setAvailable(allStudents.data.data.filter((student) => student.groupId !== groupId));
  };

  useEffect(() => { setRoster(null); load().catch((error) => toast.error(error.message)); /* eslint-disable-next-line */ }, [groupId]);

  const move = async (action, message) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(groupId)} onClose={onClose} size="lg" title={roster ? `${roster.group.name} roster` : 'Roster'}>
      {!roster ? <Loading /> : (
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-navy-900">In this group ({roster.students.length}/{roster.group.capacity})</h3>
            <ul className="scroll-slim max-h-80 divide-y divide-navy-50 overflow-y-auto rounded-card border border-navy-100">
              {roster.students.map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={student.fullName} size="h-8 w-8 text-xs" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">{student.fullName}</p>
                  <button type="button" disabled={busy} aria-label={`Remove ${student.fullName}`}
                    onClick={() => move(() => api.delete(`/groups/${roster.group.id}/students/${student.id}`), 'Student removed.')}
                    className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>
                </li>
              ))}
              {!roster.students.length && <li className="px-4 py-8 text-center text-sm text-navy-400">{t('msg.nobodyInGroup')}</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-navy-900">{t('btn.addStudent')}</h3>
            <ul className="scroll-slim max-h-80 divide-y divide-navy-50 overflow-y-auto rounded-card border border-navy-100">
              {available.map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={student.fullName} size="h-8 w-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{student.fullName}</p>
                    <p className="truncate text-xs text-navy-500">{student.groupName || 'No group'}</p>
                  </div>
                  <button type="button" disabled={busy} aria-label={`Add ${student.fullName}`}
                    onClick={() => move(() => api.post(`/groups/${roster.group.id}/students`, { studentId: student.id }), 'Student moved into the group.')}
                    className="rounded-lg p-2 text-navy-400 hover:bg-electric-50 hover:text-electric-600"><Plus size={15} /></button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------------------------
   ADMIN — PAYMENTS
   -------------------------------------------------------------------------- */

function AdminPayments() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/payments', { params: { status: status || undefined, search: search || undefined, page, limit: 12, sort: 'dueDate' } });
    setRows(data.data);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

  const recordPayment = async () => {
    setBusy(true);
    try {
      await api.post(`/payments/${paying.id}/pay`, { amount: Number(amount), method: 'cash' });
      toast.success(t('msg.paymentRecorded'));
      setPaying(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    const { data } = await api.post('/payments/remind');
    toast.success(data.sent ? `Reminder sent to ${data.sent} students.` : 'Nobody has an overdue invoice.');
  };

  return (
    <>
      <PageTitle title={t('menu.payments')} description={t('page.paymentsHint')}>
        <Button size="sm" variant="secondary" icon={BellRing} onClick={remind}>{t('btn.remindOverdue')}</Button>
      </PageTitle>

      <Panel bodyClassName="">
        <Toolbar search={search} onSearch={setSearch} placeholder={t('page.searchStudent')}
          filters={[{ key: 'status', label: t('opt.anyStatus'), value: status, onChange: setStatus, options: [
            { value: 'paid', label: t('status.paid') }, { value: 'pending', label: t('status.pending') }, { value: 'overdue', label: t('status.overdue') }] }]} />
        <Table
          loading={loading} rows={rows} empty={{ title: t('msg.noInvoicesMatch') }}
          columns={[
            { key: 'studentName', header: t('common.student'), render: (row) => <span className="font-medium text-navy-900">{row.studentName}</span> },
            { key: 'period', header: t('page.period'), render: (row) => formatMonth(row.period) },
            { key: 'amount', header: t('page.amount'), render: (row) => money(row.amount) },
            { key: 'paidAmount', header: t('page.paid'), render: (row) => (row.paidAmount ? money(row.paidAmount) : '—') },
            { key: 'dueDate', header: t('page.due'), render: (row) => formatDate(row.dueDate) },
            { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
            { key: 'actions', header: '', className: 'text-right', render: (row) => row.status === 'paid'
              ? <span className="text-xs font-medium text-emerald-600">{t('btn.settled')}</span>
              : <Button size="sm" variant="secondary" onClick={() => { setPaying(row); setAmount(row.amount); }}>{t('btn.recordPayment')}</Button> },
          ]}
        />
        <Pagination page={page} total={total} limit={12} onChange={setPage} />
      </Panel>

      <Modal open={Boolean(paying)} onClose={() => setPaying(null)} size="sm" title={t('field.recordPayment')}
        description={paying ? `${paying.studentName} · ${formatMonth(paying.period)}` : undefined}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setPaying(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={busy} onClick={recordPayment}>{t('btn.recordPayment')}</Button>
        </>}>
        <Field label={t('field.amountReceived')} name="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------------------
   ATTENDANCE — teachers and admins mark a register; students see their own
   -------------------------------------------------------------------------- */

const MARKS = [
  ['present', 'Present', Check, 'bg-emerald-500 text-white border-emerald-500'],
  ['late', 'Late', Clock, 'bg-amber-500 text-white border-amber-500'],
  ['absent', 'Absent', X, 'bg-rose-500 text-white border-rose-500'],
];

function AttendancePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  return user.role === 'student' ? <StudentAttendance /> : <AttendanceRegister />;
}

function AttendanceRegister() {
  const { t } = useLanguage();
  const { data: groupData, loading: groupsLoading } = useFetch(() => api.get('/groups', { params: { limit: 100 } }).then((r) => r.data));
  const groups = groupData?.data ?? [];

  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!groupId && groups.length) setGroupId(groups[0].id); }, [groups, groupId]);

  // Load the roster and pre-fill with whatever was already saved for this date.
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    Promise.all([api.get(`/groups/${groupId}/roster`), api.get('/attendance', { params: { groupId, date, limit: 200 } })])
      .then(([rosterResponse, existing]) => {
        setRoster(rosterResponse.data);
        const saved = {};
        existing.data.data.forEach((row) => { saved[row.studentId] = row.status; });
        const prefill = {};
        rosterResponse.data.students.forEach((student) => { prefill[student.id] = saved[student.id] ?? 'present'; });
        setMarks(prefill);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [groupId, date]);

  const counts = {
    present: Object.values(marks).filter((value) => value === 'present').length,
    late: Object.values(marks).filter((value) => value === 'late').length,
    absent: Object.values(marks).filter((value) => value === 'absent').length,
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/attendance/register', {
        groupId, date,
        records: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      });
      toast.success(t('msg.registerSaved', { count: data.saved }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (groupsLoading) return <Loading />;
  if (!groups.length) return <Empty title={t('page.noGroupsAssigned')} description={t('page.noGroupsHint')} />;

  return (
    <>
      <PageTitle title={t('menu.attendance')} description={t('page.attendanceHint')}>
        <Button size="sm" icon={Save} loading={saving} disabled={!roster} onClick={save}>{t('btn.saveRegister')}</Button>
      </PageTitle>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Check} label={t('status.present')} value={counts.present} tone="emerald" />
        <StatCard icon={Clock} label={t('status.late')} value={counts.late} tone="amber" />
        <StatCard icon={X} label={t('status.absent')} value={counts.absent} tone="rose" />
      </div>

      <Panel bodyClassName="">
        <div className="flex flex-wrap items-center gap-3 border-b border-navy-100 px-5 py-4">
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} aria-label={t('common.group')}
            className="rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-electric-400">
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label={t('common.date')}
            className="rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-electric-400" />
          <div className="ml-auto flex gap-2">
            {MARKS.map(([value, label]) => (
              <Button key={value} size="sm" variant="subtle"
                onClick={() => setMarks(Object.fromEntries(Object.keys(marks).map((key) => [key, value])))}>
                All {label.toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        {loading || !roster ? <Loading /> : !roster.students.length ? (
          <Empty title={t('page.groupNoStudents')} description={t('page.groupNoStudentsHint')} />
        ) : (
          <ul className="divide-y divide-navy-50">
            {roster.students.map((student) => (
              <li key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar name={student.fullName} size="h-8 w-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">{student.fullName}</p>
                  <p className="text-xs text-navy-500">Overall attendance {student.attendanceRate}%</p>
                </div>
                <div className="flex gap-1.5" role="group" aria-label={`Attendance for ${student.fullName}`}>
                  {MARKS.map(([value, label, Icon, activeStyle]) => (
                    <button key={value} type="button" aria-pressed={marks[student.id] === value}
                      onClick={() => setMarks({ ...marks, [student.id]: value })}
                      className={cn('inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-600 transition',
                        marks[student.id] === value ? activeStyle : 'hover:bg-navy-50')}>
                      <Icon size={13} />{label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function StudentAttendance() {
  const { t } = useLanguage();
  const { data, loading, error } = useFetch(() => api.get('/stats/student').then((r) => r.data));
  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} />;

  const slices = [
    { name: 'Present', value: data.attendance.present, color: '#10B981' },
    { name: 'Late', value: data.attendance.late, color: '#F59E0B' },
    { name: 'Absent', value: data.attendance.absent, color: '#F43F5E' },
  ].filter((slice) => slice.value > 0);

  return (
    <>
      <PageTitle title={t('page.myAttendance')} description={`${data.attendance.records.length} ${t('page.lessonsRecorded')}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Check} label={t('status.present')} value={`${data.attendance.present}%`} tone="emerald" />
        <StatCard icon={Clock} label={t('status.late')} value={`${data.attendance.late}%`} tone="amber" />
        <StatCard icon={X} label={t('status.absent')} value={`${data.attendance.absent}%`} tone="rose" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title={t('page.split')}>
          {slices.length ? (
            <ChartFrame height={220}>
              <Donut data={slices} valueFormatter={(value) => `${value}%`} />
            </ChartFrame>
          ) : <Empty title={t('page.nothingRecorded')} />}
        </Panel>

        <Panel className="lg:col-span-2" title={t('msg.lessonByLesson')} bodyClassName="">
          <ul className="scroll-slim max-h-[26rem] divide-y divide-navy-50 overflow-y-auto">
            {data.attendance.records.map((record) => (
              <li key={record.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <p className="text-sm text-navy-700">{formatDate(record.date)}</p>
                <Badge status={record.status} />
              </li>
            ))}
            {!data.attendance.records.length && <li className="px-5 py-10 text-center text-sm text-navy-400">{t('msg.noRecordsYet')}</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   HOMEWORK — teachers set and grade, students hand in
   -------------------------------------------------------------------------- */

function HomeworkPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const isStudent = user.role === 'student';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [grading, setGrading] = useState(null);
  const [handIn, setHandIn] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const { data: groupData } = useFetch(() => api.get('/groups', { params: { limit: 100 } }).then((r) => r.data));
  const groups = groupData?.data ?? [];

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/homeworks', { params: { limit: 100 } });
    setTasks(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const blank = { title: '', description: '', groupId: '', deadline: today(), link: '' };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (editing.id) await api.patch(`/homeworks/${editing.id}`, form);
      else await api.post('/homeworks', form);
      toast.success(editing.id ? 'Homework updated.' : 'Homework created.');
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/homeworks/${handIn.task.id}/complete`, { note: handIn.note, link: handIn.link });
      toast.success(t('msg.markedDone'));
      setHandIn(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const grade = async (studentId, value) => {
    try {
      await api.post(`/homeworks/${grading.id}/grade`, { studentId, grade: value });
      toast.success(t('msg.gradeSaved'));
      setGrading(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <PageTitle title={t('menu.homework')} description={isStudent ? t('page.homeworkStudentHint') : t('page.homeworkStaffHint')}>
        {!isStudent && <Button size="sm" icon={Plus} onClick={() => { setForm(blank); setEditing({}); }}>{t('btn.setHomework')}</Button>}
      </PageTitle>

      {loading ? <Loading /> : !tasks.length ? (
        <Panel><Empty title={t('page.noHomework')} description={isStudent ? t('page.noHomeworkStudent') : t('page.noHomeworkStaff')} /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => {
            const mine = (task.submissions ?? []).find((item) => item.studentId === profile?.id);
            const submitted = (task.submissions ?? []).length;
            const graded = (task.submissions ?? []).filter((item) => item.status === 'graded').length;
            const closed = task.deadline < today();

            return (
              <article key={task.id} className="flex flex-col rounded-card border border-navy-100 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-navy-900">{task.title}</h3>
                    <p className="text-xs text-navy-500">{task.groupName}</p>
                  </div>
                  <Badge status={closed ? 'pending' : 'open'}>{closed ? 'Closed' : 'Open'}</Badge>
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-navy-600">{task.description}</p>

                {task.link && (
                  <a href={task.link} target="_blank" rel="noreferrer" className="btn-secondary btn-sm mt-4 self-start">{t('btn.openLink')}</a>
                )}

                <footer className="mt-4 flex items-center justify-between gap-3 border-t border-navy-100 pt-4">
                  <p className="text-xs text-navy-500">Deadline {formatDate(task.deadline)}</p>
                  {isStudent ? (
                    mine ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                        <CheckCircle2 size={15} />{mine.grade ? `Graded ${mine.grade}` : 'Submitted'}
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => setHandIn({ task, note: '', link: '' })}>{t('btn.markAsDone')}</Button>
                    )
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setGrading(task)}>{graded}/{submitted} graded</Button>
                      <button type="button" onClick={() => { setForm({ ...blank, ...task }); setEditing(task); }} aria-label={t('common.edit')}
                        className="rounded-lg p-2 text-navy-400 hover:bg-navy-100"><Pencil size={15} /></button>
                      <button type="button" onClick={() => setDeleting(task)} aria-label={t('common.delete')}
                        className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / edit — staff only */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit homework' : 'Set homework'}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={busy} onClick={save}>{t('common.save')}</Button>
        </>}>
        <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" label={t('common.title')} name="title" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Field className="sm:col-span-2" label={t('form.whatToDo')} name="description" as="textarea" rows={4}
            value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label={t('common.group')} name="groupId" as="select" value={form.groupId ?? ''} onChange={(e) => setForm({ ...form, groupId: e.target.value })}
            options={[{ value: '', label: t('opt.chooseGroup') }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
          <Field label={t('field.deadline')} name="deadline" type="date" value={form.deadline ?? ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <Field className="sm:col-span-2" label={t('form.externalLink')} name="link" placeholder="https://…" value={form.link ?? ''} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </form>
      </Modal>

      {/* Submissions and grading */}
      <Modal open={Boolean(grading)} onClose={() => setGrading(null)} title={grading ? `Submissions — ${grading.title}` : ''}>
        {!grading?.submissions?.length ? <Empty title={t('page.nothingHandedIn')} /> : (
          <ul className="divide-y divide-navy-50">
            {grading.submissions.map((submission) => (
              <li key={submission.studentId} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={submission.studentName} size="h-8 w-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">{submission.studentName}</p>
                  <p className="text-xs text-navy-500">{submission.status === 'late' ? 'Handed in late' : 'On time'} · {formatDate(submission.submittedAt)}</p>
                </div>
                <GradeInput submission={submission} onSave={(value) => grade(submission.studentId, value)} />
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Student hands in */}
      <Modal open={Boolean(handIn)} onClose={() => setHandIn(null)} size="sm" title={handIn ? `Hand in — ${handIn.task.title}` : ''}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setHandIn(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={busy} onClick={complete}>{t('btn.markAsDone')}</Button>
        </>}>
        <form onSubmit={complete} className="space-y-5">
          <Field label={t('field.workLink')} name="link" placeholder={t('field.workLinkHint')}
            value={handIn?.link ?? ''} onChange={(e) => setHandIn({ ...handIn, link: e.target.value })} />
          <Field label={t('field.noteForTeacher')} name="note" as="textarea" rows={3}
            value={handIn?.note ?? ''} onChange={(e) => setHandIn({ ...handIn, note: e.target.value })} />
        </form>
      </Modal>

      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} title={t('page.deleteHomework')}
        message={`"${deleting?.title}" and its submissions will be removed.`}
        onConfirm={async () => {
          await api.delete(`/homeworks/${deleting.id}`);
          toast.success(t('msg.homeworkDeleted'));
          setDeleting(null);
          load();
        }} />
    </>
  );
}

function GradeInput({ submission, onSave }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(submission.grade ?? '');
  return (
    <div className="flex items-center gap-2">
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="8/10"
        aria-label={t('page.gradeFor', { name: submission.studentName })}
        className="w-20 rounded-lg border border-navy-200 px-2.5 py-1.5 text-sm outline-none focus:border-electric-400" />
      <Button size="sm" disabled={!value} onClick={() => onSave(value)}>{t('common.save')}</Button>
    </div>
  );
}

/* --------------------------------------------------------------------------
   NOTIFICATIONS — inbox for everyone, compose for staff
   -------------------------------------------------------------------------- */

function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canSend = user.role !== 'student';
  const [inbox, setInbox] = useState({ data: [], unread: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', kind: 'all', targetId: '' });
  const [busy, setBusy] = useState(false);

  const { data: groupData } = useFetch(() => api.get('/groups', { params: { limit: 100 } }).then((r) => r.data));
  const { data: studentData } = useFetch(() => api.get('/students', { params: { limit: 500 } }).then((r) => r.data).catch(() => ({ data: [] })));

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/notifications');
    setInbox(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const send = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/notifications', {
        title: form.title, message: form.message, type: form.type,
        target: { kind: form.kind, id: form.targetId },
      });
      toast.success(`Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'}.`);
      setComposing(false);
      setForm({ title: '', message: '', type: 'info', kind: 'all', targetId: '' });
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const targetOptions = form.kind === 'group'
    ? (groupData?.data ?? []).map((g) => ({ value: g.id, label: g.name }))
    : form.kind === 'user'
      ? (studentData?.data ?? []).map((s) => ({ value: s.id, label: s.fullName }))
      : form.kind === 'role'
        ? [{ value: 'student', label: t('opt.allStudents') }, { value: 'teacher', label: t('opt.allTeachers') }]
        : [];

  return (
    <>
      <PageTitle title={t('menu.notifications')} description={`${inbox.unread} ${t('page.inboxCount')} ${inbox.total}`}>
        <Button size="sm" variant="secondary" onClick={async () => { await api.patch('/notifications/read-all'); toast.success(t('msg.allMarkedRead')); load(); }}>
          Mark all read
        </Button>
        {canSend && <Button size="sm" icon={Send} onClick={() => setComposing(true)}>{t('page.sendNotification')}</Button>}
      </PageTitle>

      <Panel bodyClassName="">
        {loading ? <Loading /> : !inbox.data.length ? (
          <Empty title={t('page.inboxEmpty')} description={t('page.inboxEmptyHint')} />
        ) : (
          <ul className="divide-y divide-navy-50">
            {inbox.data.map((item) => (
              <li key={item.id} className={cn('flex gap-4 px-5 py-4', !item.read && 'bg-electric-50/40')}>
                <Badge status={item.type === 'warning' ? 'pending' : item.type === 'success' ? 'approved' : 'open'} className="h-fit">{item.type}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <p className="font-medium text-navy-900">{item.title}</p>
                    <p className="text-xs text-navy-400">{item.sender} · {relativeTime(item.date)}</p>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-navy-600">{item.message}</p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  {!item.read && (
                    <button type="button" onClick={async () => { await api.patch(`/notifications/${item.id}/read`); load(); }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-electric-600 hover:bg-electric-50">{t('btn.markRead')}</button>
                  )}
                  <button type="button" aria-label={t('field.deleteNotification')}
                    onClick={async () => { await api.delete(`/notifications/${item.id}`); load(); }}
                    className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={composing} onClose={() => setComposing(false)} title={t('page.sendNotification')}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setComposing(false)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={busy} onClick={send}>{t('btn.send')}</Button>
        </>}>
        <form onSubmit={send} className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" label={t('common.title')} name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Field className="sm:col-span-2" label={t('common.message')} name="message" as="textarea" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <Field label={t('field.sendTo')} name="kind" as="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, targetId: '' })}
            options={[{ value: 'all', label: t('opt.everyone') }, { value: 'role', label: t('opt.wholeRole') }, { value: 'group', label: t('opt.oneGroup') }, { value: 'user', label: t('opt.oneStudent') }]} />
          {form.kind !== 'all' && (
            <Field label={t('field.whichOne')} name="targetId" as="select" value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })}
              options={[{ value: '', label: t('opt.choose') }, ...targetOptions]} />
          )}
          <Field className="sm:col-span-2" label={t('form.type')} name="type" as="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: 'info', label: t('opt.information') }, { value: 'warning', label: t('opt.warning') }, { value: 'success', label: t('opt.goodNews') }]} />
        </form>
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------------------
   COMPETITIONS — students join, staff create
   -------------------------------------------------------------------------- */

function CompetitionsPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const isStudent = user.role === 'student';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/competitions', { params: { limit: 50 } });
    setItems(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const blank = { title: '', description: '', date: today(), time: '15:00', location: '', prize: '', capacity: 30 };

  const save = async (event) => {
    event.preventDefault();
    try {
      const body = { ...form, capacity: Number(form.capacity || 30) };
      if (editing.id) await api.patch(`/competitions/${editing.id}`, body);
      else await api.post('/competitions', body);
      toast.success(t('common.saved'));
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleJoin = async (item, joined) => {
    setBusyId(item.id);
    try {
      if (joined) await api.delete(`/competitions/${item.id}/join`);
      else await api.post(`/competitions/${item.id}/join`);
      toast.success(joined ? 'You left this competition.' : `You are signed up for ${item.title}.`);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageTitle title={t('menu.competitions')} description={isStudent ? t('page.competitionsStudentHint') : t('page.competitionsStaffHint')}>
        {!isStudent && <Button size="sm" icon={Plus} onClick={() => { setForm(blank); setEditing({}); }}>{t('btn.createCompetition')}</Button>}
      </PageTitle>

      {loading ? <Loading /> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const participants = item.participants ?? [];
            const joined = participants.some((p) => p.studentId === profile?.id);
            const full = participants.length >= item.capacity;

            return (
              <article key={item.id} className="flex flex-col rounded-card border border-navy-100 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Trophy size={18} /></span>
                  <span className="badge bg-navy-100 text-navy-600">{formatDate(item.date)}</span>
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-600">{item.description}</p>
                <dl className="mt-4 space-y-1.5 border-t border-navy-100 pt-4 text-sm text-navy-600">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-navy-400" /><dd>{item.location}</dd></div>
                  <div className="flex items-center gap-2"><Users size={14} className="text-navy-400" /><dd>{participants.length} of {item.capacity} places taken</dd></div>
                </dl>
                {item.prize && <p className="mt-3 text-xs text-navy-500">Prize: {item.prize}</p>}

                <div className="mt-5">
                  {isStudent ? (
                    <Button size="sm" variant={joined ? 'secondary' : 'primary'} className="w-full" loading={busyId === item.id}
                      disabled={!joined && full} onClick={() => toggleJoin(item, joined)}>
                      {joined ? 'Leave' : full ? 'All places taken' : 'Join competition'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => { setForm({ ...blank, ...item }); setEditing(item); }}>
                      Edit · {participants.length} signed up
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit competition' : 'Create competition'}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={save}>{t('common.save')}</Button>
        </>}>
        <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" label={t('common.title')} name="title" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Field className="sm:col-span-2" label={t('common.description')} name="description" as="textarea" rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label={t('common.date')} name="date" type="date" value={form.date ?? ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Field label={t('common.time')} name="time" type="time" value={form.time ?? ''} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <Field label={t('field.location')} name="location" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Field label={t('field.places')} name="capacity" type="number" value={form.capacity ?? 30} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <Field className="sm:col-span-2" label={t('form.prize')} name="prize" value={form.prize ?? ''} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
        </form>
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------------------
   PROFILE — same page for all three roles
   -------------------------------------------------------------------------- */

function ProfilePage() {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [details, setDetails] = useState({ fullName: user.fullName, phone: user.phone ?? '', avatar: profile?.avatar ?? user.avatar ?? '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);

  const saveDetails = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch('/auth/me', details);
      await refreshProfile();
      toast.success(t('msg.profileUpdated'));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error(t('valid.passwordMatch'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', passwords);
      toast.success(t('auth.passwordChanged'));
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title={t('menu.profile')} description={t('page.profileHint')} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel>
          <div className="flex flex-col items-center text-center">
            <Avatar name={details.fullName || user.fullName} src={details.avatar} size="h-20 w-20 text-xl" />
            <h2 className="mt-4 font-display text-lg font-semibold text-navy-900">{user.fullName}</h2>
            <p className="text-sm text-navy-500">{user.email}</p>
            <Badge className="mt-3 bg-action-gradient text-white">{ROLE_LABEL[user.role]}</Badge>
          </div>

          {profile && (
            <dl className="mt-6 space-y-3 border-t border-navy-100 pt-5 text-sm">
              {user.role === 'student' && [
                ['Level', profile.level], ['Group', profile.groupName || 'Not assigned'],
                ['Attendance', `${profile.attendanceRate}%`], ['Monthly fee', money(profile.monthlyPayment)],
                ['IELTS band', profile.ieltsScore ? profile.ieltsScore.toFixed(1) : 'Not taken'],
                ['Joined', formatDate(profile.joinDate)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3"><dt className="text-navy-400">{label}</dt><dd className="font-medium text-navy-800">{value}</dd></div>
              ))}
              {user.role === 'teacher' && [
                ['Position', profile.position], ['Specialism', profile.specialization],
                ['Experience', `${profile.experience} years`], ['Groups', (profile.groups ?? []).length],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3"><dt className="text-navy-400">{label}</dt><dd className="font-medium text-navy-800">{value}</dd></div>
              ))}
            </dl>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title={t('page.yourDetails')} description={t('page.emailManaged')}>
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={details.fullName || user.fullName} src={details.avatar} size="h-16 w-16 text-lg" />
            <p className="text-sm leading-relaxed text-navy-500">{t('page.avatarHint')}</p>
          </div>
            <form onSubmit={saveDetails} className="grid gap-5 sm:grid-cols-2">
              <Field className="sm:col-span-2" label={t('common.fullName')} name="fullName" value={details.fullName} onChange={(e) => setDetails({ ...details, fullName: e.target.value })} />
              <Field label={t('common.phone')} name="phone" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
          <Field className="sm:col-span-2" label={t('page.avatarUrl')} name="avatar" placeholder="https://…"
            value={details.avatar}
            onChange={(e) => setDetails({ ...details, avatar: e.target.value })} />
              <Field label={t('common.email')} name="email" value={user.email} readOnly className="opacity-60" />
              <div className="sm:col-span-2"><Button type="submit" size="sm" icon={Save} loading={busy}>{t('btn.saveChanges')}</Button></div>
            </form>
          </Panel>

          <Panel title={t('common.password')} description={t('page.passwordHint')}>
            <form onSubmit={changePassword} className="grid gap-5 sm:grid-cols-2">
              <Field className="sm:col-span-2" label={t('auth.currentPassword')} name="currentPassword" type="password"
                value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
              <Field label={t('auth.newPassword')} name="newPassword" type="password"
                value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              <Field label={t('field.repeatNewPassword')} name="confirmPassword" type="password"
                value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              <div className="sm:col-span-2"><Button type="submit" size="sm" icon={Lock} loading={busy}>{t('auth.changePassword')}</Button></div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   ADMIN — LANDING PAGE EDITOR
   Everything the public site shows is edited here and saved section by section.
   -------------------------------------------------------------------------- */

// Both maps are built inside the component because their labels are translated.
// Keeping them as plain module constants would call t() outside React.
const buildTextSections = (t) => ({
  hero:         { label: t('sec.hero'),         fields: [['eyebrow', t('form.smallLabel')], ['title', t('form.headline')], ['subtitle', t('form.paragraph'), 'textarea'], ['primaryCta', t('form.mainButton')], ['secondaryCta', t('form.secondButton')]] },
  about:        { label: t('sec.about'),        fields: [['eyebrow', t('form.smallLabel')], ['title', t('form.heading')], ['body', t('form.bodyText'), 'textarea'], ['mission', t('form.missionStatement'), 'textarea']] },
  resultsBlock: { label: t('sec.resultsBlock'), fields: [['eyebrow', t('form.smallLabel')], ['title', t('form.heading')], ['subtitle', t('form.paragraph'), 'textarea']] },
  cta:          { label: t('sec.cta'),          fields: [['title', t('form.heading')], ['subtitle', t('form.paragraph'), 'textarea'], ['buttonLabel', t('form.buttonText')]] },
  contact:      { label: t('sec.contact'),      fields: [['title', t('form.heading')], ['subtitle', t('form.paragraph'), 'textarea'], ['address', t('common.address')], ['phone', t('common.phone')], ['email', t('common.email')], ['workingHours', t('form.openingHours')]] },
  footer:       { label: t('sec.footer'),       fields: [['tagline', t('form.tagline'), 'textarea'], ['copyright', t('form.copyrightLine')]] },
  meta:         { label: t('sec.seo'),          fields: [['title', t('form.pageTitle')], ['description', t('form.metaDescription'), 'textarea'], ['keywords', t('form.keywords')]] },
});

const buildListSections = (t) => ({
  nav:      { label: t('sec.nav'),      fields: [['label', t('form.labelField')], ['href', t('form.anchor')]], blank: { label: '', href: '#top' } },
  stats:    { label: t('sec.stats'),    fields: [['value', t('form.number')], ['suffix', t('form.suffix')], ['label', t('form.caption')]], blank: { value: 0, suffix: '+', label: '' } },
  benefits: { label: t('sec.benefits'), fields: [['title', t('common.title')], ['text', t('common.description')]], blank: { title: '', text: '' } },
  steps:    { label: t('sec.steps'),    fields: [['title', t('form.stepTitle')], ['text', t('common.description')]], blank: { title: '', text: '' } },
  faq:      { label: t('sec.faq'),      fields: [['question', t('form.question')], ['answer', t('form.answer')]], blank: { question: '', answer: '' } },
});

function AdminLandingPage() {
  const { t } = useLanguage();
  const TEXT_SECTIONS = useMemo(() => buildTextSections(t), [t]);
  const LIST_SECTIONS = useMemo(() => buildListSections(t), [t]);
  // Which language the admin is typing right now. The base language writes the
  // plain field; the others write the suffixed one (title_ru, title_en).
  const [editLang, setEditLang] = useState(DEFAULT_LANG);
  const { data, loading, error, refetch } = useFetch(() => api.get('/landing/raw').then((r) => r.data));
  const [draft, setDraft] = useState(null);
  const [active, setActive] = useState('hero');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(true);
  // Drafts are per section and only visible to admins; the public page never
  // reads them. Declared after `active` because it reads it.
  const { data: drafts, refetch: refetchDrafts } = useFetch(() => api.get('/landing/drafts').then((r) => r.data));
  const pendingDraft = drafts?.data?.[active] ?? null;

  useEffect(() => { if (data) setDraft(structuredClone(data)); }, [data]);

  // The draft only becomes the live page when the admin presses Publish.
  const dirty = Boolean(data && draft) && JSON.stringify(data[active]) !== JSON.stringify(draft?.[active]);

  if (loading || !draft) return <Loading />;
  if (error) return <Empty title={t('page.landingError')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const isList = active in LIST_SECTIONS;
  const config = isList ? LIST_SECTIONS[active] : TEXT_SECTIONS[active];

  const save = async (asDraft = false) => {
    setSaving(true);
    try {
      await api.patch(`/landing/${active}`, isList ? { items: draft[active] } : draft[active]);
      toast.success(asDraft ? t('admin.draftSaved') : t('admin.published'));
      refetch();
      refetchDrafts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    ...Object.entries(TEXT_SECTIONS).map(([key, value]) => [key, value.label]),
    ...Object.entries(LIST_SECTIONS).map(([key, value]) => [key, value.label]),
  ];

  return (
    <>
      <PageTitle title={t('menu.landingPage')} description={t('page.landingHint')}>
        <a href="/" target="_blank" rel="noreferrer" className="btn-secondary btn-sm">{t('admin.viewSite')}</a>
        <Button variant="secondary" size="sm" icon={preview ? Layout : Compass} onClick={() => setPreview((value) => !value)}>
          {t('admin.livePreview')}
        </Button>
        <Button variant="secondary" size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={() => save(true)}>
          {t('admin.saveDraft')}
        </Button>
        <Button size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={() => save(false)}>{t('admin.publish')}</Button>
      </PageTitle>

      {pendingDraft && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-panel border border-electric-200 bg-electric-50 px-5 py-3.5">
          <p className="min-w-0 flex-1 text-sm text-electric-900">
            {t('admin.draftWaiting', { when: relativeTime(pendingDraft.savedAt) })}
          </p>
          <Button size="sm" variant="secondary"
            onClick={() => setDraft({ ...draft, [active]: structuredClone(pendingDraft.data) })}>
            {t('admin.loadDraft')}
          </Button>
          <Button size="sm" variant="secondary"
            onClick={async () => { await api.delete(`/landing/drafts/${active}`); refetchDrafts(); }}>
            {t('admin.discardDraft')}
          </Button>
        </div>
      )}

      {dirty && (
        <p className="mb-5 rounded-panel border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          {t('admin.unsaved')}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
        <nav aria-label={t('menu.landingPage')} className="card h-fit p-2">
          <ul className="space-y-0.5">
            {tabs.map(([key, label]) => (
              <li key={key}>
                <button type="button" onClick={() => setActive(key)}
                  className={cn('w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition',
                    active === key ? 'bg-action-gradient text-white' : 'text-navy-600 hover:bg-mist')}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-navy-100 px-3.5 pb-2 pt-3 text-xs leading-relaxed text-navy-400">
            {t('admin.branchesHint')}
          </p>
        </nav>

        <div className="space-y-5">
        <Panel title={config.label} description={t('cms.translateHint')}>
          {/* One tab per language. Switching only changes which field is edited. */}
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-navy-100 pb-4">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-navy-400">{t('cms.editingIn')}</span>
            {LANGUAGES.map((item) => {
              const filled = isList
                ? draft[active].every((row) => config.fields.every(([key]) => String(cmsText(row, key, item.code) ?? '').trim()))
                : config.fields.every(([key]) => String(cmsText(draft[active], key, item.code) ?? '').trim());
              return (
                <button key={item.code} type="button" onClick={() => setEditLang(item.code)}
                  aria-pressed={editLang === item.code}
                  className={cn('flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition',
                    editLang === item.code ? 'border-electric-400 bg-electric-50 text-electric-800' : 'border-navy-200 bg-white text-navy-600 hover:bg-mist')}>
                  <span aria-hidden="true">{item.flag}</span>{item.short}
                  <span className={cn('h-1.5 w-1.5 rounded-full', filled ? 'bg-emerald-500' : 'bg-navy-200')}
                    title={filled ? t('cms.translated') : t('cms.untranslated')} />
                </button>
              );
            })}
            {editLang === DEFAULT_LANG
              ? <span className="text-xs text-navy-400">{t('cms.baseLanguage')}</span>
              : <span className="text-xs text-navy-400">{t('cms.fallbackNote')}</span>}
          </div>

          {!isList ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {config.fields.map(([key, label, as]) => {
                const field = cmsField(key, editLang);
                return (
                  <Field key={field} className={as === 'textarea' ? 'sm:col-span-2' : ''} label={label} name={field} as={as} rows={4}
                    placeholder={editLang === DEFAULT_LANG ? undefined : draft[active][key] ?? ''}
                    value={draft[active][field] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [active]: { ...draft[active], [field]: e.target.value } })} />
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {draft[active].map((item, index) => (
                <div key={item.id ?? index} className="rounded-card border border-navy-100 bg-mist/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">#{index + 1}</span>
                    <div className="flex items-center gap-2">
                      {/* Reorder: the array order is what the public page renders. */}
                      <button type="button" aria-label={t('admin.moveUp')} disabled={index === 0}
                        onClick={() => {
                          const items = [...draft[active]];
                          [items[index - 1], items[index]] = [items[index], items[index - 1]];
                          setDraft({ ...draft, [active]: items });
                        }}
                        className="rounded-lg p-2 text-navy-400 transition hover:bg-navy-100 hover:text-navy-800 disabled:cursor-not-allowed disabled:opacity-30">
                        <ChevronUp size={15} />
                      </button>
                      <button type="button" aria-label={t('admin.moveDown')} disabled={index === draft[active].length - 1}
                        onClick={() => {
                          const items = [...draft[active]];
                          [items[index], items[index + 1]] = [items[index + 1], items[index]];
                          setDraft({ ...draft, [active]: items });
                        }}
                        className="rounded-lg p-2 text-navy-400 transition hover:bg-navy-100 hover:text-navy-800 disabled:cursor-not-allowed disabled:opacity-30">
                        <ChevronDown size={15} />
                      </button>
                      <button type="button"
                        onClick={() => {
                          const items = [...draft[active]];
                          items[index] = { ...items[index], visible: items[index].visible === false };
                          setDraft({ ...draft, [active]: items });
                        }}
                        className={cn('badge', item.visible === false ? 'bg-navy-200 text-navy-600' : 'bg-emerald-50 text-emerald-700')}>
                        {item.visible === false ? t('common.hidden') : t('common.visible')}
                      </button>
                      <button type="button" aria-label={t('common.delete')}
                        onClick={() => setDraft({ ...draft, [active]: draft[active].filter((_, position) => position !== index) })}
                        className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {config.fields.map(([key, label]) => {
                      // Numbers and anchors are language-neutral, so they always
                      // edit the base field whichever tab is open.
                      const neutral = key === 'value' || key === 'href' || key === 'suffix';
                      const field = neutral ? key : cmsField(key, editLang);
                      return (
                        <Field key={field} className={['answer', 'text'].includes(key) ? 'sm:col-span-2' : ''} label={label} name={`${field}-${index}`}
                          placeholder={neutral || editLang === DEFAULT_LANG ? undefined : item[key] ?? ''}
                          value={item[field] ?? ''}
                          onChange={(e) => {
                            const items = [...draft[active]];
                            items[index] = { ...items[index], [field]: key === 'value' ? Number(e.target.value) || 0 : e.target.value };
                            setDraft({ ...draft, [active]: items });
                          }} />
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={Plus}
                onClick={() => setDraft({ ...draft, [active]: [...draft[active], { id: `${active}-${Date.now()}`, ...config.blank, visible: true }] })}>
                {t('common.add')}
              </Button>
            </div>
          )}
        </Panel>

        {/* Live preview — renders the draft exactly as the public page will. */}
        {preview && (
          <Panel title={t('admin.livePreview')} description={config.label}>
            <div className="overflow-hidden rounded-card border border-navy-100 bg-navy-950 p-6 text-white">
              {!isList ? (
                <div className="space-y-3">
                  {cmsText(draft[active], 'eyebrow', editLang) && <p className="eyebrow-dark">{cmsText(draft[active], 'eyebrow', editLang)}</p>}
                  {cmsText(draft[active], 'title', editLang) && <h3 className="font-display text-2xl font-bold">{cmsText(draft[active], 'title', editLang)}</h3>}
                  {cmsText(draft[active], 'subtitle', editLang) && <p className="text-navy-300">{cmsText(draft[active], 'subtitle', editLang)}</p>}
                  {cmsText(draft[active], 'body', editLang) && <p className="leading-relaxed text-navy-300">{cmsText(draft[active], 'body', editLang)}</p>}
                  {cmsText(draft[active], 'buttonLabel', editLang) && (
                    <span className="mt-2 inline-flex rounded-xl bg-action-gradient px-4 py-2 text-sm font-semibold">
                      {cmsText(draft[active], 'buttonLabel', editLang)}
                    </span>
                  )}
                  {['address', 'phone', 'email', 'workingHours', 'copyright', 'tagline'].map((key) => (
                    draft[active][key] ? <p key={key} className="text-sm text-navy-400">{draft[active][key]}</p> : null
                  ))}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {draft[active].filter((item) => item.visible !== false).map((item, index) => (
                    <li key={item.id ?? index} className="rounded-xl bg-white/5 p-4">
                      <p className="font-semibold">
                        {cmsText(item, 'title', editLang) || cmsText(item, 'question', editLang) || cmsText(item, 'label', editLang) || `#${index + 1}`}
                      </p>
                      {(cmsText(item, 'text', editLang) || cmsText(item, 'answer', editLang)) && (
                        <p className="mt-1 text-sm leading-relaxed text-navy-300">
                          {cmsText(item, 'text', editLang) || cmsText(item, 'answer', editLang)}
                        </p>
                      )}
                      {item.value !== undefined && <p className="mt-1 font-display text-xl font-bold">{item.value}{item.suffix ?? ''}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        )}
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   ADMIN — SETTINGS (accounts and website enquiries)
   -------------------------------------------------------------------------- */

function AdminSettings() {
  const { t } = useLanguage();
  const { data: leads } = useFetch(() => api.get('/leads').then((r) => r.data));
  const { data: landing, refetch } = useFetch(() => api.get('/landing').then((r) => r.data));
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (landing?.settings) setSettings(structuredClone(landing.settings)); }, [landing]);

  // Brand name, section headings and social links live in websiteSettings.
  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch('/settings', settings);
      toast.success(t('common.saved'));
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const social = settings?.social ?? {};

  return (
    <>
      <PageTitle title={t('menu.settings')} description={t('page.settingsHint')} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('page.demoAccounts')} description={t('page.demoAccountsHint')}>
          <ul className="divide-y divide-navy-50 text-sm">
            {[['Administrator', 'admin@tjlanguageschool.uz', 'Admin123!'],
              ['Teacher', 'teacher1@tjlanguageschool.uz', 'Teacher123!'],
              ['Student', 'student1@tjlanguageschool.uz', 'Student123!']].map(([role, email, password]) => (
              <li key={email} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-medium text-navy-900">{role}</p><p className="text-xs text-navy-500">{email}</p></div>
                <code className="rounded-lg bg-mist px-2.5 py-1 text-xs">{password}</code>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            The students, teachers, IELTS scores and testimonials in this database are invented sample
            data. Run <code>npm run seed -- --empty</code> to start from a clean database with only the
            admin account, the courses and the landing page structure.
          </p>
        </Panel>

        <Panel title={t('admin.siteSettings')}
          action={<Button size="sm" icon={Save} loading={saving} disabled={!settings} onClick={saveSettings}>{t('common.save')}</Button>}>
          {!settings ? <Loading /> : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('common.name')} name="brandName" value={settings.brandName ?? ''}
                onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
              <Field label={t('common.address')} name="city" value={settings.city ?? ''}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })} />
              <Field label={t('admin.branchesTitle')} name="branchesTitle" value={settings.branchesTitle ?? ''}
                onChange={(e) => setSettings({ ...settings, branchesTitle: e.target.value })} />
              <Field label={t('admin.mediaTitle')} name="mediaTitle" value={settings.mediaTitle ?? ''}
                onChange={(e) => setSettings({ ...settings, mediaTitle: e.target.value })} />

              <h3 className="sm:col-span-2 -mb-2 text-sm font-semibold text-navy-900">{t('admin.socialLinks')}</h3>
              {['instagram', 'telegram', 'youtube', 'facebook'].map((key) => (
                <Field key={key} label={key} name={key} value={social[key] ?? ''} placeholder="https://…"
                  onChange={(e) => setSettings({ ...settings, social: { ...social, [key]: e.target.value } })} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* The full pipeline lives on its own page — this is just the shortcut. */}
      <Panel className="mt-5" title={t('admin.leadsTitle')} description={t('admin.leadsHint')}
        action={<Link to="/admin/leads" className="btn-secondary btn-sm">{t('common.seeAll')}</Link>}>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {['new', 'contacted', 'in-progress', 'converted', 'rejected'].map((status) => (
            <div key={status} className="rounded-card border border-navy-100 bg-mist/60 p-4">
              <p className="text-xs text-navy-500">{t(`status.${status === 'in-progress' ? 'inProgress' : status}`)}</p>
              <p className="mt-1 font-display text-2xl font-bold text-navy-900">{leads?.counts?.[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ==========================================================================
   12. TEACHER DASHBOARD
   ========================================================================== */

function TeacherDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/stats/teacher').then((r) => r.data));
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const { cards, groups, students, upcomingLessons, liveLesson, todayLessons = [], recentReviews = [] } = data;

  // Start or end a class straight from the dashboard — the same endpoints the
  // dedicated live page uses, so both views stay in step.
  const startLesson = async (lesson) => {
    setBusy(lesson.id);
    try {
      await api.post(`/lessons/${lesson.id}/start`);
      toast.success(t('live.lessonStarted'));
      refetch();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  const endLesson = async (lesson) => {
    setBusy(lesson.id);
    try {
      await api.post(`/lessons/${lesson.id}/end`);
      toast.success(t('live.lessonEnded'));
      refetch();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  return (
    <>
      <PageTitle title={`${t('teacher.hello')}, ${user.fullName.split(' ')[0]}`} description={t('teacher.todayLessons')}>
        <Link to="/teacher/attendance" className="btn-secondary btn-sm">{t('teacher.markAttendance')}</Link>
        <Link to="/teacher/homework" className="btn-primary btn-sm">{t('teacher.setHomework')}</Link>
      </PageTitle>

      {/* Live class control, right where the teacher starts their day. */}
      <Panel className="mb-6" title={liveLesson ? t('live.liveNow') : t('teacher.todayLessons')}
        action={<Link to="/teacher/live" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}
        bodyClassName="">
        {liveLesson ? (
          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="relative flex h-3 w-3" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-navy-900">{liveLesson.topic}</p>
              <p className="truncate text-sm text-navy-500">
                {liveLesson.groupName} · {(liveLesson.live?.attendees ?? []).length} {t('live.activeStudents').toLowerCase()}
              </p>
            </div>
            <Button variant="danger" size="sm" loading={busy === liveLesson.id} onClick={() => endLesson(liveLesson)}>
              {t('live.endLesson')}
            </Button>
          </div>
        ) : todayLessons.length ? (
          <ul className="divide-y divide-navy-50">
            {todayLessons.map((lesson) => (
              <li key={lesson.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="w-16 shrink-0 rounded-lg bg-mist px-2 py-1.5 text-center">
                  <p className="text-sm font-semibold text-navy-900">{lesson.time}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">{lesson.topic}</p>
                  <p className="truncate text-xs text-navy-500">{lesson.groupName} · {lesson.room}</p>
                </div>
                <Button size="sm" icon={Radio} loading={busy === lesson.id} onClick={() => startLesson(lesson)}>
                  {t('live.startLesson')}
                </Button>
              </li>
            ))}
          </ul>
        ) : <Empty title={t('teacher.noTodayLessons')} description={t('state.emptyHint')} />}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Boxes} label={t('teacher.myGroups')} value={cards.groups} />
        <StatCard icon={GraduationCap} label={t('teacher.myStudents')} value={cards.students} tone="violet" />
        <StatCard icon={CalendarDays} label={t('teacher.lessonsToday')} value={cards.lessonsToday} tone="emerald" />
        <StatCard icon={ClipboardList} label={t('teacher.openHomework')} value={cards.openHomework} tone="amber" />
        <StatCard icon={Pencil} label={t('teacher.toGrade')} value={cards.toGrade} tone="rose" />
        <StatCard icon={CalendarCheck} label={t('student.attendanceRate')} value={`${cards.attendanceRate}%`} />
        <StatCard icon={Star} tone="amber" label={t('review.averageRating')} value={cards.averageRating || '—'}
          note={`${cards.totalReviews} ${t('review.totalReviews').toLowerCase()}`} />
        <StatCard icon={Trophy} tone="violet" label={t('menu.reviews')} value={cards.totalReviews} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title={t('student.nextLessons')} bodyClassName="divide-y divide-navy-50">
          {upcomingLessons.length ? upcomingLessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-16 shrink-0 rounded-lg bg-mist px-2 py-1.5 text-center">
                <p className="text-xs text-navy-500">{formatDate(lesson.date).slice(0, 6)}</p>
                <p className="text-sm font-semibold text-navy-900">{lesson.time}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{lesson.topic}</p>
                <p className="truncate text-xs text-navy-500">{lesson.groupName} · {lesson.room}</p>
              </div>
            </div>
          )) : <Empty title={t('student.noLessons')} description={t('state.emptyHint')} />}
        </Panel>

        <Panel title={t('teacher.myGroups')} bodyClassName="divide-y divide-navy-50">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{group.name}</p>
                <p className="truncate text-xs text-navy-500">{group.schedule} · {group.room}</p>
              </div>
              <span className="badge bg-navy-100 text-navy-700">{group.studentIds.length} {t('common.students').toLowerCase()}</span>
            </div>
          ))}
        </Panel>
      </div>

      {/* What students said about recent lessons. */}
      {Boolean(recentReviews.length) && (
        <Panel className="mt-6" title={t('review.recentFeedback')} bodyClassName="divide-y divide-navy-50"
          action={<Link to="/teacher/reviews" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}>
          {recentReviews.map((review) => (
            <div key={review.id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{review.lessonTopic}</p>
                  <p className="text-xs text-navy-500">{review.studentName} · {relativeTime(review.createdAt)}</p>
                </div>
                <StarRating value={review.rating} size={14} />
              </div>
              {review.comment && <p className="mt-2 text-sm leading-relaxed text-navy-600">{review.comment}</p>}
            </div>
          ))}
        </Panel>
      )}

      <Panel className="mt-6" title={t('common.students')} bodyClassName="divide-y divide-navy-50"
        action={<Link to="/teacher/students" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}>
        {students.map((student) => (
          <div key={student.id} className="flex items-center gap-3 px-5 py-3.5">
            <Avatar name={student.fullName} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-navy-900">{student.fullName}</p>
              <p className="truncate text-xs text-navy-500">{student.level} · {student.groupName}</p>
            </div>
            <span className="text-sm font-semibold text-navy-700">{student.attendanceRate}%</span>
          </div>
        ))}
      </Panel>
    </>
  );
}

/** A teacher sees only the groups the admin assigned to them. */
function TeacherGroups() {
  const { t } = useLanguage();
  const { data, loading } = useFetch(() => api.get('/groups', { params: { limit: 50 } }).then((r) => r.data));
  const [rosterId, setRosterId] = useState(null);

  if (loading) return <Loading />;
  const groups = data?.data ?? [];

  return (
    <>
      <PageTitle title={t('menu.myGroups')} description={t('page.myGroupsHint')} />
      {!groups.length ? <Panel><Empty title={t('page.noGroupsYet')} description={t('page.adminAssignsGroups')} /></Panel> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <article key={group.id} className="flex flex-col rounded-card border border-navy-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-navy-900">{group.name}</h2>
                <Badge status={group.status} />
              </div>
              <dl className="mt-4 flex-1 space-y-1.5 text-sm text-navy-600">
                {[['Level', group.level], ['Schedule', group.schedule], ['Room', group.room], ['Students', group.studentIds.length]].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3"><dt className="text-navy-400">{label}</dt><dd className="truncate font-medium">{value}</dd></div>
                ))}
              </dl>
              <Button size="sm" variant="secondary" className="mt-5" onClick={() => setRosterId(group.id)}>{t('btn.viewStudents')}</Button>
            </article>
          ))}
        </div>
      )}
      <TeacherRosterModal groupId={rosterId} onClose={() => setRosterId(null)} />
    </>
  );
}

function TeacherRosterModal({ groupId, onClose }) {
  const [roster, setRoster] = useState(null);
  useEffect(() => {
    setRoster(null);
    if (groupId) api.get(`/groups/${groupId}/roster`).then(({ data }) => setRoster(data)).catch((error) => toast.error(error.message));
  }, [groupId]);

  return (
    <Modal open={Boolean(groupId)} onClose={onClose} title={roster ? `${roster.group.name} students` : 'Students'}>
      {!roster ? <Loading /> : (
        <ul className="divide-y divide-navy-50">
          {roster.students.map((student) => (
            <li key={student.id} className="flex items-center gap-3 py-3">
              <Avatar name={student.fullName} size="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy-900">{student.fullName}</p>
                <p className="text-xs text-navy-500">Level {student.level}</p>
              </div>
              <span className="text-sm font-semibold text-navy-700">{student.attendanceRate}%</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Read-only list; student records belong to the administrator. */
function TeacherStudents() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api.get('/students', { params: { search: search || undefined, limit: 100 } })
        .then(({ data }) => setRows(data.data))
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      <PageTitle title={t('common.students')} description={`${rows.length} ${t('page.studentsAcross')}`} />
      <Panel bodyClassName="">
        <Toolbar search={search} onSearch={setSearch} placeholder={t('page.searchYourStudents')} />
        <Table
          loading={loading} rows={rows} empty={{ title: t('msg.noStudentsInGroups') }}
          columns={[
            { key: 'fullName', header: t('common.student'), render: (row) => (
              <div className="flex items-center gap-3">
                <Avatar name={row.fullName} />
                <div className="min-w-0"><p className="truncate font-medium text-navy-900">{row.fullName}</p><p className="truncate text-xs text-navy-500">{row.email}</p></div>
              </div>
            ) },
            { key: 'level', header: t('common.level') },
            { key: 'groupName', header: t('common.group') },
            { key: 'attendanceRate', header: t('menu.attendance'), render: (row) => `${row.attendanceRate}%` },
            { key: 'ieltsScore', header: 'IELTS', render: (row) => (row.ieltsScore ? row.ieltsScore.toFixed(1) : '—') },
            { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
          ]}
        />
      </Panel>
    </>
  );
}

/* ==========================================================================
   13. STUDENT DASHBOARD
   ========================================================================== */

function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/stats/student').then((r) => r.data));
  const { data: progress, refetch: refetchProgress } = useFetch(() => api.get('/progress/me').then((r) => r.data));
  const [reviewing, setReviewing] = useState(null);

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const { cards, group, teacher, course, attendance, upcomingLessons, openHomework, results, pendingReviews = [] } = data;

  return (
    <>
      <PageTitle
        title={`${t('student.welcome')}, ${user.fullName.split(' ')[0]}`}
        description={group ? `${course?.name ?? t('common.course')} · ${group.name} · ${group.schedule}` : t('student.notInGroup')}
      >
        <Link to="/student/games" className="btn-secondary btn-sm"><Gamepad2 size={16} />{t('menu.games')}</Link>
        <Link to="/student/homework" className="btn-primary btn-sm">{t('student.myHomework')}</Link>
      </PageTitle>

      <GamificationStrip progress={progress} />

      {/* Lessons that finished and still need this student's rating. */}
      {Boolean(pendingReviews.length) && (
        <Panel className="mb-6" title={t('review.pendingReviews')} bodyClassName="divide-y divide-navy-50">
          {pendingReviews.map((lesson) => (
            <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{lesson.topic}</p>
                <p className="text-xs text-navy-500">{formatDate(lesson.date)}</p>
              </div>
              <Button size="sm" variant="secondary" icon={Star} onClick={() => setReviewing(lesson)}>{t('review.rateLesson')}</Button>
            </div>
          ))}
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label={t('student.currentCourse')} value={course?.name ?? t('common.notAssigned')} note={group?.name} />
        <StatCard icon={CalendarCheck} label={t('student.attendanceRate')} value={`${cards.attendanceRate}%`} tone="emerald" />
        <StatCard icon={ClipboardList} label={t('student.homeworkDone')} value={`${cards.homeworkDone} / ${cards.homeworkTotal}`} tone="amber" />
        <StatCard icon={Wallet} label={t('student.paymentStatus')}
          value={cards.paymentStatus === 'paid' ? t('student.upToDate') : cards.paymentStatus === 'pending' ? t('status.pending') : t('status.overdue')}
          note={cards.nextPayment ? `${money(cards.nextPayment.amount)} · ${formatDate(cards.nextPayment.dueDate)}` : undefined}
          tone={cards.paymentStatus === 'overdue' ? 'rose' : cards.paymentStatus === 'pending' ? 'amber' : 'emerald'} />
        <StatCard icon={BarChart3} label={t('student.ieltsBand')} value={cards.ieltsScore ? cards.ieltsScore.toFixed(1) : t('student.notTaken')} tone="violet" />
        <StatCard icon={UserRound} label={t('student.myTeacher')} value={teacher?.fullName ?? '—'} note={teacher?.specialization} />
        <StatCard icon={Boxes} label={t('student.myGroup')} value={group?.name ?? t('common.notAssigned')} note={group?.room} tone="navy" />
        <StatCard icon={Trophy} label={t('student.myResults')} value={results.length} note={t('student.recordedSessions')} tone="violet" />
      </div>

      {/* Learning path, daily goal and badges — all backed by stored records. */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <LearningPathPanel progress={progress} />
        <DailyGoalPanel progress={progress} onGoalChanged={refetchProgress} />
      </div>

      <div className="mt-6">
        <AchievementsPanel progress={progress} />
      </div>

      {reviewing && (
        <LessonReviewModal lesson={reviewing} onClose={() => setReviewing(null)}
          onSaved={() => { refetch(); refetchProgress(); }} />
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Panel title={t('student.attendanceSplit')}>
          {attendance.present + attendance.late + attendance.absent > 0 ? (
            <ChartFrame height={200}>
              <Donut height={200} innerRadius={54} outerRadius={80}
                data={[
                  { name: t('status.present'), value: attendance.present, color: '#10B981' },
                  { name: t('status.late'), value: attendance.late, color: '#F59E0B' },
                  { name: t('status.absent'), value: attendance.absent, color: '#F43F5E' },
                ].filter((slice) => slice.value > 0)}
                valueFormatter={(value) => `${value}%`} />
            </ChartFrame>
          ) : <Empty title={t('student.noAttendance')} description={t('student.noAttendanceHint')} />}
        </Panel>

        <Panel className="lg:col-span-2" title={t('student.nextLessons')} bodyClassName="divide-y divide-navy-50">
          {upcomingLessons.length ? upcomingLessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-16 shrink-0 rounded-lg bg-mist px-2 py-1.5 text-center">
                <p className="text-xs text-navy-500">{formatDate(lesson.date).slice(0, 6)}</p>
                <p className="text-sm font-semibold text-navy-900">{lesson.time}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{lesson.topic}</p>
                <p className="truncate text-xs text-navy-500">{t('common.room')} {lesson.room}</p>
              </div>
            </div>
          )) : <Empty title={t('student.noLessons')} description={t('state.emptyHint')} />}
        </Panel>
      </div>

      <Panel className="mt-6" title={t('student.homeworkDue')} bodyClassName="divide-y divide-navy-50"
        action={<Link to="/student/homework" className="text-sm font-semibold text-electric-600 hover:underline">{t('common.seeAll')}</Link>}>
        {openHomework.length ? openHomework.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">{task.title}</p>
              <p className="text-sm text-navy-500">{t('student.dueOn')} {formatDate(task.deadline)}</p>
            </div>
            <Badge status="open">{t('student.notHandedIn')}</Badge>
          </div>
        )) : <Empty title={t('student.nothingOutstanding')} description={t('state.emptyHint')} />}
      </Panel>
    </>
  );
}

function StudentGroup() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data, loading } = useFetch(
    () => (profile?.groupId ? api.get(`/groups/${profile.groupId}/roster`).then((r) => r.data) : Promise.resolve(null)),
    [profile?.groupId]
  );

  if (!profile?.groupId) {
    return (
      <>
        <PageTitle title={t('student.myGroup')} />
        <Panel><Empty title={t('page.notInGroupYet')} description={t('page.notInGroupHint')} /></Panel>
      </>
    );
  }
  if (loading || !data) return <Loading />;

  const { group, students, teacher, course, lessons } = data;

  return (
    <>
      <PageTitle title={group.name} description={`${course?.name ?? 'Course'} · ${group.schedule}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UserRound} label={t('common.teacher')} value={teacher?.fullName ?? t('field.unassigned')} note={teacher?.specialization} />
        <StatCard icon={Boxes} label={t('common.level')} value={group.level} tone="violet" />
        <StatCard icon={Users} label={t('student.classmates')} value={students.length} tone="emerald" />
        <StatCard icon={Calendar} label={t('student.started')} value={formatDate(group.startDate)} tone="amber" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title={t('student.classmates')} bodyClassName="divide-y divide-navy-50">
          {students.map((student) => (
            <div key={student.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={student.fullName} size="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy-900">{student.fullName}</p>
                <p className="text-xs text-navy-500">Level {student.level}</p>
              </div>
              {student.id === profile.id && <Badge status="open">{t('student.you')}</Badge>}
            </div>
          ))}
        </Panel>

        <Panel title={t('student.timetable')} description={`${t('common.room')} ${group.room}`} bodyClassName="divide-y divide-navy-50">
          {lessons.length ? [...lessons].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-16 shrink-0 rounded-lg bg-mist px-2 py-1.5 text-center">
                <p className="text-xs text-navy-500">{formatDate(lesson.date).slice(0, 6)}</p>
                <p className="text-sm font-semibold text-navy-900">{lesson.time}</p>
              </div>
              <p className="min-w-0 flex-1 truncate font-medium text-navy-900">{lesson.topic}</p>
              <Badge status={lesson.status} />
            </div>
          )) : <Empty title={t('page.noLessonsPublished')} />}
        </Panel>
      </div>
    </>
  );
}

function StudentPayments() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data, loading } = useFetch(() => api.get('/payments', { params: { limit: 100 } }).then((r) => r.data));

  const invoices = data?.data ?? [];
  const paid = invoices.filter((invoice) => invoice.status === 'paid');
  const outstanding = invoices.filter((invoice) => invoice.status !== 'paid');

  return (
    <>
      <PageTitle title={t('menu.payments')} description={t('page.myPaymentsHint')} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label={t('field.monthlyFee')} value={money(profile?.monthlyPayment)} />
        <StatCard icon={CheckCircle2} label={t('field.paidSoFar')} value={money(paid.reduce((sum, invoice) => sum + invoice.paidAmount, 0))} tone="emerald" />
        <StatCard icon={AlertTriangle} label={t('field.outstanding')}
          value={money(outstanding.reduce((sum, invoice) => sum + (invoice.amount - invoice.paidAmount), 0))}
          note={outstanding.length ? `${outstanding.length} invoice(s)` : 'Nothing due'}
          tone={outstanding.length ? 'rose' : 'emerald'} />
      </div>

      <Panel bodyClassName="">
        <Table
          loading={loading} rows={invoices} empty={{ title: t('msg.noInvoicesYet') }}
          columns={[
            { key: 'period', header: t('page.period'), render: (row) => formatMonth(row.period) },
            { key: 'amount', header: t('page.amount'), render: (row) => money(row.amount) },
            { key: 'paidAmount', header: t('page.paid'), render: (row) => (row.paidAmount ? money(row.paidAmount) : '—') },
            { key: 'dueDate', header: t('page.due'), render: (row) => formatDate(row.dueDate) },
            { key: 'paymentDate', header: t('page.paidOn'), render: (row) => (row.paymentDate ? formatDate(row.paymentDate) : '—') },
            { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
          ]}
        />
      </Panel>

      <p className="mt-4 text-sm text-navy-500">{t('msg.paymentsAtReception')}</p>
    </>
  );
}

function StudentExtraClasses() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/extra-classes', { params: { limit: 50 } });
    setClubs(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (club, joined) => {
    setBusyId(club.id);
    try {
      if (joined) await api.delete(`/extra-classes/${club.id}/join`);
      else await api.post(`/extra-classes/${club.id}/join`);
      toast.success(joined ? `You left ${club.name}.` : `You joined ${club.name}.`);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageTitle title={t('menu.extraClasses')} description={t('page.extraClassesHint')} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {clubs.map((club) => {
          const participants = club.participants ?? [];
          const joined = participants.some((p) => p.studentId === profile?.id);
          const full = participants.length >= club.capacity;

          return (
            <article key={club.id} className="flex flex-col rounded-card border border-navy-100 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-navy-900">{club.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-600">{club.description}</p>
              <dl className="mt-4 space-y-1.5 border-t border-navy-100 pt-4 text-sm text-navy-600">
                <div className="flex items-center gap-2"><Clock size={14} className="text-navy-400" /><dd>{club.schedule}</dd></div>
                <div className="flex items-center gap-2"><Users size={14} className="text-navy-400" /><dd>{participants.length} of {club.capacity} places · {club.teacherName}</dd></div>
              </dl>
              <Button size="sm" variant={joined ? 'secondary' : 'primary'} className="mt-5" loading={busyId === club.id}
                disabled={!joined && full} onClick={() => toggle(club, joined)}>
                {joined ? 'Leave club' : full ? 'All places taken' : 'Join'}
              </Button>
            </article>
          );
        })}
      </div>
    </>
  );
}

function StudentResults() {
  const { t } = useLanguage();
  const { data, loading } = useFetch(() => api.get('/stats/student').then((r) => r.data));
  if (loading) return <Loading />;

  const results = [...(data?.results ?? [])].sort((a, b) => b.session.localeCompare(a.session));
  const latest = results[0];

  if (!latest) {
    return (
      <>
        <PageTitle title={t('menu.results')} />
        <Panel><Empty title={t('page.noIelts')} description={t('page.noIeltsHint')} /></Panel>
      </>
    );
  }

  const skills = [['listening', 'Listening'], ['reading', 'Reading'], ['writing', 'Writing'], ['speaking', 'Speaking']];

  return (
    <>
      <PageTitle title={t('menu.results')} description={`${t('page.latestSession')}: ${formatDate(latest.session)}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Trophy} label={t('field.overallBand')} value={latest.overall.toFixed(1)} tone="violet" />
        {skills.map(([key, label]) => <StatCard key={key} icon={BarChart3} label={label} value={latest[key].toFixed(1)} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('page.skillBreakdown')} description={t('page.latestSession')}>
          <ChartFrame height={260}>
            <Bars height={260} data={skills.map(([key, label]) => ({ skill: label, band: latest[key] }))}
              xKey="skill" yKey="band" domain={[0, 9]}
              valueFormatter={(value) => [value.toFixed(1), 'IELTS']} />
          </ChartFrame>
        </Panel>

        <Panel title={t('page.allSessions')} bodyClassName="divide-y divide-navy-50">
          {results.map((result) => (
            <div key={result.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium text-navy-900">{formatDate(result.session)}</p>
                <p className="text-sm text-navy-500">L {result.listening} · R {result.reading} · W {result.writing} · S {result.speaking}</p>
              </div>
              <p className="font-display text-2xl font-bold text-electric-600">{result.overall.toFixed(1)}</p>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}

/* ==========================================================================
   15. UPGRADE — SHARED PIECES
   ========================================================================== */

/** Language switcher. Sits in the public header and in the dashboard topbar. */
function LanguageSwitcher({ tone = 'light', compact = false }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => { if (!boxRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const trigger = tone === 'dark'
    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
    : 'border-navy-200 bg-white text-navy-800 hover:bg-mist';

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox" aria-expanded={open} aria-label={t('nav.language')}
        className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition', trigger)}>
        <Languages size={16} />
        <span>{current.short}</span>
        {!compact && <ChevronRight size={14} className={cn('transition', open && 'rotate-90')} />}
      </button>

      {open && (
        <ul role="listbox" aria-label={t('nav.language')}
          className="absolute right-0 z-[60] mt-2 w-44 overflow-hidden rounded-xl border border-navy-100 bg-white py-1 shadow-lift">
          {LANGUAGES.map((item) => (
            <li key={item.code}>
              <button type="button" role="option" aria-selected={item.code === language}
                onClick={() => { setLanguage(item.code); setOpen(false); }}
                className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-mist',
                  item.code === language ? 'font-semibold text-electric-700' : 'text-navy-700')}>
                <span aria-hidden="true">{item.flag}</span>
                <span className="flex-1">{item.label}</span>
                {item.code === language && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Row of 1–5 stars. Read-only unless onChange is passed. */
function StarRating({ value = 0, onChange, size = 20, label }) {
  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (!onChange) {
          return <Star key={star} size={size} className={filled ? 'text-amber-400' : 'text-navy-200'} fill={filled ? 'currentColor' : 'none'} />;
        }
        return (
          <button key={star} type="button" role="radio" aria-checked={star === value} aria-label={`${star}`}
            onClick={() => onChange(star)}
            className="rounded transition hover:scale-110">
            <Star size={size} className={filled ? 'text-amber-400' : 'text-navy-200'} fill={filled ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}

/** Labelled progress bar used by the daily goal and the learning path. */
function ProgressBar({ value, max, tone = 'bg-action-gradient', className }) {
  const percent = Math.min(100, max ? Math.round((value / max) * 100) : 0);
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-navy-100', className)}
      role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span className={cn('block h-full rounded-full transition-all duration-500', tone)} style={{ width: `${percent}%` }} />
    </div>
  );
}

/* --------------------------------------------------------------------------
   LIVE CLASS + LESSON REMINDERS
   --------------------------------------------------------------------------
   One poller shared by the whole dashboard. It asks the API every 20 seconds
   whether a class is live and what is coming up, so the state is real and
   survives a refresh or a second device.
   -------------------------------------------------------------------------- */

function useLiveClass(enabled) {
  const [state, setState] = useState({ live: null, reminders: [] });

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const poll = () => api.get('/lessons/live')
      .then(({ data }) => { if (alive) setState(data); })
      .catch(() => {});
    poll();
    const timer = setInterval(poll, 20000);
    return () => { alive = false; clearInterval(timer); };
  }, [enabled]);

  return state;
}

/** The banner a student sees the moment their teacher starts the class. */
function LiveClassBanner() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { live, reminders } = useLiveClass(role === 'student');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const announced = useRef(null);

  // Toast once per lesson, not once per poll.
  useEffect(() => {
    if (live && announced.current !== live.id) {
      announced.current = live.id;
      toast.info(t('live.banner'));
    }
  }, [live, t]);

  const join = async () => {
    setJoining(true);
    try {
      await api.post(`/lessons/${live.id}/join`);
      setJoined(true);
      toast.success(t('live.joined'));
      if (live.live?.joinUrl) window.open(live.live.joinUrl, '_blank', 'noreferrer');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  const soonest = reminders[0];

  if (!live && !soonest) return null;

  if (live) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-panel border border-emerald-200 bg-emerald-50 px-5 py-4">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-900">{t('live.banner')}</p>
          <p className="truncate text-sm text-emerald-700">{live.topic} · {live.groupName}</p>
        </div>
        <Button size="sm" icon={PlayCircle} loading={joining} disabled={joined} onClick={join}>
          {joined ? t('game.earned') : t('live.join')}
        </Button>
      </div>
    );
  }

  // No live class — show the nearest reminder window instead.
  const key = soonest.window === '15m' ? 'reminder.title15m' : soonest.window === '1h' ? 'reminder.title1h' : 'reminder.title24h';
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-panel border border-electric-200 bg-electric-50 px-5 py-3.5">
      <Clock size={18} className="text-electric-600" />
      <p className="min-w-0 flex-1 text-sm text-electric-900">
        <span className="font-semibold">{t(key)}</span>
        <span className="text-electric-700"> — {soonest.topic} · {soonest.time}{soonest.room ? ` · ${soonest.room}` : ''}</span>
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------------
   LESSON REVIEW
   -------------------------------------------------------------------------- */

function LessonReviewModal({ lesson, onClose, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ rating: 0, teacherRating: 0, clarity: 0, homeworkUsefulness: 0, comment: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.rating) { toast.error(t('review.rateLesson')); return; }
    setSaving(true);
    try {
      await api.post(`/lessons/${lesson.id}/review`, form);
      toast.success(t('review.thanks'));
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    ['rating', 'review.overall'],
    ['teacherRating', 'review.teacherRating'],
    ['clarity', 'review.clarity'],
    ['homeworkUsefulness', 'review.homeworkUseful'],
  ];

  return (
    <Modal open onClose={onClose} title={t('review.rateLesson')} description={lesson.topic} size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" loading={saving} onClick={submit}>{t('review.submitReview')}</Button>
      </>}>
      <p className="mb-5 text-sm text-navy-500">{t('review.rateHint')}</p>
      <div className="space-y-4">
        {rows.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-navy-700">{t(label)}</span>
            <StarRating value={form[key]} label={t(label)} onChange={(value) => setForm({ ...form, [key]: value })} />
          </div>
        ))}
        <Field label={t('review.comment')} name="comment" as="textarea" rows={3} value={form.comment}
          onChange={(event) => setForm({ ...form, comment: event.target.value })} />
      </div>
    </Modal>
  );
}

/* ==========================================================================
   STUDENT — GAMIFICATION PANELS
   ========================================================================== */

const ACHIEVEMENT_ICONS = {
  firstLesson: BookOpen, streak7: Flame, homeworkHero: ClipboardCheck, vocabMaster: Languages,
  quizChampion: Trophy, speakingStar: Mic, ieltsProgress: TrendingUp, perfectAttendance: CalendarCheck,
};

/** XP, level, streak and badge count — the header of the student dashboard. */
function GamificationStrip({ progress }) {
  const { t } = useLanguage();
  if (!progress) return null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="card flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-action-gradient text-white"><Zap size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-navy-500">{t('game.level')} {progress.level}</p>
          <p className="font-display text-2xl font-bold text-navy-900">{progress.xp} {t('game.xp')}</p>
          <ProgressBar className="mt-2" value={progress.xpIntoLevel} max={250} />
          <p className="mt-1 text-xs text-navy-400">{250 - progress.xpIntoLevel} {t('game.xp')} {t('game.toNextLevel')}</p>
        </div>
      </div>

      <StatCard icon={Flame} tone="amber" label={t('game.streak')} value={`${progress.streak} ${t('game.days')}`}
        note={`${t('game.longestStreak')}: ${progress.longestStreak}`} />
      <StatCard icon={Award} tone="violet" label={t('game.badges')} value={progress.badges.length}
        note={`${progress.allAchievements.length} ${t('common.total').toLowerCase()}`} />
      <StatCard icon={Target} tone="emerald" label={t('game.currentLevel')} value={progress.path.currentLevel ?? '—'}
        note={progress.path.course ?? undefined} />
    </div>
  );
}

/** Daily goal with a real, stored progress count. */
function DailyGoalPanel({ progress, onGoalChanged }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(progress?.dailyGoal ?? { vocabulary: 20, grammar: 10, minutes: 15 });
  const [saving, setSaving] = useState(false);

  if (!progress) return null;
  const { daily, dailyGoal } = progress;

  const rows = [
    ['vocabulary', 'game.vocabularyWords'],
    ['grammar', 'game.grammarTasks'],
    ['minutes', 'game.minutesPractised'],
  ];
  const done = rows.every(([key]) => (daily[key] ?? 0) >= dailyGoal[key]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/progress/goal', {
        vocabulary: Number(form.vocabulary), grammar: Number(form.grammar), minutes: Number(form.minutes),
      });
      toast.success(t('common.saved'));
      setEditing(false);
      onGoalChanged?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={t('game.dailyGoal')} description={done ? t('game.goalDone') : t('game.dailyGoalHint')}
      action={<Button variant="subtle" size="sm" onClick={() => setEditing(true)}>{t('game.editGoal')}</Button>}>
      <div className="space-y-4">
        {rows.map(([key, label]) => (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-navy-600">{t(label)}</span>
              <span className="font-semibold text-navy-900">{daily[key] ?? 0} / {dailyGoal[key]}</span>
            </div>
            <ProgressBar value={daily[key] ?? 0} max={dailyGoal[key]}
              tone={(daily[key] ?? 0) >= dailyGoal[key] ? 'bg-emerald-500' : 'bg-action-gradient'} />
          </div>
        ))}
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(false)} title={t('game.editGoal')} size="sm"
          footer={<>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
            <Button size="sm" loading={saving} onClick={save}>{t('common.save')}</Button>
          </>}>
          <div className="grid gap-4">
            {rows.map(([key, label]) => (
              <Field key={key} label={t(label)} name={key} type="number" min="1" value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            ))}
          </div>
        </Modal>
      )}
    </Panel>
  );
}

/** Learning path + deterministic recommendations, both built from real records. */
function LearningPathPanel({ progress }) {
  const { t } = useLanguage();
  if (!progress) return null;
  const { path, recommendations } = progress;

  const steps = [
    [t('game.currentLevel'), path.currentLevel ?? '—'],
    [t('common.course'), path.course ?? t('common.notAssigned')],
    [t('game.completedLessons'), `${path.completedLessons} / ${path.totalLessons}`],
    [t('game.nextGoal'), path.nextGoal ?? '—'],
  ];

  const toneStyle = {
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-electric-200 bg-electric-50 text-electric-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  return (
    <Panel title={t('game.learningPath')}>
      <ol className="relative space-y-4 border-l-2 border-navy-100 pl-6">
        {steps.map(([label, value], index) => (
          <li key={label} className="relative">
            <span className="absolute -left-[1.9rem] flex h-5 w-5 items-center justify-center rounded-full bg-action-gradient text-[0.6rem] font-bold text-white">
              {index + 1}
            </span>
            <p className="text-sm text-navy-500">{label}</p>
            <p className="font-semibold text-navy-900">{value}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5">
        <ProgressBar value={path.progressPercent} max={100} />
        <p className="mt-1.5 text-xs text-navy-400">{path.progressPercent}%</p>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-navy-900">{t('game.recommended')}</h3>
      <ul className="mt-3 space-y-2">
        {recommendations.map((item) => (
          <li key={item.code} className={cn('rounded-xl border px-4 py-2.5 text-sm', toneStyle[item.tone] ?? toneStyle.info)}>
            {t(`rec.${item.code}`, { value: item.value })}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Every badge in the catalogue, earned ones highlighted. */
function AchievementsPanel({ progress }) {
  const { t } = useLanguage();
  if (!progress) return null;
  const earned = new Set(progress.badges.map((b) => b.code));

  return (
    <Panel title={t('game.badges')} description={earned.size ? undefined : t('game.noBadges')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {progress.allAchievements.map((achievement) => {
          const Icon = ACHIEVEMENT_ICONS[achievement.code] ?? Award;
          const has = earned.has(achievement.code);
          return (
            <div key={achievement.id}
              className={cn('flex items-start gap-3 rounded-card border p-4 transition',
                has ? 'border-electric-200 bg-electric-50/60' : 'border-navy-100 bg-mist/50 opacity-70')}>
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                has ? 'bg-action-gradient text-white' : 'bg-navy-100 text-navy-400')}>
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">{t(`ach.${achievement.code}`)}</p>
                <p className="text-xs leading-relaxed text-navy-500">{t(`ach.${achievement.code}.desc`)}</p>
                <p className="mt-1 text-xs font-semibold text-electric-600">
                  {has ? t('game.earned') : t('game.locked')} · +{achievement.xp} {t('game.xp')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------------------
   STUDENT — LEADERBOARD
   -------------------------------------------------------------------------- */

function StudentLeaderboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => api.get('/leaderboard').then((r) => r.data));

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const medal = ['bg-amber-400 text-navy-950', 'bg-navy-300 text-navy-900', 'bg-amber-700 text-white'];

  return (
    <>
      <PageTitle title={t('game.leaderboard')} description={t('game.leaderboardHint')} />

      {data.me && (
        <div className="mb-5 flex items-center gap-4 rounded-panel bg-brand-gradient px-6 py-5 text-white">
          <span className="font-display text-3xl font-extrabold">#{data.me.rank}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-navy-200">{t('game.yourRank')}</p>
            <p className="truncate font-semibold">{data.me.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold">{data.me.xp}</p>
            <p className="text-xs text-navy-200">{t('game.xp')}</p>
          </div>
        </div>
      )}

      <Panel bodyClassName="">
        {!data.data.length ? <Empty title={t('state.emptyTitle')} description={t('state.emptyHint')} /> : (
          <ul className="divide-y divide-navy-50">
            {data.data.map((row) => (
              <li key={row.studentId}
                className={cn('flex items-center gap-3 px-5 py-3.5', row.studentId === profile?.id && 'bg-electric-50/60')}>
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  medal[row.rank - 1] ?? 'bg-navy-100 text-navy-600')}>{row.rank}</span>
                <Avatar name={row.name} size="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">{row.name}</p>
                  <p className="truncate text-xs text-navy-500">{row.groupName || t('common.notAssigned')} · {row.level}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-amber-600" title={t('game.streak')}><Flame size={14} />{row.streak}</span>
                  <span className="flex items-center gap-1 text-violet-600" title={t('game.badges')}><Award size={14} />{row.badges}</span>
                  <span className="w-16 text-right font-display font-bold text-navy-900">{row.xp}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ==========================================================================
   STUDENT — LANGUAGE GAMES
   --------------------------------------------------------------------------
   Five games. Each one posts its round to /api/games/result, where the XP is
   worked out on the server — the client never decides its own score.
   ========================================================================== */

const GAME_LIST = [
  { id: 'vocabulary-match', icon: Shuffle, tone: 'blue' },
  { id: 'grammar-drag', icon: Boxes, tone: 'violet' },
  { id: 'word-builder', icon: Languages, tone: 'emerald' },
  { id: 'quick-quiz', icon: Zap, tone: 'rose' },
];

const shuffleArray = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** The result card every game ends on. */
function GameResult({ result, onPlayAgain, onExit }) {
  const { t } = useLanguage();
  return (
    <Panel title={t('games.roundOver')}>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={Trophy} label={t('game.score')} value={result.correct * 10} />
        <StatCard icon={Target} tone="emerald" label={t('game.accuracy')}
          value={`${result.correct + result.wrong ? Math.round((result.correct / (result.correct + result.wrong)) * 100) : 0}%`} />
        <StatCard icon={Clock} tone="amber" label={t('game.timeSpent')} value={`${Math.round(result.durationMs / 1000)}s`} />
        <StatCard icon={Zap} tone="violet" label={t('game.xpEarned')} value={`+${result.xpEarned ?? 0}`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={15} />{t('game.correct')}: {result.correct}</span>
        <span className="flex items-center gap-1.5 text-rose-600"><XCircle size={15} />{t('game.incorrect')}: {result.wrong}</span>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="sm" onClick={onPlayAgain}>{t('game.playAgain')}</Button>
        <Button variant="secondary" size="sm" onClick={onExit}>{t('game.backToGames')}</Button>
      </div>
    </Panel>
  );
}

/** Shared plumbing: load content, time the round, post the result. */
function useGameRound(gameId, onFinished) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const startedAt = useRef(Date.now());

  const load = useCallbackShim(() => {
    setLoading(true);
    startedAt.current = Date.now();
    return api.get('/games/content', { params: { count: 8 } })
      .then(({ data }) => setContent(data))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  });

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const finish = async (correct, wrong) => {
    const durationMs = Date.now() - startedAt.current;
    try {
      const { data } = await api.post('/games/result', { game: gameId, correct, wrong, durationMs });
      if (data.earned?.length) toast.success(`+${data.earned.length} 🏅`);
      onFinished({ ...data.result, durationMs });
    } catch (error) {
      toast.error(error.message);
      onFinished({ correct, wrong, durationMs, xpEarned: 0 });
    }
  };

  return { content, loading, finish, reload: load };
}

// Tiny helper so the hook above stays readable without pulling in useCallback deps.
function useCallbackShim(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  return useMemo(() => (...args) => ref.current(...args), []);
}

/** GAME 1 — match an English word to its translation. */
function VocabularyMatch({ onExit }) {
  const { t, language } = useLanguage();
  const [result, setResult] = useState(null);
  const { content, loading, finish, reload } = useGameRound('vocabulary-match', setResult);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState([]);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [wrongPair, setWrongPair] = useState(null);

  const words = content?.words ?? [];
  const translationOf = (word) => (language === 'ru' ? word.ru : word.uz);
  const rightColumn = useMemo(() => shuffleArray(words), [words]);

  useEffect(() => {
    if (words.length && done.length === words.length) finish(score.correct, score.wrong);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done.length, words.length]);

  if (result) {
    return <GameResult result={result} onExit={onExit}
      onPlayAgain={() => { setResult(null); setDone([]); setPicked(null); setScore({ correct: 0, wrong: 0 }); reload(); }} />;
  }
  if (loading) return <Loading />;

  const choose = (side, word) => {
    if (done.includes(word.id)) return;
    if (!picked) { setPicked({ side, word }); return; }
    if (picked.side === side) { setPicked({ side, word }); return; }

    if (picked.word.id === word.id) {
      setDone((list) => [...list, word.id]);
      setScore((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
      setWrongPair(word.id);
      setTimeout(() => setWrongPair(null), 400);
    }
    setPicked(null);
  };

  const tile = (word, side, text) => {
    const isDone = done.includes(word.id);
    const isPicked = picked?.word.id === word.id && picked.side === side;
    return (
      <button key={`${side}-${word.id}`} type="button" disabled={isDone} onClick={() => choose(side, word)}
        className={cn('rounded-xl border px-4 py-3 text-sm font-medium transition',
          isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60'
            : isPicked ? 'border-electric-500 bg-electric-50 text-electric-800'
            : wrongPair === word.id ? 'border-rose-400 bg-rose-50 text-rose-700'
            : 'border-navy-200 bg-white text-navy-800 hover:border-electric-300 hover:bg-mist')}>
        {text}
      </button>
    );
  };

  return (
    <Panel title={t('games.vocabulary-match')} description={t('games.tapPairs')}>
      <div className="mb-4 flex gap-4 text-sm">
        <span className="text-emerald-600">{t('game.correct')}: {score.correct}</span>
        <span className="text-rose-600">{t('game.incorrect')}: {score.wrong}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">{words.map((word) => tile(word, 'left', word.en))}</div>
        <div className="grid gap-2">{rightColumn.map((word) => tile(word, 'right', translationOf(word)))}</div>
      </div>
    </Panel>
  );
}

/** GAMES 2 & 3 — put shuffled words back into a correct sentence. */
function SentenceGame({ gameId, onExit }) {
  const { t } = useLanguage();
  const [result, setResult] = useState(null);
  const { content, loading, finish, reload } = useGameRound(gameId, setResult);
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState([]);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [verdict, setVerdict] = useState(null);

  const sentences = content?.sentences ?? [];
  const sentence = sentences[round];
  const pool = useMemo(() => (sentence ? shuffleArray(sentence.text.split(' ')).map((word, i) => ({ word, key: `${i}-${word}` })) : []), [sentence]);

  if (result) {
    return <GameResult result={result} onExit={onExit}
      onPlayAgain={() => { setResult(null); setRound(0); setChosen([]); setScore({ correct: 0, wrong: 0 }); setVerdict(null); reload(); }} />;
  }
  if (loading || !sentence) return <Loading />;

  const check = () => {
    const attempt = chosen.map((item) => item.word).join(' ');
    const right = attempt === sentence.text;
    setScore((s) => ({ correct: s.correct + (right ? 1 : 0), wrong: s.wrong + (right ? 0 : 1) }));
    setVerdict(right ? 'correct' : 'wrong');

    setTimeout(() => {
      setVerdict(null);
      setChosen([]);
      const next = round + 1;
      if (next >= sentences.length) finish(score.correct + (right ? 1 : 0), score.wrong + (right ? 0 : 1));
      else setRound(next);
    }, 1200);
  };

  return (
    <Panel title={t(`games.${gameId}`)} description={t('games.tapWordsInOrder')}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-navy-500">{round + 1} / {sentences.length}</span>
        <span className="badge bg-navy-100 text-navy-600">{sentence.hint}</span>
      </div>

      <div className={cn('min-h-[4.5rem] rounded-xl border-2 border-dashed p-4 transition',
        verdict === 'correct' ? 'border-emerald-400 bg-emerald-50'
          : verdict === 'wrong' ? 'border-rose-400 bg-rose-50' : 'border-navy-200 bg-mist')}>
        <div className="flex flex-wrap gap-2">
          {chosen.map((item, index) => (
            <button key={item.key} type="button"
              onClick={() => setChosen(chosen.filter((_, i) => i !== index))}
              className="rounded-lg bg-action-gradient px-3 py-1.5 text-sm font-medium text-white">{item.word}</button>
          ))}
          {!chosen.length && <span className="text-sm text-navy-400">{t('games.tapWordsInOrder')}</span>}
        </div>
      </div>
      {verdict === 'wrong' && <p className="mt-2 text-sm text-rose-600">{sentence.text}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {pool.filter((item) => !chosen.some((c) => c.key === item.key)).map((item) => (
          <button key={item.key} type="button" onClick={() => setChosen([...chosen, item])}
            className="rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:border-electric-300 hover:bg-mist">
            {item.word}
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <Button size="sm" disabled={!chosen.length || Boolean(verdict)} onClick={check}>{t('games.check')}</Button>
        <Button variant="secondary" size="sm" disabled={!chosen.length} onClick={() => setChosen([])}>{t('games.reset')}</Button>
      </div>
    </Panel>
  );
}

/** GAME 4 — multiple choice on vocabulary. */
function QuickQuizGame({ onExit }) {
  const { t, language } = useLanguage();
  const [result, setResult] = useState(null);
  const { content, loading, finish, reload } = useGameRound('quick-quiz', setResult);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [picked, setPicked] = useState(null);

  const words = content?.words ?? [];
  const word = words[round];
  const translationOf = (item) => (language === 'ru' ? item.ru : item.uz);
  const options = useMemo(() => (word ? shuffleArray([word, ...words.filter((w) => w.id !== word.id).slice(0, 3)]) : []), [word, words]);

  if (result) {
    return <GameResult result={result} onExit={onExit}
      onPlayAgain={() => { setResult(null); setRound(0); setScore({ correct: 0, wrong: 0 }); setPicked(null); reload(); }} />;
  }
  if (loading || !word) return <Loading />;

  const answer = (option) => {
    if (picked) return;
    const right = option.id === word.id;
    setPicked(option.id);
    const nextScore = { correct: score.correct + (right ? 1 : 0), wrong: score.wrong + (right ? 0 : 1) };
    setScore(nextScore);

    setTimeout(() => {
      setPicked(null);
      if (round + 1 >= words.length) finish(nextScore.correct, nextScore.wrong);
      else setRound(round + 1);
    }, 900);
  };

  return (
    <Panel title={t('games.quick-quiz')} description={t('games.chooseTranslation')}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-navy-500">{round + 1} / {words.length}</span>
        <span className="text-emerald-600">{t('game.correct')}: {score.correct}</span>
      </div>

      <p className="rounded-panel bg-mist py-8 text-center font-display text-3xl font-bold text-navy-900">{word.en}</p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {options.map((option) => {
          const isRight = option.id === word.id;
          const state = !picked ? 'idle' : isRight ? 'right' : option.id === picked ? 'wrong' : 'idle';
          return (
            <button key={option.id} type="button" onClick={() => answer(option)} disabled={Boolean(picked)}
              className={cn('rounded-xl border px-4 py-3 text-sm font-medium transition',
                state === 'right' ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : state === 'wrong' ? 'border-rose-400 bg-rose-50 text-rose-800'
                  : 'border-navy-200 bg-white text-navy-800 hover:border-electric-300 hover:bg-mist')}>
              {translationOf(option)}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/** The games hub — stats per game, then the chosen game. */
function StudentGames() {
  const { t } = useLanguage();
  const [active, setActive] = useState(null);
  const { data, loading, refetch } = useFetch(() => api.get('/games/results').then((r) => r.data));

  const exit = () => { setActive(null); refetch(); };

  if (active === 'vocabulary-match') return <><PageTitle title={t('games.title')} /><VocabularyMatch onExit={exit} /></>;
  if (active === 'grammar-drag') return <><PageTitle title={t('games.title')} /><SentenceGame gameId="grammar-drag" onExit={exit} /></>;
  if (active === 'word-builder') return <><PageTitle title={t('games.title')} /><SentenceGame gameId="word-builder" onExit={exit} /></>;
  if (active === 'quick-quiz') return <><PageTitle title={t('games.title')} /><QuickQuizGame onExit={exit} /></>;

  const statsFor = (id) => data?.best?.find((b) => b.game === id) ?? { plays: 0, bestScore: 0, bestAccuracy: 0 };

  return (
    <>
      <PageTitle title={t('games.title')} description={t('games.subtitle')} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {GAME_LIST.map(({ id, icon: Icon, tone }) => {
          const stats = statsFor(id);
          const tones = { blue: 'bg-electric-50 text-electric-600', amber: 'bg-amber-50 text-amber-600',
            violet: 'bg-violet-500/10 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600' };
          return (
            <article key={id} className="card flex flex-col p-6">
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', tones[tone])}><Icon size={22} /></span>
              <h3 className="mt-4 font-display text-lg font-semibold text-navy-900">{t(`games.${id}`)}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-navy-500">{t(`games.${id}.desc`)}</p>
              <dl className="mt-4 flex gap-5 border-t border-navy-100 pt-4 text-sm">
                <div><dt className="text-xs text-navy-400">{t('games.plays')}</dt><dd className="font-semibold text-navy-800">{stats.plays}</dd></div>
                <div><dt className="text-xs text-navy-400">{t('games.best')}</dt><dd className="font-semibold text-navy-800">{stats.bestScore}</dd></div>
                <div><dt className="text-xs text-navy-400">{t('game.accuracy')}</dt><dd className="font-semibold text-navy-800">{stats.bestAccuracy}%</dd></div>
              </dl>
              <Button size="sm" className="mt-4" icon={PlayCircle} onClick={() => setActive(id)}>{t('games.play')}</Button>
            </article>
          );
        })}
      </div>

      <Panel className="mt-6" title={t('tests.history')} bodyClassName="">
        {loading ? <Loading /> : !(data?.data ?? []).length ? (
          <Empty title={t('state.emptyTitle')} description={t('games.subtitle')} />
        ) : (
          <ul className="scroll-slim max-h-80 divide-y divide-navy-50 overflow-y-auto">
            {data.data.filter((row) => GAME_LIST.some((g) => g.id === row.game)).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{t(`games.${row.game}`)}</p>
                  <p className="text-xs text-navy-400">{relativeTime(row.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-navy-600">{row.accuracy}%</span>
                  <span className="font-semibold text-electric-600">+{row.xpEarned} {t('game.xp')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ==========================================================================
   STUDENT — TESTS
   ========================================================================== */

function TestRunner({ quizId, onExit }) {
  const { t } = useLanguage();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startedAt = useRef(Date.now());
  const submitted = useRef(false);

  // While a test is running, warn on refresh or tab close. Cleared the moment
  // the test is submitted or abandoned on purpose, so it never nags afterwards.
  const inProgress = Boolean(quiz) && !result;
  useEffect(() => {
    if (!inProgress) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inProgress]);

  useEffect(() => {
    api.get(`/quizzes/${quizId}/play`)
      .then(({ data }) => {
        setQuiz(data);
        setAnswers(new Array(data.questions.length).fill(null));
        if (data.timeLimit) setSeconds(data.timeLimit * 60);
      })
      .catch((error) => { toast.error(error.message); onExit(); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const submit = async (auto = false) => {
    if (submitted.current) return;
    submitted.current = true;
    setSaving(true);
    try {
      const { data } = await api.post(`/quizzes/${quizId}/attempt`, {
        answers, timeSpent: Math.round((Date.now() - startedAt.current) / 1000),
      });
      setResult(data);
      if (auto) toast.info(t('tests.timeUp'));
      if (data.earned?.length) toast.success('🏅');
    } catch (error) {
      toast.error(error.message);
      submitted.current = false;
    } finally {
      setSaving(false);
    }
  };

  // Countdown, when the test has a limit.
  useEffect(() => {
    if (seconds === null || result) return undefined;
    if (seconds <= 0) { submit(true); return undefined; }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, result]);

  if (loading) return <Loading />;
  if (!quiz) return null;

  if (result) {
    const { attempt } = result;
    return (
      <>
        <Panel title={t('tests.yourScore')}>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Trophy} label={t('tests.yourScore')} value={`${attempt.score} / ${attempt.total}`} />
            <StatCard icon={Target} tone="emerald" label={t('game.accuracy')} value={`${attempt.percentage}%`} />
            <StatCard icon={Zap} tone="violet" label={t('game.xpEarned')} value={`+${attempt.xpEarned}`} />
          </div>
          <Button variant="secondary" size="sm" className="mt-5" onClick={onExit}>{t('common.back')}</Button>
        </Panel>

        <Panel className="mt-5" title={t('tests.reviewAnswers')} bodyClassName="">
          <ul className="divide-y divide-navy-50">
            {attempt.answers.map((row, position) => (
              <li key={row.questionId} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    row.correct ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                    {row.correct ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-navy-900">{position + 1}. {row.prompt}</p>
                    <p className="mt-1 text-sm text-navy-600">
                      {t('tests.yourAnswer')}: {row.given === null ? t('tests.noAnswer') : row.options[row.given]}
                    </p>
                    {!row.correct && (
                      <p className="text-sm text-emerald-700">{t('tests.correctAnswer')}: {row.options[row.correctIndex]}</p>
                    )}
                    {row.explanation && <p className="mt-1 text-sm text-navy-500">{row.explanation}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </>
    );
  }

  if (!quiz.questions.length) {
    return <Panel><Empty title={t('tests.emptyQuiz')} actionLabel={t('common.back')} onAction={onExit} /></Panel>;
  }

  const question = quiz.questions[index];
  const answered = answers.filter((a) => a !== null).length;

  // Leaving on purpose: drop the unfinished attempt and go back to the list.
  // Nothing is posted, so an abandoned test never counts as an attempt.
  const confirmExit = () => {
    submitted.current = true;
    setExiting(false);
    onExit();
  };

  return (
    <Panel title={quiz.title} description={quiz.description}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-navy-500">
          {t('tests.question')} {index + 1} {t('tests.of')} {quiz.questions.length}
          <span className="ml-3 text-navy-400">{t('tests.answeredSoFar')}: {answered}</span>
        </span>
        <div className="flex items-center gap-3">
          {seconds !== null && (
            <span className={cn('flex items-center gap-1.5 font-display font-bold', seconds <= 30 ? 'text-rose-600' : 'text-navy-900')}>
              <Timer size={16} />{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          )}
          {/* Never leaves straight away — it opens the confirmation below. */}
          <Button variant="secondary" size="sm" icon={X} onClick={() => setExiting(true)}>
            {t('tests.exitTest')}
          </Button>
        </div>
      </div>
      <ProgressBar value={answered} max={quiz.questions.length} className="mb-6" />

      <h3 className="font-display text-lg font-semibold text-navy-900">{question.prompt}</h3>
      <div className="mt-4 grid gap-2.5">
        {question.options.map((option, position) => (
          <button key={option} type="button"
            onClick={() => setAnswers(answers.map((a, i) => (i === index ? position : a)))}
            className={cn('rounded-xl border px-4 py-3 text-left text-sm font-medium transition',
              answers[index] === position
                ? 'border-electric-500 bg-electric-50 text-electric-800'
                : 'border-navy-200 bg-white text-navy-800 hover:border-electric-300 hover:bg-mist')}>
            {option}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" icon={ArrowLeft} disabled={index === 0} onClick={() => setIndex(index - 1)}>
          {t('common.back')}
        </Button>
        {index < quiz.questions.length - 1 ? (
          <Button size="sm" onClick={() => setIndex(index + 1)}>{t('common.next')}</Button>
        ) : (
          <Button size="sm" loading={saving} onClick={() => submit(false)}>{t('tests.finishTest')}</Button>
        )}
      </div>

      {/* Cancel keeps every answer exactly as it was; only "Yes" leaves. */}
      <Modal open={exiting} onClose={() => setExiting(false)} size="sm" title={t('tests.exitConfirm')}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setExiting(false)}>{t('tests.exitCancel')}</Button>
          <Button variant="danger" size="sm" onClick={confirmExit}>{t('tests.exitConfirmYes')}</Button>
        </>}>
        <p className="text-sm leading-relaxed text-navy-600">{t('tests.exitWarning')}</p>
        <p className="mt-3 text-sm font-medium text-navy-900">
          {t('tests.answeredSoFar')}: {answered} / {quiz.questions.length}
        </p>
      </Modal>
    </Panel>
  );
}

function StudentTests() {
  const { t } = useLanguage();
  const [running, setRunning] = useState(null);
  const { data: quizzes, loading } = useFetch(() => api.get('/quizzes', { params: { limit: 100 } }).then((r) => r.data));
  const { data: attempts, refetch } = useFetch(() => api.get('/quiz-attempts').then((r) => r.data));

  if (running) {
    return (
      <>
        <PageTitle title={t('tests.title')} />
        <TestRunner quizId={running} onExit={() => { setRunning(null); refetch(); }} />
      </>
    );
  }

  const published = (quizzes?.data ?? []).filter((q) => q.visible !== false);

  return (
    <>
      <PageTitle title={t('tests.title')} description={t('tests.subtitle')} />

      {loading ? <Loading /> : !published.length ? (
        <Panel><Empty title={t('tests.noTests')} description={t('state.emptyHint')} /></Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {published.map((quiz) => (
            <article key={quiz.id} className="card flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-navy-900">{quiz.title}</h3>
                {quiz.level && <span className="badge bg-navy-50 text-navy-600">{quiz.level}</span>}
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-500">{quiz.description}</p>
              <dl className="mt-4 flex gap-5 border-t border-navy-100 pt-4 text-sm">
                <div><dt className="text-xs text-navy-400">{t('tests.questions')}</dt>
                  <dd className="font-semibold text-navy-800">{(quiz.questions ?? []).length}</dd></div>
                <div><dt className="text-xs text-navy-400">{t('tests.timeLimit')}</dt>
                  <dd className="font-semibold text-navy-800">{quiz.timeLimit ? `${quiz.timeLimit} ${t('common.minutes')}` : t('tests.noLimit')}</dd></div>
              </dl>
              <Button size="sm" className="mt-4" disabled={!(quiz.questions ?? []).length} onClick={() => setRunning(quiz.id)}>
                {t('tests.startTest')}
              </Button>
            </article>
          ))}
        </div>
      )}

      <Panel className="mt-6" title={t('tests.history')} bodyClassName="">
        {!(attempts?.data ?? []).length ? <Empty title={t('tests.noAttempts')} /> : (
          <Table
            columns={[
              { key: 'quizTitle', header: t('common.title') },
              { key: 'score', header: t('game.score'), render: (row) => `${row.score} / ${row.total}` },
              { key: 'percentage', header: t('game.accuracy'), render: (row) => `${row.percentage}%` },
              { key: 'xpEarned', header: t('game.xp'), render: (row) => `+${row.xpEarned}` },
              { key: 'createdAt', header: t('common.date'), render: (row) => relativeTime(row.createdAt) },
            ]}
            rows={attempts.data}
            empty={{ title: t('tests.noAttempts') }}
          />
        )}
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------------------
   STUDENT — DISCOVER (course catalogue)
   -------------------------------------------------------------------------- */

function StudentDiscover() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [asking, setAsking] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const { data, loading, error, refetch } = useFetch(() => api.get('/courses', { params: { limit: 100 } }).then((r) => r.data));
  const { data: myRequests, refetch: refetchRequests } = useFetch(() => api.get('/course-requests').then((r) => r.data));

  const requestCourse = async () => {
    setSending(true);
    try {
      await api.post('/course-requests', { courseId: asking.id, message: note });
      toast.success(t('enrol.sent'));
      setAsking(null); setNote('');
      refetchRequests();
    } catch (err) { toast.error(err.message); } finally { setSending(false); }
  };

  const pendingFor = (courseId) => (myRequests?.data ?? []).some((r) => r.courseId === courseId && r.status === 'pending');

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const courses = (data?.data ?? []).filter((course) =>
    !search || `${course.name} ${course.level} ${course.description}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageTitle title={t('menu.discover')} description={t('landing.coursesSubtitle')} />

      <Panel bodyClassName="">
        <Toolbar search={search} onSearch={setSearch} placeholder={t('common.search')} />
        <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
          {!courses.length && <Empty title={t('state.noResults')} />}
          {courses.map((course) => (
            <article key={course.id} className="card flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-navy-900">{course.name}</h3>
                {course.id === profile?.courseId && <Badge status="active">{t('student.currentCourse')}</Badge>}
              </div>
              <p className="mt-1 text-sm font-medium text-electric-600">{course.level}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-navy-500">{course.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-navy-100 pt-4 text-sm">
                <div><dt className="text-xs text-navy-400">{t('common.duration')}</dt><dd className="font-semibold text-navy-800">{course.duration}</dd></div>
                <div><dt className="text-xs text-navy-400">{t('landing.lessonsLabel')}</dt><dd className="font-semibold text-navy-800">{course.lessonsCount}</dd></div>
                <div><dt className="text-xs text-navy-400">{t('common.schedule')}</dt><dd className="font-semibold text-navy-800">{course.schedule}</dd></div>
                <div><dt className="text-xs text-navy-400">{t('common.price')}</dt><dd className="font-semibold text-navy-800">{money(course.pricePerMonth)}</dd></div>
              </dl>

              {course.id !== profile?.courseId && (
                <Button size="sm" variant={pendingFor(course.id) ? 'secondary' : 'primary'} className="mt-4"
                  disabled={pendingFor(course.id)} onClick={() => { setAsking(course); setNote(''); }}>
                  {pendingFor(course.id) ? t('status.pending') : t('enrol.request')}
                </Button>
              )}
            </article>
          ))}
        </div>
      </Panel>

      {Boolean((myRequests?.data ?? []).length) && (
        <Panel className="mt-6" title={t('enrol.myRequests')} bodyClassName="divide-y divide-navy-50">
          {myRequests.data.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{row.courseName}</p>
                <p className="text-xs text-navy-500">{relativeTime(row.createdAt)}</p>
              </div>
              <Badge status={row.status} />
            </div>
          ))}
        </Panel>
      )}

      <Modal open={Boolean(asking)} onClose={() => setAsking(null)} size="sm"
        title={t('enrol.requestTitle')} description={asking?.name}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setAsking(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={sending} onClick={requestCourse}>{t('common.submit')}</Button>
        </>}>
        <p className="mb-4 text-sm leading-relaxed text-navy-600">{t('enrol.requestHint')}</p>
        <Field label={t('enrol.yourMessage')} name="note" as="textarea" rows={3} value={note}
          onChange={(event) => setNote(event.target.value)} />
      </Modal>
    </>
  );
}

/** Admin review of course change requests. Approving moves the student. */
function AdminCourseRequests() {
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/course-requests').then((r) => r.data));
  const [busy, setBusy] = useState(null);

  const decide = async (row, status) => {
    setBusy(row.id);
    try {
      await api.patch(`/course-requests/${row.id}`, { status });
      toast.success(t('common.saved'));
      refetch();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  return (
    <>
      <PageTitle title={t('enrol.adminTitle')} description={t('enrol.adminHint')} />
      <Panel bodyClassName="">
        <Table
          rows={data.data}
          empty={{ title: t('enrol.noRequests'), description: t('enrol.adminHint') }}
          columns={[
            { key: 'studentName', header: t('common.student') },
            { key: 'courseName', header: t('enrol.wantedCourse') },
            { key: 'message', header: t('common.message'), render: (row) => (
              <p className="line-clamp-2 max-w-xs text-sm text-navy-600">{row.message || '—'}</p>
            ) },
            { key: 'createdAt', header: t('common.date'), render: (row) => relativeTime(row.createdAt) },
            { key: 'status', header: t('common.status'), render: (row) => <Badge status={row.status} /> },
            { key: 'actions', header: '', className: 'text-right', render: (row) => (row.status !== 'pending' ? null : (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" loading={busy === row.id} onClick={() => decide(row, 'rejected')}>{t('btn.reject')}</Button>
                <Button size="sm" loading={busy === row.id} onClick={() => decide(row, 'approved')}>{t('btn.approve')}</Button>
              </div>
            )) },
          ]}
        />
      </Panel>
    </>
  );
}

/* ==========================================================================
   ADMIN — NEW CMS PAGES
   ========================================================================== */

/** Branches: three cards on the public site, fully editable here. */
function AdminBranches() {
  const { t } = useLanguage();
  return (
    <CrudPage
      title={t('admin.branchesTitle')} label={t('admin.branchesTitle')} resource="branches"
      description={t('admin.branchesHint')}
      defaults={{ name: '', address: '', landmark: '', phone: '', workingHours: '', image: '', video: '', googleMaps: '', yandexMaps: '', order: 1, visible: true }}
      transform={(values) => ({ ...values, order: Number(values.order) || 1, visible: values.visible !== 'false' && values.visible !== false })}
      columns={[
        { key: 'name', header: t('common.name'), render: (row) => (
          <div><p className="font-medium text-navy-900">{row.name}</p><p className="text-xs text-navy-500">{row.address || '—'}</p></div>
        ) },
        { key: 'phone', header: t('common.phone') },
        { key: 'workingHours', header: t('common.workingHours') },
        { key: 'maps', header: 'Maps', render: (row) => (
          <div className="flex gap-1.5">
            {row.googleMaps && <a href={row.googleMaps} target="_blank" rel="noreferrer" className="badge bg-electric-50 text-electric-700">G</a>}
            {row.yandexMaps && <a href={row.yandexMaps} target="_blank" rel="noreferrer" className="badge bg-amber-50 text-amber-700">Y</a>}
            {!row.googleMaps && !row.yandexMaps && <span className="text-navy-300">—</span>}
          </div>
        ) },
        { key: 'visible', header: t('common.status'), render: (row) => (
          <Badge status={row.visible === false ? 'pending' : 'active'}>
            {row.visible === false ? t('common.hidden') : t('common.visible')}
          </Badge>
        ) },
      ]}
      fields={[
        { name: 'name', label: t('common.name'), full: true, i18n: true },
        { name: 'address', label: t('common.address'), full: true, i18n: true },
        { name: 'landmark', label: t('landing.landmark'), i18n: true },
        { name: 'phone', label: t('common.phone') },
        { name: 'workingHours', label: t('common.workingHours'), i18n: true },
        { name: 'order', label: t('admin.order'), type: 'number' },
        { name: 'googleMaps', label: t('admin.googleMapsLink'), full: true, placeholder: 'https://maps.google.com/…' },
        { name: 'yandexMaps', label: t('admin.yandexMapsLink'), full: true, placeholder: 'https://yandex.uz/maps/…' },
        { name: 'image', label: t('admin.imageUrl'), full: true },
        { name: 'video', label: t('admin.videoUrl'), full: true },
        { name: 'visible', label: t('common.status'), as: 'select', options: [
          { value: true, label: t('common.visible') }, { value: false, label: t('common.hidden') }] },
      ]}
    />
  );
}

/** Media posts — the "School life" grid on the public site. */
function AdminMedia() {
  const { t } = useLanguage();
  const categories = ['School', 'Students', 'Teachers', 'Events', 'Courses', 'Achievements'];

  return (
    <CrudPage
      title={t('admin.mediaTitle')} label={t('menu.media')} resource="media"
      description={t('admin.mediaHint')}
      defaults={{ title: '', description: '', category: 'School', image: '', video: '', date: today(), visible: true }}
      transform={(values) => ({ ...values, visible: values.visible !== 'false' && values.visible !== false })}
      filters={[{ key: 'category', label: t('common.category'), options: categories.map((c) => ({ value: c, label: c })) }]}
      columns={[
        { key: 'title', header: t('common.title'), render: (row) => (
          <div className="flex items-center gap-3">
            {row.image
              ? <img src={row.image} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
              : <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-mist text-navy-300"><Layout size={16} /></span>}
            <div className="min-w-0">
              <p className="truncate font-medium text-navy-900">{row.title}</p>
              <p className="line-clamp-1 text-xs text-navy-500">{row.description}</p>
            </div>
          </div>
        ) },
        { key: 'category', header: t('common.category'), render: (row) => <span className="badge bg-navy-50 text-navy-600">{row.category}</span> },
        { key: 'date', header: t('common.date'), render: (row) => formatDate(row.date) },
        { key: 'video', header: t('form.video'), render: (row) => (row.video ? <Video size={16} className="text-electric-600" /> : '—') },
        { key: 'visible', header: t('common.status'), render: (row) => (
          <Badge status={row.visible === false ? 'pending' : 'active'}>
            {row.visible === false ? t('common.hidden') : t('common.visible')}
          </Badge>
        ) },
      ]}
      fields={[
        { name: 'title', label: t('common.title'), full: true, i18n: true },
        { name: 'category', label: t('common.category'), as: 'select', options: categories.map((c) => ({ value: c, label: c })) },
        { name: 'date', label: t('common.date'), type: 'date' },
        { name: 'image', label: t('admin.imageUrl'), full: true, placeholder: 'https://…' },
        { name: 'video', label: t('admin.videoUrl'), full: true, placeholder: 'https://…' },
        { name: 'description', label: t('common.description'), as: 'textarea', rows: 3, full: true, i18n: true },
        { name: 'visible', label: t('common.status'), as: 'select', options: [
          { value: true, label: t('common.visible') }, { value: false, label: t('common.hidden') }] },
      ]}
    />
  );
}

/** Lead pipeline: search, filter, change status, add notes, delete. */
function AdminLeads() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [notes, setNotes] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useFetch(
    () => api.get('/leads', { params: { search: search || undefined, status: status || undefined } }).then((r) => r.data),
    [search, status]
  );

  const STATUSES = ['new', 'contacted', 'in-progress', 'converted', 'rejected'];
  const labelFor = (value) => t(`status.${value === 'in-progress' ? 'inProgress' : value}`);

  const changeStatus = async (lead, value) => {
    try {
      await api.patch(`/leads/${lead.id}`, { status: value });
      toast.success(t('common.saved'));
      refetch();
    } catch (err) { toast.error(err.message); }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/leads/${editing.id}`, { notes });
      toast.success(t('common.saved'));
      setEditing(null);
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/leads/${deleting.id}`);
      toast.success(t('common.deleted'));
      setDeleting(null);
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  return (
    <>
      <PageTitle title={t('admin.leadsTitle')} description={t('admin.leadsHint')} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STATUSES.map((value) => (
          <button key={value} type="button" onClick={() => setStatus(status === value ? '' : value)}
            className={cn('card p-4 text-left transition', status === value && 'ring-2 ring-electric-400')}>
            <p className="text-sm text-navy-500">{labelFor(value)}</p>
            <p className="mt-1 font-display text-2xl font-bold text-navy-900">{data?.counts?.[value] ?? 0}</p>
          </button>
        ))}
      </div>

      <Panel bodyClassName="">
        <Toolbar search={search} onSearch={setSearch} placeholder={t('common.search')}
          filters={[{ key: 'status', label: t('common.status'), value: status, onChange: setStatus,
            options: STATUSES.map((value) => ({ value, label: labelFor(value) })) }]} />
        <Table
          loading={loading}
          rows={data?.data ?? []}
          empty={{ title: t('state.emptyTitle'), description: t('admin.leadsHint') }}
          columns={[
            { key: 'fullName', header: t('common.fullName'), render: (row) => (
              <div>
                <p className="font-medium text-navy-900">{row.fullName}</p>
                <p className="text-xs text-navy-500">{row.phone}{row.email ? ` · ${row.email}` : ''}</p>
              </div>
            ) },
            { key: 'course', header: t('common.course'), render: (row) => row.course || '—' },
            { key: 'message', header: t('common.message'), render: (row) => (
              <p className="line-clamp-2 max-w-xs text-sm text-navy-600">{row.message || '—'}</p>
            ) },
            { key: 'createdAt', header: t('common.date'), render: (row) => relativeTime(row.createdAt) },
            { key: 'status', header: t('common.status'), render: (row) => (
              <select value={row.status ?? 'new'} onChange={(event) => changeStatus(row, event.target.value)}
                aria-label={t('admin.changeStatus')}
                className="rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-medium text-navy-700 outline-none focus:border-electric-400">
                {STATUSES.map((value) => <option key={value} value={value}>{labelFor(value)}</option>)}
              </select>
            ) },
            { key: 'actions', header: '', className: 'text-right', render: (row) => (
              <div className="flex justify-end gap-1">
                <button type="button" aria-label={t('admin.leadNotes')}
                  onClick={() => { setEditing(row); setNotes(row.notes ?? ''); }}
                  className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-800"><Pencil size={15} /></button>
                <button type="button" aria-label={t('common.delete')} onClick={() => setDeleting(row)}
                  className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </div>
            ) },
          ]}
        />
      </Panel>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={t('admin.leadNotes')}
        description={editing?.fullName} size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button size="sm" loading={saving} onClick={saveNotes}>{t('common.save')}</Button>
        </>}>
        <Field label={t('admin.leadNotes')} name="notes" as="textarea" rows={5} value={notes}
          onChange={(event) => setNotes(event.target.value)} />
      </Modal>

      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving}
        title={t('common.delete')} confirmLabel={t('common.delete')}
        message={`${deleting?.fullName ?? ''} — ${t('common.delete')}?`} />
    </>
  );
}

/** Announcements. Publishing one also fills the matching inboxes. */
function AdminAnnouncements() {
  const { t } = useLanguage();
  const { data: groupData } = useFetch(() => api.get('/groups', { params: { limit: 100 } }).then((r) => r.data));
  const groups = groupData?.data ?? [];

  return (
    <CrudPage
      title={t('admin.announcementsTitle')} label={t('menu.announcements')} resource="announcements"
      description={t('admin.announcementsHint')}
      defaults={{ title: '', message: '', audienceKind: 'all', audienceId: '', visible: true }}
      transform={(values) => ({
        title: values.title,
        message: values.message,
        visible: values.visible !== 'false' && values.visible !== false,
        audience: { kind: values.audienceKind || 'all', id: values.audienceKind === 'group' ? values.audienceId : values.audienceKind === 'role' ? values.audienceId : null },
      })}
      columns={[
        { key: 'title', header: t('common.title'), render: (row) => (
          <div className="max-w-sm">
            <p className="font-medium text-navy-900">{row.title}</p>
            <p className="line-clamp-1 text-xs text-navy-500">{row.message}</p>
          </div>
        ) },
        { key: 'audience', header: t('admin.audience'), render: (row) => {
          const kind = row.audience?.kind ?? 'all';
          if (kind === 'all') return <span className="badge bg-navy-50 text-navy-600">{t('admin.audienceAll')}</span>;
          if (kind === 'role') return <span className="badge bg-electric-50 text-electric-700">{row.audience.id}</span>;
          return <span className="badge bg-violet-500/10 text-violet-700">{groups.find((g) => g.id === row.audience?.id)?.name ?? row.audience?.id}</span>;
        } },
        { key: 'authorName', header: t('common.name') },
        { key: 'publishedAt', header: t('common.date'), render: (row) => relativeTime(row.publishedAt ?? row.createdAt) },
      ]}
      fields={[
        { name: 'title', label: t('common.title'), full: true, i18n: true },
        { name: 'message', label: t('common.message'), as: 'textarea', rows: 4, full: true, i18n: true },
        { name: 'audienceKind', label: t('admin.audience'), as: 'select', options: [
          { value: 'all', label: t('admin.audienceAll') },
          { value: 'role', label: `${t('admin.audienceStudents')} / ${t('admin.audienceTeachers')}` },
          { value: 'group', label: t('admin.audienceGroup') },
        ] },
        { name: 'audienceId', label: `${t('common.group')} / role`, as: 'select',
          hint: 'student · teacher',
          options: [
            { value: '', label: '—' },
            { value: 'student', label: t('admin.audienceStudents') },
            { value: 'teacher', label: t('admin.audienceTeachers') },
            ...groups.map((g) => ({ value: g.id, label: g.name })),
          ] },
      ]}
    />
  );
}

/** Test builder — questions, options and the correct answer. */
function AdminQuizzes() {
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/quizzes', { params: { limit: 100 } }).then((r) => r.data));
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const blankQuestion = () => ({ id: `q-${Date.now()}`, prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });
  const blankQuiz = { title: '', category: 'Grammar', level: 'A2', description: '', timeLimit: 10, visible: true, questions: [blankQuestion()] };

  const save = async () => {
    if (!editing.title?.trim()) { toast.error(t('common.title')); return; }
    setSaving(true);
    try {
      const body = { ...editing, timeLimit: Number(editing.timeLimit) || 0 };
      if (editing.id) await api.patch(`/quizzes/${editing.id}`, body);
      else await api.post('/quizzes', body);
      toast.success(t('common.saved'));
      setEditing(null);
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/quizzes/${deleting.id}`);
      toast.success(t('common.deleted'));
      setDeleting(null);
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const patchQuestion = (index, patch) => setEditing({
    ...editing,
    questions: editing.questions.map((question, i) => (i === index ? { ...question, ...patch } : question)),
  });

  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  return (
    <>
      <PageTitle title={t('admin.quizzesTitle')} description={t('admin.quizzesHint')}>
        <Button size="sm" icon={Plus} onClick={() => setEditing(structuredClone(blankQuiz))}>{t('common.add')}</Button>
      </PageTitle>

      <Panel bodyClassName="">
        <Table
          loading={loading}
          rows={data?.data ?? []}
          empty={{ title: t('tests.noTests'), actionLabel: t('common.add'), onAction: () => setEditing(structuredClone(blankQuiz)) }}
          columns={[
            { key: 'title', header: t('common.title'), render: (row) => (
              <div className="max-w-sm">
                <p className="font-medium text-navy-900">{row.title}</p>
                <p className="line-clamp-1 text-xs text-navy-500">{row.description}</p>
              </div>
            ) },
            { key: 'category', header: t('common.category') },
            { key: 'level', header: t('common.level') },
            { key: 'questions', header: t('tests.questions'), render: (row) => (row.questions ?? []).length },
            { key: 'timeLimit', header: t('tests.timeLimit'), render: (row) => (row.timeLimit ? `${row.timeLimit} ${t('common.minutes')}` : t('tests.noLimit')) },
            { key: 'visible', header: t('common.status'), render: (row) => (
              <Badge status={row.visible === false ? 'pending' : 'active'}>
                {row.visible === false ? t('common.hidden') : t('common.visible')}
              </Badge>
            ) },
            { key: 'actions', header: '', className: 'text-right', render: (row) => (
              <div className="flex justify-end gap-1">
                <button type="button" aria-label={t('common.edit')} onClick={() => setEditing(structuredClone({ ...blankQuiz, ...row }))}
                  className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-800"><Pencil size={15} /></button>
                <button type="button" aria-label={t('common.delete')} onClick={() => setDeleting(row)}
                  className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </div>
            ) },
          ]}
        />
      </Panel>

      {editing && (
        <Modal open onClose={() => setEditing(null)} size="lg"
          title={editing.id ? t('common.edit') : t('common.add')}
          footer={<>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button size="sm" loading={saving} onClick={save}>{t('common.save')}</Button>
          </>}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field className="sm:col-span-2" label={t('common.title')} name="title" value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Field label={t('common.category')} name="category" value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            <Field label={t('common.level')} name="level" as="select" value={editing.level} options={LEVELS}
              onChange={(e) => setEditing({ ...editing, level: e.target.value })} />
            <Field label={`${t('tests.timeLimit')} (${t('common.minutes')})`} name="timeLimit" type="number" value={editing.timeLimit}
              onChange={(e) => setEditing({ ...editing, timeLimit: e.target.value })} />
            <Field label={t('common.status')} name="visible" as="select" value={String(editing.visible !== false)}
              options={[{ value: 'true', label: t('common.visible') }, { value: 'false', label: t('common.hidden') }]}
              onChange={(e) => setEditing({ ...editing, visible: e.target.value === 'true' })} />
            <Field className="sm:col-span-2" label={t('common.description')} name="description" as="textarea" rows={2}
              value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>

          <h3 className="mb-3 mt-6 font-display text-base font-semibold text-navy-900">{t('tests.questions')}</h3>
          <div className="space-y-4">
            {editing.questions.map((question, index) => (
              <div key={question.id} className="rounded-card border border-navy-100 bg-mist/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">{t('tests.question')} {index + 1}</span>
                  <button type="button" aria-label={t('common.delete')}
                    onClick={() => setEditing({ ...editing, questions: editing.questions.filter((_, i) => i !== index) })}
                    className="rounded-lg p-1.5 text-navy-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
                <Field label={t('admin.questionPrompt')} name={`prompt-${index}`} value={question.prompt}
                  onChange={(e) => patchQuestion(index, { prompt: e.target.value })} />
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {question.options.map((option, position) => (
                    <div key={position} className="flex items-center gap-2">
                      <button type="button" aria-label={t('admin.markCorrect')}
                        onClick={() => patchQuestion(index, { correctIndex: position })}
                        className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition',
                          question.correctIndex === position ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-navy-200 text-transparent')}>
                        <Check size={13} />
                      </button>
                      <input value={option} placeholder={`${t('admin.answerOption')} ${position + 1}`}
                        aria-label={`${t('admin.answerOption')} ${position + 1}`}
                        onChange={(e) => patchQuestion(index, { options: question.options.map((o, i) => (i === position ? e.target.value : o)) })}
                        className="input py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <Field className="mt-3" label={t('admin.explanation')} name={`exp-${index}`} value={question.explanation}
                  onChange={(e) => patchQuestion(index, { explanation: e.target.value })} />
              </div>
            ))}
            <Button variant="secondary" size="sm" icon={Plus}
              onClick={() => setEditing({ ...editing, questions: [...editing.questions, blankQuestion()] })}>
              {t('admin.addQuestion')}
            </Button>
          </div>
        </Modal>
      )}

      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving}
        title={t('common.delete')} confirmLabel={t('common.delete')} message={`${deleting?.title ?? ''}?`} />
    </>
  );
}

/* --------------------------------------------------------------------------
   ADMIN — ANALYTICS
   -------------------------------------------------------------------------- */

function AdminAnalytics() {
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/stats/admin').then((r) => r.data));

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const { cards, charts } = data;

  return (
    <>
      <PageTitle title={t('menu.analytics')} description={t('admin.overview')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={GraduationCap} label={t('admin.totalStudents')} value={cards.totalStudents} note={`${cards.activeStudents} ${t('status.active').toLowerCase()}`} />
        <StatCard icon={Wallet} tone="emerald" label={t('admin.monthlyRevenue')} value={money(cards.monthlyRevenue)} />
        <StatCard icon={Send} tone="violet" label={t('admin.newLeads')} value={cards.newLeads} note={`${cards.totalLeads} ${t('common.total').toLowerCase()}`} />
        <StatCard icon={ClipboardList} tone="amber" label={t('admin.homeworkCompletion')} value={`${cards.homeworkCompletion}%`} />
        <StatCard icon={CalendarCheck} label={t('student.attendanceRate')} value={`${cards.attendanceRate}%`} />
        <StatCard icon={Star} tone="amber" label={t('admin.averageRating')} value={cards.averageLessonRating || '—'} note={`${cards.totalReviews} ${t('review.totalReviews').toLowerCase()}`} />
        <StatCard icon={Radio} tone="rose" label={t('admin.liveNow')} value={cards.liveNow} />
        <StatCard icon={BarChart3} tone="violet" label={t('menu.tests')} value={cards.quizAttempts} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title={t('admin.coursePopularity')}>
          <ChartFrame height={260}>
            <Bars height={260} data={charts.coursePopularity} xKey="name" yKey="students" horizontal multicolour />
          </ChartFrame>
        </Panel>

        <Panel title={t('admin.leadFunnel')}>
          {charts.leadFunnel.some((row) => row.count > 0) ? (
            <ChartFrame height={260}>
              <Bars height={260} data={charts.leadFunnel} xKey="status" yKey="count" color="#7C3AED" allowDecimals={false} />
            </ChartFrame>
          ) : <Empty title={t('state.emptyTitle')} description={t('admin.leadsHint')} />}
        </Panel>

        <Panel title={t('admin.attendanceByGroup')}>
          <ChartFrame height={260}>
            <Bars height={260} data={charts.attendanceByGroup} xKey="name" yKey="rate" color="#10B981"
              domain={[0, 100]} angledLabels valueFormatter={(value) => `${value}%`} />
          </ChartFrame>
        </Panel>

        <Panel title={t('admin.studentGrowth')}>
          <ChartFrame height={260}>
            <AreaTrend height={260} data={charts.studentGrowth} xKey="month" yKey="total" gradientId="growthFill"
              tickFormatter={formatMonth} labelFormatter={formatMonth} />
          </ChartFrame>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   ADMIN / TEACHER — LESSON RATINGS
   -------------------------------------------------------------------------- */

function ReviewsPage() {
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(() => api.get('/lesson-reviews').then((r) => r.data));

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  return (
    <>
      <PageTitle title={t('menu.reviews')} description={t('review.rateHint')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Star} tone="amber" label={t('review.averageRating')} value={data.average || '—'} />
        <StatCard icon={ClipboardList} label={t('review.totalReviews')} value={data.total} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Panel title={t('review.averageRating')}>
          <ul className="space-y-3">
            {[...data.breakdown].reverse().map((row) => (
              <li key={row.star} className="flex items-center gap-3">
                <span className="flex w-12 items-center gap-1 text-sm text-navy-600">{row.star}<Star size={12} className="text-amber-400" fill="currentColor" /></span>
                <ProgressBar className="flex-1" value={row.count} max={Math.max(1, data.total)} tone="bg-amber-400" />
                <span className="w-8 text-right text-sm text-navy-500">{row.count}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-2" title={t('review.recentFeedback')} bodyClassName="">
          {!data.data.length ? <Empty title={t('review.noReviews')} /> : (
            <ul className="scroll-slim max-h-[26rem] divide-y divide-navy-50 overflow-y-auto">
              {data.data.map((review) => (
                <li key={review.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy-900">{review.lessonTopic}</p>
                      <p className="text-xs text-navy-500">{review.studentName} · {relativeTime(review.createdAt)}</p>
                    </div>
                    <StarRating value={review.rating} size={14} />
                  </div>
                  {review.comment && <p className="mt-2 text-sm leading-relaxed text-navy-600">{review.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   TEACHER — LIVE CLASS CONTROL
   -------------------------------------------------------------------------- */

function TeacherLiveClass() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');
  const { data, loading, error, refetch } = useFetch(() => api.get('/lessons/live').then((r) => r.data));
  const { data: lessonData, refetch: refetchLessons } = useFetch(
    () => api.get('/lessons', { params: { limit: 100 } }).then((r) => r.data)
  );

  // Keep the attendee list fresh while a class is running.
  useEffect(() => {
    if (!data?.live) return undefined;
    const timer = setInterval(refetch, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.live?.id]);

  const start = async (lesson) => {
    setBusy(lesson.id);
    try {
      await api.post(`/lessons/${lesson.id}/start`, { joinUrl });
      toast.success(t('live.lessonStarted'));
      refetch(); refetchLessons();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  const end = async (lesson) => {
    setBusy(lesson.id);
    try {
      await api.post(`/lessons/${lesson.id}/end`);
      toast.success(t('live.lessonEnded'));
      refetch(); refetchLessons();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  if (error) return <Empty title={t('state.errorTitle')} description={error} actionLabel={t('common.retry')} onAction={refetch} />;

  const live = data.live;
  const todays = (lessonData?.data ?? [])
    .filter((lesson) => lesson.date === today() && lesson.live?.status !== 'live')
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  return (
    <>
      <PageTitle title={t('live.liveNow')} description={t('teacher.todayLessons')} />

      {live ? (
        <Panel className="mb-5" title={live.topic} description={`${live.groupName} · ${live.room ?? ''}`}
          action={<Button variant="danger" size="sm" loading={busy === live.id} onClick={() => end(live)}>{t('live.endLesson')}</Button>}>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            {t('status.live')}
          </div>

          <h3 className="mt-5 text-sm font-semibold text-navy-900">
            {t('live.activeStudents')} ({(live.live?.attendees ?? []).length})
          </h3>
          {(live.live?.attendees ?? []).length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {live.live.attendees.map((attendee) => (
                <li key={attendee.studentId} className="flex items-center gap-2 rounded-full bg-mist py-1 pl-1 pr-3">
                  <Avatar name={attendee.studentName} size="h-7 w-7 text-[0.6rem]" />
                  <span className="text-sm text-navy-700">{attendee.studentName}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-navy-400">{t('state.emptyHint')}</p>}
        </Panel>
      ) : (
        <Panel className="mb-5">
          <Empty title={t('live.noLiveLesson')} description={t('teacher.noTodayLessons')} />
        </Panel>
      )}

      <Panel title={t('teacher.todayLessons')} bodyClassName="">
        <div className="border-b border-navy-100 px-5 py-4">
          <Field label={`${t('live.joinLink')} (${t('common.optional')})`} name="joinUrl" value={joinUrl}
            placeholder="https://meet.google.com/…" onChange={(event) => setJoinUrl(event.target.value)} />
        </div>
        {!todays.length ? <Empty title={t('teacher.noTodayLessons')} /> : (
          <ul className="divide-y divide-navy-50">
            {todays.map((lesson) => (
              <li key={lesson.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="w-16 shrink-0 rounded-lg bg-mist px-2 py-1.5 text-center">
                  <p className="text-sm font-semibold text-navy-900">{lesson.time}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">{lesson.topic}</p>
                  <p className="truncate text-xs text-navy-500">{lesson.groupName} · {lesson.room}</p>
                </div>
                <Badge status={lesson.status} >{t(`status.${lesson.status === 'in-progress' ? 'inProgress' : lesson.status}`)}</Badge>
                <Button size="sm" icon={Radio} loading={busy === lesson.id} disabled={Boolean(live)} onClick={() => start(lesson)}>
                  {t('live.startLesson')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ==========================================================================
   14. ROUTING
   --------------------------------------------------------------------------
   Public pages, then three protected areas. Each area only lets its own role
   through — a student opening /admin/dashboard lands on the 403 page.
   ========================================================================== */

function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<LandingPage />} />

      {/* LOGIN and REGISTER are separate routes and separate pages. */}
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/request-status" element={<RequestStatusPage />} />

      {/* ADMIN */}
      <Route element={<ProtectedRoute allow={['admin']} />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="requests" element={<AdminStudentRequests />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="groups" element={<AdminGroups />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="competitions" element={<CompetitionsPage />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="quizzes" element={<AdminQuizzes />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="course-requests" element={<AdminCourseRequests />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="landing-page" element={<AdminLandingPage />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* TEACHER */}
      <Route element={<ProtectedRoute allow={['teacher']} />}>
        <Route path="/teacher" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="live" element={<TeacherLiveClass />} />
          <Route path="quizzes" element={<AdminQuizzes />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="groups" element={<TeacherGroups />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="competitions" element={<CompetitionsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* STUDENT */}
      <Route element={<ProtectedRoute allow={['student']} />}>
        <Route path="/student" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="discover" element={<StudentDiscover />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="games" element={<StudentGames />} />
          <Route path="leaderboard" element={<StudentLeaderboard />} />
          <Route path="group" element={<StudentGroup />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="payments" element={<StudentPayments />} />
          <Route path="extra-classes" element={<StudentExtraClasses />} />
          <Route path="competitions" element={<CompetitionsPage />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer position="top-right" autoClose={3200} newestOnTop closeOnClick theme="light" />
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
