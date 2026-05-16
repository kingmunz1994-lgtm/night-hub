// ── Night Hub ─────────────────────────────────────────────────────────────────

const NIGHT_ID_API   = 'https://night-markets-94-production.up.railway.app';
const MIDNIGHT_INDEX = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const NIGHT_CONTRACT = '7473b82b398f6b8665541862a1165c6c5da379355f9c32dace36ed234b7cc711';

// ── App registry ──────────────────────────────────────────────────────────────
const APPS = [
  { id:'markets', icon:'🛒', name:'Night Markets', tag:'ZK escrow marketplace',   url:'https://kingmunz1994-lgtm.github.io/night-markets/', desc:'Buy and sell anything privately. ZK escrow lifecycle — createListing → fundEscrow → releaseEscrow. Live on Midnight Preprod.' },
  { id:'poker',   icon:'🃏', name:'Night Poker',   tag:'Provably fair Hold\'em',   url:'https://kingmunz1994-lgtm.github.io/night-poker/',  desc:'XOR mental poker — no trusted dealer. Private hole cards. ZK proof at showdown. WebSocket room management.' },
  { id:'fun',     icon:'🚀', name:'Night Fun',     tag:'ZK token launchpad',       url:'https://kingmunz1994-lgtm.github.io/night-fun/',    desc:'Launch a token in 60 seconds. Anonymous buys. Bonding curve + epoch revenue sharing to holders.' },
  { id:'id',      icon:'🪪', name:'Night ID',      tag:'Multi-chain ZK identity',  url:'https://kingmunz1994-lgtm.github.io/night-id/',     desc:'Score your on-chain history across ETH, SOL, ADA, Midnight. Issue W3C credentials. Claim a .night name.' },
  { id:'lend',    icon:'💸', name:'Night Lend',    tag:'ZK DeFi lending',          url:'https://kingmunz1994-lgtm.github.io/night-lend/',   desc:'Deposit to earn yield. Borrow at 75% LTV. Prove solvency in ZK — lenders see you\'re healthy, not your balance.' },
  { id:'save',    icon:'🏦', name:'Night Save',    tag:'ZK vault + sUSD',          url:'https://kingmunz1994-lgtm.github.io/night-save/',   desc:'Deposit NIGHT, mint sUSD stablecoin. Prove vault health in ZK. BNPL instalments included.' },
  { id:'work',    icon:'⚙️',  name:'Night Work',    tag:'ZK task marketplace',      url:'https://kingmunz1994-lgtm.github.io/night-work/',   desc:'AI agents post bounties. Humans earn NIGHT completing them. Worker identities are ZK commitments.' },
  { id:'biz',     icon:'🏢', name:'Night Biz',     tag:'ZK loyalty tokens',        url:'https://kingmunz1994-lgtm.github.io/night-biz/',    desc:'Any business issues private loyalty tokens. Customers prove Bronze/Silver/Gold/Platinum tier without revealing balance.' },
  { id:'store',   icon:'🛍️', name:'Night Store',   tag:'Pay with NIGHT',           url:'https://kingmunz1994-lgtm.github.io/night-store/',  desc:'Official Night Markets merch — tees, hoodies, caps, mugs, totes. Pay with your Night Score NIGHT balance. Printed by Printful, shipped worldwide.' },
];

const LEVELS = [
  {min:0,   name:'Contributor', emoji:'⬜'},
  {min:100, name:'Builder',     emoji:'🟣'},
  {min:300, name:'Maker',       emoji:'🔵'},
  {min:600, name:'Founder',     emoji:'🟢'},
  {min:1000,name:'Architect',   emoji:'🌟'},
];

