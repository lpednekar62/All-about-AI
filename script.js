/* ==========================================================================
   Wellness Blind Spot Score — Welocity Life Science
   Vanilla JS, no framework, no build step, no third-party scripts.

   Answers live in sessionStorage and die with the tab (an exhibition tablet
   is shared, so nothing may survive for the next person who picks it up).
   Completed results are additionally posted once to a Google Sheet via an
   Apps Script Web App — see apps-script/Code.gs and README.md.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ CONFIG
   Everything you need to change before the exhibition is in this one block.

   WhatsApp numbers: country code + number, DIGITS ONLY.
   No "+", no spaces, no brackets, no leading zero. India = 91.
   Example: 919876543210

   A contact whose number is left blank is simply not rendered — the page
   never publishes a dead wa.me link.
   ------------------------------------------------------------------------ */
const CONFIG = {
  EVENT_LABEL: 'Welocity Life Science  ·  DNAWellCode',

  CONTACTS: [
    { key: 'mumtaz', label: 'Talk to Mumtaz', number: '' },
    { key: 'laxman', label: 'Talk to Laxman', number: '919326082818' }
  ],

  /* Google Apps Script Web App URL — see README.md §2.
     Leave blank to disable saving entirely; the assessment still works. */
  SHEET_ENDPOINT: '',

  VENUE: 'Welocity',

  /* How long an interrupted run stays resumable in the same tab.
     Kept short on purpose: a shared booth tablet must not hand one
     visitor's answers to the next. */
  RESUME_WINDOW_MS: 20 * 60 * 1000,

  STORAGE_KEY: 'bss.welocity.v1'
};

/* --------------------------------------------------------------- ANALYTICS
   Placeholder only. To connect GA4 / Meta Pixel later, define
   window.__track = (name, props) => { ... } before this file loads.
   ------------------------------------------------------------------------ */
function track(name, props) {
  try { if (typeof window.__track === 'function') window.__track(name, props || {}); }
  catch (_) { /* analytics must never break the assessment */ }
}

/* --------------------------------------------------------------- CATEGORIES */
const CATS = {
  nutrition: { name: 'Nutrition clarity',           note: 'How well you understand what your body specifically does with food.' },
  fitness:   { name: 'Fitness & recovery',          note: 'Whether your training and recovery are designed for you or borrowed.' },
  sleep:     { name: 'Sleep & energy',              note: 'How well you understand your own energy, sleep and stimulant response.' },
  stress:    { name: 'Stress response',             note: 'Whether you know how pressure actually shows up in your body.' },
  prevent:   { name: 'Preventive & family awareness',note: 'Whether family health patterns have become knowledge you act on.' },
  genetics:  { name: 'Personalisation & genetics',  note: 'How much of your routine rests on measured information about you.' }
};

/* ---------------------------------------------------------------- QUESTIONS
   p = blind-spot points, 0 (fully personalised) .. 4 (entirely unexamined).
   na:true removes the question from BOTH sides of the score. It is never a
   penalty — not taking supplements is a valid choice, not a blind spot.
   ------------------------------------------------------------------------ */
