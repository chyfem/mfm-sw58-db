// js/api.js — Centralized API client for MFM SW58 CMS
const API_BASE = '/api';

/* ── Token Management ─────────────────────────────────────── */
const Auth = {
  getToken:   () => localStorage.getItem('mfm_token'),
  setToken:   (t) => localStorage.setItem('mfm_token', t),
  getUser:    () => { try { return JSON.parse(localStorage.getItem('mfm_user')); } catch { return null; } },
  setUser:    (u) => localStorage.setItem('mfm_user', JSON.stringify(u)),
  clear:      () => { localStorage.removeItem('mfm_token'); localStorage.removeItem('mfm_user'); },
  isLoggedIn: () => !!localStorage.getItem('mfm_token'),
  isRole:     (...roles) => { const u = Auth.getUser(); return u && roles.includes(u.role); },
  isSuperAdmin: () => Auth.isRole('super_admin'),
};

/* ── Core Fetch ───────────────────────────────────────────── */
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (res.status === 401) {
    Auth.clear();
    window.location.href = '/pages/login.html';
    return;
  }
  return { ok: res.ok, status: res.status, data };
}

const api = {
  get:    (url)          => apiFetch(url),
  post:   (url, body)    => apiFetch(url, { method:'POST',   body: JSON.stringify(body) }),
  put:    (url, body)    => apiFetch(url, { method:'PUT',    body: JSON.stringify(body) }),
  delete: (url)          => apiFetch(url, { method:'DELETE' }),
};

/* ── Toast Notifications ──────────────────────────────────── */
function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;';
    document.body.appendChild(container);
  }
  const colors = { success:'#2d6a4f', error:'#c1121f', info:'#17a2b8', warning:'#856404' };
  const icons  = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
  const el = document.createElement('div');
  el.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:.75rem 1.2rem;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);max-width:320px;font-size:.9rem;display:flex;gap:.6rem;align-items:flex-start;animation:slideIn .25s ease;`;
  el.innerHTML = `<span style="font-weight:700">${icons[type]||'ℹ'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='.3s'; setTimeout(() => el.remove(), 300); }, duration);
}

/* ── Format Helpers ───────────────────────────────────────── */
const fmt = {
  currency: (n) => '₦' + parseFloat(n||0).toLocaleString('en-NG', {minimumFractionDigits:2}),
  date:     (d) => d ? new Date(d).toLocaleDateString('en-NG', {day:'2-digit',month:'short',year:'numeric'}) : '—',
  datetime: (d) => d ? new Date(d).toLocaleString('en-NG') : '—',
  initials: (name) => name ? name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?',
  monthName:(m)  => ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] || '',
};

/* ── Modal Helper ─────────────────────────────────────────── */
function openModal(id)  { const m=document.getElementById(id); if(m){ m.classList.add('open'); } }
function closeModal(id) { const m=document.getElementById(id); if(m){ m.classList.remove('open'); } }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
  if (e.target.classList.contains('modal-close'))   e.target.closest('.modal-overlay')?.classList.remove('open');
});

/* ── Confirm Dialog ───────────────────────────────────────── */
function confirmDialog(message, onConfirm) {
  const existing = document.getElementById('global-confirm');
  if (existing) existing.remove();
  const html = `
    <div class="modal-overlay open" id="global-confirm">
      <div class="modal" style="max-width:400px">
        <div class="modal-header"><h3>Confirm Action</h3><button class="modal-close">×</button></div>
        <div class="modal-body"><p>${message}</p></div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-close">Cancel</button>
          <button class="btn btn-danger" id="confirm-yes">Confirm</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('confirm-yes').onclick = () => { document.getElementById('global-confirm').remove(); onConfirm(); };
}

/* ── Loading State on Buttons ─────────────────────────────── */
function setLoading(btn, loading) {
  if (loading) { btn.dataset.origText = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Loading…'; btn.disabled = true; }
  else         { btn.innerHTML = btn.dataset.origText || btn.innerHTML; btn.disabled = false; }
}

/* ── Number animation ─────────────────────────────────────── */
function animateCount(el, target, duration = 800) {
  const start = 0;
  const step  = (target / duration) * 16;
  let   cur   = start;
  const timer = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(timer); }
    el.textContent = typeof target === 'number' && target > 999
      ? Math.round(cur).toLocaleString()
      : Math.round(cur);
  }, 16);
}

/* ── Sidebar Toggle (Admin) ───────────────────────────────── */
function initSidebarToggle() {
  const btn     = document.querySelector('.hamburger-admin');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  });
  if (overlay) overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

/* ── Public Navbar Mobile Toggle ──────────────────────────── */
function initMobileNav() {
  const btn  = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('open'));
}

/* ── Active Nav Link ──────────────────────────────────────── */
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && path.endsWith(href)) a.classList.add('active');
  });
}

/* ── Guard: redirect to login if not authenticated ─────────── */
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  return true;
}

/* ── Populate user info in sidebar ────────────────────────── */
function populateSidebarUser() {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl   = document.getElementById('sidebar-name');
  const roleEl   = document.getElementById('sidebar-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  const branchEl = document.getElementById('sidebar-branch');
  if (nameEl)   nameEl.textContent   = user.full_name;
  if (roleEl)   roleEl.textContent   = user.role.replace(/_/g,' ');
  if (avatarEl) avatarEl.textContent = fmt.initials(user.full_name);
  if (branchEl) branchEl.textContent = user.branch_name || '';
}

/* ── Logout ───────────────────────────────────────────────── */
async function logout() {
  try { await api.post('/auth/logout'); } catch {}
  Auth.clear();
  window.location.href = '/pages/login.html';
}

/* ── On DOM ready ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initSidebarToggle();
  setActiveNav();
  populateSidebarUser();

  document.querySelectorAll('[data-logout]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); logout(); });
  });
});
