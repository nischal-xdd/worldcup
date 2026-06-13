// FIFA World Cup 2026 data site
// Matches/groups/teams come from the API. The API references teams by ISO
// code or numeric ID, so display names are resolved locally via a team index
// plus Intl.DisplayNames, and flags come from flagcdn.com. Stadiums use
// verified static data for the 16 official venues.
const API = 'https://worldcup26.ir';

const ENDPOINTS = {
  matches: '/get/games',
  groups: '/get/groups',
  teams: '/get/teams',
};

const cache = {};

// --- static data: the 16 official 2026 venues -------------------------------

const STADIUMS = [
  { name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', code: 'mx', capacity: 87523 },
  { name: 'MetLife Stadium', city: 'East Rutherford, New Jersey', country: 'United States', code: 'us', capacity: 82500 },
  { name: 'AT&T Stadium', city: 'Arlington, Texas', country: 'United States', code: 'us', capacity: 80000 },
  { name: 'Arrowhead Stadium', city: 'Kansas City, Missouri', country: 'United States', code: 'us', capacity: 76416 },
  { name: 'NRG Stadium', city: 'Houston, Texas', country: 'United States', code: 'us', capacity: 72220 },
  { name: 'Mercedes-Benz Stadium', city: 'Atlanta, Georgia', country: 'United States', code: 'us', capacity: 71000 },
  { name: 'SoFi Stadium', city: 'Inglewood, California', country: 'United States', code: 'us', capacity: 70240 },
  { name: 'Lincoln Financial Field', city: 'Philadelphia, Pennsylvania', country: 'United States', code: 'us', capacity: 69796 },
  { name: 'Lumen Field', city: 'Seattle, Washington', country: 'United States', code: 'us', capacity: 69000 },
  { name: "Levi's Stadium", city: 'Santa Clara, California', country: 'United States', code: 'us', capacity: 68500 },
  { name: 'Hard Rock Stadium', city: 'Miami Gardens, Florida', country: 'United States', code: 'us', capacity: 64767 },
  { name: 'Gillette Stadium', city: 'Foxborough, Massachusetts', country: 'United States', code: 'us', capacity: 64628 },
  { name: 'BC Place', city: 'Vancouver, British Columbia', country: 'Canada', code: 'ca', capacity: 54500 },
  { name: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', code: 'mx', capacity: 53500 },
  { name: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico', code: 'mx', capacity: 49850 },
  { name: 'BMO Field', city: 'Toronto, Ontario', country: 'Canada', code: 'ca', capacity: 45736 },
];
const MAX_CAPACITY = Math.max(...STADIUMS.map((s) => s.capacity));

// --- inline SVG icons (no emoji) ---------------------------------------------

const ICONS = {
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
};

function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
}

// --- helpers -----------------------------------------------------------------

// Pick the first present value among candidate keys (case-insensitive).
function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// Normalise an API payload to an array regardless of envelope shape.
function toArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['data', 'results', 'items', 'games', 'matches', 'teams', 'groups', 'stadiums']) {
    if (Array.isArray(data[key])) return data[key];
  }
  // Object keyed by id/group letter -> values
  const values = Object.values(data);
  if (values.every((v) => v && typeof v === 'object')) return values;
  return [];
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Resolve an ISO 3166-1 alpha-2 code to an English country name.
function regionName(code) {
  if (!code || !/^[A-Za-z]{2}$/.test(String(code))) return undefined;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(String(code).toUpperCase());
  } catch {
    return undefined;
  }
}

// Flag image from flagcdn.com instead of emoji. Falls back to a TBD badge.
function flagImg(code, cls) {
  if (!code || !/^[A-Za-z]{2}$/.test(String(code))) {
    return '<span class="flag-fallback">TBD</span>';
  }
  const cc = String(code).toLowerCase();
  return '<img class="flag' + (cls ? ' ' + cls : '') + '" loading="lazy"' +
    ' src="https://flagcdn.com/h80/' + cc + '.png"' +
    ' srcset="https://flagcdn.com/h160/' + cc + '.png 2x"' +
    ' alt="' + esc(regionName(cc) || cc.toUpperCase()) + ' flag" />';
}

// --- team index: resolves IDs and codes used by matches/groups ----------------

let teamIndex = null;

