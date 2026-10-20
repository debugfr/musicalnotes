import { supabase, getProfile, createClass, joinClass, toast } from './supabase.js';
import { initPracticeView } from './practice.js';
import { initTeacherView } from './teacher.js';

window.state = { user: null, profile: null };

window.showView = function(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  renderNav();
  if (name === 'dashboard') renderDashboard();
  if (name === 'practice') initPracticeView();
  if (name === 'teacher') initTeacherView();
};

function renderNav() {
  const nav = document.getElementById('nav');
  if (!window.state.user) { nav.innerHTML = ''; return; }
  nav.innerHTML = `
    <button id="nav-dash">Dashboard</button>
    <button id="nav-practice">Practice</button>
    <button id="nav-signout">Sign Out</button>
  `;
}

async function refreshUser() {
  const { data: { session } } = await supabase.auth.getSession();
  window.state.user = session?.user || null;
  window.state.profile = session ? await getProfile() : null;
}

function renderDashboard() {
  if (!window.state.profile) return;
  document.getElementById('dash-hello').textContent = `Hello, ${window.state.profile.username || 'Student'}`;
  const stats = [
    { num: window.state.profile.note_balance, lbl: 'Notes' },
    { num: window.state.profile.current_rhythm, lbl: 'Rhythm (days)' },
    { num: window.state.profile.role, lbl: 'Role' },
  ];
  document.getElementById('dash-stats').innerHTML = stats.map(s =>
    `<div class="stat"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`
  ).join('');
  
  document.getElementById('btn-teacher').style.display = window.state.profile.role === 'teacher' ? 'inline-flex' : 'none';
}

// Global Click Delegation to prevent missing event listeners
document.body.addEventListener('click', async (e) => {
  if (e.target.closest('#logo')) window.showView(window.state.user ? 'dashboard' : 'landing');
  if (e.target.closest('#btn-start')) window.showView('auth');
  if (e.target.closest('#btn-practice')) window.showView('practice');
  if (e.target.closest('#btn-teacher')) window.showView('teacher');
  if (e.target.closest('#nav-dash')) window.showView('dashboard');
  if (e.target.closest('#nav-practice')) window.showView('practice');
  if (e.target.closest('#nav-signout')) {
    await supabase.auth.signOut();
    window.state.user = null;
    window.state.profile = null;
    window.showView('landing');
  }
});

// Auth Tabs
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
  window.showView('dashboard');
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
  if (window.state.user) window.showView('dashboard');
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
    msg.innerHTML = `Created! Code: <span class="code">${r.join_code}</span>`;
    msg.className = 'msg ok';
    await refreshUser();
    toast('You are now a teacher!');
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

// Initial Boot
(async () => {
  await refreshUser();
  window.showView(window.state.user ? 'dashboard' : 'landing');
})();

supabase.auth.onAuthStateChange(async () => {
  await refreshUser();
  renderNav();
});
