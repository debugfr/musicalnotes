import { supabase, getProfile, createClass, joinClass, toast } from './supabase.js';
import { initPracticeView } from './practice.js';
import { initTeacherView } from './teacher.js';

export const state = { user: null, profile: null };

const views = ['landing', 'auth', 'dashboard', 'practice', 'teacher'];

export function showView(name) {
  views.forEach(v => document.getElementById('view-' + v)?.classList.toggle('active', v === name));
  renderNav();
  if (name === 'dashboard') renderDashboard();
  if (name === 'practice') initPracticeView();
  if (name === 'teacher') initTeacherView();
}

function renderNav() {
  const nav = document.getElementById('nav');
  if (!state.user) { nav.innerHTML = ''; return; }
  nav.innerHTML = `
    <button id="nav-dash">Dashboard</button>
    <button id="nav-practice">Practice</button>
    <button id="nav-signout">Sign Out</button>
  `;
  nav.querySelector('#nav-dash').onclick = () => showView('dashboard');
  nav.querySelector('#nav-practice').onclick = () => showView('practice');
  nav.querySelector('#nav-signout').onclick = async () => {
    await supabase.auth.signOut();
    state.user = null; state.profile = null;
    showView('landing');
  };
}

async function refreshUser() {
  const { data: { session } } = await supabase.auth.getSession();
  state.user = session?.user || null;
  state.profile = session ? await getProfile() : null;
}

async function renderDashboard() {
  if (!state.profile) return;
  document.getElementById('dash-hello').textContent = `Hi, ${state.profile.username || 'musician'}! 🎶`;
  const stats = [
    { num: state.profile.note_balance, lbl: 'Notes' },
    { num: state.profile.current_rhythm, lbl: 'Rhythm (days)' },
    { num: state.profile.role, lbl: 'Role' },
  ];
  document.getElementById('dash-stats').innerHTML = stats.map(s =>
    `<div class="stat"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`
  ).join('');
  document.getElementById('btn-teacher').style.display = state.profile.role === 'teacher' ? '' : 'none';
}

// ---------- Boot ----------
document.getElementById('logo').onclick = () => showView(state.user ? 'dashboard' : 'landing');
document.getElementById('btn-start').onclick = () => showView('auth');
document.getElementById('btn-practice').onclick = () => showView('practice');
document.getElementById('btn-teacher').onclick = () => showView('teacher');

// Auth tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById('form-' + tab.dataset.tab).classList.add('active');
  };
});

// Sign in
document.getElementById('form-signin').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Signing in…'; msg.className = 'msg';
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('si-email').value,
    password: document.getElementById('si-pass').value,
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg err'; return; }
  await refreshUser();
  showView('dashboard');
};

// Sign up
document.getElementById('form-signup').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Creating account…'; msg.className = 'msg';
  const { error } = await supabase.auth.signUp({
    email: document.getElementById('su-email').value,
    password: document.getElementById('su-pass').value,
    options: { data: { username: document.getElementById('su-username').value } },
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg err'; return; }
  await refreshUser();
  if (state.user) showView('dashboard');
  else { msg.textContent = 'Check your email to confirm, then sign in.'; msg.className = 'msg ok'; }
};

// Join class
document.getElementById('btn-join').onclick = async () => {
  const code = document.getElementById('join-code').value.trim();
  const msg = document.getElementById('join-msg');
  try {
    const r = await joinClass(code);
    msg.textContent = `Joined ${r.name}!`; msg.className = 'msg ok';
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

// Create class
document.getElementById('btn-create').onclick = async () => {
  const name = document.getElementById('class-name').value.trim();
  const msg = document.getElementById('create-msg');
  if (!name) return;
  try {
    const r = await createClass(name);
    msg.innerHTML = `Created! Join code: <span class="code">${r.join_code}</span>`;
    msg.className = 'msg ok';
    await refreshUser();
    toast('You are now a teacher!');
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

// Initial auth check
(async () => {
  await refreshUser();
  showView(state.user ? 'dashboard' : 'landing');
})();

supabase.auth.onAuthStateChange(async () => {
  await refreshUser();
  renderNav();
});