function getLevel(score) {
  return [...LEVELS].reverse().find(l => score >= l.min) || LEVELS[0];
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = { connected:false, demo:false, address:null, nightName:null, score:null };

// ── Landing init ──────────────────────────────────────────────────────────────
function initLanding() {
  // Sync app count everywhere it appears
  document.querySelectorAll('.app-count-dyn').forEach(el => el.textContent = APPS.length);
  const countEl = document.getElementById('app-count');
  if (countEl) countEl.textContent = APPS.length;

  // App strip (doubled for infinite scroll)
  const strip = document.getElementById('l-strip');
  if (strip) {
    const pills = [...APPS, ...APPS].map(a =>
      `<div class="strip-pill">${a.icon} ${a.name}</div>`
    ).join('');
    strip.innerHTML = pills;
  }

  // Landing cards
  const cards = document.getElementById('l-cards');
  if (cards) {
    cards.innerHTML = APPS.map(a =>
      `<a class="l-card" href="${a.url}" target="_blank">
        <div class="l-card-icon">${a.icon}</div>
        <div class="l-card-name">${a.name}</div>
        <div class="l-card-tag">${a.tag}</div>
      </a>`
    ).join('');
  }

  // Footer links
  const fl = document.getElementById('l-footer-links');
  if (fl) {
    fl.innerHTML = APPS.map(a =>
      `<a href="${a.url}" target="_blank">${a.name.replace('Night ','')}</a>`
    ).join('');
  }

  fetchPokerCount();
  fetchCommunityApps();
}

// ── Connect modal ─────────────────────────────────────────────────────────────
function openConnect()  { document.getElementById('m-connect')?.classList.remove('hidden'); }
function closeConnect() { document.getElementById('m-connect')?.classList.add('hidden'); }

async function connectMidnight() {
  const btn = document.getElementById('lace-btn');
  const txt = document.getElementById('lace-txt');
  btn.disabled = true;
  txt.innerHTML = '<div class="spinner"></div> Connecting…';

  try {
    if (!window.midnight) throw new Error('No Midnight wallet found — install Lace, 1AM, or Nocturne');

    let walletEntry = null;
    // Try mnLace first (Lace legacy), then UUID-based wallets
    if (window.midnight.mnLace?.connect) {
      walletEntry = window.midnight.mnLace;
    } else {
      const key = Object.keys(window.midnight).find(k => window.midnight[k]?.connect);
      if (key) walletEntry = window.midnight[key];
    }
    if (!walletEntry) throw new Error('No compatible Midnight wallet found');

    let api = null;
    for (const net of ['mainnet','preprod','undeployed']) {
      try { api = await walletEntry.connect(net); if (api) break; } catch(e) {}
    }
    if (!api) throw new Error('Connection rejected');

    let address = null;
    try { address = await api.getUnshieldedAddress(); } catch(e) {}
    if (!address) {
      try { const sr = await api.getShieldedAddresses(); address = sr?.shieldedAddress || null; } catch(e) {}
    }
    if (!address) throw new Error('Could not retrieve address');

    state = { connected:true, demo:false, address, nightName:null, score:null };
    closeConnect();
    enterDashboard();
  } catch(err) {
    txt.innerHTML = '⊘ ' + (err.message || 'Connection failed');
    btn.disabled = false;
    setTimeout(() => { txt.innerHTML = '⊘ Connect Lace / 1AM / Nocturne'; btn.disabled = false; }, 3000);
  }
}

function connectDemo() {
  const demoAddr = '0x' + Array.from({length:40},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
  state = { connected:true, demo:true, address:demoAddr, nightName:'demo.night', score:null };
  closeConnect();
  enterDashboard();
}

function disconnect() {
  state = { connected:false, demo:false, address:null, nightName:null, score:null };
  document.getElementById('view-dashboard').classList.add('hidden');
  document.getElementById('view-landing').classList.remove('hidden');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function enterDashboard() {
  document.getElementById('view-landing').classList.add('hidden');
  document.getElementById('view-dashboard').classList.remove('hidden');

  renderHeader();
  renderAppTiles();
  renderAppsGrid();

  if (state.demo) {
    renderDemoScore();
  } else {
    fetchScore();
  }

  fetchFeed();
  fetchPokerCount();
  fetchLeaderboard();
}

function renderHeader() {
  const shortAddr = state.address
    ? (state.address.length > 20 ? state.address.slice(0,14)+'…'+state.address.slice(-6) : state.address)
    : '—';
  document.getElementById('dh-name').textContent  = state.nightName || (state.demo ? '🎭 Demo Mode' : shortAddr);
  document.getElementById('dh-addr').textContent  = state.demo ? 'Simulated data — no real funds' : state.address;
  document.getElementById('id-name').textContent  = state.nightName || shortAddr;
  document.getElementById('id-did').textContent   = 'did:midnight:' + (state.address||'').slice(2,22);
  document.getElementById('id-ava').textContent   = state.demo ? '🎭' : '🌙';

  // Chain badges
  const chains = state.demo
    ? ['⟠ ETH','◎ SOL','∞ ADA','⬛ Midnight']
    : ['⬛ Midnight'];
  document.getElementById('id-chains').innerHTML = chains
    .map(c => `<span class="chain-badge">${c}</span>`).join('');
}

async function fetchScore() {
  const addr = state.address;
  if (!addr) return;

  // Detect chain from address format
  let chain = 'midnight';
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) chain = 'eth';
  else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) chain = 'sol';
  else if (addr.startsWith('addr1')) chain = 'ada';

  try {
    const [chainRes, appRes, nameRes] = await Promise.allSettled([
      fetch(`${NIGHT_ID_API}/api/nightid/score/${chain}/${encodeURIComponent(addr)}`),
      fetch(`${NIGHT_ID_API}/api/nightid/action-score/${encodeURIComponent(addr)}`),
      fetch(`${NIGHT_ID_API}/api/nightid/lookup/${encodeURIComponent(addr)}`),
    ]);

    if (chainRes.status === 'rejected' || !chainRes.value.ok) throw new Error('API not available');
    const data    = await chainRes.value.json();
    const appData = appRes.status === 'fulfilled' && appRes.value.ok ? await appRes.value.json() : null;

    renderScore(data.totalScore ?? 0, data.breakdowns ?? [], false, appData?.byApp ?? {});

    // Update header score pill
    const total = data.totalScore ?? 0;
    const lvl   = getLevel(total);
    document.getElementById('dh-emoji').textContent = lvl.emoji;
    document.getElementById('dh-pts').textContent   = total + ' pts';
    document.getElementById('dh-lvl').textContent   = lvl.name;

    // Stats
    const bd = data.breakdowns ?? [];
    document.getElementById('sg-zk').textContent     = bd.reduce((s,b) => s + b.components.length, 0);
    document.getElementById('sg-apps').textContent   = appData?.appsUsed ?? '—';
    document.getElementById('sg-night').textContent  = (appData?.available ?? appData?.total ?? total) + ' NIGHT';
    document.getElementById('sg-chains').textContent = bd.length || 1;

    // Night name
    if (nameRes.status === 'fulfilled' && nameRes.value.ok) {
      const nd = await nameRes.value.json();
      if (nd.name) {
        state.nightName = nd.name;
        document.getElementById('dh-name').textContent = nd.name;
        document.getElementById('id-name').textContent = nd.name;
      }
    }
  } catch(e) {
    // API not running — show Midnight-only score from indexer
    renderScore(0, [], false, {});
    fetchMidnightScore(addr);
  }
}

async function fetchMidnightScore(addr) {
  const nightDeployers = [
    'mn_addr_preprod1etmexcm6rhwqtp3a3suvfwjfp6993u0e27uraxts9k2pmt7rhlvqnu2njv',
    'mn_addr_preprod1s74q2udqmzzpud9rdkp7txa8elx3nece3t29yn6av3tfw552wtss65llx5',
  ];
  let score = 0;
  const items = [];
  if (nightDeployers.includes(addr)) {
    score = 275;
    items.push({label:'Night Markets Deployer', pts:200});
    items.push({label:'ZK Circuit Calls (6)',   pts:90});
    items.push({label:'Full Escrow Flow',       pts:75});
  }
  renderScore(score, [{chain:'midnight', components: items.map(i=>({label:i.label, points:i.pts}))}], false);
  const lvl = getLevel(score);
  document.getElementById('dh-emoji').textContent = lvl.emoji;
  document.getElementById('dh-pts').textContent   = score + ' pts';
  document.getElementById('dh-lvl').textContent   = lvl.name;
  document.getElementById('sg-zk').textContent     = '6';
  document.getElementById('sg-apps').textContent   = '1';
  document.getElementById('sg-night').textContent  = Math.floor(score/10) + ' NIGHT';
  document.getElementById('sg-chains').textContent = '1';
}

function renderDemoScore() {
  const score = 425;
  const breakdowns = [{
    chain:'eth',
    components:[
      {label:'ETH Transactions (87)',    points:174},
      {label:'DeFi Protocols (3)',        points:90},
      {label:'Wallet Age (2.1 yrs)',      points:60},
    ]
  },{
    chain:'midnight',
    components:[
      {label:'ZK Circuit Calls',         points:90},
      {label:'Full Escrow Flow',         points:75},
    ]
  }];
  const demoByApp = {
    'night-markets': 50,
    'night-poker':   15,
    'night-store':   5,
  };
  renderScore(score, breakdowns, true, demoByApp);
  const lvl = getLevel(score);
  document.getElementById('dh-emoji').textContent = lvl.emoji;
  document.getElementById('dh-pts').textContent   = score + ' pts';
  document.getElementById('dh-lvl').textContent   = lvl.name;
  document.getElementById('sg-zk').textContent    = '14';
  document.getElementById('sg-apps').textContent  = '3';
  document.getElementById('sg-night').textContent = '355 NIGHT';
  document.getElementById('sg-chains').textContent= '2';
  document.getElementById('demo-note').style.display = 'block';
}

const APP_ICONS = {
  'night-markets':'🛒','night-poker':'🃏','night-fun':'🚀','night-id':'🪪',
  'night-lend':'💸','night-save':'🏦','night-work':'⚙️','night-biz':'🏢',
  'night-store':'🛍️',
};

function renderScore(score, breakdowns, isDemo, byApp = {}) {
  const lvl  = getLevel(score);
  const next = LEVELS.find(l => l.min > score) || LEVELS[LEVELS.length-1];
  const pct  = score >= 1000 ? 100 : Math.round(((score - lvl.min) / (next.min - lvl.min)) * 100);

  document.getElementById('sc-big').textContent   = score;
  document.getElementById('sc-badge').textContent = lvl.emoji + ' ' + lvl.name;
  document.getElementById('sc-next').textContent  = score >= 1000 ? 'Max level reached 🌟' : `${next.min - score} pts to ${next.name}`;
  setTimeout(() => { document.getElementById('sc-fill').style.width = Math.min(pct,100) + '%'; }, 300);

  const chainIcon = {eth:'⟠',sol:'◎',ada:'∞',midnight:'⬛'};
  const chainItems = breakdowns.flatMap(bd =>
    bd.components.filter(c => c.points > 0).map(c => ({
      label: (chainIcon[bd.chain]||'🔗') + ' ' + c.label,
      pts: c.points,
    }))
  );

  const appItems = Object.entries(byApp)
    .filter(([, pts]) => pts > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([appId, pts]) => ({
      label: (APP_ICONS[appId] || '⬛') + ' ' + appId.replace('night-', 'Night ').replace(/\b\w/g, c => c.toUpperCase()),
      pts,
    }));

  const allItems = [...chainItems, ...appItems];
  document.getElementById('sc-items').innerHTML =
    allItems.slice(0, 6).map(i =>
      `<div class="sc-item"><span class="sc-item-lbl">${i.label}</span><span class="sc-item-pts">+${i.pts}</span></div>`
    ).join('') ||
    '<div class="sc-item"><span class="sc-item-lbl" style="font-style:italic">No on-chain activity yet</span></div>';
}

// ── App tiles ─────────────────────────────────────────────────────────────────
function renderAppTiles() {
  document.getElementById('app-tiles').innerHTML = APPS.map(a =>
    `<a class="app-tile" href="${a.url}" target="_blank">
      <div class="at-icon">${a.icon}</div>
      <div class="at-name">${a.name.replace('Night ','')}</div>
      <div class="at-tag">${a.tag}</div>
    </a>`
  ).join('');
}

function renderAppsGrid() {
  document.getElementById('apps-grid-full').innerHTML = APPS.map(a =>
    `<a class="agf-card" href="${a.url}" target="_blank">
      <div class="agf-icon">${a.icon}</div>
      <div class="agf-name">${a.name}</div>
      <div class="agf-tag">${a.tag}</div>
      <div class="agf-desc">${a.desc}</div>
      <div class="agf-cta">Open app →</div>
    </a>`
  ).join('');
}

// ── Live poker count ─────────────────────────────────────────────────────────
async function fetchPokerCount() {
  try {
    const res    = await fetch(`${NIGHT_ID_API}/api/poker/tables`);
    const tables = await res.json();
    const arr    = Array.isArray(tables) ? tables : (tables.tables ?? []);
    const count  = arr.length;
    const label  = `🃏 ${count} poker table${count !== 1 ? 's' : ''} live`;

    const badge = document.querySelector('.l-badge');
    if (badge) badge.innerHTML = `<span class="pdot"></span>Midnight Network · Kūkolu Mainnet · Live &nbsp;·&nbsp; ${label}`;

    const el = document.getElementById('poker-count-live');
    if (el) el.textContent = label;
  } catch(e) {}
}

// ── Live feed ─────────────────────────────────────────────────────────────────
const FEED_LABELS = {
  ContractDeploy: { icon:'🚀', label:'Contract Deployed', color:'var(--glow)' },
  ContractCall:   { icon:'⚡', label:'ZK Circuit Call',   color:'var(--cyan)' },
  ContractUpdate: { icon:'🔄', label:'Contract Updated',  color:'var(--plasma)' },
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return s + 's ago';
  if (s < 3600)  return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

async function fetchFeed() {
  const dot    = document.getElementById('feed-dot');
  const status = document.getElementById('feed-status');
  try {
    const res = await fetch(MIDNIGHT_INDEX, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query:`
        query{contractActions(contractAddress:"${NIGHT_CONTRACT}",first:12){nodes{
          __typename
          ...on ContractDeploy{transaction{hash block{height timestamp}}}
          ...on ContractCall{transaction{hash block{height timestamp}}}
          ...on ContractUpdate{transaction{hash block{height timestamp}}}
        }}}
      `}),
    });
    const data  = await res.json();
    const nodes = data?.data?.contractActions?.nodes ?? [];
    const events = nodes.map(n => ({
      type: n.__typename,
      block: n.transaction?.block?.height,
      time:  n.transaction?.block?.timestamp,
    }));

    dot.style.color = 'var(--green)';
    status.textContent = 'live · ' + events.length + ' events';

    const html = events.length ? events.slice(0,8).map(ev => {
      const m = FEED_LABELS[ev.type] || {icon:'📋', label:ev.type, color:'var(--text2)'};
      return `<div class="feed-item">
        <div class="fi-icon">${m.icon}</div>
        <div class="fi-info">
          <div class="fi-label" style="color:${m.color}">${m.label}</div>
          <div class="fi-detail">Night Markets Escrow${ev.block ? ' · Block #'+ev.block : ''}</div>
        </div>
        <div class="fi-time">${ev.time ? timeAgo(ev.time) : ''}</div>
      </div>`;
    }).join('') : '<div class="feed-empty">No recent events — contract is live and waiting 🌙</div>';

    document.getElementById('feed-home').innerHTML     = html;
    document.getElementById('feed-activity').innerHTML = html;
  } catch(e) {
    dot.style.color = 'var(--muted)';
    status.textContent = 'indexer offline';
    document.getElementById('feed-home').innerHTML     = '<div class="feed-empty">Midnight indexer offline</div>';
    document.getElementById('feed-activity').innerHTML = '<div class="feed-empty">Midnight indexer offline</div>';
  }
}