const QUESTIONS = [
  { id:'q1', cat:'nutrition', text:'How was your current eating plan put together?', opts:[
    { t:'Designed for me using professional input and my own data', p:0 },
    { t:'Adjusted over time from my own observation and experience', p:1 },
    { t:'Based mostly on general advice I have read or been told', p:2 },
    { t:'I do not follow a particular plan', p:3 },
    { t:'Copied from a friend, trainer, influencer or online plan', p:4 }
  ]},
  { id:'q2', cat:'nutrition', text:'How clearly do you understand why certain foods affect your energy, hunger or weight differently?', opts:[
    { t:'Very clearly, and I understand why', p:0 },
    { t:'Fairly clearly', p:1 },
    { t:'I have noticed patterns but cannot explain them', p:2 },
    { t:'I mostly guess', p:3 },
    { t:'I have never really thought about it', p:4 }
  ]},
  { id:'q3', cat:'nutrition', text:'How were your current supplements chosen?', opts:[
    { t:'From test results plus professional guidance', p:0 },
    { t:'On a qualified professional’s advice', p:1 },
    { t:'From general recommendations', p:2 },
    { t:'Suggested by friends, trainers or social media', p:3 },
    { t:'I am not sure whether I actually need them', p:4 },
    { t:'I do not take any supplements', na:true }
  ]},
  { id:'q4', cat:'fitness', text:'How personalised is your current training programme?', opts:[
    { t:'Built for me and reviewed regularly', p:0 },
    { t:'Partly personalised', p:1 },
    { t:'A standard gym programme', p:2 },
    { t:'Copied from someone else or found online', p:3 },
    { t:'I am not sure what actually suits me', p:4 }
  ]},
  { id:'q5', cat:'fitness', text:'When your progress slows down, do you usually know why?', opts:[
    { t:'Usually, and I know what to change', p:0 },
    { t:'Often', p:1 },
    { t:'Sometimes', p:2 },
    { t:'Rarely', p:3 },
    { t:'I switch to a different plan and try again', p:4 }
  ]},
  { id:'q6', cat:'fitness', text:'How well do you understand how much recovery your body needs?', opts:[
    { t:'Very well', p:0 },
    { t:'Fairly well', p:1 },
    { t:'Only through trial and error', p:2 },
    { t:'Not really', p:3 },
    { t:'I do not factor recovery in', p:4 }
  ]},
  { id:'q7', cat:'sleep', text:'How predictable is your energy across the day?', opts:[
    { t:'Mostly stable and predictable', p:0 },
    { t:'Usually stable, occasionally off', p:1 },
    { t:'It swings with food, sleep or stress', p:2 },
    { t:'I get regular energy crashes', p:3 },
    { t:'I have never paid attention to it', p:4 }
  ]},
  { id:'q8', cat:'sleep', text:'How well do you know what caffeine actually does to your sleep and energy?', opts:[
    { t:'Very well — I have tested it deliberately', p:0 },
    { t:'Fairly well', p:1 },
    { t:'I notice an effect but I am not sure', p:2 },
    { t:'I drink it without tracking the effect', p:3 },
    { t:'I have never considered it', p:4 },
    { t:'I do not consume caffeine', na:true }
  ]},
  { id:'q9', cat:'sleep', text:'How confidently do you understand your own sleep pattern?', opts:[
    { t:'Very confidently', p:0 },
    { t:'I understand parts of it', p:1 },
    { t:'I know something is inconsistent, but not what', p:2 },
    { t:'I mostly guess', p:3 },
    { t:'I have never looked at it', p:4 }
  ]},
  { id:'q10', cat:'stress', text:'When pressure rises, do you know how it affects your appetite, sleep, recovery and motivation?', opts:[
    { t:'Yes — I know my own pattern', p:0 },
    { t:'Mostly', p:1 },
    { t:'I notice changes but cannot explain them', p:2 },
    { t:'I usually only realise afterwards', p:3 },
    { t:'I have never connected the two', p:4 }
  ]},
  { id:'q11', cat:'stress', text:'How well do you know which recovery methods genuinely work for you?', opts:[
    { t:'Very well — I have tested what works', p:0 },
    { t:'Fairly well', p:1 },
    { t:'I have a rough idea', p:2 },
    { t:'I try whatever is popular and hope', p:3 },
    { t:'I have not looked into it', p:4 }
  ]},
  { id:'q12', cat:'prevent', text:'How well do you understand your family’s health patterns?', opts:[
    { t:'Very well, with professional guidance', p:0 },
    { t:'I know the history but have had no guidance on it', p:1 },
    { t:'I know a few details', p:2 },
    { t:'I rarely discuss it', p:3 },
    { t:'I am not really aware of it', p:4 }
  ]},
  { id:'q13', cat:'prevent', text:'Have you turned what you know about your family’s health into any specific preventive action?', opts:[
    { t:'Yes — a clear plan made with professional input', p:0 },
    { t:'Yes — a few deliberate changes', p:1 },
    { t:'I have thought about it but not acted', p:2 },
    { t:'Not yet', p:3 },
    { t:'I have never considered it', p:4 }
  ]},
  { id:'q14', cat:'genetics', text:'Have you ever had personalised insight that combines your biology with your lifestyle?', opts:[
    { t:'Yes, and it was properly explained to me', p:0 },
    { t:'Yes, but I did not fully understand the report', p:1 },
    { t:'I have read about it but never done it', p:2 },
    { t:'No', p:3 },
    { t:'I do not know how that works', p:4 }
  ]},
  { id:'q15', cat:'genetics', text:'How much of your current routine is based on measured information about you specifically?', opts:[
    { t:'Most of it', p:0 },
    { t:'Some of it', p:1 },
    { t:'Very little', p:2 },
    { t:'Almost none — it is mostly trial and error', p:3 },
    { t:'I have never evaluated this', p:4 }
  ]}
];

