// Vice State Trophy Guide — tracker logic. Static, offline: the only request it
// makes is fetching its own data/trophies.json from the same server.
const STORE_KEY = 'vice-state-trophy-guide-v1';
const KIND_LABELS = {
  all: 'All trophies', story: 'Story', missable: 'Missable', collectibles: 'Collectibles',
  activities: 'Activities', side: 'Side quests', robbery: 'Robberies', exploration: 'Exploration',
  money: 'Money', combat: 'Combat', misc: 'Misc', online: 'Online', platinum: 'Platinum', completion: '100% completion',
};
const KIND_CHIPS = ['all', 'story', 'missable', 'collectibles', 'activities', 'side', 'robbery', 'exploration', 'money', 'combat', 'misc', 'online'];
const STAGES = [
  { n: 1, title: 'Stage 1 — Play the story, grab what only exists now', time: '60–80 hours', blurb: 'Play the five chapters in order and take optional missions, stranger strands and character quests as they appear. Scan vehicles with the WAiNK app (200 needed for 100%), study animals with binoculars (100), meditate at every spot, and turn on every progress and collectible notification in the settings. Do the Chapter 1 balcony meditation before Chapter 1 ends — it is the only possibly missable step. Keep cheats off: they disable trophies and saving.' },
  { n: 2, title: 'Stage 2 — The 100% checklist and the big grinds', time: 'About 100 hours', blurb: 'After the credits, open Progress > Stats > 100% Completion and work through what is left: every robbery, bank vault and gang operation, underwater discoveries, shooting ranges, drone races, Bret\u2019s Target Decks and 70 of the 80 challenges. Most of the miscellaneous trophies pop along the way. This is the longest stretch of the platinum.' },
  { n: 3, title: 'Stage 3 — Strangers & Freaks and cleanup', time: 'About 10 hours', blurb: 'Finish the 8 Strangers & Freaks strands and the side-character final missions, then clean up whatever is left. The platinum pops the moment the last of the other 54 is earned.' },
];

let DATA = null;
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { earned: s.earned || {}, spoilers: !!s.spoilers, kind: s.kind || 'all', grade: s.grade || 'all', earnedFilter: s.earnedFilter || 'all', query: s.query || '', selected: s.selected || null };
    }
  } catch (e) { /* corrupted save: start fresh */ }
  return { earned: {}, spoilers: false, kind: 'all', grade: 'all', earnedFilter: 'all', query: '', selected: null };
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
}

function el(id) { return document.getElementById(id); }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }
function isStory(t) { return t.kinds.includes('story'); }
function isHiddenBySpoilers(t) { return state.spoilers && isStory(t) && !state.earned[t.id]; }
function sourceByKey(k) { return DATA.sources[k] || { name: k, note: '', url: '' }; }

function filteredTrophies() {
  const q = state.query.trim().toLowerCase();
  return DATA.trophies.filter((t) => {
    if (state.kind !== 'all' && !t.kinds.includes(state.kind)) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedFilter === 'earned' && !state.earned[t.id]) return false;
    if (state.earnedFilter === 'unearned' && state.earned[t.id]) return false;
    if (q) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kinds.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderProgress() {
  const earned = DATA.trophies.filter((t) => state.earned[t.id]).length;
  const pct = Math.round((earned / DATA.trophies.length) * 100);
  el('earnedCount').textContent = earned;
  el('progressFill').style.width = pct + '%';
  el('progressPct').textContent = pct + '%';
  el('platinumState').textContent = earned >= DATA.trophies.length ? 'Vice Got a Price! earned' : 'Vice Got a Price! locked';
}

function renderChips() {
  const box = el('kindChips');
  box.innerHTML = '';
  for (const k of KIND_CHIPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.kind === k ? ' active' : '');
    b.textContent = KIND_LABELS[k];
    b.addEventListener('click', () => { state.kind = k; saveState(); renderList(); renderChips(); });
    box.appendChild(b);
  }
}

function renderList() {
  const list = el('trophyList');
  const items = filteredTrophies();
  list.innerHTML = '';
  const earnedShown = items.filter((t) => state.earned[t.id]).length;
  el('listMeta').textContent = items.length === DATA.trophies.length
    ? 'Showing all 55 trophies — ' + earnedShown + ' earned.'
    : 'Showing ' + items.length + ' of 55 trophies — ' + earnedShown + ' earned in this view.';
  if (state.kind === 'online') {
    const p = document.createElement('p');
    p.className = 'empty-list';
    p.textContent = 'No online trophies: GTA VI launches as a single-player game and all 55 trophies are earned offline (PowerPyx, GTABase).';
    list.appendChild(p);
    return;
  }
  if (!items.length) {
    const p = document.createElement('p');
    p.className = 'empty-list';
    p.textContent = 'No trophies match this filter. Clear the search or pick another filter.';
    list.appendChild(p);
    return;
  }
  for (const t of items) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'trophy-row' + (state.earned[t.id] ? ' earned' : '') + (state.selected === t.id ? ' selected' : '');
    row.setAttribute('role', 'listitem');
    const hidden = isHiddenBySpoilers(t);
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = !!state.earned[t.id];
    check.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    check.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleEarned(t.id);
    });
    const mid = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'trophy-name' + (hidden ? ' spoiler-hidden' : '');
    name.textContent = hidden ? 'Hidden story trophy — earn it to reveal' : t.name;
    const desc = document.createElement('span');
    desc.className = 'trophy-desc' + (hidden ? ' spoiler-hidden' : '');
    desc.textContent = hidden ? 'Its name and description stay hidden while spoilers are on.' : t.description;
    const tags = document.createElement('span');
    tags.className = 'trophy-tags';
    for (const k of t.kinds) {
      const tag = document.createElement('span');
      tag.className = 'tag' + (k === 'missable' ? ' missable' : k === 'story' ? ' story' : '');
      tag.textContent = k === 'missable' ? 'Missable' : KIND_LABELS[k] || k;
      tags.appendChild(tag);
    }
    mid.appendChild(name);
    mid.appendChild(document.createElement('br'));
    mid.appendChild(desc);
    mid.appendChild(document.createElement('br'));
    mid.appendChild(tags);
    const badge = document.createElement('span');
    badge.className = 'grade-badge ' + t.grade;
    badge.textContent = t.grade;
    row.appendChild(check);
    row.appendChild(mid);
    row.appendChild(badge);
    row.addEventListener('click', () => { state.selected = t.id; saveState(); renderList(); renderDetail(); });
    list.appendChild(row);
  }
}

