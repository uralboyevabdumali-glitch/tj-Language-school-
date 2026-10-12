/**
 * ============================================================================
 *  TJ LANGUAGE SCHOOL — TRANSLATIONS (uz · ru · en)
 * ============================================================================
 *  This is the only place UI text lives. Components never hold a translated
 *  string; they call t('some.key') and get the active language back.
 *
 *    import { useLanguage } from './i18n';
 *    const { t, language, setLanguage } = useLanguage();
 *
 *  Rules used throughout:
 *    · Default language is Uzbek.
 *    · The choice is stored in localStorage under "tj.lang".
 *    · Database ids, emails, currency codes and level names (A1, B2, IELTS)
 *      are technical values and are NOT translated.
 *    · A missing key falls back to Uzbek, then to the key itself, so a gap
 *      is visible in development rather than rendering blank.
 * ============================================================================
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANGUAGES = [
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿', short: 'UZ' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', short: 'RU' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
];

export const DEFAULT_LANGUAGE = 'uz';
const STORAGE_KEY = 'tj.lang';

/* ==========================================================================
   DICTIONARY
   --------------------------------------------------------------------------
   Grouped by area. Keys are dot-separated and identical across all three
   languages, so a missing translation is easy to spot.
   ========================================================================== */

const dictionary = {
  /* ---------- shared / generic ---------- */
  common: {
    save:            { uz: 'Saqlash',            ru: 'Сохранить',        en: 'Save' },
    cancel:          { uz: 'Bekor qilish',       ru: 'Отмена',           en: 'Cancel' },
    delete:          { uz: "O'chirish",          ru: 'Удалить',          en: 'Delete' },
    edit:            { uz: 'Tahrirlash',         ru: 'Редактировать',    en: 'Edit' },
    add:             { uz: "Qo'shish",           ru: 'Добавить',         en: 'Add' },
    close:           { uz: 'Yopish',             ru: 'Закрыть',          en: 'Close' },
    search:          { uz: 'Qidirish',           ru: 'Поиск',            en: 'Search' },
    filter:          { uz: 'Filtr',              ru: 'Фильтр',           en: 'Filter' },
    all:             { uz: 'Hammasi',            ru: 'Все',              en: 'All' },
    loading:         { uz: 'Yuklanmoqda',        ru: 'Загрузка',         en: 'Loading' },
    retry:           { uz: 'Qayta urinish',      ru: 'Повторить',        en: 'Try again' },
    back:            { uz: 'Orqaga',             ru: 'Назад',            en: 'Back' },
    next:            { uz: 'Keyingi',            ru: 'Далее',            en: 'Next' },
    finish:          { uz: 'Tugatish',           ru: 'Завершить',        en: 'Finish' },
    start:           { uz: 'Boshlash',           ru: 'Начать',           en: 'Start' },
    submit:          { uz: 'Yuborish',           ru: 'Отправить',        en: 'Submit' },
    confirm:         { uz: 'Tasdiqlash',         ru: 'Подтвердить',      en: 'Confirm' },
    yes:             { uz: 'Ha',                 ru: 'Да',               en: 'Yes' },
    no:              { uz: "Yo'q",               ru: 'Нет',              en: 'No' },
    none:            { uz: "Yo'q",               ru: 'Нет',              en: 'None' },
    notAssigned:     { uz: 'Biriktirilmagan',    ru: 'Не назначено',     en: 'Not assigned' },
    total:           { uz: 'Jami',               ru: 'Всего',            en: 'Total' },
    status:          { uz: 'Holat',              ru: 'Статус',           en: 'Status' },
    date:            { uz: 'Sana',               ru: 'Дата',             en: 'Date' },
    time:            { uz: 'Vaqt',               ru: 'Время',            en: 'Time' },
    name:            { uz: 'Ism',                ru: 'Имя',              en: 'Name' },
    fullName:        { uz: "To'liq ism",         ru: 'Полное имя',       en: 'Full name' },
    email:           { uz: 'Email',              ru: 'Email',            en: 'Email' },
    phone:           { uz: 'Telefon',            ru: 'Телефон',          en: 'Phone' },
    password:        { uz: 'Parol',              ru: 'Пароль',           en: 'Password' },
    message:         { uz: 'Xabar',              ru: 'Сообщение',        en: 'Message' },
    course:          { uz: 'Kurs',               ru: 'Курс',             en: 'Course' },
    group:           { uz: 'Guruh',              ru: 'Группа',           en: 'Group' },
    teacher:         { uz: "O'qituvchi",         ru: 'Преподаватель',    en: 'Teacher' },
    student:         { uz: "O'quvchi",           ru: 'Ученик',           en: 'Student' },
    students:        { uz: "O'quvchilar",        ru: 'Ученики',          en: 'Students' },
    level:           { uz: 'Daraja',             ru: 'Уровень',          en: 'Level' },
    room:            { uz: 'Xona',               ru: 'Кабинет',          en: 'Room' },
    topic:           { uz: 'Mavzu',              ru: 'Тема',             en: 'Topic' },
    title:           { uz: 'Sarlavha',           ru: 'Заголовок',        en: 'Title' },
    description:     { uz: 'Tavsif',             ru: 'Описание',         en: 'Description' },
    category:        { uz: 'Kategoriya',         ru: 'Категория',        en: 'Category' },
    price:           { uz: 'Narx',               ru: 'Цена',             en: 'Price' },
    duration:        { uz: 'Davomiyligi',        ru: 'Длительность',     en: 'Duration' },
    schedule:        { uz: 'Jadval',             ru: 'Расписание',       en: 'Schedule' },
    address:         { uz: 'Manzil',             ru: 'Адрес',            en: 'Address' },
    workingHours:    { uz: 'Ish vaqti',          ru: 'Часы работы',      en: 'Working hours' },
    visible:         { uz: "Ko'rinadi",          ru: 'Показан',          en: 'Visible' },
    hidden:          { uz: 'Yashirilgan',        ru: 'Скрыт',            en: 'Hidden' },
    minutes:         { uz: 'daqiqa',             ru: 'мин',              en: 'min' },
    perMonth:        { uz: '/ oyiga',            ru: '/ в месяц',        en: '/ month' },
    seeAll:          { uz: 'Hammasini ko\u2018rish', ru: 'Смотреть все', en: 'See all' },
    optional:        { uz: 'ixtiyoriy',          ru: 'необязательно',    en: 'optional' },
    saved:           { uz: 'Saqlandi.',          ru: 'Сохранено.',       en: 'Saved.' },
    deleted:         { uz: "O'chirildi.",        ru: 'Удалено.',         en: 'Deleted.' },
    somethingWrong:  { uz: 'Xatolik yuz berdi.', ru: 'Произошла ошибка.', en: 'Something went wrong.' },
  },

  /* ---------- states ---------- */
  state: {
    loadingLabel:    { uz: 'Yuklanmoqda',                ru: 'Загрузка',                     en: 'Loading' },
    emptyTitle:      { uz: "Ma'lumot yo'q",              ru: 'Нет данных',                   en: 'Nothing here yet' },
    emptyHint:       { uz: 'Bu bo\u2018limda hozircha hech narsa yo\u2018q.', ru: 'В этом разделе пока пусто.', en: 'This section is empty for now.' },
    errorTitle:      { uz: 'Yuklab bo\u2018lmadi',        ru: 'Не удалось загрузить',         en: 'Could not load this' },
    errorHint:       { uz: 'Serverga ulanib bo\u2018lmadi. Qayta urinib ko\u2018ring.', ru: 'Не удалось связаться с сервером. Попробуйте ещё раз.', en: 'Could not reach the server. Try again.' },
    noResults:       { uz: 'Hech narsa topilmadi',        ru: 'Ничего не найдено',            en: 'No results found' },
  },

  /* ---------- statuses ---------- */
  status: {
    active:      { uz: 'Faol',            ru: 'Активен',      en: 'Active' },
    inactive:    { uz: 'Nofaol',          ru: 'Неактивен',    en: 'Inactive' },
    pending:     { uz: 'Kutilmoqda',      ru: 'В ожидании',   en: 'Pending' },
    approved:    { uz: 'Tasdiqlangan',    ru: 'Одобрено',     en: 'Approved' },
    rejected:    { uz: 'Rad etilgan',     ru: 'Отклонено',    en: 'Rejected' },
    paid:        { uz: "To'langan",       ru: 'Оплачено',     en: 'Paid' },
    overdue:     { uz: 'Muddati o\u2018tgan', ru: 'Просрочено', en: 'Overdue' },
    present:     { uz: 'Kelgan',          ru: 'Присутствовал', en: 'Present' },
    absent:      { uz: 'Kelmagan',        ru: 'Отсутствовал', en: 'Absent' },
    late:        { uz: 'Kechikkan',       ru: 'Опоздал',      en: 'Late' },
    scheduled:   { uz: 'Rejalashtirilgan', ru: 'Запланирован', en: 'Scheduled' },
    completed:   { uz: 'Tugagan',         ru: 'Завершён',     en: 'Completed' },
    cancelled:   { uz: 'Bekor qilingan',  ru: 'Отменён',      en: 'Cancelled' },
    submitted:   { uz: 'Topshirilgan',    ru: 'Сдано',        en: 'Submitted' },
    graded:      { uz: 'Baholangan',      ru: 'Оценено',      en: 'Graded' },
    open:        { uz: 'Ochiq',           ru: 'Открыт',       en: 'Open' },
    live:        { uz: 'Jonli',           ru: 'В эфире',      en: 'Live' },
    inProgress:  { uz: 'Jarayonda',       ru: 'В процессе',   en: 'In progress' },
    new:         { uz: 'Yangi',           ru: 'Новый',        en: 'New' },
    contacted:   { uz: "Bog'lanildi",     ru: 'Связались',    en: 'Contacted' },
    converted:   { uz: 'Mijozga aylandi', ru: 'Конвертирован', en: 'Converted' },
    blocked:     { uz: 'Bloklangan',      ru: 'Заблокирован', en: 'Blocked' },
  },

  /* ---------- navigation / public site ---------- */
  nav: {
    login:       { uz: 'Kirish',              ru: 'Войти',            en: 'Log in' },
    register:    { uz: "Ro'yxatdan o'tish",   ru: 'Регистрация',      en: 'Register' },
    dashboard:   { uz: 'Kabinetim',           ru: 'Мой кабинет',      en: 'My dashboard' },
    logout:      { uz: 'Chiqish',             ru: 'Выйти',            en: 'Sign out' },
    openMenu:    { uz: 'Menyuni ochish',      ru: 'Открыть меню',     en: 'Open menu' },
    closeMenu:   { uz: 'Menyuni yopish',      ru: 'Закрыть меню',     en: 'Close menu' },
    language:    { uz: 'Til',                 ru: 'Язык',             en: 'Language' },
  },

  landing: {
    tagline:            { uz: 'Ingliz tili & IELTS · Olmaliq', ru: 'Английский и IELTS · Алмалык', en: 'English & IELTS · Olmaliq' },
    freeTest:           { uz: 'Bepul daraja aniqlash testi · Birinchi darsgacha to\u2018lov yo\u2018q', ru: 'Бесплатный тест на уровень · Оплата только после первого урока', en: 'Free placement test · No payment before your first lesson' },
    viewCourses:        { uz: 'Kurslarni ko\u2018rish', ru: 'Посмотреть курсы', en: 'View courses' },
    recentResults:      { uz: 'So\u2018nggi IELTS natijalari', ru: 'Последние результаты IELTS', en: 'Recent IELTS results' },
    sampleData:         { uz: 'Namunaviy ma\u2019lumot', ru: 'Демо-данные', en: 'Sample data' },
    startedAt:          { uz: 'Boshlang\u2018ich daraja', ru: 'Начальный уровень', en: 'Started at' },
    coursesEyebrow:     { uz: 'Kurslar',        ru: 'Курсы',            en: 'Courses' },
    coursesTitle:       { uz: 'O\u2018zingizga mos kursni tanlang', ru: 'Выберите подходящий курс', en: 'Find the course that fits you' },
    coursesSubtitle:    { uz: 'Bepul daraja aniqlash testi qaysi guruhdan boshlashingizni aniqlaydi.', ru: 'Бесплатный тест определит, с какой группы вы начнёте.', en: 'The free placement test decides which group you start in.' },
    lessonsLabel:       { uz: 'Darslar',        ru: 'Уроки',            en: 'Lessons' },
    lengthLabel:        { uz: 'Muddat',         ru: 'Срок',             en: 'Length' },
    groupLabel:         { uz: 'Guruh',          ru: 'Группа',           en: 'Group' },
    maxStudents:        { uz: 'ko\u2018pi bilan 14', ru: 'до 14',       en: 'max 14' },
    joinCourse:         { uz: 'Kursga yozilish', ru: 'Записаться',      en: 'Join course' },
    whyEyebrow:         { uz: 'Nega TJ',        ru: 'Почему TJ',        en: 'Why TJ' },
    whyTitle:           { uz: 'Haqiqiy farqni nima yaratadi', ru: 'Что действительно имеет значение', en: 'What actually makes the difference' },
    teachersEyebrow:    { uz: "O'qituvchilar",  ru: 'Преподаватели',    en: 'Teachers' },
    teachersTitle:      { uz: 'Har bir insho ustida shaxsan ishlaydigan jamoa', ru: 'Команда, которая проверяет каждое эссе лично', en: 'The team who mark every essay themselves' },
    yearsTeaching:      { uz: 'yillik tajriba', ru: 'лет опыта',        en: 'years teaching' },
    storiesEyebrow:     { uz: "O'quvchilar hikoyalari", ru: 'Истории учеников', en: 'Student stories' },
    storiesTitle:       { uz: 'Qayerdan boshlashdi, qayerga yetishdi', ru: 'С чего начали и к чему пришли', en: 'Where they started, where they finished' },
    before:             { uz: 'Oldin',          ru: 'До',               en: 'Before' },
    stepsEyebrow:       { uz: 'Qanday ishlaydi', ru: 'Как это работает', en: 'How it works' },
    stepsTitle:         { uz: 'Arizadan birinchi darsgacha', ru: 'От заявки до первого урока', en: 'From registration request to first lesson' },
    eventsEyebrow:      { uz: 'Tadbirlar va musobaqalar', ru: 'События и конкурсы', en: 'Events and competitions' },
    eventsTitle:        { uz: 'Bu oyda maktabda nimalar bo\u2018lmoqda', ru: 'Что происходит в школе в этом месяце', en: 'What is happening at the school this month' },
    faqEyebrow:         { uz: 'Savol-javob',    ru: 'Вопросы и ответы', en: 'FAQ' },
    faqTitle:           { uz: "Ko'p so'raladigan savollar", ru: 'Частые вопросы', en: 'Frequently asked questions' },
    faqHelp:            { uz: 'Javobini topa olmadingizmi? Qo\u2018ng\u2018iroq qiling yoki formani to\u2018ldiring — bir ish kuni ichida bog\u2018lanamiz.', ru: 'Не нашли ответ? Позвоните или заполните форму — свяжемся в течение рабочего дня.', en: 'Did not find your answer? Call us or fill in the form — we reply within one working day.' },
    contactEyebrow:     { uz: 'Bog\u2018lanish', ru: 'Контакты',        en: 'Contact' },
    bookFree:           { uz: 'Bepul darsga yozilish', ru: 'Записаться на бесплатный урок', en: 'Book a free lesson' },
    bookFreeHint:       { uz: 'Daraja aniqlash testi ham kiradi. Bir ish kuni ichida qo\u2018ng\u2018iroq qilamiz.', ru: 'Тест на уровень включён. Перезвоним в течение рабочего дня.', en: 'Placement test included. We call back within one working day.' },
    notSureYet:         { uz: 'Hali aniq emas', ru: 'Пока не знаю',     en: 'Not sure yet' },
    sendRequest:        { uz: 'Ariza yuborish', ru: 'Отправить заявку', en: 'Send request' },
    contactRequired:    { uz: 'Ism va telefon raqamingizni kiriting.', ru: 'Укажите имя и номер телефона.', en: 'Add your name and phone number.' },
    footerPages:        { uz: 'Sahifalar',      ru: 'Страницы',         en: 'Pages' },
    footerFindUs:       { uz: 'Bizni toping',   ru: 'Как нас найти',    en: 'Find us' },
    checkRequest:       { uz: 'Arizamni tekshirish', ru: 'Проверить заявку', en: 'Check my request' },
    demoNotice:         { uz: 'Saytdagi o\u2018quvchi va natija ma\u2019lumotlari namunaviy.', ru: 'Данные учеников и результатов на сайте — демонстрационные.', en: 'Student and result data shown on this site is demo content.' },
    apiDown:            { uz: 'Server ishlamayapti', ru: 'Сервер не запущен', en: 'The API is not running' },
    apiDownHint:        { uz: 'Lokalda npm run dev ni ishga tushiring. Vercel\u2018da esa oxirgi deploy muvaffaqiyatli bo\u2018lganini tekshiring.', ru: 'Локально запустите npm run dev. На Vercel проверьте, что последний деплой прошёл успешно.', en: 'Locally run npm run dev. On Vercel, check that the latest deploy succeeded.' },
    // branches
    branchesEyebrow:    { uz: 'Filiallar',      ru: 'Филиалы',          en: 'Branches' },
    branchesTitle:      { uz: 'Olmaliqdagi uchta filialimiz', ru: 'Три наших филиала в Алмалыке', en: 'Our three branches in Olmaliq' },
    branchesSubtitle:   { uz: 'Sizga eng yaqinini tanlang — har birida bir xil dastur va bir xil o\u2018qituvchilar jamoasi.', ru: 'Выберите ближайший — везде одна программа и одна команда преподавателей.', en: 'Pick the one nearest you — same programme and same teaching team in each.' },
    landmark:           { uz: "Mo'ljal",        ru: 'Ориентир',         en: 'Landmark' },
    googleMaps:         { uz: 'Google Maps',    ru: 'Google Maps',      en: 'Google Maps' },
    yandexMaps:         { uz: 'Yandex Maps',    ru: 'Яндекс Карты',     en: 'Yandex Maps' },
    getDirections:      { uz: 'Yo\u2018l ko\u2018rsatish', ru: 'Построить маршрут', en: 'Get directions' },
    branchSetup:        { uz: 'Manzil hali kiritilmagan — administrator panelida to\u2018ldiriladi.', ru: 'Адрес ещё не заполнен — добавляется в панели администратора.', en: 'Address not filled in yet — it is added from the admin panel.' },
    // media
    mediaEyebrow:       { uz: 'Maktab hayoti',  ru: 'Жизнь школы',      en: 'School life' },
    mediaTitle:         { uz: 'Darslar, tadbirlar va yutuqlar', ru: 'Уроки, события и достижения', en: 'Lessons, events and achievements' },
    mediaEmpty:         { uz: 'Hozircha post yo\u2018q. Administrator panelidan qo\u2018shiladi.', ru: 'Пока нет публикаций. Добавляются в панели администратора.', en: 'No posts yet. They are added from the admin panel.' },
    watchVideo:         { uz: 'Videoni ko\u2018rish', ru: 'Смотреть видео', en: 'Watch video' },
    monthsLabel:        { uz: 'oyda',            ru: 'мес.',            en: 'months' },
    studentsEnrolled:   { uz: 'o\u2018quvchi',   ru: 'учеников',        en: 'students' },
    perWeek:            { uz: 'haftasiga',       ru: 'в неделю',        en: 'per week' },
    noRatingYet:        { uz: 'Baho yo\u2018q',  ru: 'Нет оценок',      en: 'No ratings yet' },
    basedOnReviews:     { uz: '{count} ta bahodan', ru: 'из {count} оценок', en: 'from {count} ratings' },
    // landing redesign
    freeLesson:         { uz: 'Bepul dars',     ru: 'Бесплатный урок',  en: 'Free lesson' },
    freeSeal:           { uz: 'Birinchi dars bepul', ru: 'Первый урок бесплатно', en: 'First lesson free' },
    helloNote:          { uz: 'Hozir o‘rgandingiz — inglizcha “salom”', ru: 'Вы только что выучили — «привет» по-английски', en: 'You just learned it — “hello” is “salom” in Uzbek' },
    pickCourse:         { uz: 'Kartani bosing — u yozilish formasiga avtomatik tushadi.', ru: 'Нажмите на карточку — курс сам попадёт в форму записи.', en: 'Tap a card — it drops straight into the sign-up form.' },
    whyLead:            { uz: 'Nega aynan',     ru: 'Почему именно',    en: 'Why choose' },
    whyMark:            { uz: 'biz?',           ru: 'мы?',              en: 'us?' },
    pricesTitle:        { uz: 'Narxlar',        ru: 'Цены',             en: 'Prices' },
    mostPopular:        { uz: 'Eng ommabop',    ru: 'Самый популярный', en: 'Most popular' },
    sumPerMonth:        { uz: 'so‘m / oyiga', ru: 'сум / месяц',  en: 'UZS / month' },
    timesPerWeek:       { uz: 'Haftada {count} marta', ru: '{count} раза в неделю', en: '{count} times a week' },
    finalLead:          { uz: 'Birinchi dars —', ru: 'Первый урок —',   en: 'First lesson —' },
    finalMark:          { uz: 'bepul.',         ru: 'бесплатно.',       en: 'free.' },
    finalHint:          { uz: 'Raqamingizni qoldiring — administrator siz bilan bog‘lanib, darajangizni aniqlaydi va qulay vaqtni tanlaydi.', ru: 'Оставьте номер — администратор свяжется с вами, определит уровень и подберёт удобное время.', en: 'Leave your number — an administrator will call, check your level and find a time that suits you.' },
    chosenCourse:       { uz: 'Tanlangan kurs', ru: 'Выбранный курс',   en: 'Chosen course' },
    signUp:             { uz: 'Yozilish',       ru: 'Записаться',       en: 'Sign up' },
  },

  /* ---------- auth ---------- */
  auth: {
    loginTitle:        { uz: 'Hisobingizga kiring', ru: 'Вход в аккаунт', en: 'Log in to your account' },
    loginSubtitle:     { uz: 'Administrator tasdiqlagan hisob bilan kiring.', ru: 'Войдите с аккаунтом, одобренным администратором.', en: 'Sign in with an account approved by the administrator.' },
    registerTitle:     { uz: "Ro'yxatdan o'tish", ru: 'Регистрация',    en: 'Create a registration request' },
    registerSubtitle:  { uz: 'Ariza administratorga yuboriladi. Tasdiqlangach kirishingiz mumkin.', ru: 'Заявка отправится администратору. После одобрения вы сможете войти.', en: 'Your request goes to the administrator. You can log in once it is approved.' },
    confirmPassword:   { uz: 'Parolni tasdiqlang', ru: 'Подтвердите пароль', en: 'Confirm password' },
    noAccount:         { uz: 'Hisobingiz yo\u2018qmi?', ru: 'Нет аккаунта?', en: 'No account yet?' },
    haveAccount:       { uz: 'Hisobingiz bormi?', ru: 'Уже есть аккаунт?', en: 'Already have an account?' },
    loginButton:       { uz: 'Kirish',           ru: 'Войти',            en: 'Log in' },
    registerButton:    { uz: 'Ariza yuborish',   ru: 'Отправить заявку', en: 'Send request' },
    welcomeBack:       { uz: 'Xush kelibsiz',    ru: 'С возвращением',   en: 'Welcome back' },
    requestSent:       { uz: 'Ariza yuborildi. Administrator tasdiqlashini kuting.', ru: 'Заявка отправлена. Дождитесь одобрения администратора.', en: 'Request sent. Please wait for admin approval.' },
    checkStatus:       { uz: 'Ariza holatini tekshirish', ru: 'Проверить статус заявки', en: 'Check request status' },
    statusTitle:       { uz: 'Ariza holati',     ru: 'Статус заявки',    en: 'Request status' },
    statusSubtitle:    { uz: 'Email manzilingizni kiriting.', ru: 'Введите свой email.', en: 'Enter the email you registered with.' },
    passwordChanged:   { uz: 'Parol o\u2018zgartirildi.', ru: 'Пароль изменён.', en: 'Password changed.' },
    currentPassword:   { uz: 'Joriy parol',      ru: 'Текущий пароль',   en: 'Current password' },
    newPassword:       { uz: 'Yangi parol',      ru: 'Новый пароль',     en: 'New password' },
    changePassword:    { uz: 'Parolni o\u2018zgartirish', ru: 'Сменить пароль', en: 'Change password' },
    signedOut:         { uz: 'Tizimdan chiqdingiz.', ru: 'Вы вышли из системы.', en: 'Signed out.' },
    forbiddenTitle:    { uz: '403 — bu sizning bo\u2018limingiz emas', ru: '403 — это не ваш раздел', en: '403 — not your section' },
    forbiddenBody:     { uz: 'Hisobingizda bu yerga ruxsat yo\u2018q. O\u2018quvchilar faqat o\u2018z ma\u2019lumotlarini, o\u2018qituvchilar faqat o\u2018z guruhlarini ko\u2018radi.', ru: 'У вашего аккаунта нет доступа сюда. Ученики видят только свои данные, преподаватели — только свои группы.', en: 'Your account does not have access here. Students see their own records only, and teachers manage their own groups only.' },
    backToDashboard:   { uz: 'Kabinetimga qaytish', ru: 'Вернуться в кабинет', en: 'Back to my dashboard' },
    goHome:            { uz: 'Bosh sahifaga',    ru: 'На главную',       en: 'Go to homepage' },
    notFound:          { uz: 'Bunday sahifa mavjud emas', ru: 'Такой страницы не существует', en: 'This page does not exist' },
    checkingSession:   { uz: 'Sessiya tekshirilmoqda', ru: 'Проверка сессии', en: 'Checking your session' },
  },

  /* ---------- form validation ---------- */
  valid: {
    fullName:        { uz: "To'liq ismingizni kiriting.",      ru: 'Введите полное имя.',              en: 'Enter your full name.' },
    email:           { uz: "To'g'ri email manzil kiriting.",   ru: 'Введите корректный email.',        en: 'Enter a valid email address.' },
    phone:           { uz: "To'g'ri telefon raqam kiriting.",  ru: 'Введите корректный номер.',        en: 'Enter a valid phone number.' },
    password:        { uz: 'Kamida 6 ta belgi kiriting.',      ru: 'Минимум 6 символов.',              en: 'Use at least 6 characters.' },
    passwordMatch:   { uz: 'Parollar mos kelmadi.',            ru: 'Пароли не совпадают.',             en: 'Passwords do not match.' },
    atLeast6:        { uz: 'Kamida 6 ta belgi',                ru: 'Минимум 6 символов',               en: 'At least 6 characters' },
    repeatPassword:  { uz: 'Parolni takrorlang',               ru: 'Повторите пароль',                 en: 'Repeat your password' },
    emailTaken:      { uz: 'Bu email allaqachon ro\u2018yxatdan o\u2018tgan.', ru: 'Этот email уже зарегистрирован.', en: 'Already registered.' },
    requestExists:   { uz: 'Ariza allaqachon yuborilgan.',     ru: 'Заявка уже отправлена.',           en: 'Request already sent.' },
  },

  /* ---------- register flow ---------- */
  register: {
    asideEyebrow:    { uz: "Ro'yxatdan o'tish arizasi",  ru: 'Заявка на регистрацию',  en: 'Registration request' },
    asideTitle:      { uz: 'Birinchi darsgacha to\u2018rt qadam.', ru: 'Четыре шага до первого урока.', en: 'Four steps between you and your first lesson.' },
    step1:           { uz: 'Siz ariza yuborasiz',        ru: 'Вы отправляете заявку',    en: 'You send a registration request' },
    step2:           { uz: 'Administrator ko\u2018rib chiqadi', ru: 'Администратор рассматривает', en: 'An admin reviews it' },
    step3:           { uz: 'Hisobingiz faollashtiriladi', ru: 'Ваш аккаунт активируют',  en: 'Your account is activated' },
    step4:           { uz: 'Kirasiz va boshlaysiz',      ru: 'Вы входите и начинаете',   en: 'You log in and start' },
    asideNote:       { uz: 'Ariza yuborish hisob yaratmaydi. Hech qanday to\u2018lov olinmaydi va holatni istalgan vaqt tekshirishingiz mumkin.', ru: 'Отправка заявки не создаёт аккаунт. Оплата не взимается, статус можно проверить в любой момент.', en: 'Registering does not create an account by itself. Nothing is charged and you can check your status any time.' },
    sentTitle:       { uz: 'Ariza yuborildi',            ru: 'Заявка отправлена',        en: 'Request sent' },
    sentSubtitle:    { uz: 'Rahmat. Arizangiz maktabga yetib bordi.', ru: 'Спасибо. Ваша заявка у школы.', en: 'Thank you. Your registration is now with the school.' },
    sentBody:        { uz: 'Administrator tasdiqlashini kuting. Tasdiqlangach, tanlagan email va parolingiz bilan kirasiz.', ru: 'Дождитесь одобрения администратора. После этого войдите с выбранными email и паролем.', en: 'Please wait for admin approval. Once approved you can log in with the email and password you just chose.' },
    goToLogin:       { uz: 'Kirish sahifasiga',          ru: 'На страницу входа',        en: 'Go to login' },
    noRoleNote:      { uz: 'Rol tanlanmaydi: ro\u2018yxatdan o\u2018tish har doim o\u2018quvchi arizasini yaratadi. O\u2018qituvchi va administratorlarni maktab qo\u2018shadi.', ru: 'Роль не выбирается: регистрация всегда создаёт заявку ученика. Преподавателей и администраторов добавляет школа.', en: 'There is no role to choose: registration always creates a student request. Teachers and administrators are added by the school.' },
  },

  /* ---------- dashboard menus ---------- */
  menu: {
    dashboard:      { uz: 'Bosh sahifa',       ru: 'Главная',          en: 'Dashboard' },
    discover:       { uz: 'Kurslar katalogi',  ru: 'Каталог курсов',   en: 'Discover' },
    students:       { uz: "O'quvchilar",       ru: 'Ученики',          en: 'Students' },
    requests:       { uz: 'Arizalar',          ru: 'Заявки',           en: 'Student Requests' },
    teachers:       { uz: "O'qituvchilar",     ru: 'Преподаватели',    en: 'Teachers' },
    groups:         { uz: 'Guruhlar',          ru: 'Группы',           en: 'Groups' },
    myGroups:       { uz: 'Mening guruhlarim', ru: 'Мои группы',       en: 'My Groups' },
    myGroup:        { uz: 'Mening guruhim',    ru: 'Моя группа',       en: 'My Group' },
    courses:        { uz: 'Kurslar',           ru: 'Курсы',            en: 'Courses' },
    payments:       { uz: "To'lovlar",         ru: 'Платежи',          en: 'Payments' },
    attendance:     { uz: 'Davomat',           ru: 'Посещаемость',     en: 'Attendance' },
    homework:       { uz: 'Uy vazifasi',       ru: 'Домашнее задание', en: 'Homework' },
    lessons:        { uz: 'Darslar',           ru: 'Уроки',            en: 'Lessons' },
    myLessons:      { uz: 'Mening darslarim',  ru: 'Мои уроки',        en: 'My Lessons' },
    notifications:  { uz: 'Bildirishnomalar',  ru: 'Уведомления',      en: 'Notifications' },
    competitions:   { uz: 'Musobaqalar',       ru: 'Конкурсы',         en: 'Competitions' },
    extraClasses:   { uz: "Qo'shimcha darslar", ru: 'Доп. занятия',    en: 'Extra Classes' },
    results:        { uz: 'Natijalarim',       ru: 'Мои результаты',   en: 'My Results' },
    tests:          { uz: 'Testlar',           ru: 'Тесты',            en: 'Tests' },
    games:          { uz: "O'yinlar",          ru: 'Игры',             en: 'Games' },
    leaderboard:    { uz: 'Reyting',           ru: 'Рейтинг',          en: 'Leaderboard' },
    profile:        { uz: 'Profil',            ru: 'Профиль',          en: 'Profile' },
    landingPage:    { uz: 'Sayt sahifasi',     ru: 'Сайт',             en: 'Landing Page' },
    branches:       { uz: 'Filiallar',         ru: 'Филиалы',          en: 'Branches' },
    media:          { uz: 'Media',             ru: 'Медиа',            en: 'Media' },
    leads:          { uz: 'Murojaatlar',       ru: 'Обращения',        en: 'Leads' },
    announcements:  { uz: "E'lonlar",          ru: 'Объявления',       en: 'Announcements' },
    quizzes:        { uz: 'Testlar',           ru: 'Тесты',            en: 'Tests' },
    analytics:      { uz: 'Tahlil',            ru: 'Аналитика',        en: 'Analytics' },
    settings:       { uz: 'Sozlamalar',        ru: 'Настройки',        en: 'Settings' },
    reviews:        { uz: 'Baholar',           ru: 'Оценки',           en: 'Ratings' },
    adminPanel:     { uz: 'Administrator paneli', ru: 'Панель администратора', en: 'Administrator panel' },
    teacherPanel:   { uz: "O'qituvchi paneli", ru: 'Панель преподавателя', en: 'Teacher panel' },
    studentPanel:   { uz: "O'quvchi paneli",   ru: 'Панель ученика',   en: 'Student panel' },
  },

  /* ---------- student dashboard ---------- */
  student: {
    welcome:            { uz: 'Xush kelibsiz',  ru: 'Добро пожаловать', en: 'Welcome' },
    notInGroup:         { uz: 'Siz hali guruhga biriktirilmagansiz — test natijasidan keyin biriktiriladi.', ru: 'Вы ещё не в группе — вас распределят после теста.', en: 'You are not in a group yet — the school will place you after the test.' },
    currentCourse:      { uz: 'Joriy kurs',     ru: 'Текущий курс',     en: 'Current course' },
    attendanceRate:     { uz: 'Davomat',        ru: 'Посещаемость',     en: 'Attendance' },
    homeworkDone:       { uz: 'Bajarilgan vazifalar', ru: 'Сделано заданий', en: 'Homework done' },
    paymentStatus:      { uz: "To'lov holati",  ru: 'Статус оплаты',    en: 'Payment status' },
    upToDate:           { uz: "To'langan",      ru: 'Оплачено',         en: 'Up to date' },
    ieltsBand:          { uz: 'IELTS bali',     ru: 'Балл IELTS',       en: 'IELTS band' },
    notTaken:           { uz: 'Topshirilmagan', ru: 'Не сдавался',      en: 'Not taken' },
    myTeacher:          { uz: "Mening o'qituvchim", ru: 'Мой преподаватель', en: 'My teacher' },
    myGroup:            { uz: 'Mening guruhim', ru: 'Моя группа',       en: 'My group' },
    myResults:          { uz: 'Natijalarim',    ru: 'Мои результаты',   en: 'My results' },
    recordedSessions:   { uz: 'qayd etilgan sessiyalar', ru: 'записанных сессий', en: 'recorded sessions' },
    attendanceSplit:    { uz: 'Davomat taqsimoti', ru: 'Распределение посещаемости', en: 'Attendance split' },
    noAttendance:       { uz: 'Hozircha davomat yo\u2018q', ru: 'Пока нет отметок', en: 'No attendance yet' },
    noAttendanceHint:   { uz: 'O\u2018qituvchi davomatni belgilagach paydo bo\u2018ladi.', ru: 'Появится, когда преподаватель отметит journal.', en: 'It appears once your teacher marks a register.' },
    nextLessons:        { uz: 'Keyingi darslar', ru: 'Ближайшие уроки', en: 'Next lessons' },
    noLessons:          { uz: 'Dars rejalashtirilmagan', ru: 'Уроки не запланированы', en: 'No lessons scheduled' },
    homeworkDue:        { uz: 'Muddati yaqin vazifalar', ru: 'Задания к сдаче', en: 'Homework due' },
    nothingOutstanding: { uz: 'Qarz vazifa yo\u2018q', ru: 'Нет несданных заданий', en: 'Nothing outstanding' },
    notHandedIn:        { uz: 'Topshirilmagan', ru: 'Не сдано',         en: 'Not handed in' },
    dueOn:              { uz: 'Muddati',        ru: 'Срок',             en: 'Due' },
    classmates:         { uz: 'Guruhdoshlar',   ru: 'Одногруппники',    en: 'Classmates' },
    timetable:          { uz: 'Dars jadvali',   ru: 'Расписание',       en: 'Timetable' },
    you:                { uz: 'Siz',            ru: 'Вы',               en: 'You' },
    started:            { uz: 'Boshlangan',     ru: 'Начало',           en: 'Started' },
    joinClub:           { uz: "Klubga qo'shilish", ru: 'Вступить в клуб', en: 'Join a club' },
    myHomework:         { uz: 'Uy vazifalarim', ru: 'Мои задания',      en: 'My homework' },
  },

  /* ---------- gamification ---------- */
  game: {
    xp:               { uz: 'XP',                ru: 'XP',              en: 'XP' },
    level:            { uz: 'Daraja',            ru: 'Уровень',         en: 'Level' },
    streak:           { uz: 'Kunlik seriya',     ru: 'Серия дней',      en: 'Daily streak' },
    days:             { uz: 'kun',               ru: 'дн.',             en: 'days' },
    longestStreak:    { uz: 'Eng uzun seriya',   ru: 'Лучшая серия',    en: 'Longest streak' },
    badges:           { uz: 'Nishonlar',         ru: 'Значки',          en: 'Badges' },
    toNextLevel:      { uz: 'keyingi darajagacha', ru: 'до следующего уровня', en: 'to the next level' },
    leaderboard:      { uz: 'Reyting jadvali',   ru: 'Таблица лидеров', en: 'Leaderboard' },
    leaderboardHint:  { uz: 'XP bo\u2018yicha barcha faol o\u2018quvchilar.', ru: 'Все активные ученики по количеству XP.', en: 'Every active student, ranked by XP.' },
    rank:             { uz: "O'rin",             ru: 'Место',           en: 'Rank' },
    yourRank:         { uz: 'Sizning o\u2018rningiz', ru: 'Ваше место',  en: 'Your rank' },
    dailyGoal:        { uz: 'Kunlik maqsad',     ru: 'Цель на день',    en: 'Daily goal' },
    dailyGoalHint:    { uz: 'Har kuni bajaring — seriya uzilmasin.', ru: 'Выполняйте каждый день, чтобы не потерять серию.', en: 'Finish it each day to keep your streak alive.' },
    vocabularyWords:  { uz: 'so\u2018z',         ru: 'слов',            en: 'words' },
    grammarTasks:     { uz: 'grammatika',        ru: 'грамматика',      en: 'grammar' },
    minutesPractised: { uz: 'daqiqa',            ru: 'минут',           en: 'minutes' },
    goalDone:         { uz: 'Bugungi maqsad bajarildi!', ru: 'Цель на сегодня выполнена!', en: 'Today\u2019s goal is done!' },
    editGoal:         { uz: 'Maqsadni o\u2018zgartirish', ru: 'Изменить цель', en: 'Change goal' },
    learningPath:     { uz: "O'quv yo'lim",      ru: 'Мой путь обучения', en: 'Your learning path' },
    currentLevel:     { uz: 'Joriy daraja',      ru: 'Текущий уровень', en: 'Current level' },
    completedLessons: { uz: 'Tugallangan darslar', ru: 'Завершённые уроки', en: 'Completed lessons' },
    nextGoal:         { uz: 'Keyingi maqsad',    ru: 'Следующая цель',  en: 'Next goal' },
    recommended:      { uz: 'Tavsiya etiladi',   ru: 'Рекомендуем',     en: 'Recommended for you' },
    xpEarned:         { uz: 'Olingan XP',        ru: 'Получено XP',     en: 'XP earned' },
    accuracy:         { uz: 'Aniqlik',           ru: 'Точность',        en: 'Accuracy' },
    correct:          { uz: "To'g'ri",           ru: 'Верно',           en: 'Correct' },
    incorrect:        { uz: "Noto'g'ri",         ru: 'Неверно',         en: 'Incorrect' },
    score:            { uz: 'Ball',              ru: 'Очки',            en: 'Score' },
    timeSpent:        { uz: 'Sarflangan vaqt',   ru: 'Затрачено',       en: 'Time' },
    playAgain:        { uz: 'Yana o\u2018ynash', ru: 'Играть снова',    en: 'Play again' },
    backToGames:      { uz: "O'yinlarga qaytish", ru: 'К играм',        en: 'Back to games' },
    noBadges:         { uz: 'Hali nishon yo\u2018q — birinchi darsdan boshlanadi.', ru: 'Значков пока нет — всё начинается с первого урока.', en: 'No badges yet — they start with your first lesson.' },
    locked:           { uz: 'Ochilmagan',        ru: 'Закрыто',         en: 'Locked' },
    earned:           { uz: 'Olingan',           ru: 'Получено',        en: 'Earned' },
  },

  games: {
    title:            { uz: "Til o'yinlari",     ru: 'Языковые игры',   en: 'Language games' },
    subtitle:         { uz: 'Har bir o\u2018yin natijasi saqlanadi va XP beradi.', ru: 'Результат каждой игры сохраняется и приносит XP.', en: 'Every round is saved and earns you XP.' },
    plays:            { uz: 'marta o\u2018ynalgan', ru: 'сыграно',      en: 'plays' },
    best:             { uz: 'Eng yaxshi',        ru: 'Лучший',          en: 'Best' },
    play:             { uz: "O'ynash",           ru: 'Играть',          en: 'Play' },
    'vocabulary-match':       { uz: 'So\u2018z juftligi', ru: 'Сопоставь слова', en: 'Vocabulary Match' },
    'vocabulary-match.desc':  { uz: 'Inglizcha so\u2018zni tarjimasi bilan juftlang.', ru: 'Соедините английское слово с переводом.', en: 'Match each English word with its translation.' },
    'grammar-drag':           { uz: 'Grammatika: joyiga qo\u2018y', ru: 'Грамматика: перетащи', en: 'Grammar Drag & Drop' },
    'grammar-drag.desc':      { uz: 'So\u2018zlarni to\u2018g\u2018ri tartibda joylashtiring.', ru: 'Расставьте слова в правильном порядке.', en: 'Put the words in the right order.' },
    'word-builder':           { uz: 'Gap tuzish', ru: 'Собери предложение', en: 'Word Builder' },
    'word-builder.desc':      { uz: 'Aralashtirilgan so\u2018zlardan gap tuzing.', ru: 'Составьте предложение из перемешанных слов.', en: 'Build a sentence from shuffled words.' },
    'quick-quiz':             { uz: 'Tezkor viktorina', ru: 'Быстрая викторина', en: 'Quick Quiz' },
    'quick-quiz.desc':        { uz: 'Variantlardan to\u2018g\u2018ri tarjimani tanlang.', ru: 'Выберите правильный перевод.', en: 'Pick the correct translation.' },
    chooseTranslation:        { uz: 'To\u2018g\u2018ri tarjimani tanlang', ru: 'Выберите правильный перевод', en: 'Choose the correct translation' },
    tapPairs:                 { uz: 'Juftlikni tanlang', ru: 'Выберите пару', en: 'Tap a matching pair' },
    knewIt:                   { uz: 'Bildim',    ru: 'Знал',            en: 'I knew it' },
    didntKnow:                { uz: 'Bilmadim', ru: 'Не знал',          en: 'I did not' },
    tapWordsInOrder:          { uz: 'So\u2018zlarni tartib bilan bosing', ru: 'Нажимайте слова по порядку', en: 'Tap the words in order' },
    check:                    { uz: 'Tekshirish', ru: 'Проверить',      en: 'Check' },
    reset:                    { uz: 'Tozalash',   ru: 'Сбросить',       en: 'Clear' },
    roundOver:                { uz: 'Raund tugadi', ru: 'Раунд окончен', en: 'Round over' },
    saving:                   { uz: 'Natija saqlanmoqda…', ru: 'Сохраняем результат…', en: 'Saving your result…' },
    resultSaved:              { uz: 'Natija saqlandi', ru: 'Результат сохранён', en: 'Result saved' },
  },

  tests: {
    title:           { uz: 'Testlar',           ru: 'Тесты',            en: 'Tests' },
    subtitle:        { uz: 'Natijalar saqlanadi, tarixni istagan vaqt ko\u2018rishingiz mumkin.', ru: 'Результаты сохраняются, историю можно посмотреть в любой момент.', en: 'Results are saved and you can review your history any time.' },
    questions:       { uz: 'savol',             ru: 'вопросов',         en: 'questions' },
    timeLimit:       { uz: 'Vaqt chegarasi',    ru: 'Ограничение',      en: 'Time limit' },
    noLimit:         { uz: 'cheklovsiz',        ru: 'без ограничения',  en: 'no limit' },
    startTest:       { uz: 'Testni boshlash',   ru: 'Начать тест',      en: 'Start test' },
    question:        { uz: 'Savol',             ru: 'Вопрос',           en: 'Question' },
    of:              { uz: '/',                 ru: 'из',               en: 'of' },
    finishTest:      { uz: 'Testni yakunlash',  ru: 'Завершить тест',   en: 'Finish test' },
    yourScore:       { uz: 'Sizning natijangiz', ru: 'Ваш результат',   en: 'Your score' },
    history:         { uz: 'Urinishlar tarixi', ru: 'История попыток',  en: 'Attempt history' },
    noAttempts:      { uz: 'Hali test topshirmadingiz', ru: 'Вы ещё не проходили тесты', en: 'You have not taken a test yet' },
    reviewAnswers:   { uz: 'Javoblarni ko\u2018rish', ru: 'Посмотреть ответы', en: 'Review answers' },
    yourAnswer:      { uz: 'Sizning javobingiz', ru: 'Ваш ответ',       en: 'Your answer' },
    correctAnswer:   { uz: "To'g'ri javob",     ru: 'Правильный ответ', en: 'Correct answer' },
    noAnswer:        { uz: 'Javob berilmagan',  ru: 'Нет ответа',       en: 'Not answered' },
    timeUp:          { uz: 'Vaqt tugadi — test avtomatik yakunlandi.', ru: 'Время вышло — тест завершён автоматически.', en: 'Time is up — the test was submitted automatically.' },
    noTests:         { uz: 'Hozircha test yo\u2018q', ru: 'Пока нет тестов', en: 'No tests published yet' },
    exitTest:        { uz: 'Testdan chiqish',  ru: 'Выйти из теста',  en: 'Exit test' },
    exitConfirm:     { uz: 'Haqiqatan ham testdan chiqmoqchimisiz?', ru: 'Вы действительно хотите выйти из теста?', en: 'Are you sure you want to exit the test?' },
    exitWarning:     { uz: 'Belgilangan javoblaringiz saqlanmaydi va test yakunlanmagan holda qoladi.', ru: 'Ваши ответы не сохранятся, и тест останется незавершённым.', en: 'Your answers will not be saved and the test will stay unfinished.' },
    exitCancel:      { uz: 'Bekor qilish',     ru: 'Отмена',          en: 'Cancel' },
    exitConfirmYes:  { uz: 'Ha, chiqish',      ru: 'Да, выйти',       en: 'Yes, exit' },
    answeredSoFar:   { uz: 'Javob berilgan',   ru: 'Отвечено',        en: 'Answered' },
    leaveWarning:    { uz: 'Test tugallanmagan. Sahifani tark etsangiz javoblaringiz yo\u2018qoladi.', ru: 'Тест не завершён. Если вы покинете страницу, ответы будут потеряны.', en: 'The test is unfinished. Leaving this page will lose your answers.' },
    emptyQuiz:       { uz: 'Bu testda hali savol yo\u2018q.', ru: 'В этом тесте пока нет вопросов.', en: 'This test has no questions yet.' },
  },

  /* ---------- live class & reviews ---------- */
  live: {
    banner:          { uz: 'O\u2018qituvchi darsni boshladi. Hoziroq qo\u2018shiling!', ru: 'Преподаватель начал урок. Присоединяйтесь!', en: 'Teacher started the class. Join now!' },
    join:            { uz: 'Qo\u2018shilish', ru: 'Присоединиться',     en: 'Join' },
    joined:          { uz: 'Darsga qo\u2018shildingiz.', ru: 'Вы присоединились к уроку.', en: 'You joined the class.' },
    startLesson:     { uz: 'Darsni boshlash', ru: 'Начать урок',        en: 'Start lesson' },
    endLesson:       { uz: 'Darsni yakunlash', ru: 'Завершить урок',    en: 'End lesson' },
    lessonStarted:   { uz: 'Dars boshlandi — guruhga xabar yuborildi.', ru: 'Урок начался — группа уведомлена.', en: 'Lesson started — the group has been notified.' },
    lessonEnded:     { uz: 'Dars yakunlandi.', ru: 'Урок завершён.',    en: 'Lesson ended.' },
    activeStudents:  { uz: 'Qo\u2018shilgan o\u2018quvchilar', ru: 'Присоединились', en: 'Students joined' },
    liveNow:         { uz: 'Hozir jonli efirda', ru: 'Сейчас в эфире',  en: 'Live right now' },
    noLiveLesson:    { uz: 'Hozir jonli dars yo\u2018q.', ru: 'Сейчас нет активного урока.', en: 'No class is live right now.' },
    joinLink:        { uz: 'Qo\u2018shilish havolasi', ru: 'Ссылка для подключения', en: 'Join link' },
  },

  reminder: {
    title24h:        { uz: 'Ertaga dars bor',   ru: 'Завтра урок',      en: 'You have a lesson tomorrow' },
    title1h:         { uz: 'Dars bir soatdan keyin', ru: 'Урок через час', en: 'Your lesson starts in an hour' },
    title15m:        { uz: 'Dars 15 daqiqadan keyin', ru: 'Урок через 15 минут', en: 'Your lesson starts in 15 minutes' },
    inMinutes:       { uz: 'daqiqadan keyin',   ru: 'через мин.',       en: 'in minutes' },
  },

  review: {
    rateLesson:      { uz: 'Darsni baholang',   ru: 'Оцените урок',     en: 'Rate your lesson' },
    rateHint:        { uz: 'Bahoyingiz o\u2018qituvchi va maktabga yordam beradi.', ru: 'Ваша оценка помогает преподавателю и школе.', en: 'Your rating helps the teacher and the school.' },
    overall:         { uz: 'Umumiy baho',       ru: 'Общая оценка',     en: 'Overall' },
    teacherRating:   { uz: "O'qituvchi",        ru: 'Преподаватель',    en: 'Teacher' },
    clarity:         { uz: 'Tushuntirish sifati', ru: 'Ясность объяснения', en: 'Explanation quality' },
    homeworkUseful:  { uz: 'Uy vazifasi foydasi', ru: 'Польза домашнего задания', en: 'Homework usefulness' },
    comment:         { uz: 'Izoh',              ru: 'Комментарий',      en: 'Written feedback' },
    submitReview:    { uz: 'Bahoni yuborish',   ru: 'Отправить оценку', en: 'Send rating' },
    thanks:          { uz: 'Rahmat! Bahoyingiz saqlandi.', ru: 'Спасибо! Оценка сохранена.', en: 'Thank you — your rating was saved.' },
    alreadyRated:    { uz: 'Bu darsni allaqachon baholagansiz.', ru: 'Вы уже оценили этот урок.', en: 'You have already rated this lesson.' },
    averageRating:   { uz: "O'rtacha baho",     ru: 'Средняя оценка',   en: 'Average rating' },
    totalReviews:    { uz: 'Jami baholar',      ru: 'Всего оценок',     en: 'Total ratings' },
    recentFeedback:  { uz: 'So\u2018nggi izohlar', ru: 'Последние отзывы', en: 'Recent feedback' },
    noReviews:       { uz: 'Hali baho yo\u2018q', ru: 'Пока нет оценок', en: 'No ratings yet' },
    pendingReviews:  { uz: 'Baholanmagan darslar', ru: 'Уроки без оценки', en: 'Lessons waiting for your rating' },
  },

  /* ---------- recommendations (deterministic, from real records) ---------- */
  rec: {
    attendance:  { uz: 'Davomatingiz {value}% — keyingi darsni qoldirmang.', ru: 'Ваша посещаемость {value}% — постарайтесь не пропускать.', en: 'Your attendance is {value}% — try not to miss your next lesson.' },
    homework:    { uz: 'Sizda {value} ta bajarilmagan vazifa bor.', ru: 'У вас {value} невыполненных заданий.', en: 'You have {value} unfinished tasks.' },
    vocabulary:  { uz: 'Lug\u2018atni {value} daqiqa mashq qiling.', ru: 'Потренируйте словарь {value} минут.', en: 'Practise vocabulary for {value} minutes.' },
    firstQuiz:   { uz: 'Birinchi testni topshirib ko\u2018ring.', ru: 'Попробуйте пройти первый тест.', en: 'Try taking your first test.' },
    ieltsUp:     { uz: 'Tabriklaymiz! IELTS balingiz {value} gacha oshdi.', ru: 'Поздравляем! Ваш балл IELTS вырос до {value}.', en: 'Congratulations! Your IELTS score improved to {value}.' },
    streak:      { uz: '{value} kunlik seriya — davom eting!', ru: 'Серия {value} дней — так держать!', en: '{value} day streak — keep it going!' },
    allGood:     { uz: 'Hammasi joyida. Bugungi mashqni bajaring.', ru: 'Всё в порядке. Выполните сегодняшнюю практику.', en: 'You are on track. Do today\u2019s practice.' },
  },

  /* ---------- achievements ---------- */
  ach: {
    firstLesson:        { uz: 'Birinchi dars',        ru: 'Первый урок',        en: 'First Lesson' },
    'firstLesson.desc': { uz: 'Birinchi darsga qatnashdingiz.', ru: 'Вы пришли на первый урок.', en: 'You attended your first lesson.' },
    streak7:            { uz: '7 kunlik seriya',      ru: 'Серия 7 дней',       en: '7 Day Streak' },
    'streak7.desc':     { uz: 'Ketma-ket 7 kun mashq qildingiz.', ru: '7 дней подряд занятий.', en: 'Seven days of practice in a row.' },
    homeworkHero:       { uz: 'Vazifa qahramoni',     ru: 'Герой домашки',      en: 'Homework Hero' },
    'homeworkHero.desc':{ uz: '10 ta uy vazifasi topshirdingiz.', ru: 'Сдано 10 домашних заданий.', en: 'You handed in ten homework tasks.' },
    vocabMaster:        { uz: "Lug'at ustasi",        ru: 'Мастер словаря',     en: 'Vocabulary Master' },
    'vocabMaster.desc': { uz: 'So\u2018z o\u2018yinida 5 marta 80%+ aniqlik.', ru: '5 раз по 80%+ точности в словарной игре.', en: 'Five vocabulary rounds at 80% accuracy or better.' },
    quizChampion:       { uz: 'Viktorina chempioni',  ru: 'Чемпион викторины',  en: 'Quiz Champion' },
    'quizChampion.desc':{ uz: 'Testda 90% dan yuqori natija.', ru: 'Более 90% в тесте.', en: 'Scored over 90% in a test.' },
    speakingStar:       { uz: 'Speaking yulduzi',     ru: 'Звезда Speaking',    en: 'Speaking Star' },
    'speakingStar.desc':{ uz: 'Speaking Club ga qo\u2018shildingiz.', ru: 'Вы вступили в Speaking Club.', en: 'You joined the Speaking Club.' },
    ieltsProgress:      { uz: 'IELTS natijasi',       ru: 'Результат IELTS',    en: 'IELTS Progress' },
    'ieltsProgress.desc':{ uz: 'Birinchi IELTS natijangiz qayd etildi.', ru: 'Записан ваш первый результат IELTS.', en: 'Your first IELTS result was recorded.' },
    perfectAttendance:  { uz: 'Mukammal davomat',     ru: 'Идеальная посещаемость', en: 'Perfect Attendance' },
    'perfectAttendance.desc': { uz: 'Bironta darsni qoldirmadingiz.', ru: 'Вы не пропустили ни одного урока.', en: 'You have not missed a single lesson.' },
  },

  /* ---------- table headers and page copy ---------- */
  page: {
    applicant:        { uz: 'Ariza beruvchi',     ru: 'Заявитель',         en: 'Applicant' },
    requestDate:      { uz: 'Ariza sanasi',       ru: 'Дата заявки',       en: 'Request date' },
    position:         { uz: 'Lavozim',            ru: 'Должность',         en: 'Position' },
    specialism:       { uz: 'Yo\u2018nalish',     ru: 'Специализация',     en: 'Specialism' },
    experience:       { uz: 'Tajriba',            ru: 'Опыт',              en: 'Experience' },
    years:            { uz: 'yil',                ru: 'лет',               en: 'yrs' },
    joined:           { uz: 'Qo\u2018shilgan',    ru: 'Присоединился',     en: 'Joined' },
    noGroup:          { uz: 'Guruhsiz',           ru: 'Без группы',        en: 'No group' },
    when:             { uz: 'Qachon',             ru: 'Когда',             en: 'When' },
    period:           { uz: 'Davr',               ru: 'Период',            en: 'Period' },
    amount:           { uz: 'Summa',              ru: 'Сумма',             en: 'Amount' },
    paid:             { uz: "To'langan",          ru: 'Оплачено',          en: 'Paid' },
    due:              { uz: 'Muddat',             ru: 'Срок',              en: 'Due' },
    paidOn:           { uz: "To'langan sana",     ru: 'Дата оплаты',       en: 'Paid on' },
    pricePerMonth:    { uz: 'Narx / oy',          ru: 'Цена / мес.',       en: 'Price / month' },

    adminDashboard:   { uz: 'Bosh sahifa',        ru: 'Главная',           en: 'Dashboard' },
    adminDashboardHint:{ uz: 'Maktabda hozir nima bo\u2018layotgani.', ru: 'Что происходит в школе прямо сейчас.', en: 'Everything happening at the school right now.' },
    ieltsBandsHint:   { uz: 'Ballar bo\u2018yicha natijalar', ru: 'Результаты по баллам', en: 'Recorded results by band' },
    waitingApproval:  { uz: 'Tasdiq kutmoqda',    ru: 'Ожидают одобрения', en: 'Waiting for approval' },
    noPending:        { uz: 'Yangi ariza yo\u2018q', ru: 'Нет новых заявок', en: 'No pending requests' },
    newestStudents:   { uz: 'Yangi o\u2018quvchilar', ru: 'Новые ученики',  en: 'Newest students' },

    requestsHint:     { uz: 'Saytda ro\u2018yxatdan o\u2018tgan va hisob kutayotganlar.', ru: 'Зарегистрировались на сайте и ждут аккаунт.', en: 'People who registered on the website and are waiting for an account.' },
    searchRequests:   { uz: 'Ism, email yoki telefon bo\u2018yicha qidirish', ru: 'Поиск по имени, email или телефону', en: 'Search by name, email or phone' },
    studentsHint:     { uz: 'Tasdiqlangan o\u2018quvchilar. Yangi arizalar avval "Arizalar" bo\u2018limiga tushadi.', ru: 'Одобренные ученики. Новые заявки сначала попадают в раздел «Заявки».', en: 'Approved students. New sign-ups appear under Student Requests first.' },
    teachersHint:     { uz: 'O\u2018qituvchi qo\u2018shilganda hisobi ham yaratiladi. Ular o\u2018zi ro\u2018yxatdan o\u2018ta olmaydi.', ru: 'При добавлении преподавателя создаётся его аккаунт. Сами они не регистрируются.', en: 'Adding a teacher also creates their login account. Teachers cannot register themselves.' },
    coursesHint:      { uz: '"Ko\u2018rinadi" deb belgilangan kurslar saytda chiqadi.', ru: 'Курсы, отмеченные как видимые, показываются на сайте.', en: 'Courses marked visible appear on the public website.' },
    groupsRunning:    { uz: 'ta guruh faol.',     ru: 'групп работает.',   en: 'groups running.' },
    deleteGroup:      { uz: 'Guruh o\u2018chirilsinmi?', ru: 'Удалить группу?', en: 'Delete group?' },
    deleteGroupBody:  { uz: 'guruh o\u2018chiriladi va o\u2018quvchilari guruhsiz qoladi.', ru: 'группа будет удалена, а её ученики останутся без группы.', en: 'will be deleted and its students left without a group.' },
    paymentsHint:     { uz: 'Hisob-fakturalar, yig\u2018ilgan summa va qarzdorlar.', ru: 'Счета, поступления и должники.', en: 'Invoices, what has been collected and who is late.' },
    searchStudent:    { uz: 'O\u2018quvchi bo\u2018yicha qidirish', ru: 'Поиск по ученику', en: 'Search by student' },
    searchYourStudents:{ uz: 'O\u2018quvchilaringizni qidirish', ru: 'Поиск среди ваших учеников', en: 'Search your students' },

    noGroupsAssigned: { uz: 'Sizga guruh biriktirilmagan', ru: 'Вам не назначены группы', en: 'No groups assigned to you' },
    noGroupsHint:     { uz: 'Guruh biriktirilgach, jurnali shu yerda paydo bo\u2018ladi.', ru: 'Как только появится группа, здесь будет её журнал.', en: 'Once you have a group, its register appears here.' },
    attendanceHint:   { uz: 'Bitta guruhni bitta sanaga belgilang. Qayta saqlash eski belgilarni almashtiradi.', ru: 'Отметьте одну группу на одну дату. Повторное сохранение заменит прежние отметки.', en: 'Mark one group on one date. Saving again replaces the earlier marks.' },
    groupNoStudents:  { uz: 'Bu guruhda o\u2018quvchi yo\u2018q', ru: 'В этой группе нет учеников', en: 'This group has no students' },
    groupNoStudentsHint:{ uz: 'Avval guruhga o\u2018quvchi qo\u2018shing.', ru: 'Сначала добавьте учеников в группу.', en: 'Add students to the group first.' },
    myAttendance:     { uz: 'Mening davomatim', ru: 'Моя посещаемость', en: 'My attendance' },
    lessonsRecorded:  { uz: 'ta dars qayd etilgan.', ru: 'уроков записано.', en: 'lessons recorded.' },
    split:            { uz: 'Taqsimot',          ru: 'Распределение',   en: 'Split' },
    nothingRecorded:  { uz: 'Hali hech narsa qayd etilmagan', ru: 'Пока ничего не записано', en: 'Nothing recorded yet' },

    homeworkStudentHint:{ uz: 'Guruhingizga berilgan vazifalar.', ru: 'Задания для вашей группы.', en: 'Tasks set for your group.' },
    homeworkStaffHint:{ uz: 'Vazifa bering va kelganini baholang.', ru: 'Задавайте задания и оценивайте присланное.', en: 'Set tasks and grade what comes back.' },
    noHomework:       { uz: 'Vazifa yo\u2018q',  ru: 'Заданий нет',     en: 'No homework here' },
    noHomeworkStudent:{ uz: 'Guruhingizga hali vazifa berilmagan.', ru: 'Вашей группе ещё ничего не задали.', en: 'Nothing has been set for your group yet.' },
    noHomeworkStaff:  { uz: 'Guruhlaringizdan biriga birinchi vazifani bering.', ru: 'Задайте первое задание одной из ваших групп.', en: 'Set the first task for one of your groups.' },
    nothingHandedIn:  { uz: 'Hali hech kim topshirmadi', ru: 'Пока никто не сдал', en: 'Nothing handed in yet' },
    deleteHomework:   { uz: 'Vazifa o\u2018chirilsinmi?', ru: 'Удалить задание?', en: 'Delete homework?' },

    inboxCount:       { uz: 'o\u2018qilmagan / jami',  ru: 'непрочитанных из',  en: 'unread of' },
    inboxEmpty:       { uz: 'Pochtangiz bo\u2018sh',   ru: 'Входящие пусты',    en: 'Your inbox is empty' },
    inboxEmptyHint:   { uz: 'Maktabdan kelgan xabarlar shu yerda chiqadi.', ru: 'Сообщения от школы появятся здесь.', en: 'Messages from the school appear here.' },
    sendNotification: { uz: 'Bildirishnoma yuborish', ru: 'Отправить уведомление', en: 'Send notification' },

    competitionsStudentHint:{ uz: 'Yaqinlashayotgan musobaqalarga yoziling. Joylar cheklangan.', ru: 'Записывайтесь на ближайшие конкурсы. Мест мало.', en: 'Sign up for what is coming. Places are limited.' },
    competitionsStaffHint:{ uz: 'Musobaqa yarating va kim yozilganini ko\u2018ring.', ru: 'Создавайте конкурсы и смотрите, кто записался.', en: 'Create competitions and see who signed up.' },

    profileHint:      { uz: 'Ma\u2019lumotlaringiz va parol.', ru: 'Ваши данные и пароль.', en: 'Your details and password.' },
    avatarUrl:        { uz: 'Avatar havolasi',   ru: 'Ссылка на аватар',  en: 'Avatar URL' },
    gradeFor:         { uz: '{name} uchun baho', ru: 'Оценка для {name}', en: 'Grade for {name}' },
    avatarHint:       { uz: 'Rasm havolasini qo\u2018ying. Bo\u2018sh qoldirsangiz, bosh harflaringiz ko\u2018rsatiladi.', ru: 'Вставьте ссылку на изображение. Если оставить пустым, покажутся инициалы.', en: 'Paste an image link. Leave it empty to show your initials instead.' },
    yourDetails:      { uz: 'Ma\u2019lumotlaringiz',  ru: 'Ваши данные',  en: 'Your details' },
    emailManaged:     { uz: 'Email manzilingizni maktab boshqaradi.', ru: 'Ваш email управляется школой.', en: 'Your email address is managed by the school.' },
    passwordHint:     { uz: 'Kamida olti belgi ishlating.', ru: 'Используйте минимум шесть символов.', en: 'Use at least six characters.' },

    landingHint:      { uz: 'Bu yerdagi hamma narsa saytga chiqadi.', ru: 'Всё отсюда видно посетителям сайта.', en: 'Everything here is what visitors see on the public site.' },
    landingError:     { uz: 'Sahifa matnini yuklab bo\u2018lmadi', ru: 'Не удалось загрузить содержимое', en: 'Could not load the page content' },
    settingsHint:     { uz: 'Demo hisoblar va sayt sozlamalari.', ru: 'Демо-аккаунты и настройки сайта.', en: 'Demo accounts and site settings.' },
    demoAccounts:     { uz: 'Demo hisoblar',       ru: 'Демо-аккаунты',   en: 'Demo accounts' },
    demoAccountsHint: { uz: 'npm run seed orqali server/db.json ga yoziladi.', ru: 'Заполняются в server/db.json через npm run seed.', en: 'Seeded in server/db.json by npm run seed.' },

    myGroupsHint:     { uz: 'Faqat maktab sizga biriktirgan guruhlar.', ru: 'Только группы, назначенные вам школой.', en: 'Only the groups the school assigned to you.' },
    noGroupsYet:      { uz: 'Hali guruh yo\u2018q', ru: 'Пока нет групп', en: 'No groups yet' },
    adminAssignsGroups:{ uz: 'Guruhlarni administrator biriktiradi.', ru: 'Группы назначает администратор.', en: 'The administrator assigns groups to teachers.' },
    studentsAcross:   { uz: 'ta o\u2018quvchi guruhlaringizda.', ru: 'учеников в ваших группах.', en: 'students across your groups.' },

    notInGroupYet:    { uz: 'Siz hali guruhda emassiz', ru: 'Вы ещё не в группе', en: 'You are not in a group yet' },
    notInGroupHint:   { uz: 'Daraja aniqlash testidan so\u2018ng maktab sizni guruhga joylashtiradi.', ru: 'После теста школа определит вас в группу.', en: 'Book the placement test and the school will place you.' },
    noLessonsPublished:{ uz: 'Hali dars e\u2019lon qilinmagan', ru: 'Уроки ещё не опубликованы', en: 'No lessons published yet' },
    myPaymentsHint:   { uz: 'Hisob-fakturalaringiz va tushgan to\u2018lovlar.', ru: 'Ваши счета и поступившие платежи.', en: 'Your invoices and what has been received.' },
    extraClassesHint: { uz: 'Kursingizga qo\u2018shimcha klub va laboratoriyalar. To\u2018lovsiz.', ru: 'Клубы и лаборатории в дополнение к курсу. Без доплаты.', en: 'Clubs and labs that run alongside your course. No extra charge.' },
    noIelts:          { uz: 'Hali IELTS natijasi yo\u2018q', ru: 'Результатов IELTS пока нет', en: 'No IELTS result recorded yet' },
    noIeltsHint:      { uz: 'Sinov yoki haqiqiy imtihondan so\u2018ng ballaringiz shu yerda chiqadi.', ru: 'После пробного или реального экзамена баллы появятся здесь.', en: 'Sit a mock exam or a real session and your bands appear here.' },
    latestSession:    { uz: 'So\u2018nggi sessiya', ru: 'Последняя сессия', en: 'Latest session' },
    skillBreakdown:   { uz: 'Ko\u2018nikmalar bo\u2018yicha', ru: 'По навыкам',  en: 'Skill breakdown' },
    allSessions:      { uz: 'Barcha sessiyalar',   ru: 'Все сессии',      en: 'All sessions' },
    checkRequestTitle:{ uz: 'Arizangizni tekshiring', ru: 'Проверьте заявку', en: 'Check your request' },
    checkRequestHint: { uz: 'Ro\u2018yxatdan o\u2018tgan email manzilingizni kiriting.', ru: 'Введите email, указанный при регистрации.', en: 'Enter the email you registered with to see where your request stands.' },
  },

  /* ---------- remaining form and card labels ---------- */
  field: {
    previousPage:    { uz: 'Oldingi sahifa',     ru: 'Предыдущая страница', en: 'Previous page' },
    nextPage:        { uz: 'Keyingi sahifa',     ru: 'Следующая страница',  en: 'Next page' },
    links:           { uz: 'Havolalar',          ru: 'Ссылки',              en: 'Links' },
    onWebsite:       { uz: 'Saytda',             ru: 'На сайте',            en: 'On website' },
    editGroup:       { uz: 'Guruhni tahrirlash', ru: 'Редактировать группу', en: 'Edit group' },
    deleteGroup:     { uz: 'Guruhni o\u2018chirish', ru: 'Удалить группу',  en: 'Delete group' },
    deleteNotification:{ uz: 'Bildirishnomani o\u2018chirish', ru: 'Удалить уведомление', en: 'Delete notification' },
    capacity:        { uz: 'Sig\u2018im',        ru: 'Вместимость',         en: 'Capacity' },
    startDate:       { uz: 'Boshlanish sanasi',  ru: 'Дата начала',         en: 'Start date' },
    recordPayment:   { uz: 'To\u2018lovni qayd etish', ru: 'Записать платёж', en: 'Record payment' },
    amountReceived:  { uz: 'Qabul qilingan summa (UZS)', ru: 'Получено (UZS)', en: 'Amount received (UZS)' },
    deadline:        { uz: 'Muddat',             ru: 'Срок сдачи',          en: 'Deadline' },
    workLink:        { uz: 'Ishingizga havola',  ru: 'Ссылка на работу',    en: 'Link to your work' },
    workLinkHint:    { uz: 'Google Docs, audio, rasm…', ru: 'Google Docs, запись, фото…', en: 'Google Docs, recording, photo…' },
    noteForTeacher:  { uz: 'O\u2018qituvchi uchun izoh', ru: 'Заметка преподавателю', en: 'Note for your teacher' },
    sendTo:          { uz: 'Kimga yuborish',     ru: 'Кому отправить',      en: 'Send to' },
    whichOne:        { uz: 'Qaysi biri',         ru: 'Кому именно',         en: 'Which one' },
    location:        { uz: 'Joy',                ru: 'Место',               en: 'Location' },
    places:          { uz: 'Joylar soni',        ru: 'Мест',                en: 'Places' },
    repeatNewPassword:{ uz: 'Yangi parolni takrorlang', ru: 'Повторите новый пароль', en: 'Repeat new password' },
    unassigned:      { uz: 'Biriktirilmagan',    ru: 'Не назначен',         en: 'Unassigned' },
    monthlyFee:      { uz: 'Oylik to\u2018lov',  ru: 'Ежемесячный платёж',  en: 'Monthly fee' },
    paidSoFar:       { uz: 'To\u2018langan',     ru: 'Оплачено',            en: 'Paid so far' },
    outstanding:     { uz: 'Qarz',               ru: 'Задолженность',       en: 'Outstanding' },
    overallBand:     { uz: 'Umumiy ball',        ru: 'Общий балл',          en: 'Overall band' },
    totalStudents:   { uz: 'Jami o\u2018quvchilar', ru: 'Всего учеников',   en: 'Total students' },
    pendingRequests: { uz: 'Yangi arizalar',     ru: 'Новые заявки',        en: 'Pending requests' },
    revenueThisMonth:{ uz: 'Bu oylik tushum',    ru: 'Доход за месяц',      en: 'Revenue this month' },
    averageIelts:    { uz: 'O\u2018rtacha IELTS', ru: 'Средний балл IELTS', en: 'Average IELTS band' },
    overduePayments: { uz: 'Muddati o\u2018tgan to\u2018lovlar', ru: 'Просроченные платежи', en: 'Overdue payments' },
    upcomingEvents:  { uz: 'Yaqin tadbirlar',    ru: 'Ближайшие события',   en: 'Upcoming events' },
    activeGroups:    { uz: 'faol guruh',         ru: 'активных групп',      en: 'active groups' },
    payment:         { uz: 'To\u2018lov',        ru: 'Оплата',              en: 'Payment' },
  },

  /* ---------- form field labels ---------- */
  form: {
    age:              { uz: 'Yosh',                    ru: 'Возраст',                  en: 'Age' },
    monthlyPayment:   { uz: 'Oylik to\u2018lov (UZS)', ru: 'Ежемесячный платёж (UZS)', en: 'Monthly payment (UZS)' },
    paymentStatus:    { uz: 'To\u2018lov holati',      ru: 'Статус оплаты',            en: 'Payment status' },
    notes:            { uz: 'Izohlar',                 ru: 'Заметки',                  en: 'Notes' },
    accountPassword:  { uz: 'Hisobi uchun parol',      ru: 'Пароль для аккаунта',      en: 'Password for their account' },
    yearsExperience:  { uz: 'Tajriba (yil)',           ru: 'Опыт (лет)',               en: 'Years of experience' },
    ownIelts:         { uz: 'Shaxsiy IELTS bali',      ru: 'Свой балл IELTS',          en: 'Own IELTS band' },
    shortBio:         { uz: 'Qisqacha ma\u2019lumot',  ru: 'Краткая биография',        en: 'Short bio' },
    courseName:       { uz: 'Kurs nomi',               ru: 'Название курса',           en: 'Course name' },
    levelRange:       { uz: 'Daraja oralig\u2018i',    ru: 'Диапазон уровней',         en: 'Level range' },
    lessonCount:      { uz: 'Darslar soni',            ru: 'Количество уроков',        en: 'Number of lessons' },
    pricePerMonthUzs: { uz: 'Oylik narx (UZS)',        ru: 'Цена в месяц (UZS)',       en: 'Price per month (UZS)' },
    showOnWebsite:    { uz: 'Saytda ko\u2018rsatish',  ru: 'Показывать на сайте',      en: 'Show on website' },
    lessonLength:     { uz: 'Davomiyligi (daqiqa)',    ru: 'Длительность (мин)',       en: 'Length (minutes)' },
    lessonPlan:       { uz: 'Dars rejasi',             ru: 'План урока',               en: 'Lesson plan' },
    groupName:        { uz: 'Guruh nomi',              ru: 'Название группы',          en: 'Group name' },
    whatToDo:         { uz: 'O\u2018quvchilar nima qilishi kerak', ru: 'Что должны сделать ученики', en: 'What students have to do' },
    externalLink:     { uz: 'Tashqi havola',           ru: 'Внешняя ссылка',           en: 'External link' },
    prize:            { uz: 'Sovrin',                  ru: 'Приз',                     en: 'Prize' },
    type:             { uz: 'Turi',                    ru: 'Тип',                      en: 'Type' },
    egScheduleLong:   { uz: 'Sesh / Pay / Shan · 18:00', ru: 'Вт / Чт / Сб · 18:00', en: 'Tue / Thu / Sat · 18:00' },
    egSchedule:       { uz: 'Sesh / Pay / Shan',       ru: 'Вт / Чт / Сб',             en: 'Tue / Thu / Sat' },
    egDuration:       { uz: '4 oy',                    ru: '4 месяца',                 en: '4 months' },
    egTopic:          { uz: 'Present Perfect',         ru: 'Present Perfect',          en: 'Present Perfect' },
    egSpecialism:     { uz: 'IELTS Writing & Speaking', ru: 'IELTS Writing & Speaking', en: 'IELTS Writing & Speaking' },
    egName:           { uz: 'Aziza Karimova',          ru: 'Азиза Каримова',           en: 'Aziza Karimova' },
    video:            { uz: 'Video',                   ru: 'Видео',                    en: 'Video' },
    smallLabel:       { uz: 'Kichik yorliq',           ru: 'Малая подпись',            en: 'Small label' },
    headline:         { uz: 'Sarlavha',                ru: 'Заголовок',                en: 'Headline' },
    paragraph:        { uz: 'Matn',                    ru: 'Абзац',                    en: 'Paragraph' },
    mainButton:       { uz: 'Asosiy tugma matni',      ru: 'Текст главной кнопки',     en: 'Main button text' },
    secondButton:     { uz: 'Ikkinchi tugma matni',    ru: 'Текст второй кнопки',      en: 'Second button text' },
    heading:          { uz: 'Sarlavha',                ru: 'Заголовок',                en: 'Heading' },
    bodyText:         { uz: 'Asosiy matn',             ru: 'Основной текст',           en: 'Body text' },
    missionStatement: { uz: 'Maqsad bayoni',           ru: 'Формулировка миссии',      en: 'Mission statement' },
    buttonText:       { uz: 'Tugma matni',             ru: 'Текст кнопки',             en: 'Button text' },
    openingHours:     { uz: 'Ish vaqti',               ru: 'Часы работы',              en: 'Opening hours' },
    tagline:          { uz: 'Shior',                   ru: 'Слоган',                   en: 'Tagline' },
    copyrightLine:    { uz: 'Mualliflik huquqi qatori', ru: 'Строка копирайта',        en: 'Copyright line' },
    pageTitle:        { uz: 'Sahifa sarlavhasi',       ru: 'Заголовок страницы',       en: 'Page title' },
    metaDescription:  { uz: 'Meta tavsif',             ru: 'Мета-описание',            en: 'Meta description' },
    keywords:         { uz: 'Kalit so‘zlar',      ru: 'Ключевые слова',           en: 'Keywords' },
    labelField:       { uz: 'Yorliq',                  ru: 'Подпись',                  en: 'Label' },
    anchor:           { uz: 'Havola (anchor)',         ru: 'Якорь',                    en: 'Anchor' },
    number:           { uz: 'Raqam',                   ru: 'Число',                    en: 'Number' },
    suffix:           { uz: 'Qo‘shimcha belgi',   ru: 'Суффикс',                  en: 'Suffix' },
    caption:          { uz: 'Izoh',                    ru: 'Подпись',                  en: 'Caption' },
    stepTitle:        { uz: 'Qadam sarlavhasi',        ru: 'Название шага',            en: 'Step title' },
    question:         { uz: 'Savol',                   ru: 'Вопрос',                   en: 'Question' },
    answer:           { uz: 'Javob',                   ru: 'Ответ',                    en: 'Answer' },
  },

  /* ---------- select options ---------- */
  opt: {
    allStatuses:     { uz: 'Barcha holatlar',   ru: 'Все статусы',        en: 'All statuses' },
    anyStatus:       { uz: 'Istalgan holat',    ru: 'Любой статус',       en: 'Any status' },
    allGroups:       { uz: 'Barcha guruhlar',   ru: 'Все группы',         en: 'All groups' },
    allLevels:       { uz: 'Barcha darajalar',  ru: 'Все уровни',         en: 'All levels' },
    anyPayment:      { uz: 'Istalgan to\u2018lov holati', ru: 'Любой статус оплаты', en: 'Any payment status' },
    allStudents:     { uz: 'Barcha o\u2018quvchilar',    ru: 'Все ученики',        en: 'All students' },
    allTeachers:     { uz: 'Barcha o\u2018qituvchilar',  ru: 'Все преподаватели',  en: 'All teachers' },
    chooseCourse:    { uz: 'Kursni tanlang',    ru: 'Выберите курс',      en: 'Choose a course' },
    chooseGroup:     { uz: 'Guruhni tanlang',   ru: 'Выберите группу',    en: 'Choose a group' },
    choose:          { uz: 'Tanlang',           ru: 'Выберите',           en: 'Choose' },
    noGroup:         { uz: 'Guruhsiz',          ru: 'Без группы',         en: 'No group' },
    unassigned:      { uz: 'Biriktirilmagan',   ru: 'Не назначен',        en: 'Unassigned' },
    closed:          { uz: 'Yopilgan',          ru: 'Закрыта',            en: 'Closed' },
    everyone:        { uz: 'Hammaga',           ru: 'Всем',               en: 'Everyone' },
    wholeRole:       { uz: 'Butun rolga',       ru: 'Целой роли',         en: 'A whole role' },
    oneGroup:        { uz: 'Bitta guruhga',     ru: 'Одной группе',       en: 'One group' },
    oneStudent:      { uz: 'Bitta o\u2018quvchiga', ru: 'Одному ученику', en: 'One student' },
    information:     { uz: 'Ma\u2019lumot',     ru: 'Информация',         en: 'Information' },
    warning:         { uz: 'Ogohlantirish',     ru: 'Предупреждение',     en: 'Warning' },
    goodNews:        { uz: 'Xushxabar',         ru: 'Хорошая новость',    en: 'Good news' },
  },

  /* ---------- buttons and inline actions ---------- */
  btn: {
    approve:          { uz: 'Tasdiqlash',           ru: 'Одобрить',            en: 'Approve' },
    reject:           { uz: 'Rad etish',            ru: 'Отклонить',           en: 'Reject' },
    reviewNow:        { uz: 'Hozir ko\u2018rib chiqish', ru: 'Рассмотреть',    en: 'Review now' },
    sendReminders:    { uz: 'Eslatma yuborish',     ru: 'Отправить напоминания', en: 'Send reminders' },
    createGroup:      { uz: 'Guruh yaratish',       ru: 'Создать группу',      en: 'Create group' },
    saveGroup:        { uz: 'Guruhni saqlash',      ru: 'Сохранить группу',    en: 'Save group' },
    roster:           { uz: 'Ro\u2018yxat',         ru: 'Состав',              en: 'Roster' },
    addStudent:       { uz: 'O\u2018quvchi qo\u2018shish', ru: 'Добавить ученика', en: 'Add a student' },
    remindOverdue:    { uz: 'Qarzdorlarga eslatma', ru: 'Напомнить должникам', en: 'Remind overdue students' },
    settled:          { uz: 'Yopilgan',             ru: 'Закрыт',              en: 'Settled' },
    saveRegister:     { uz: 'Jurnalni saqlash',     ru: 'Сохранить журнал',    en: 'Save register' },
    setHomework:      { uz: 'Vazifa berish',        ru: 'Задать задание',      en: 'Set homework' },
    openLink:         { uz: 'Havolani ochish',      ru: 'Открыть ссылку',      en: 'Open link' },
    markAsDone:       { uz: 'Bajarildi deb belgilash', ru: 'Отметить выполненным', en: 'Mark as done' },
    markRead:         { uz: 'O\u2018qildi',         ru: 'Прочитано',           en: 'Mark read' },
    send:             { uz: 'Yuborish',             ru: 'Отправить',           en: 'Send' },
    createCompetition:{ uz: 'Musobaqa yaratish',    ru: 'Создать конкурс',     en: 'Create competition' },
    saveChanges:      { uz: 'O\u2018zgarishlarni saqlash', ru: 'Сохранить изменения', en: 'Save changes' },
    viewStudents:     { uz: 'O\u2018quvchilarni ko\u2018rish', ru: 'Смотреть учеников', en: 'View students' },
    studentRequests:  { uz: 'Arizalar',             ru: 'Заявки',              en: 'Student requests' },
    editLanding:      { uz: 'Saytni tahrirlash',    ru: 'Редактировать сайт',  en: 'Edit landing page' },
    checkStatus:      { uz: 'Holatni tekshirish',   ru: 'Проверить статус',    en: 'Check status' },
    loginNow:         { uz: 'Hozir kirish',         ru: 'Войти сейчас',        en: 'Log in now' },
    recordPayment:    { uz: 'To\u2018lovni qayd etish', ru: 'Записать платёж', en: 'Record payment' },
  },

  /* ---------- landing editor section names ---------- */
  sec: {
    hero:          { uz: 'Bosh blok',           ru: 'Главный блок',      en: 'Hero' },
    about:         { uz: 'Biz haqimizda',       ru: 'О нас',             en: 'About' },
    resultsBlock:  { uz: 'Natijalar bloki',     ru: 'Блок результатов',  en: 'Results block' },
    cta:           { uz: 'Chaqiruv bloki',      ru: 'Призыв к действию', en: 'Call to action' },
    contact:       { uz: 'Kontaktlar',          ru: 'Контакты',          en: 'Contact' },
    footer:        { uz: 'Pastki qism',         ru: 'Подвал',            en: 'Footer' },
    seo:           { uz: 'SEO',                 ru: 'SEO',               en: 'SEO' },
    nav:           { uz: 'Navigatsiya',         ru: 'Навигация',         en: 'Navigation' },
    stats:         { uz: 'Statistika',          ru: 'Статистика',        en: 'Statistics' },
    benefits:      { uz: 'Nega TJ',             ru: 'Почему TJ',         en: 'Why TJ' },
    steps:         { uz: 'Qanday ishlaydi',     ru: 'Как это работает',  en: 'How it works' },
    faq:           { uz: 'Savol-javob',         ru: 'Вопросы и ответы',  en: 'FAQ' },
  },

  /* ---------- toast and inline messages ---------- */
  msg: {
    deleted:          { uz: 'O\u2018chirildi.',            ru: 'Удалено.',                 en: 'Deleted.' },
    groupDeleted:     { uz: 'Guruh o\u2018chirildi.',      ru: 'Группа удалена.',          en: 'Group deleted.' },
    homeworkDeleted:  { uz: 'Vazifa o\u2018chirildi.',     ru: 'Задание удалено.',         en: 'Homework deleted.' },
    paymentRecorded:  { uz: 'To\u2018lov qayd etildi.',    ru: 'Платёж записан.',          en: 'Payment recorded.' },
    registerSaved:    { uz: '{count} o\u2018quvchi uchun jurnal saqlandi.', ru: 'Журнал сохранён для {count} учеников.', en: 'Register saved for {count} students.' },
    markedDone:       { uz: 'Bajarildi deb belgilandi. O\u2018qituvchingiz ko\u2018radi.', ru: 'Отмечено как выполненное. Преподаватель это увидит.', en: 'Marked as done. Your teacher can see it now.' },
    gradeSaved:       { uz: 'Baho saqlandi va o\u2018quvchiga xabar berildi.', ru: 'Оценка сохранена, ученик уведомлён.', en: 'Grade saved and the student was notified.' },
    allMarkedRead:    { uz: 'Hammasi o\u2018qilgan deb belgilandi.', ru: 'Всё отмечено как прочитанное.', en: 'All marked as read.' },
    profileUpdated:   { uz: 'Profil yangilandi.',          ru: 'Профиль обновлён.',        en: 'Profile updated.' },
    noRecordsYet:     { uz: 'Hali yozuv yo\u2018q.',       ru: 'Пока нет записей.',        en: 'No records yet.' },
    nobodyInGroup:    { uz: 'Bu guruhda hali hech kim yo\u2018q.', ru: 'В этой группе пока никого нет.', en: 'Nobody in this group yet.' },
    noRequests:       { uz: 'Bu yerda ariza yo\u2018q',    ru: 'Здесь нет заявок',         en: 'No requests here' },
    noRequestsHint:   { uz: 'Saytdan kelgan yangi ro\u2018yxatlar shu sahifaga tushadi.', ru: 'Новые регистрации с сайта попадают на эту страницу.', en: 'New registrations from the website land on this page.' },
    noInvoicesMatch:  { uz: 'Bu filtrga mos hisob-faktura yo\u2018q', ru: 'Нет счетов по этому фильтру', en: 'No invoices match this view' },
    noInvoicesYet:    { uz: 'Hali hisob-faktura yo\u2018q', ru: 'Счетов пока нет',         en: 'No invoices yet' },
    noStudentsInGroups:{ uz: 'Guruhlaringizda hali o\u2018quvchi yo\u2018q', ru: 'В ваших группах пока нет учеников', en: 'No students in your groups yet' },
    paymentsAtReception:{ uz: 'To\u2018lovlar qabulxonada qayd etiladi. Nimadir noto\u2018g\u2018ri bo\u2018lsa, administratorga yozing.', ru: 'Платежи фиксируются на ресепшене. Если что-то не так, напишите администратору.', en: 'Payments are recorded at reception. If something looks wrong, message the administrator.' },
    ourMission:       { uz: 'Bizning maqsadimiz',          ru: 'Наша миссия',              en: 'Our mission' },
    highestBand:      { uz: 'Eng yuqori ball',             ru: 'Высший балл',              en: 'Highest band recorded' },
    approvedAlready:  { uz: 'Allaqachon tasdiqlanganmi?',  ru: 'Уже одобрено?',            en: 'Approved already?' },
    noAccountYet:     { uz: 'Hisob yo\u2018qmi? Arizangiz hali ko\u2018rib chiqilayotgan bo\u2018lishi mumkin.', ru: 'Нет аккаунта? Ваша заявка может быть ещё на рассмотрении.', en: 'No account yet? Your request may still be waiting.' },
    studentGrowth:    { uz: 'O\u2018quvchilar o\u2018sishi', ru: 'Рост числа учеников',    en: 'Student growth' },
    studentGrowthHint:{ uz: 'Vaqt bo\u2018yicha jami o\u2018quvchilar', ru: 'Всего учеников по времени', en: 'Total students over time' },
    revenueCollected: { uz: 'Yig\u2018ilgan tushum',       ru: 'Собранный доход',          en: 'Revenue collected' },
    revenueHint:      { uz: 'Oylar bo\u2018yicha to\u2018langan hisob-fakturalar', ru: 'Оплаченные счета по месяцам', en: 'Paid invoices per month' },
    lessonByLesson:   { uz: 'Dars bo\u2018yicha',          ru: 'По урокам',                en: 'Lesson by lesson' },
    closeLabel:       { uz: 'Yopish',                      ru: 'Закрыть',                  en: 'Close' },
    pagination:       { uz: 'Sahifalash',                  ru: 'Пагинация',                en: 'Pagination' },
    mainNav:          { uz: 'Asosiy menyu',                ru: 'Главное меню',             en: 'Main' },
    mobileNav:        { uz: 'Mobil menyu',                 ru: 'Мобильное меню',           en: 'Mobile' },
  },

  /* ---------- multilingual CMS editor ---------- */
  cms: {
    editingIn:      { uz: 'Tahrirlanayotgan til',  ru: 'Язык редактирования',  en: 'Editing language' },
    baseLanguage:   { uz: 'Asosiy til',            ru: 'Основной язык',        en: 'Base language' },
    fallbackNote:   { uz: 'Bo\u2018sh qoldirilsa, asosiy tildagi matn ko\u2018rsatiladi.', ru: 'Если оставить пустым, покажется текст основного языка.', en: 'Leave blank to fall back to the base language.' },
    translated:     { uz: 'Tarjima qilingan',      ru: 'Переведено',           en: 'Translated' },
    untranslated:   { uz: 'Tarjima yo\u2018q',     ru: 'Нет перевода',         en: 'Not translated' },
    translateHint:  { uz: 'Har bir til uchun alohida matn kiriting. Saytda tanlangan tilga mos matn chiqadi.', ru: 'Введите текст для каждого языка. На сайте покажется текст выбранного языка.', en: 'Enter text per language. The site shows the text for the visitor\u2019s language.' },
    coverage:       { uz: 'Tarjima qamrovi',       ru: 'Покрытие переводом',   en: 'Translation coverage' },
  },

  /* ---------- course enrolment requests ---------- */
  enrol: {
    request:        { uz: 'Kursga yozilish',       ru: 'Записаться на курс',   en: 'Request this course' },
    requestTitle:   { uz: 'Kursga yozilish so‘rovi', ru: 'Заявка на курс', en: 'Course request' },
    requestHint:    { uz: 'So‘rovingiz administratorga boradi. Tasdiqlangach kursingiz o‘zgaradi.', ru: 'Заявка уйдёт администратору. После одобрения курс изменится.', en: 'Your request goes to an administrator. Your course changes once it is approved.' },
    yourMessage:    { uz: 'Izohingiz',             ru: 'Ваш комментарий',      en: 'Your message' },
    sent:           { uz: 'So‘rov yuborildi.', ru: 'Заявка отправлена.',  en: 'Request sent.' },
    myRequests:     { uz: 'Mening so‘rovlarim', ru: 'Мои заявки',         en: 'My requests' },
    adminTitle:     { uz: 'Kurs so‘rovlari',  ru: 'Заявки на курсы',      en: 'Course requests' },
    adminHint:      { uz: 'Tasdiqlansa, o‘quvchi avtomatik yangi kursga o‘tadi.', ru: 'При одобрении ученик автоматически переходит на новый курс.', en: 'Approving moves the student onto the new course automatically.' },
    currentCourse:  { uz: 'Joriy kurs',            ru: 'Текущий курс',         en: 'Current course' },
    wantedCourse:   { uz: 'So‘ralgan kurs',   ru: 'Запрошенный курс',     en: 'Requested course' },
    noRequests:     { uz: 'So‘rov yo‘q', ru: 'Заявок нет',           en: 'No requests' },
  },

  /* ---------- API error codes ---------- */
  err: {
    network:          { uz: 'Serverga ulanib bo\u2018lmadi.',        ru: 'Не удалось связаться с сервером.',   en: 'Could not reach the server.' },
    invalidLogin:     { uz: 'Email yoki parol noto\u2018g\u2018ri.', ru: 'Неверный email или пароль.',         en: 'Incorrect email or password.' },
    requestPending:   { uz: 'Arizangiz hali ko\u2018rib chiqilmoqda.', ru: 'Ваша заявка ещё на рассмотрении.', en: 'Your registration request is still pending.' },
    requestRejected:  { uz: 'Arizangiz rad etilgan.',               ru: 'Ваша заявка отклонена.',             en: 'Your registration request was rejected.' },
    accountInactive:  { uz: 'Hisobingiz faol emas.',                ru: 'Ваш аккаунт неактивен.',             en: 'Your account is not active.' },
    checkForm:        { uz: 'Formani tekshiring.',                  ru: 'Проверьте форму.',                   en: 'Check the form.' },
    emailTaken:       { uz: 'Bu email allaqachon ro\u2018yxatdan o\u2018tgan.', ru: 'Этот email уже зарегистрирован.', en: 'That email already has an account.' },
    requestExists:    { uz: 'Bu email bilan ariza allaqachon yuborilgan.', ru: 'Заявка с этим email уже отправлена.', en: 'A request with this email is already waiting.' },
    notFound:         { uz: 'Topilmadi.',                           ru: 'Не найдено.',                        en: 'Not found.' },
    forbidden:        { uz: 'Bunga ruxsatingiz yo\u2018q.',         ru: 'У вас нет доступа.',                 en: 'You do not have access to this.' },
    lessonNotFound:   { uz: 'Dars topilmadi.',                      ru: 'Урок не найден.',                    en: 'Lesson not found.' },
    notYourLesson:    { uz: 'Bu sizning darsingiz emas.',           ru: 'Это не ваш урок.',                   en: 'That is not your lesson.' },
    otherGroupLesson: { uz: 'Bu dars boshqa guruh uchun.',          ru: 'Этот урок для другой группы.',       en: 'That lesson is for another group.' },
    notLive:          { uz: 'Bu dars jonli efirda emas.',           ru: 'Этот урок не в эфире.',              en: 'That class is not live.' },
    alreadyReviewed:  { uz: 'Siz bu darsni allaqachon baholagansiz.', ru: 'Вы уже оценили этот урок.',        en: 'You have already rated this lesson.' },
    ratingRange:      { uz: 'Darsga 1 dan 5 gacha baho qo\u2018ying.', ru: 'Поставьте оценку от 1 до 5.',     en: 'Give the lesson between 1 and 5 stars.' },
    quizNotFound:     { uz: 'Test topilmadi.',                      ru: 'Тест не найден.',                    en: 'Test not found.' },
    quizEmpty:        { uz: 'Bu testda hali savol yo\u2018q.',      ru: 'В этом тесте пока нет вопросов.',    en: 'This test has no questions yet.' },
    quizUnpublished:  { uz: 'Bu test hali chop etilmagan.',         ru: 'Этот тест ещё не опубликован.',      en: 'This test is not published.' },
    unknownGame:      { uz: 'Noma\u2019lum o\u2018yin.',            ru: 'Неизвестная игра.',                  en: 'Unknown game.' },
    unknownStatus:    { uz: 'Noma\u2019lum holat.',                 ru: 'Неизвестный статус.',                en: 'Unknown status.' },
    leadNotFound:     { uz: 'Murojaat topilmadi.',                  ru: 'Обращение не найдено.',              en: 'Lead not found.' },
    notYourGroup:     { uz: 'Faqat o\u2018z guruhlaringiz uchun.',  ru: 'Только для ваших групп.',            en: 'You can only do this for your own groups.' },
    badAvatarUrl:     { uz: 'Avatar to\u2018liq http(s) havola bo\u2018lishi kerak.', ru: 'Аватар должен быть полной http(s) ссылкой.', en: 'Avatar must be a full http(s) URL.' },
    alreadyOnCourse:  { uz: 'Siz allaqachon shu kursdasiz.',        ru: 'Вы уже на этом курсе.',              en: 'You are already on this course.' },
    alreadyJoined:    { uz: 'Siz allaqachon qo\u2018shilgansiz.',   ru: 'Вы уже записаны.',                   en: 'You already joined this.' },
    noPlacesLeft:     { uz: 'Joylar tugadi.',                      ru: 'Мест не осталось.',                  en: 'All places are taken.' },
    signIn:           { uz: 'Davom etish uchun tizimga kiring.',    ru: 'Войдите, чтобы продолжить.',         en: 'Sign in to continue.' },
    accountGone:      { uz: 'Bu hisob endi mavjud emas.',           ru: 'Этот аккаунт больше не существует.', en: 'This account no longer exists.' },
    sessionExpired:   { uz: 'Sessiya tugadi. Qayta kiring.',        ru: 'Сессия истекла. Войдите снова.',     en: 'Your session expired. Sign in again.' },
    wrongPassword:    { uz: 'Parol noto\u2018g\u2018ri.',           ru: 'Неверный пароль.',                   en: 'Incorrect password.' },
    wrongCurrentPassword:{ uz: 'Joriy parol noto\u2018g\u2018ri.',  ru: 'Текущий пароль неверен.',            en: 'Your current password is incorrect.' },
    missingCredentials:{ uz: 'Email va parolni kiriting.',          ru: 'Введите email и пароль.',            en: 'Enter your email and password.' },
  },

  /* ---------- admin ---------- */
  admin: {
    overview:          { uz: 'Umumiy ko\u2018rinish', ru: 'Обзор',        en: 'Overview' },
    totalStudents:     { uz: 'Jami o\u2018quvchilar', ru: 'Всего учеников', en: 'Total students' },
    activeStudents:    { uz: 'Faol o\u2018quvchilar', ru: 'Активные ученики', en: 'Active students' },
    totalTeachers:     { uz: "O'qituvchilar",     ru: 'Преподаватели',    en: 'Teachers' },
    activeGroups:      { uz: 'Faol guruhlar',     ru: 'Активные группы',  en: 'Active groups' },
    pendingRequests:   { uz: 'Yangi arizalar',    ru: 'Новые заявки',     en: 'Pending requests' },
    monthlyRevenue:    { uz: 'Oylik tushum',      ru: 'Доход за месяц',   en: 'Monthly revenue' },
    overdueStudents:   { uz: 'Qarzdorlar',        ru: 'Должники',         en: 'Overdue students' },
    newLeads:          { uz: 'Yangi murojaatlar', ru: 'Новые обращения',  en: 'New leads' },
    homeworkCompletion:{ uz: 'Vazifa bajarilishi', ru: 'Выполнение заданий', en: 'Homework completion' },
    averageRating:     { uz: "O'rtacha dars bahosi", ru: 'Средняя оценка урока', en: 'Average lesson rating' },
    liveNow:           { uz: 'Jonli darslar',     ru: 'Уроков в эфире',   en: 'Live now' },
    studentGrowth:     { uz: 'O\u2018quvchilar o\u2018sishi', ru: 'Рост числа учеников', en: 'Student growth' },
    revenueByMonth:    { uz: 'Oylik tushum',      ru: 'Доход по месяцам', en: 'Revenue by month' },
    coursePopularity:  { uz: 'Kurslar ommaboptligi', ru: 'Популярность курсов', en: 'Course popularity' },
    leadFunnel:        { uz: 'Murojaatlar voronkasi', ru: 'Воронка обращений', en: 'Lead conversion' },
    attendanceByGroup: { uz: 'Guruhlar bo\u2018yicha davomat', ru: 'Посещаемость по группам', en: 'Attendance by group' },
    ieltsBands:        { uz: 'IELTS ballari',     ru: 'Баллы IELTS',      en: 'IELTS bands' },
    // branches
    branchesTitle:     { uz: 'Filiallar',         ru: 'Филиалы',          en: 'Branches' },
    branchesHint:      { uz: 'Manzil, telefon va xarita havolalarini shu yerda boshqaring.', ru: 'Адреса, телефоны и ссылки на карты — здесь.', en: 'Addresses, phone numbers and map links are managed here.' },
    googleMapsLink:    { uz: 'Google Maps havolasi', ru: 'Ссылка Google Maps', en: 'Google Maps link' },
    yandexMapsLink:    { uz: 'Yandex Maps havolasi', ru: 'Ссылка Яндекс Карт', en: 'Yandex Maps link' },
    imageUrl:          { uz: 'Rasm URL',          ru: 'URL изображения',  en: 'Image URL' },
    videoUrl:          { uz: 'Video URL',         ru: 'URL видео',        en: 'Video URL' },
    order:             { uz: 'Tartib',            ru: 'Порядок',          en: 'Order' },
    // media
    mediaTitle:        { uz: 'Media postlar',     ru: 'Медиа-публикации', en: 'Media posts' },
    mediaHint:         { uz: 'Saytdagi "Maktab hayoti" bo\u2018limi shu postlardan yig\u2018iladi.', ru: 'Раздел «Жизнь школы» на сайте собирается из этих публикаций.', en: 'The "School life" section on the site is built from these posts.' },
    // leads
    leadsTitle:        { uz: 'Murojaatlar',       ru: 'Обращения',        en: 'Leads' },
    leadsHint:         { uz: 'Saytdagi bog\u2018lanish formasidan kelgan murojaatlar.', ru: 'Обращения с формы обратной связи на сайте.', en: 'Enquiries from the contact form on the public site.' },
    leadNotes:         { uz: 'Izohlar',           ru: 'Заметки',          en: 'Notes' },
    changeStatus:      { uz: 'Holatni o\u2018zgartirish', ru: 'Изменить статус', en: 'Change status' },
    // announcements
    announcementsTitle:{ uz: "E'lonlar",          ru: 'Объявления',       en: 'Announcements' },
    announcementsHint: { uz: 'E\u2019lon chop etilganda tanlangan foydalanuvchilarga bildirishnoma yuboriladi.', ru: 'При публикации объявления выбранные пользователи получают уведомление.', en: 'Publishing an announcement sends a notification to everyone it targets.' },
    audience:          { uz: 'Kimga',             ru: 'Кому',             en: 'Audience' },
    audienceAll:       { uz: 'Hammaga',           ru: 'Всем',             en: 'Everyone' },
    audienceStudents:  { uz: "O'quvchilarga",     ru: 'Ученикам',         en: 'Students' },
    audienceTeachers:  { uz: "O'qituvchilarga",   ru: 'Преподавателям',   en: 'Teachers' },
    audienceGroup:     { uz: 'Guruhga',           ru: 'Группе',           en: 'A group' },
    // tests
    quizzesTitle:      { uz: 'Testlar',           ru: 'Тесты',            en: 'Tests' },
    quizzesHint:       { uz: 'Savollar va to\u2018g\u2018ri javoblar shu yerda boshqariladi.', ru: 'Вопросы и правильные ответы управляются здесь.', en: 'Questions and correct answers are managed here.' },
    addQuestion:       { uz: 'Savol qo\u2018shish', ru: 'Добавить вопрос', en: 'Add question' },
    questionPrompt:    { uz: 'Savol matni',       ru: 'Текст вопроса',    en: 'Question' },
    answerOption:      { uz: 'Variant',           ru: 'Вариант',          en: 'Option' },
    markCorrect:       { uz: 'To\u2018g\u2018ri deb belgilash', ru: 'Отметить верным', en: 'Mark as correct' },
    explanation:       { uz: 'Izoh',              ru: 'Пояснение',        en: 'Explanation' },
    // landing editor
    livePreview:       { uz: 'Jonli ko\u2018rinish', ru: 'Предпросмотр',  en: 'Live preview' },
    unsaved:           { uz: 'Saqlanmagan o\u2018zgarishlar', ru: 'Несохранённые изменения', en: 'Unsaved changes' },
    publish:           { uz: 'Chop etish',        ru: 'Опубликовать',     en: 'Publish' },
    viewSite:          { uz: 'Saytni ochish',     ru: 'Открыть сайт',     en: 'View the site' },
    saveDraft:         { uz: 'Qoralama saqlash',  ru: 'Сохранить черновик', en: 'Save draft' },
    draftWaiting:      { uz: 'Bu bo\u2018limda chop etilmagan qoralama bor ({when}).', ru: 'В этом разделе есть неопубликованный черновик ({when}).', en: 'This section has an unpublished draft ({when}).' },
    loadDraft:         { uz: 'Qoralamani yuklash', ru: 'Загрузить черновик', en: 'Load draft' },
    discardDraft:      { uz: 'Qoralamani tashlash', ru: 'Удалить черновик', en: 'Discard draft' },
    draftSaved:        { uz: 'Qoralama saqlandi. Sayt hali o\u2018zgargani yo\u2018q.', ru: 'Черновик сохранён. Сайт пока не изменён.', en: 'Draft saved. The public site has not changed.' },
    published:         { uz: 'Chop etildi. Sayt yangilandi.', ru: 'Опубликовано. Сайт обновлён.', en: 'Published. The site is updated.' },
    moveUp:            { uz: 'Yuqoriga',         ru: 'Вверх',            en: 'Move up' },
    moveDown:          { uz: 'Pastga',           ru: 'Вниз',             en: 'Move down' },
    siteSettings:      { uz: 'Sayt sozlamalari',  ru: 'Настройки сайта',  en: 'Site settings' },
    socialLinks:       { uz: 'Ijtimoiy tarmoqlar', ru: 'Соцсети',        en: 'Social links' },
  },

  teacher: {
    hello:            { uz: 'Salom',             ru: 'Здравствуйте',     en: 'Hello' },
    todayLessons:     { uz: 'Bugungi darslar',   ru: 'Уроки сегодня',    en: "Today's lessons" },
    myGroups:         { uz: 'Mening guruhlarim', ru: 'Мои группы',       en: 'My groups' },
    myStudents:       { uz: 'Mening o\u2018quvchilarim', ru: 'Мои ученики', en: 'My students' },
    lessonsToday:     { uz: 'Bugungi darslar',   ru: 'Уроков сегодня',   en: 'Lessons today' },
    openHomework:     { uz: 'Ochiq vazifalar',   ru: 'Открытые задания', en: 'Open homework' },
    toGrade:          { uz: 'Baholanishi kerak', ru: 'Ждут проверки',    en: 'Waiting to be graded' },
    markAttendance:   { uz: 'Davomat belgilash', ru: 'Отметить посещаемость', en: 'Mark attendance' },
    setHomework:      { uz: 'Vazifa berish',     ru: 'Задать домашнее',  en: 'Set homework' },
    noTodayLessons:   { uz: 'Bugun dars yo\u2018q.', ru: 'Сегодня уроков нет.', en: 'No lessons today.' },
  },
};