/* -------------------------------------------------------------- SCORE BANDS
   Deliberately supportive. No "unhealthy", "high risk" or "poor health".
   ------------------------------------------------------------------------ */
const BANDS = [
  { max:24,  name:'Strong personal awareness',
    blurb:'You already understand several areas of your wellness well. Your opportunity is the handful of areas where more personalised information could still help.' },
  { max:49,  name:'A few important gaps',
    blurb:'You have built genuinely useful awareness, though parts of your nutrition, recovery, sleep or lifestyle still rest on trial and error.' },
  { max:69,  name:'Several unanswered questions',
    blurb:'You are clearly putting effort in, but a number of your decisions are still based on general advice rather than information about you.' },
  { max:84,  name:'High personalisation blind spot',
    blurb:'You may be working hard on your health without much personalised clarity about how your body responds. That does not mean anything is wrong — it means there are useful questions worth exploring.' },
  { max:100, name:'Mostly guesswork',
    blurb:'Much of your current approach depends on generic advice, assumptions or repeated trial and error. A guided conversation would help you work out where to start.' }
];

const AGES  = ['Below 18','18–29','30–39','40–49','50–59','60+'];
const GOALS = ['Weight management','Fitness performance','More energy','Better sleep',
               'Stress management','Healthy ageing','Family wellness','General preventive wellness'];

/* ------------------------------------------------------------------- STATE */
const state = { id:'', name:'', phone:'', age:'', goal:'', answers:{}, idx:0, result:null, sent:false };

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

/* Every value that came from a human is written with textContent or
   encodeURIComponent, never innerHTML. */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function newId() {
  try {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/* ------------------------------------------------------------------ STORAGE */
function save() {
  try {
    sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
      id:state.id, name:state.name, phone:state.phone, age:state.age,
      goal:state.goal, answers:state.answers, idx:state.idx, sent:state.sent,
      ts:Date.now()
    }));
  } catch (_) { /* private mode — the assessment still works, just not resumable */ }
}
/* Resume an interrupted run — but only the SAME person's run.
   An exhibition tablet is handed from visitor to visitor, so a finished or
   stale session must never greet the next person with someone else's
   half-answered quiz. Both cases start clean instead. */
function restore() {
  try {
    const raw = sessionStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return false;
    if (d.sent === true) { wipe(); return false; }          // previous visitor finished
    const ts = parseInt(d.ts, 10);
    if (!ts || Date.now() - ts > CONFIG.RESUME_WINDOW_MS) { wipe(); return false; }
    state.id      = typeof d.id === 'string' ? d.id.slice(0, 60) : newId();
    state.name    = typeof d.name === 'string' ? d.name.slice(0, 40) : '';
    state.phone   = typeof d.phone === 'string' ? d.phone.slice(0, 18) : '';
    state.age     = AGES.indexOf(d.age) > -1 ? d.age : '';
    state.goal    = GOALS.indexOf(d.goal) > -1 ? d.goal : '';
    state.answers = (d.answers && typeof d.answers === 'object') ? d.answers : {};
    state.idx     = Math.min(Math.max(parseInt(d.idx, 10) || 0, 0), QUESTIONS.length - 1);
    state.sent    = false;
    return Object.keys(state.answers).length > 0;
  } catch (_) { return false; }
}
function wipe() {
  try { sessionStorage.removeItem(CONFIG.STORAGE_KEY); } catch (_) {}
  state.id = newId();
  state.name = state.phone = state.age = state.goal = '';
  state.answers = {}; state.idx = 0; state.result = null; state.sent = false;
}

/* ------------------------------------------------------------------ SCREENS */
function show(id) {
  $$('.screen').forEach(s => {
    const on = s.id === id;
    s.classList.toggle('is-active', on);
    s.hidden = !on;
  });
  window.scrollTo({ top:0, behavior:'auto' });
}

