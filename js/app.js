/* مواقيت — تطبيق مواقيت الصلاة (PWA)
 * الحساب الفلكي بمكتبة adhan-js (MIT) ويتم كاملاً على الجهاز.
 */
(() => {
  'use strict';

  const A = window.adhan;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const KAABA = { lat: 21.422487, lng: 39.826206 };

  // ---------- أيقونات الصلوات ----------
  const ICONS = {
    fajr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 18h18M6 21h12"/><path d="M15.5 6.5a5 5 0 1 0 2.9 8.6 4 4 0 0 1-2.9-8.6z"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v3M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4"/></svg>',
    dhuhr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    asr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 3v1.5M3 10h1.5M5 5l1 1M15 5l-1 1"/><path d="M9 20h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-8.6 1.6A2.8 2.8 0 0 0 9 20z" fill="var(--surface-2)"/></svg>',
    maghrib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 16h18M7 16a5 5 0 0 1 10 0M12 20v-1.5M12 4v5M9.5 6.5L12 9l2.5-2.5"/></svg>',
    isha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4.5a7.5 7.5 0 1 0 5.5 12.6A6 6 0 0 1 14 4.5z"/><path d="M19 4l.6 1.4L21 6l-1.4.6L19 8l-.6-1.4L17 6l1.4-.6z" fill="currentColor"/></svg>',
  };

  const PRAYERS = [
    { key: 'fajr', name: 'الفجر' },
    { key: 'sunrise', name: 'الشروق', minor: true },
    { key: 'dhuhr', name: 'الظهر' },
    { key: 'asr', name: 'العصر' },
    { key: 'maghrib', name: 'المغرب' },
    { key: 'isha', name: 'العشاء' },
  ];

  const METHODS = [
    ['UmmAlQura', 'أم القرى — السعودية'],
    ['MuslimWorldLeague', 'رابطة العالم الإسلامي'],
    ['Egyptian', 'الهيئة المصرية العامة للمساحة'],
    ['Kuwait', 'الكويت'],
    ['Qatar', 'قطر'],
    ['Dubai', 'الإمارات'],
    ['Karachi', 'جامعة العلوم الإسلامية بكراتشي'],
    ['Turkey', 'تركيا'],
    ['Singapore', 'سنغافورة وماليزيا'],
    ['NorthAmerica', 'أمريكا الشمالية'],
    ['MoonsightingCommittee', 'لجنة رؤية الهلال'],
  ];

  // ---------- الإعدادات ----------
  const KEY = 'mawaqeet:settings';
  const DEFAULTS = {
    mode: 'gps', cityId: 'riyadh', gps: null,
    method: 'UmmAlQura', madhab: 'Shafi',
    hour12: true, digits: 'arab',
    adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    notify: false, sound: true, installDismissed: false,
  };
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { ...DEFAULTS, ...s, adjust: { ...DEFAULTS.adjust, ...(s.adjust || {}) } };
    } catch (_) {
      return { ...DEFAULTS, adjust: { ...DEFAULTS.adjust } };
    }
  }
  let S = loadSettings();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };

  const ALL_CITIES = [...window.CITIES.saudi, ...window.CITIES.other]
    .map(([id, name, lat, lng, tz]) => ({ id, name, lat, lng, tz }));
  const cityById = (id) => ALL_CITIES.find((c) => c.id === id) || ALL_CITIES[0];
  const deviceTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh'; } catch (_) { return 'Asia/Riyadh'; } })();

  // ---------- أدوات جغرافية ----------
  const rad = (d) => (d * Math.PI) / 180;
  function distanceKm(a, b) {
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  function nearestCity(p) {
    let best = ALL_CITIES[0], bd = Infinity;
    for (const c of ALL_CITIES) { const d = distanceKm(p, c); if (d < bd) { bd = d; best = c; } }
    return { city: best, km: bd };
  }
  function currentLocation() {
    if (S.mode === 'gps' && S.gps) {
      const n = nearestCity(S.gps);
      const name = n.km <= 35 ? n.city.name : n.km <= 150 ? `قرب ${n.city.name}` : 'موقعي الحالي';
      return { lat: S.gps.lat, lng: S.gps.lng, tz: deviceTz, name, gps: true };
    }
    const c = cityById(S.cityId);
    return { lat: c.lat, lng: c.lng, tz: c.tz, name: c.name, gps: false };
  }

  // ---------- التواريخ ----------
  function ymdInTz(date, tz) {
    const o = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(date).forEach((p) => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day };
  }
  function addDays(d, n) {
    const t = new Date(Date.UTC(d.y, d.m - 1, d.d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  const ymdKey = (d) => `${d.y}-${d.m}-${d.d}`;
  const utcNoon = (d) => new Date(Date.UTC(d.y, d.m - 1, d.d, 12));
  const isFriday = (d) => utcNoon(d).getUTCDay() === 5;

  function hijriMonth(d) {
    try {
      const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: 'UTC' })
        .formatToParts(utcNoon(d)).find((x) => x.type === 'month');
      return p ? parseInt(p.value, 10) : 0;
    } catch (_) { return 0; }
  }

  // ---------- التنسيق ----------
  const NU = () => (S.digits === 'latn' ? 'latn' : 'arab');
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const num = (v) => (NU() === 'arab' ? String(v).replace(/\d/g, (x) => AR_DIGITS[x]) : String(v));
  const fmtNum = (n) => new Intl.NumberFormat(`ar-SA-u-nu-${NU()}`).format(n);
  const pad = (n) => String(n).padStart(2, '0');

  function fmtTime(date, tz) {
    const opts = S.hour12
      ? { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }
      : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz };
    let main = '', dp = '';
    for (const p of new Intl.DateTimeFormat(`ar-SA-u-nu-${NU()}`, opts).formatToParts(date)) {
      if (p.type === 'dayPeriod') dp = p.value; else main += p.value;
    }
    return { main: main.replace(/[‎‏؜]/g, '').trim(), dp: dp.trim() };
  }
  const timeHTML = (date, tz) => {
    const t = fmtTime(date, tz);
    return t.dp ? `${t.main}<small>${t.dp}</small>` : t.main;
  };
  const weekday = (d) => new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { weekday: 'long', timeZone: 'UTC' }).format(utcNoon(d));
  const hijriLong = (d) => new Intl.DateTimeFormat(`ar-SA-u-ca-islamic-umalqura-nu-${NU()}`, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utcNoon(d));
  const gregLong = (d) => new Intl.DateTimeFormat(`ar-SA-u-ca-gregory-nu-${NU()}`, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utcNoon(d));
  function hijriDM(d) {
    const o = {};
    new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', timeZone: 'UTC' })
      .formatToParts(utcNoon(d)).forEach((p) => { o[p.type] = p.value; });
    return num(`${parseInt(o.day, 10)}/${parseInt(o.month, 10)}`);
  }

  // ---------- حساب المواقيت ----------
  function calcParams(d) {
    const make = A.CalculationMethod[S.method] || A.CalculationMethod.UmmAlQura;
    const p = make();
    p.madhab = S.madhab === 'Hanafi' ? A.Madhab.Hanafi : A.Madhab.Shafi;
    // تقويم أم القرى: العشاء بعد المغرب بساعتين في رمضان
    if (S.method === 'UmmAlQura' && hijriMonth(d) === 9) p.ishaInterval = 120;
    p.adjustments = { ...S.adjust };
    return p;
  }
  function timesFor(d, loc) {
    const pt = new A.PrayerTimes(new A.Coordinates(loc.lat, loc.lng), new Date(d.y, d.m - 1, d.d), calcParams(d));
    return PRAYERS.map((p) => ({ ...p, time: pt[p.key], date: d }));
  }
  const displayName = (item) => (item.key === 'dhuhr' && isFriday(item.date) ? 'الجمعة' : item.name);

  // خط زمني: عشاء الأمس ← صلوات اليوم ← فجر الغد
  let TL = null;
  function buildTimeline() {
    const loc = currentLocation();
    const today = ymdInTz(new Date(), loc.tz);
    const only = (arr) => arr.filter((x) => !x.minor);
    const items = [
      only(timesFor(addDays(today, -1), loc)).pop(),
      ...only(timesFor(today, loc)),
      only(timesFor(addDays(today, 1), loc))[0],
    ];
    TL = { loc, today, todayKey: ymdKey(today), items };
  }
  function currentIndex(now) {
    const it = TL.items;
    for (let i = 0; i < it.length - 1; i++) if (now >= it[i].time && now < it[i + 1].time) return i;
    return -1;
  }

  // ---------- العرض: المواقيت ----------
  let viewDay = null; // null = اليوم
  let lastCurTime = null;

  function renderTimes() {
    const { loc, today } = TL;
    const day = viewDay || today;
    const isToday = ymdKey(day) === TL.todayKey;
    const times = timesFor(day, loc);

    $('#locName').textContent = S.mode === 'gps' && !S.gps ? `${loc.name} (افتراضي)` : loc.name;
    $('#hijri').textContent = `${weekday(day)} ${hijriLong(day)}`;
    $('#greg').textContent = `${gregLong(day)}م`;
    $('#todayBtn').hidden = isToday;

    const now = new Date();
    const ci = currentIndex(now);
    const cur = ci >= 0 ? TL.items[ci] : null;
    const nxt = ci >= 0 ? TL.items[ci + 1] : null;
    const same = (a, b) => a && b && a.time.getTime() === b.time.getTime();

    $('#list').innerHTML = times.map((t) => {
      const isCur = isToday && same(t, cur);
      const isNext = isToday && same(t, nxt);
      const cls = [t.minor ? 'minor' : '', isCur ? 'current' : '', isNext ? 'next' : ''].join(' ').trim();
      const tag = isCur ? '<span class="tag now">الآن</span>' : isNext ? '<span class="tag soon">التالية</span>' : '';
      return `<li class="${cls}"><span class="ico">${ICONS[t.key]}</span>` +
        `<span class="name">${displayName(t)}${tag}</span>` +
        `<span class="time">${timeHTML(t.time, loc.tz)}</span></li>`;
    }).join('');

    const m = METHODS.find((x) => x[0] === S.method);
    let note = `${m ? m[1] : ''} · العصر: ${S.madhab === 'Hanafi' ? 'الحنفي' : 'الجمهور'}`;
    if (S.method === 'UmmAlQura' && hijriMonth(day) === 9) note += ' · رمضان: العشاء بعد المغرب بساعتين';
    if (Object.values(S.adjust).some((v) => v)) note += ' · مع تعديل يدوي';
    $('#methodNote').textContent = note;

    tick(true);
  }

  function tick(force) {
    if (!TL) return;
    const now = new Date();
    if (ymdKey(ymdInTz(now, TL.loc.tz)) !== TL.todayKey) { refresh(); return; }
    const i = currentIndex(now);
    if (i < 0) { if (!force) refresh(); return; }
    const cur = TL.items[i], nxt = TL.items[i + 1];

    // دخول وقت صلاة جديدة
    const ct = cur.time.getTime();
    if (lastCurTime !== null && ct !== lastCurTime && now - cur.time < 120000) {
      alertPrayer(cur);
      lastCurTime = ct;
      renderTimes();
      return;
    }
    lastCurTime = ct;

    const diff = Math.max(0, Math.floor((nxt.time - now) / 1000));
    const h = Math.floor(diff / 3600), mi = Math.floor((diff % 3600) / 60), s = diff % 60;
    $('#countdown').textContent = num(`${pad(h)}:${pad(mi)}:${pad(s)}`);
    const nameEl = $('#nextName');
    const nextChanged = nameEl.dataset.t !== String(nxt.time.getTime());
    if (force || nextChanged) {
      nameEl.textContent = displayName(nxt);
      nameEl.dataset.t = String(nxt.time.getTime());
      $('#nextTime').innerHTML = timeHTML(nxt.time, TL.loc.tz);
    }
    if (force || nextChanged || now.getSeconds() === 0) {
      const since = Math.floor((now - cur.time) / 60000);
      $('#heroSub').textContent = since < 60 * 6
        ? `دخل وقت ${displayName(cur)} ${since < 1 ? 'الآن' : `منذ ${relMinutes(since)}`}`
        : '';
    }
    const pct = Math.min(100, Math.max(0, ((now - cur.time) / (nxt.time - cur.time)) * 100));
    $('#barFill').style.width = `${pct.toFixed(2)}%`;
  }
  function relMinutes(m) {
    if (m < 60) return m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m <= 10 ? `${num(m)} دقائق` : `${num(m)} دقيقة`;
    const h = Math.floor(m / 60), r = m % 60;
    const hs = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${num(h)} ساعات`;
    return r ? `${hs} و${relMinutes(r)}` : hs;
  }

  // ---------- العرض: الشهر ----------
  function renderMonth() {
    const { loc, today } = TL;
    $('#monthLoc').textContent = loc.name;
    let html = '<thead><tr><th>اليوم</th>' + PRAYERS.map((p) => `<th>${p.name}</th>`).join('') + '</tr></thead><tbody>';
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, i);
      const t = timesFor(d, loc);
      const cls = [i === 0 ? 'today' : '', isFriday(d) ? 'fri' : ''].join(' ').trim();
      html += `<tr class="${cls}"><td><b>${weekday(d)}</b><small>${hijriDM(d)}هـ · ${num(`${d.d}/${d.m}`)}</small></td>` +
        t.map((x) => `<td>${fmtTime(x.time, loc.tz).main}</td>`).join('') + '</tr>';
    }
    $('#monthTable').innerHTML = html + '</tbody>';
  }

  // ---------- العرض: القبلة ----------
  let qiblaAngle = 0;
  function buildDial() {
    let ticks = '';
    for (let a = 0; a < 360; a += 10) {
      const major = a % 90 === 0;
      const r1 = major ? 128 : 136;
      const x1 = Math.sin(rad(a)) * r1, y1 = -Math.cos(rad(a)) * r1;
      const x2 = Math.sin(rad(a)) * 146, y2 = -Math.cos(rad(a)) * 146;
      ticks += `<line class="tick${major ? ' major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    $('#ticks').innerHTML = ticks;
  }
  function renderQibla() {
    const loc = TL.loc;
    qiblaAngle = A.Qibla(new A.Coordinates(loc.lat, loc.lng));
    $('#qiblaLoc').textContent = loc.name;
    $('#qiblaMarker').setAttribute('transform', `rotate(${qiblaAngle.toFixed(2)})`);
    $('#qiblaDeg').textContent = `${num(Math.round(qiblaAngle))}° من الشمال`;
    $('#qiblaDist').textContent = `المسافة إلى الكعبة: ${fmtNum(Math.round(distanceKm(loc, KAABA)))} كم`;
  }

  let compassOn = false, heading = null, buzzed = false;
  const orientEvent = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  async function startCompass() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') { $('#compassStatus').textContent = 'لم يُسمح باستخدام البوصلة.'; return; }
      }
    } catch (_) { $('#compassStatus').textContent = 'تعذّر تشغيل البوصلة.'; return; }
    if (!('DeviceOrientationEvent' in window)) { $('#compassStatus').textContent = 'البوصلة غير مدعومة في هذا المتصفح.'; return; }
    window.addEventListener(orientEvent, onOrient, true);
    compassOn = true; heading = null;
    $('#compassBtn').hidden = true;
    $('#compassStatus').textContent = 'جاري قراءة البوصلة…';
    setTimeout(() => {
      if (compassOn && heading === null) {
        $('#compassStatus').textContent = 'البوصلة غير متاحة في هذا الجهاز أو المتصفح. استخدم الزاوية المكتوبة أعلاه.';
        stopCompass(); $('#compassBtn').hidden = false;
      }
    }, 3500);
  }
  function stopCompass() {
    window.removeEventListener(orientEvent, onOrient, true);
    compassOn = false;
  }
  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
    if (h == null) return;
    const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    h = (h + so + 360) % 360;
    if (heading == null) heading = h;
    else { const d = ((h - heading + 540) % 360) - 180; heading = (heading + d * 0.25 + 360) % 360; }
    $('#dial').style.transform = `rotate(${(-heading).toFixed(1)}deg)`;
    const delta = ((qiblaAngle - heading + 540) % 360) - 180; // موجب = لليمين
    const ok = Math.abs(delta) < 4;
    $('#compass').classList.toggle('aligned', ok);
    if (ok && !buzzed) { if (navigator.vibrate) navigator.vibrate(60); buzzed = true; }
    if (Math.abs(delta) > 10) buzzed = false;
    $('#compassStatus').textContent = ok
      ? 'أنت الآن باتجاه القبلة ✓'
      : `استدر ${delta > 0 ? 'يمينًا' : 'يسارًا'} ${num(Math.round(Math.abs(delta)))}°`;
  }

  // ---------- التنبيه ----------
  let actx = null;
  function audio() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!actx) actx = new C();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  document.addEventListener('pointerdown', () => { if (S.sound) audio(); }, { once: true, passive: true });
  function chime() {
    const c = audio(); if (!c) return;
    [659.25, 783.99, 987.77, 783.99].forEach((f, i) => {
      const t = c.currentTime + i * 0.42;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 1.9);
    });
  }
  async function showNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'mawaqeet', renotify: true, vibrate: [200, 100, 200], lang: 'ar', dir: 'rtl' };
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) { await reg.showNotification(title, opts); return true; }
      new Notification(title, opts); return true;
    } catch (_) { return false; }
  }
  function alertPrayer(item) {
    if (!S.notify) return;
    const name = displayName(item);
    if (S.sound) chime();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    showNotification(`حان وقت صلاة ${name}`, `${TL.loc.name} — ${fmtTime(item.time, TL.loc.tz).main} ${fmtTime(item.time, TL.loc.tz).dp}`.trim());
    toast(`حان وقت صلاة ${name}`);
  }

  // ---------- الإعدادات ----------
  function setSeg(el, value) { $$('button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === String(value))); }
  function renderSettings() {
    setSeg($('#modeSeg'), S.mode);
    $('#gpsBox').hidden = S.mode !== 'gps';
    $('#cityBox').hidden = S.mode !== 'city';
    $('#gpsInfo').textContent = S.gps
      ? `آخر تحديد: ${num(S.gps.lat.toFixed(3))}، ${num(S.gps.lng.toFixed(3))} — ${currentLocation().name}`
      : 'لم يُحدَّد موقعك بعد.';
    $('#citySel').value = S.cityId;
    $('#methodSel').value = S.method;
    $('#madhabSel').value = S.madhab;
    setSeg($('#h12Seg'), S.hour12 ? '12' : '24');
    setSeg($('#digitsSeg'), S.digits);
    $('#notifyChk').checked = S.notify;
    $('#soundChk').checked = S.sound;
    $('#adjustList').innerHTML = PRAYERS.map((p) => {
      const v = S.adjust[p.key] || 0;
      return `<div class="adj"><span>${p.name}</span><div class="stepper">` +
        `<button data-k="${p.key}" data-d="1" aria-label="زيادة دقيقة">+</button>` +
        `<output class="${v ? 'changed' : ''}">${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}</output>` +
        `<button data-k="${p.key}" data-d="-1" aria-label="نقص دقيقة">−</button></div></div>`;
    }).join('');
  }
  function fillSelects() {
    const opt = (c) => `<option value="${c.id}">${c.name}</option>`;
    const sa = window.CITIES.saudi.map(([id]) => cityById(id)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const ot = window.CITIES.other.map(([id]) => cityById(id));
    $('#citySel').innerHTML = `<optgroup label="السعودية">${sa.map(opt).join('')}</optgroup><optgroup label="دول أخرى">${ot.map(opt).join('')}</optgroup>`;
    $('#methodSel').innerHTML = METHODS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  }
  function changed() { save(); refresh(); renderSettings(); }

  function bindSettings() {
    $('#modeSeg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      S.mode = b.dataset.v; changed();
      if (S.mode === 'gps') locate(true);
    });
    $('#refreshLoc').addEventListener('click', () => locate(true));
    $('#citySel').addEventListener('change', (e) => { S.cityId = e.target.value; changed(); });
    $('#methodSel').addEventListener('change', (e) => { S.method = e.target.value; changed(); });
    $('#madhabSel').addEventListener('change', (e) => { S.madhab = e.target.value; changed(); });
    $('#h12Seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.hour12 = b.dataset.v === '12'; changed(); });
    $('#digitsSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.digits = b.dataset.v; changed(); });
    $('#adjustList').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      const k = b.dataset.k;
      S.adjust[k] = Math.max(-30, Math.min(30, (S.adjust[k] || 0) + Number(b.dataset.d)));
      changed();
    });
    $('#resetAdjust').addEventListener('click', () => { S.adjust = { ...DEFAULTS.adjust }; changed(); toast('تم تصفير التعديلات'); });
    $('#notifyChk').addEventListener('change', async (e) => {
      if (e.target.checked && 'Notification' in window && Notification.permission !== 'granted') {
        const r = await Notification.requestPermission().catch(() => 'denied');
        if (r !== 'granted') toast('لن تظهر الإشعارات، لكن التنبيه الصوتي سيعمل والتطبيق مفتوح');
      }
      S.notify = e.target.checked; save();
      if (S.notify && S.sound) audio();
    });
    $('#soundChk').addEventListener('change', (e) => { S.sound = e.target.checked; save(); if (S.sound) audio(); });
    $('#testAlert').addEventListener('click', async () => {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission().catch(() => {});
      if (S.sound) chime();
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      const shown = await showNotification('تجربة التنبيه', 'هكذا سيظهر تنبيه دخول وقت الصلاة');
      toast(shown ? 'تم إرسال تنبيه تجريبي' : 'هذا هو صوت التنبيه');
    });
  }

  // ---------- تحديد الموقع ----------
  function locate(manual) {
    if (!('geolocation' in navigator)) { if (manual) toast('الجهاز لا يدعم تحديد الموقع، اختر مدينتك'); return; }
    if (manual) toast('جاري تحديد موقعك…');
    navigator.geolocation.getCurrentPosition((pos) => {
      S.gps = { lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4), ts: Date.now() };
      save(); refresh(); renderSettings();
      if (manual) toast(`تم تحديد موقعك: ${currentLocation().name}`);
    }, (err) => {
      if (err.code === 1 && !S.gps) {
        S.mode = 'city'; save(); refresh(); renderSettings();
        toast('لم يُسمح بتحديد الموقع — اختر مدينتك من الإعدادات');
      } else if (manual || !S.gps) {
        toast('تعذّر تحديد الموقع الآن، حاول مرة أخرى أو اختر مدينة');
      }
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 20 * 60 * 1000 });
  }

  // ---------- التنقل ----------
  let currentView = 'times';
  function showView(name) {
    currentView = name;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    if (name === 'month') renderMonth();
    if (name === 'qibla') renderQibla();
    if (name === 'settings') renderSettings();
    if (name !== 'qibla' && compassOn) { stopCompass(); $('#compassBtn').hidden = false; }
    window.scrollTo({ top: 0 });
  }

  // ---------- التثبيت ----------
  let deferredPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function updateInstallUI() {
    if (isStandalone()) { $('#installCard').hidden = true; $('#installBanner').hidden = true; return; }
    let text;
    if (deferredPrompt) text = 'ثبّت «مواقيت» على الشاشة الرئيسية ليعمل كتطبيق مستقل وبدون إنترنت.';
    else if (isIOS) text = 'للتثبيت على الآيفون: افتح الصفحة في Safari، اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».';
    else text = 'للتثبيت: افتح قائمة المتصفح (⋮) ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».';
    $('#installCard').hidden = false;
    $('#installText').textContent = text;
    $('#installBtn').hidden = !deferredPrompt;
    $('#installBannerBtn').hidden = !deferredPrompt;
    $('#installBannerText').textContent = deferredPrompt ? 'ثبّت «مواقيت» على جوالك' : (isIOS ? 'للتثبيت: زر المشاركة ← «إضافة إلى الشاشة الرئيسية»' : 'ثبّت التطبيق من قائمة المتصفح ⋮');
    $('#installBanner').hidden = S.installDismissed;
  }
  async function doInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (_) {}
    deferredPrompt = null; updateInstallUI();
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; updateInstallUI(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; updateInstallUI(); toast('تم تثبيت التطبيق'); });

  // ---------- رسالة سريعة ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  // ---------- التحديث العام ----------
  function refresh() {
    buildTimeline();
    renderTimes();
    if (currentView === 'month') renderMonth();
    if (currentView === 'qibla') renderQibla();
  }

  function init() {
    fillSelects();
    buildDial();
    bindSettings();

    $$('.tabs button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
    $('#locBtn').addEventListener('click', () => showView('settings'));
    $('#prevDay').addEventListener('click', () => { viewDay = addDays(viewDay || TL.today, -1); renderTimes(); });
    $('#nextDay').addEventListener('click', () => { viewDay = addDays(viewDay || TL.today, 1); renderTimes(); });
    $('#todayBtn').addEventListener('click', () => { viewDay = null; renderTimes(); });
    $('#compassBtn').addEventListener('click', startCompass);
    $('#installBtn').addEventListener('click', doInstall);
    $('#installBannerBtn').addEventListener('click', doInstall);
    $('#installBannerClose').addEventListener('click', () => { S.installDismissed = true; save(); updateInstallUI(); });

    refresh();
    updateInstallUI();
    if (S.mode === 'gps') locate(false);

    setInterval(() => tick(false), 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    }
  }

  init();
})();