/* ==========================================================================
   LOOKUP
   ========================================================================== */

/** Read a dot key such as "landing.branchesTitle" out of the dictionary. */
function lookup(key, language) {
  const [group, ...rest] = key.split('.');
  const leaf = rest.join('.');
  const entry = dictionary[group]?.[leaf];
  if (!entry) return null;
  return entry[language] ?? entry[DEFAULT_LANGUAGE] ?? null;
}

/**
 * translate('rec.homework', 'ru', { value: 2 })
 * Placeholders are written as {name} in the dictionary.
 */
/**
 * The active language, readable outside React.
 * The axios interceptor runs at module scope and cannot use the hook, so it
 * reads the same localStorage key the provider writes.
 */
/**
 * Read a CMS field in the active language.
 *
 * Content typed by an admin lives in db.json, not in this dictionary. The base
 * field (`title`) holds the default text and optional `title_ru` / `title_en`
 * hold the translations. Anything missing falls back to the base field, so a
 * half-translated page still renders and older databases keep working.
 *
 *   cmsText(page.hero, 'title', 'ru')  ->  hero.title_ru ?? hero.title
 */
export function cmsText(row, field, language = DEFAULT_LANGUAGE) {
  if (!row) return '';
  if (language === DEFAULT_LANGUAGE) return row[field] ?? '';
  const translated = row[`${field}_${language}`];
  return (translated === undefined || translated === null || translated === '') ? (row[field] ?? '') : translated;
}

/** The suffixed key an editor writes to for a given language. */
export const cmsField = (field, language) => (language === DEFAULT_LANGUAGE ? field : `${field}_${language}`);

export function currentLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return LANGUAGES.some((l) => l.code === stored) ? stored : DEFAULT_LANGUAGE;
}

export function translate(key, language = DEFAULT_LANGUAGE, vars) {
  const text = lookup(key, language);
  if (text == null) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
}

/* ==========================================================================
   CONTEXT AND HOOK
   ========================================================================== */

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === stored) ? stored : DEFAULT_LANGUAGE;
  });

  // Persist the choice and keep <html lang> honest for screen readers and SEO.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (LANGUAGES.some((l) => l.code === code)) setLanguageState(code);
  }, []);

  const t = useCallback((key, vars) => translate(key, language, vars), [language]);

  const value = useMemo(() => ({ language, setLanguage, t, languages: LANGUAGES }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside <LanguageProvider>.');
  return context;
}