async function ensureTeamIndex() {
  if (teamIndex) return teamIndex;
  teamIndex = {};
  try {
    const teams = await load('teams');
    for (const t of teams) {
      const name = t.name;
      if (!name) continue;
      const info = { name: name, code: t.code ? String(t.code).toLowerCase() : undefined };
      const id = pick(t, 'id', 'teamId', 'team_id');
      if (id !== undefined) teamIndex[String(id).toLowerCase()] = info;
      if (info.code) teamIndex[info.code] = info;
      teamIndex[String(name).toLowerCase()] = info;
    }
  } catch {
    /* index stays empty; teamInfo falls back gracefully */
  }
  return teamIndex;
}

// Resolve any team reference (object, ISO code, numeric ID, or name)
// to { name, code }.
function teamInfo(v) {
  if (v === undefined || v === null || v === '') return { name: 'TBD' };
  if (typeof v === 'object') {
    return teamInfo(pick(v, 'name', 'team', 'country', 'code', 'iso2', 'countryCode', 'id'));
  }
  const key = String(v).toLowerCase();
  if (teamIndex && teamIndex[key]) return teamIndex[key];
  const rn = regionName(v);
  if (rn) return { name: rn, code: key };
  if (/^\d+$/.test(String(v))) return { name: 'TBD' }; // unresolved numeric id
  return { name: String(v) };
}

function teamLabel(v) {
  return teamInfo(v).name;
}

// Post-processors to enrich raw API items so rendering and search both work.
const POST = {
  teams: (list) => list.map((t) => {
    const code = pick(t, 'code', 'iso2', 'countryCode', 'flag');
    const name = pick(t, 'name', 'team', 'country') || regionName(code);
    return Object.assign({}, t, { name: name, code: code });
  }),
};