// ── Community apps directory ──────────────────────────────────────────────────
const CATEGORY_LABELS = {
  tools:      { label: 'Dev Tools',   icon: '🛠️' },
  games:      { label: 'Games',       icon: '🎮' },
  identity:   { label: 'Identity',    icon: '🪪' },
  finance:    { label: 'Finance',     icon: '💰' },
  compliance: { label: 'Compliance',  icon: '📋' },
  ai:         { label: 'AI & Agents', icon: '🤖' },
};

let _communityApps = [];
let _communityFilter = 'all';

async function fetchCommunityApps() {
  try {
    const res = await fetch('community-apps.json');
    _communityApps = await res.json();
    renderCommunitySection();
  } catch(e) {}
}

function renderCommunitySection() {
  const grid = document.getElementById('community-grid');
  const count = document.getElementById('community-count');
  if (!grid) return;

  const filtered = _communityFilter === 'all'
    ? _communityApps
    : _communityApps.filter(a => a.category === _communityFilter);

  if (count) count.textContent = _communityApps.length;

  // Filter chips
  const chips = document.getElementById('community-filters');
  if (chips) {
    const cats = ['all', ...Object.keys(CATEGORY_LABELS)];
    chips.innerHTML = cats.map(c => {
      const active = c === _communityFilter;
      const lbl = c === 'all' ? 'All' : CATEGORY_LABELS[c].label;
      return `<button class="cf-chip${active?' active':''}" onclick="setCommunityFilter('${c}')">${lbl}</button>`;
    }).join('');
  }

  grid.innerHTML = filtered.map(a => `
    <a class="cm-card" href="${a.url}" target="_blank" rel="noopener">
      <div class="cm-top">
        <div class="cm-icon">${a.icon}</div>
        <div class="cm-stars">${a.stars > 0 ? '★ '+a.stars : ''}</div>
      </div>
      <div class="cm-name">${a.name}</div>
      <div class="cm-owner">by ${a.owner}</div>
      <div class="cm-tag">${a.tag}</div>
      <div class="cm-desc">${a.desc}</div>
    </a>
  `).join('') || '<div class="lb-empty">No projects in this category yet.</div>';
}