function renderDetail() {
  const pane = el('detailPane');
  const t = DATA.trophies.find((x) => x.id === state.selected);
  if (!t) {
    pane.innerHTML = '<p class="detail-empty">Select a trophy on the left to read its guide and sources.</p>';
    return;
  }
  const hidden = isHiddenBySpoilers(t);
  const earned = !!state.earned[t.id];
  const wrap = document.createElement('div');
  const h = document.createElement('h2');
  h.textContent = hidden ? 'Hidden story trophy' : t.name;
  wrap.appendChild(h);
  const off = document.createElement('p');
  off.className = 'detail-official';
  off.innerHTML = hidden
    ? 'Official name and description hidden by the spoiler setting.'
    : '<strong>Official:</strong> ' + esc(t.description) + ' &middot; <strong>Grade:</strong> ' + gradeLabel(t.grade);
  wrap.appendChild(off);
  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'detail-guide missable-callout';
    warn.innerHTML = '<strong>Possibly missable.</strong> ' + esc(t.guide);
    wrap.appendChild(warn);
  } else if (!hidden) {
    const g = document.createElement('p');
    g.className = 'detail-guide';
    g.textContent = t.guide;
    wrap.appendChild(g);
  }
  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  const parts = [];
  if (t.count) parts.push('<b>Target:</b> ' + t.count.toLocaleString('en-US'));
  parts.push('<b>Roadmap stage:</b> ' + t.stage + ' of 3');
  parts.push('<b>Kind:</b> ' + t.kinds.map((k) => esc(KIND_LABELS[k] || k)).join(', '));
  if (t.hidden) parts.push('<b>Hidden on PSN</b> until earned');
  meta.innerHTML = parts.join(' &middot; ');
  wrap.appendChild(meta);
  const src = document.createElement('div');
  src.className = 'detail-sources';
  const sh = document.createElement('h3');
  sh.textContent = 'Sources';
  src.appendChild(sh);
  const ul = document.createElement('ul');
  for (const k of t.sources) {
    const s = sourceByKey(k);
    const li = document.createElement('li');
    if (s.url) {
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      li.appendChild(a);
    } else {
      li.textContent = s.name;
    }
    if (s.note) {
      const note = document.createElement('span');
      note.className = 'src-note';
      note.textContent = ' — ' + s.note;
      li.appendChild(note);
    }
    ul.appendChild(li);
  }
  src.appendChild(ul);
  wrap.appendChild(src);
  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const mark = document.createElement('button');
  mark.type = 'button';
  mark.className = earned ? '' : 'primary';
  mark.textContent = earned ? 'Mark as not earned' : 'Mark as earned';
  mark.addEventListener('click', () => toggleEarned(t.id));
  actions.appendChild(mark);
  wrap.appendChild(actions);
  pane.innerHTML = '';
  pane.appendChild(wrap);
}

function toggleEarned(id) {
  if (state.earned[id]) delete state.earned[id]; else state.earned[id] = 1;
  saveState();
  renderProgress();
  renderList();
  renderDetail();
}