/* ------------------------------------------------------------------ SCORING */
function calculate() {
  let got = 0, max = 0;
  const per = {};
  Object.keys(CATS).forEach(k => { per[k] = { got:0, max:0 }; });

  QUESTIONS.forEach(q => {
    const pick = state.answers[q.id];
    if (pick == null) return;
    const opt = q.opts[pick];
    if (!opt || opt.na) return;            // excluded from both sides
    got += opt.p; max += 4;
    per[q.cat].got += opt.p; per[q.cat].max += 4;
  });

  const pct  = max > 0 ? Math.round((got / max) * 100) : 0;
  const band = BANDS.find(b => pct <= b.max) || BANDS[BANDS.length - 1];

  const cats = Object.keys(CATS)
    .map(k => ({
      key:k, name:CATS[k].name, note:CATS[k].note,
      pct: per[k].max > 0 ? Math.round((per[k].got / per[k].max) * 100) : null
    }))
    .filter(c => c.pct !== null)
    .sort((a, b) => b.pct - a.pct);

  return { pct, band, cats, top: cats.slice(0, 3), answered: Object.keys(state.answers).length };
}

/* ------------------------------------------------------- GOOGLE SHEET SAVE
   Fire-and-forget. sendBeacon is used first because it survives the page
   being backgrounded when the visitor taps straight through to WhatsApp.
   text/plain avoids a CORS preflight, which Apps Script does not answer.
   A failure here is silent by design: it must never block the result.
   ------------------------------------------------------------------------ */
function postToSheet(payload) {
  const url = String(CONFIG.SHEET_ENDPOINT || '').trim();
  if (!url) return false;
  let body;
  try { body = JSON.stringify(payload); } catch (_) { return false; }

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type:'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon(url, blob)) return true;
    }
  } catch (_) { /* fall through to fetch */ }

  try {
    fetch(url, {
      method:'POST',
      mode:'no-cors',
      keepalive:true,
      headers:{ 'Content-Type':'text/plain;charset=UTF-8' },
      body:body
    }).catch(() => {});
    return true;
  } catch (_) { return false; }
}

function answerSummary() {
  const out = {};
  QUESTIONS.forEach(q => {
    const pick = state.answers[q.id];
    const opt  = (pick != null) ? q.opts[pick] : null;
    out[q.id] = opt ? opt.t : '';
  });
  return out;
}

function sendResult(r) {
  if (state.sent) return;
  const catPct = {};
  r.cats.forEach(c => { catPct[c.key] = c.pct; });

  const ok = postToSheet({
    type:'result',
    id:state.id,
    submittedAt:new Date().toISOString(),
    event:CONFIG.VENUE,
    name:state.name,
    phone:state.phone,
    age:state.age,
    goal:state.goal,
    score:r.pct,
    band:r.band.name,
    top1:r.top[0] ? r.top[0].name : '',
    top2:r.top[1] ? r.top[1].name : '',
    top3:r.top[2] ? r.top[2].name : '',
    categories:catPct,
    answers:answerSummary(),
    answered:r.answered
  });

  if (ok) { state.sent = true; save(); }
}

/* ------------------------------------------------------------------- RENDER */
function renderChips(host, values, key) {
  host.innerHTML = '';
  values.forEach((v, i) => {
    const id  = key + '-' + i;
    const lab = el('label', 'chip');
    const inp = document.createElement('input');
    inp.type = 'radio'; inp.name = key; inp.id = id; inp.value = v;
    inp.checked = state[key] === v;
    inp.addEventListener('change', () => { state[key] = v; save(); });
    lab.appendChild(inp);
    lab.appendChild(el('span', null, v));
    host.appendChild(lab);
  });
}

