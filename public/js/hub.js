// ── Night Hub — JS ────────────────────────────────────────────

const nightScore = JSON.parse(localStorage.getItem('night_score') || '{"score":0,"hands":0,"tokens":0,"zk":0}');

let walletState = { connected: false, demo: false, address: null };

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── Wallet ────────────────────────────────────────────────────
function connectDemo() {
  walletState = {
    connected: true, demo: true,
    address: 'midnight1' + Math.random().toString(36).slice(2, 10),
  };
  closeModal('ov-wallet');
  updateWalletUI();
  showScoreStrip();
  toast('🎭 Demo wallet connected', 'success');
}

function updateWalletUI() {
  const dot = document.getElementById('wallet-dot');
  const lbl = document.getElementById('wallet-label');
  if (!dot || !lbl) return;
  if (walletState.connected) {
    dot.className = 'dot dot-on';
    lbl.textContent = walletState.demo ? '🎭 Demo' : walletState.address.slice(0, 12) + '…';
  } else {
    dot.className = 'dot dot-off';
    lbl.textContent = 'Sign in';
  }
}

// ── Night Score strip ─────────────────────────────────────────
function showScoreStrip() {
  const strip = document.getElementById('score-strip');
  if (!strip) return;
  strip.style.display = 'block';
  document.getElementById('score-address').textContent = walletState.address;

  // Animate score from localStorage (or demo seed)
  const score = nightScore.score || Math.floor(Math.random() * 400) + 50;
  const pct   = Math.min((score / 2000) * 100, 100);
  setTimeout(() => {
    document.getElementById('score-bar').style.width   = pct + '%';
    document.getElementById('score-level').textContent = `Night Score: ${score}`;
    document.getElementById('sc-hands').textContent    = nightScore.hands  || Math.floor(Math.random() * 40) + 5;
    document.getElementById('sc-tokens').textContent   = nightScore.tokens || Math.floor(Math.random() * 8);
    document.getElementById('sc-zk').textContent       = nightScore.zk     || Math.floor(Math.random() * 60) + 10;
  }, 300);
}

// ── Modals ────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Wallet button ─────────────────────────────────────────────
document.getElementById('wallet-btn')?.addEventListener('click', () => {
  if (walletState.connected) {
    walletState = { connected: false, demo: false, address: null };
    updateWalletUI();
    document.getElementById('score-strip').style.display = 'none';
    toast('Wallet disconnected', 'info');
  } else {
    openModal('ov-wallet');
  }
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateWalletUI();
});