function renderRoadmap() {
  const box = el('roadmapStages');
  box.innerHTML = '';
  for (const s of STAGES) {
    const stageTrophies = DATA.trophies.filter((t) => t.stage === s.n);
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h2');
    h.textContent = s.title;
    const time = document.createElement('div');
    time.className = 'stage-time';
    time.textContent = s.time + ' · ' + stageTrophies.length + ' trophies';
    const p = document.createElement('p');
    p.textContent = s.blurb;
    div.appendChild(h);
    div.appendChild(time);
    div.appendChild(p);
    if (s.n === 1) {
      const banner = document.createElement('div');
      banner.className = 'missable-banner';
      banner.innerHTML = '<strong>Watch out in Chapter 1:</strong> Lucia\u2019s balcony meditation for Positive Mental Attitude becomes permanently unavailable after Chapter 1. Do it before the chapter ends.';
      div.appendChild(banner);
    }
    const ul = document.createElement('ul');
    for (const t of stageTrophies) {
      const li = document.createElement('li');
      const earned = !!state.earned[t.id];
      li.textContent = (earned ? '✓ ' : '') + t.name + ' (' + gradeLabel(t.grade) + ')' + (t.missable ? ' — possibly missable' : '');
      ul.appendChild(li);
    }
    div.appendChild(ul);
    const src = document.createElement('p');
    src.className = 'stage-sources';
    src.textContent = 'Sources: ' + (s.n === 1 ? 'PowerPyx roadmap Step 1; GTABase roadmap Step 1; Output Lag chapter saves.' : s.n === 2 ? 'PowerPyx roadmap Step 2; GTABase 100% checklist; KeenGamer robbery counts.' : 'PowerPyx roadmap Step 3; GTABase roadmap Step 3.');
    div.appendChild(src);
    box.appendChild(div);
  }
}

function renderMissables() {
  const box = el('missableList');
  box.innerHTML = '';
  const missables = DATA.trophies.filter((t) => t.missable);
  for (const t of missables) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const h = document.createElement('h2');
    h.textContent = t.name + ' — possibly missable';
    const off = document.createElement('p');
    off.innerHTML = '<strong>Official:</strong> ' + esc(t.description) + ' &middot; <strong>Grade:</strong> ' + gradeLabel(t.grade);
    const g = document.createElement('p');
    g.textContent = t.guide;
    const src = document.createElement('p');
    src.className = 'detail-meta';
    src.textContent = 'Sources: ' + t.sources.map((k) => sourceByKey(k).name).join('; ') + '.';
    card.appendChild(h);
    card.appendChild(off);
    card.appendChild(g);
    card.appendChild(src);
    box.appendChild(card);
  }
  const note = document.createElement('p');
  note.className = 'section-intro';
  note.textContent = 'That is the whole missable list: 1 of 55. PowerPyx flags only Positive Mental Attitude, and only as a maybe — it is not yet confirmed whether the Chapter 1 meditation is required for the trophy. Every other trophy, story trophies included, can be earned after the story.';
  box.appendChild(note);
}

function renderSources() {
  const ul = el('sourceList');
  ul.innerHTML = '';
  for (const k of Object.keys(DATA.sources)) {
    const s = DATA.sources[k];
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.appendChild(a);
    li.appendChild(document.createTextNode(' — ' + s.note));
    ul.appendChild(li);
  }
}

function exportProgress() {
  const payload = { app: 'vice-state-trophy-guide', version: 1, exportedAt: new Date().toISOString(), earned: Object.keys(state.earned).map(Number).sort((a, b) => a - b), spoilers: state.spoilers };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data.earned) ? data.earned : (Array.isArray(data) ? data : null);
      if (!ids) throw new Error('bad file');
      const valid = new Set(DATA.trophies.map((t) => t.id));
      const earned = {};
      for (const id of ids) if (valid.has(Number(id))) earned[Number(id)] = 1;
      state.earned = earned;
      if (typeof data.spoilers === 'boolean') state.spoilers = data.spoilers;
      saveState();
      el('spoilerToggle').checked = state.spoilers;
      renderProgress();
      renderList();
      renderDetail();
      renderRoadmap();
      renderMissables();
    } catch (e) {
      alert('That file is not a progress export from this guide.');
    }
  };
  reader.readAsText(file);
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
}

async function boot() {
  const res = await fetch('data/trophies.json');
  DATA = await res.json();
  el('searchBox').value = state.query;
  el('gradeFilter').value = state.grade;
  el('earnedFilter').value = state.earnedFilter;
  el('spoilerToggle').checked = state.spoilers;
  el('searchBox').addEventListener('input', (ev) => { state.query = ev.target.value; saveState(); renderList(); });
  el('gradeFilter').addEventListener('change', (ev) => { state.grade = ev.target.value; saveState(); renderList(); });
  el('earnedFilter').addEventListener('change', (ev) => { state.earnedFilter = ev.target.value; saveState(); renderList(); });
  el('spoilerToggle').addEventListener('change', (ev) => { state.spoilers = ev.target.checked; saveState(); renderList(); renderDetail(); });
  el('exportBtn').addEventListener('click', exportProgress);
  el('importBtn').addEventListener('click', () => el('importFile').click());
  el('importFile').addEventListener('change', (ev) => { if (ev.target.files[0]) importProgress(ev.target.files[0]); ev.target.value = ''; });
  el('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies and reset this guide?')) {
      state.earned = {};
      state.selected = null;
      saveState();
      renderProgress();
      renderList();
      renderDetail();
      renderRoadmap();
      renderMissables();
    }
  });
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  renderProgress();
  renderChips();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderSources();
}

boot();