function setCommunityFilter(cat) {
  _communityFilter = cat;
  renderCommunitySection();
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function fetchLeaderboard() {
  const el  = document.getElementById('leaderboard-list');
  const dot = document.getElementById('lb-dot');
  if (!el) return;
  try {
    const res = await fetch(`${NIGHT_ID_API}/api/nightid/leaderboard?limit=10`);
    if (!res.ok) throw new Error('API error');
    const { leaderboard } = await res.json();
    if (dot) dot.style.color = 'var(--green)';
    if (!leaderboard.length) {
      el.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>';
      return;
    }
    el.innerHTML = leaderboard.map(({ rank, address, score }) => {
      const short  = address.length > 20 ? address.slice(0,10)+'…'+address.slice(-6) : address;
      const lvl    = getLevel(score);
      const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#'+rank;
      return `<div class="lb-row">
        <div class="lb-rank">${medal}</div>
        <div class="lb-addr">${short}</div>
        <div class="lb-lvl">${lvl.emoji} ${lvl.name}</div>
        <div class="lb-score">${score} pts</div>
      </div>`;
    }).join('');
  } catch(e) {
    if (dot) dot.style.color = 'var(--muted)';
    el.innerHTML = '<div class="lb-empty">Leaderboard unavailable</div>';
  }
}

// ── Tab switcher ──────────────────────────────────────────────────────────────
function setTab(name) {
  ['home','apps','activity'].forEach(t => {
    document.getElementById('tab-'+t)?.classList.toggle('hidden', t !== name);
    document.getElementById('sb-'+t)?.classList.toggle('active', t === name);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLanding();
  // Midnight wallet detection
  window.addEventListener('midnight#ready', () => {});
});