function renderQuestion() {
  const q    = QUESTIONS[state.idx];
  const host = $('#q-host');
  host.innerHTML = '';

  const wrap = el('div', 'q');
  const fs   = document.createElement('fieldset');
  fs.className = 'opts';
  const lg = document.createElement('legend');
  lg.className = 'q__text';
  lg.textContent = q.text;
  fs.appendChild(lg);

  q.opts.forEach((o, i) => {
    const lab = el('label', 'opt-row');
    const inp = document.createElement('input');
    inp.type = 'radio'; inp.name = q.id; inp.value = String(i);
    inp.checked = state.answers[q.id] === i;
    inp.addEventListener('change', () => {
      state.answers[q.id] = i;
      $('#q-err').hidden = true;
      save();
      track('question_completed', { id:q.id, index:state.idx + 1 });
    });
    lab.appendChild(inp);
    lab.appendChild(el('span', null, o.t));
    fs.appendChild(lab);
  });

  wrap.appendChild(fs);
  host.appendChild(wrap);

  const n = state.idx + 1, total = QUESTIONS.length;
  $('#p-count').textContent = n + ' / ' + total;
  $('#p-cat').textContent   = CATS[q.cat].name;
  $('#p-fill').style.width  = (n / total * 100) + '%';
  const bar = $('#p-bar');
  bar.setAttribute('aria-valuenow', String(n));
  bar.setAttribute('aria-valuetext', 'Question ' + n + ' of ' + total);
  $('#q-live').textContent = 'Question ' + n + ' of ' + total + '. ' + q.text;

  $('[data-action="prev"]').disabled  = state.idx === 0;
  $('[data-action="next"]').textContent = state.idx === total - 1 ? 'See my score' : 'Next';
}

