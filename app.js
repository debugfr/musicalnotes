import { supabase, getProfile, createClass, joinClass, toast } from './supabase.js';
import { initPracticeView, initDiagnosticView } from './practice.js';
import { initTeacherView } from './teacher.js';

window.state = { user: null, profile: null };

window.showView = function(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  renderNav();
  
  if (name === 'dashboard') {
    if (!window.state.profile.diagnostic_complete) {
      showView('diagnostic');
      initDiagnosticView();
    } else {
      renderDashboard();
    }
  }
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
  document.getElementById('dash-grade').textContent = window.state.profile.grade_level;
  document.getElementById('dash-notes').textContent = window.state.profile.note_balance;
  document.getElementById('dash-rhythm').textContent = window.state.profile.current_rhythm;
  document.getElementById('dash-role').textContent = window.state.profile.role;
  
  const tBtn = document.getElementById('btn-teacher');
  tBtn.style.display = (window.state.profile.role === 'teacher' || window.state.profile.role === 'admin') ? 'inline-flex' : 'none';
}

// Event Listeners
document.getElementById('logo').onclick = () => showView(window.state.user ? 'dashboard' : 'landing');
document.getElementById('btn-start').onclick = () => showView('auth');
document.getElementById('btn-practice').onclick = () => showView('practice');
document.getElementById('btn-teacher').onclick = () => showView('teacher');

document.getElementById('nav').addEventListener('click', async (e) => {
  if (e.target.id === 'nav-dash') showView('dashboard');
  if (e.target.id === 'nav-practice') showView('practice');
  if (e.target.id === 'nav-signout') {
    await supabase.auth.signOut();
    window.state.user = null; window.state.profile = null;
    showView('landing');
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById('form-' + tab.dataset.tab).classList.add('active');
  };
});

document.getElementById('form-signin').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Signing in…'; msg.className = 'msg';
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('si-email').value, password: document.getElementById('si-pass').value,
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg err'; return; }
  await refreshUser(); showView('dashboard');
};

document.getElementById('form-signup').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Creating account…'; msg.className = 'msg';
  const { error } = await supabase.auth.signUp({
    email: document.getElementById('su-email').value, password: document.getElementById('su-pass').value,
    options: { data: { username: document.getElementById('su-username').value } },
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg err'; return; }
  await refreshUser();
  if (window.state.user) showView('dashboard');
  else { msg.textContent = 'Check your email to confirm, then sign in.'; msg.className = 'msg ok'; }
};

document.getElementById('btn-join').onclick = async () => {
  const code = document.getElementById('join-code').value.trim();
  const msg = document.getElementById('join-msg');
  try {
    const r = await joinClass(code);
    msg.textContent = `Joined ${r.name}!`; msg.className = 'msg ok';
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

document.getElementById('btn-create').onclick = async () => {
  const name = document.getElementById('class-name').value.trim();
  const passcode = document.getElementById('teacher-passcode').value.trim();
  const msg = document.getElementById('create-msg');
  if (!name || !passcode) { msg.textContent = 'Name and passcode required.'; msg.className = 'msg err'; return; }
  
  try {
    const r = await createClass(name, passcode);
    msg.innerHTML = `Created! Code: <span class="code">${r.join_code}</span>`;
    msg.className = 'msg ok';
    await refreshUser();
    toast('Teacher role unlocked!');
    renderDashboard();
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

refreshUser().then(() => showView(window.state.user ? 'dashboard' : 'landing'));
supabase.auth.onAuthStateChange(async () => {
  await refreshUser();
  if(document.getElementById('nav')) renderNav();
});