async function load(name) {
  if (cache[name]) return cache[name];
  const res = await fetch(API + ENDPOINTS[name], { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  let list = toArray(json);
  if (POST[name]) list = POST[name](list);
  cache[name] = list;
  return cache[name];
}

function setState(elId, html) {
  document.getElementById(elId).innerHTML = '<div class="state">' + html + '</div>';
}

// --- renderers -----------------------------------------------------------------

const HOME_KEYS = ['home', 'homeTeam', 'home_team', 'team1', 'teamA', 'homeTeamId', 'home_team_id', 'home_id', 'team1_id', 'local', 'localTeam'];
const AWAY_KEYS = ['away', 'awayTeam', 'away_team', 'team2', 'teamB', 'awayTeamId', 'away_team_id', 'away_id', 'team2_id', 'visitor', 'visitorTeam'];

function renderMatches(list) {
  const el = document.getElementById('matches');
  if (!list.length) { setState('matches', 'No matches found.'); return; }
  el.innerHTML = list.map((m) => {
    const home = m._home || 'TBD';
    const away = m._away || 'TBD';
    const hs = pick(m, 'homeScore', 'home_score', 'score1', 'homeGoals');
    const as = pick(m, 'awayScore', 'away_score', 'score2', 'awayGoals');
    const date = pick(m, 'date', 'datetime', 'kickoff', 'time', 'utcDate');
    const venue = pick(m, 'stadium', 'venue', 'location');
    const group = pick(m, 'group', 'stage', 'round');
    const hasScore = hs !== undefined && as !== undefined;
    const middle = hasScore
      ? '<span class="match-score">' + esc(hs) + ' - ' + esc(as) + '</span>'
      : '<span class="match-vs">vs</span>';
    return '<div class="card">' +
      '<div class="match-teams">' +
        '<span class="match-team">' + (m._homeCode ? flagImg(m._homeCode, 'flag-sm') : '') + esc(home) + '</span>' +
        middle +
        '<span class="match-team match-team-away">' + esc(away) + (m._awayCode ? flagImg(m._awayCode, 'flag-sm') : '') + '</span>' +
      '</div>' +
      '<div class="match-meta">' +
        (group ? '<span>' + icon('trophy') + esc(group) + '</span>' : '') +
        (date ? '<span>' + icon('calendar') + esc(date) + '</span>' : '') +
        (venue ? '<span>' + icon('pin') + esc(venue) + '</span>' : '') +
      '</div></div>';
  }).join('');
}

function renderGroups(list) {
  const el = document.getElementById('groups');
  if (!list.length) { setState('groups', 'No groups found.'); return; }
  el.innerHTML = list.map((g) => {
    const name = pick(g, 'group', 'name', 'letter', 'title') || 'Group';
    let teams = pick(g, 'teams', 'standings', 'table', 'rows');
    teams = Array.isArray(teams) ? teams : toArray(teams);
    const rows = teams.map((t) => {
      const tn = teamLabel(pick(t, 'name', 'team', 'country', 'code', 'iso2', 'teamId', 'team_id', 'id'));
      const p = pick(t, 'played', 'p', 'games') ?? '-';
      const w = pick(t, 'won', 'w', 'wins') ?? '-';
      const d = pick(t, 'draw', 'd', 'draws') ?? '-';
      const l = pick(t, 'lost', 'l', 'losses') ?? '-';
      const pts = pick(t, 'points', 'pts') ?? '-';
      return '<tr><td>' + esc(tn) + '</td><td class="num">' + esc(p) + '</td><td class="num">' + esc(w) +
        '</td><td class="num">' + esc(d) + '</td><td class="num">' + esc(l) + '</td><td class="num">' + esc(pts) + '</td></tr>';
    }).join('');
    return '<div class="card"><div class="group-title">' + esc(name) + '</div>' +
      '<table><thead><tr><th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">Pts</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="6">No standings yet.</td></tr>') + '</tbody></table></div>';
  }).join('');
}

function renderTeams(list) {
  const el = document.getElementById('teams');
  if (!list.length) { setState('teams', 'No teams found.'); return; }
  el.innerHTML = list.map((t) => {
    const name = t.name || 'Play-off winner (TBD)';
    const group = pick(t, 'group', 'pool');
    return '<div class="card team-card">' +
      '<div class="team-flag">' + flagImg(t.code) + '</div>' +
      '<div class="team-name">' + esc(name) + '</div>' +
      (group ? '<div class="team-group">Group ' + esc(group) + '</div>' : '') +
      '</div>';
  }).join('');
}

function renderStadiums() {
  const el = document.getElementById('stadiums');
  el.innerHTML = STADIUMS.map((s) => {
    const pct = Math.round((s.capacity / MAX_CAPACITY) * 100);
    return '<div class="card stadium-card">' +
      '<div class="stadium-banner banner-' + s.code + '"><i class="bx bxs-building-house" aria-hidden="true"></i></div>' +
      '<div class="stadium-body">' +
        '<div class="stadium-name">' + esc(s.name) + '</div>' +
        '<div class="stadium-meta">' +
          '<span>' + icon('pin') + esc(s.city + ', ' + s.country) + flagImg(s.code, 'flag-sm') + '</span>' +
          '<span>' + icon('users') + esc(s.capacity.toLocaleString()) + ' seats</span>' +
        '</div>' +
        '<div class="cap-bar" title="Capacity relative to the largest venue"><span style="width:' + pct + '%"></span></div>' +
      '</div></div>';
  }).join('');
}

const RENDERERS = { matches: renderMatches, groups: renderGroups, teams: renderTeams, stadiums: renderStadiums };

async function show(name) {
  if (name === 'stadiums') {
    cache.stadiums = STADIUMS;
    renderStadiums();
    return;
  }
  // Render instantly from cache when available.
  if (cache[name]) { RENDERERS[name](cache[name]); return; }
  setState(name, 'Loading\u2026');
  try {
    // Matches and groups reference teams by ID, so the index must exist first.
    if (name === 'matches' || name === 'groups') await ensureTeamIndex();
    const data = await load(name);
    if (name === 'matches') {
      for (const m of data) {
        const hi = teamInfo(pick(m, ...HOME_KEYS));
        const ai = teamInfo(pick(m, ...AWAY_KEYS));
        m._home = hi.name; m._homeCode = hi.code;
        m._away = ai.name; m._awayCode = ai.code;
      }
    }
    RENDERERS[name](data);
  } catch (e) {
    setState(name, '<span class="error">Failed to load: ' + esc(e.message) + '</span>');
  }
}

// --- search --------------------------------------------------------------------

function wireSearch(inputId, name, fields) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const data = cache[name] || [];
    const filtered = !q ? data : data.filter((item) =>
      fields.some((f) => {
        const v = pick(item, ...f);
        return v && String(v).toLowerCase().includes(q);
      })
    );
    RENDERERS[name](filtered);
  });
}

// --- tabs / init -----------------------------------------------------------------

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  const tab = btn.dataset.tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab));
  // Always render the panel; data is cached so this is instant after first load.
  show(tab);
});

wireSearch('matches-search', 'matches', [['_home'], ['_away']]);
wireSearch('teams-search', 'teams', [['name', 'team', 'country']]);

show('matches');