function renderResult() {
  const r = state.result = calculate();

  const heading = $('[data-role="result-heading"]');
  heading.textContent = state.name
    ? state.name + ', your Wellness Blind Spot Score is:'
    : 'Your Wellness Blind Spot Score is:';

  $('[data-role="gauge-title"]').textContent =
    'Wellness Blind Spot Score: ' + r.pct + ' percent. ' + r.band.name + '.';
  $('#score-band').textContent  = r.band.name;
  $('#score-blurb').textContent = r.band.blurb;

  // gauge: colour is decorative only — the band name carries the meaning
  const arc = $('#gauge-arc');
  const C   = 2 * Math.PI * 52;
  arc.style.stroke = r.pct >= 70 ? 'var(--gold)' : r.pct >= 50 ? 'var(--plum)' : 'var(--teal-deep)';
  requestAnimationFrame(() => { arc.style.strokeDashoffset = String(C - (C * r.pct / 100)); });

  // count-up
  const num    = $('#score-num');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { num.textContent = String(r.pct); }
  else {
    let cur = 0;
    const step = () => {
      cur += Math.max(1, Math.ceil((r.pct - cur) / 8));
      if (cur >= r.pct) { num.textContent = String(r.pct); return; }
      num.textContent = String(cur);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const card = c => {
    const li  = el('li', 'cat');
    const top = el('div', 'cat__top');
    top.appendChild(el('span', 'cat__name', c.name));
    top.appendChild(el('span', 'cat__val', c.pct + '% unexamined'));
    li.appendChild(top);
    const trackEl = el('div', 'cat__track');
    const fill    = el('div', 'cat__fill');
    trackEl.appendChild(fill);
    li.appendChild(trackEl);
    li.appendChild(el('p', 'cat__note', c.note));
    requestAnimationFrame(() => { fill.style.width = c.pct + '%'; });
    return li;
  };

  const topList = $('#cat-list'); topList.innerHTML = '';
  r.top.forEach(c => topList.appendChild(card(c)));
  const allList = $('#cat-all'); allList.innerHTML = '';
  r.cats.forEach(c => allList.appendChild(card(c)));

  buildWhatsApp(r);
  sendResult(r);

  track('assessment_completed', { score:r.pct, band:r.band.name });
  track('score_generated', { score:r.pct, top:r.top.map(c => c.name).join(', ') });
}

/* ----------------------------------------------------------------- WHATSAPP */
function digits(number) { return String(number).replace(/\D/g, ''); }

/* A placeholder left in CONFIG would produce https://wa.me/ — a link that
   opens WhatsApp and silently goes nowhere. Fail loudly instead. */
function isConfigured(number) { return digits(number).length >= 10; }

function waLink(number, message) {
  return 'https://wa.me/' + digits(number) + '?text=' + encodeURIComponent(message);
}

function buildWhatsApp(r) {
  const minor = state.age === 'Below 18';
  $('#minor-note').hidden = !minor;
  $('#cta-row').hidden    = minor;          // no direct consult route for under-18s
  if (minor) { $('#wa-unset').hidden = true; return; }

  const parts = [];
  parts.push('Hi, I completed the ' + CONFIG.VENUE + ' Wellness Blind Spot Assessment.');
  if (state.name) parts.push('My name is ' + state.name + '.');
  parts.push('My score was ' + r.pct + '% (' + r.band.name + ').');
  parts.push('My main blind-spot areas were: ' + r.top.map(c => c.name).join(', ') + '.');
  if (state.goal) parts.push('What matters most to me right now is ' + state.goal.toLowerCase() + '.');
  if (state.age)  parts.push('Age range: ' + state.age + '.');
  parts.push('I would like to understand what this means and explore the free expert discussion.');
  const msg = parts.join(' ');

  const slots = [$('#wa-1'), $('#wa-2')];
  let live = 0;

  slots.forEach((a, i) => {
    const c = CONFIG.CONTACTS[i];
    if (c && isConfigured(c.number)) {
      const label = $('[data-role="wa-' + (i + 1) + '-label"]', a);
      if (label) label.textContent = c.label;
      a.hidden = false;
      a.href   = waLink(c.number, msg);
      a.onclick = () => {
        track('wa_clicked', { who:c.key, score:r.pct });
        // second, tiny beacon so the Sheet shows who actually reached out
        postToSheet({ type:'contact_click', id:state.id, contact:c.key,
                      clickedAt:new Date().toISOString() });
      };
      live++;
    } else {
      a.hidden = true;                       // never show a dead WhatsApp button
      a.removeAttribute('href');
    }
  });

  $('#wa-unset').hidden = live > 0;
}

/* --------------------------------------------------------------- NAVIGATION */
function goQuiz() { show('s-quiz'); renderQuestion(); }

function next() {
  const q = QUESTIONS[state.idx];
  if (state.answers[q.id] == null) {
    const err = $('#q-err');
    err.hidden = false;
    err.focus && err.focus();
    return;
  }
  if (state.idx < QUESTIONS.length - 1) {
    state.idx++; save(); renderQuestion();
  } else {
    show('s-result'); renderResult();
  }
}
function prev() {
  if (state.idx > 0) { state.idx--; save(); renderQuestion(); }
  else { show('s-details'); }
}

function resetInputs() {
  $('#f-name').value  = '';
  $('#f-phone').value = '';
  $$('input[type="radio"]').forEach(i => { i.checked = false; });
}

/* --------------------------------------------------------------------- INIT */
document.addEventListener('DOMContentLoaded', () => {
  const label = $('[data-role="event-label"]');
  if (label && CONFIG.EVENT_LABEL) label.textContent = CONFIG.EVENT_LABEL;

  state.id = newId();
  renderChips($('#f-age'),  AGES,  'age');
  renderChips($('#f-goal'), GOALS, 'goal');

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;

    if (a === 'start') {
      track('assessment_started', {});
      show('s-details');
    }
    if (a === 'skip-details') {
      state.name = state.phone = state.age = state.goal = '';
      save(); goQuiz();
    }
    if (a === 'next') next();
    if (a === 'prev') prev();
    if (a === 'retake') {
      wipe();
      resetInputs();
      track('assessment_restarted', {});
      show('s-intro');
    }
    if (a === 'clear') {
      wipe();
      resetInputs();
      show('s-intro');
      btn.textContent = 'Cleared';
      setTimeout(() => { btn.textContent = 'Clear my answers on this device'; }, 2200);
    }
  });

  $('#details-form').addEventListener('submit', e => {
    e.preventDefault();
    state.name  = $('#f-name').value.trim().slice(0, 40);
    state.phone = digits($('#f-phone').value).slice(0, 15);
    save();
    goQuiz();
  });

  // resume an interrupted run within the same tab
  if (restore()) {
    $('#f-name').value  = state.name;
    $('#f-phone').value = state.phone;
    renderChips($('#f-age'),  AGES,  'age');
    renderChips($('#f-goal'), GOALS, 'goal');
    goQuiz();
  }

  // keyboard: 1-6 picks an option, Enter advances
  document.addEventListener('keydown', e => {
    if ($('#s-quiz').hidden) return;
    if (e.target.matches('input,textarea')) return;
    const q = QUESTIONS[state.idx];
    const k = parseInt(e.key, 10);
    if (k >= 1 && k <= q.opts.length) {
      const inp = $$('#q-host input')[k - 1];
      if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change')); }
    }
    if (e.key === 'Enter') { e.preventDefault(); next(); }
  });
});
