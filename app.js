import { supabase, getProfile, createClass, joinClass, toast } from './supabase.js';
import { initPracticeView } from './practice.js';
import { initAssessmentView } from './assessment.js';
import { initTeacherView } from './teacher.js';
import { initAdminView } from './admin.js';

window.state = { user: null, profile: null };

const views = {
  dashboard: { title: 'Dashboard', init: () => {} },
  practice: { title: 'Practice', init: initPracticeView },
  teacher: { title: 'Teacher', init: initTeacherView },
  admin: { title: 'Admin', init: initAdminView },
};

window.showView = function(name) {
  if (name === 'assessment') {
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('view-auth').classList.remove('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-assessment').classList.add('active');
    // Assessment lives outside the shell
    initAssessmentView();
    return;
  }

  // Show Shell
  document.getElementById('app-shell').style.display = 'flex';
  document.getElementById('view-auth').classList.remove('active');
  document.getElementById('view-assessment').style.display = 'none';

  // Route
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.getElementById('topbar-title').textContent = views[name]?.title || 'Dashboard';
  
  // Highlight Sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === name);
  });

  if (views[name]?.init) views[name].init();
  if (name === 'dashboard') renderDashboard();
};

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  const p = window.state.profile;
  
  let html = `
    <button class="nav-item active" data-view="dashboard">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
      Dashboard
    </button>
    <button class="nav-item" data-view="practice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      Practice
    </button>
  `;

  if (p.role === 'teacher' || p.role === 'admin') {
    html += `<button class="nav-item" data-view="teacher">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
      Teacher Dashboard
    </button>`;
  }

  if (p.role === 'admin') {
    html += `<button class="nav-item" data-view="admin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      Admin God Mode
    </button>`;
  }

  nav.innerHTML = html;

  // Bind clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => showView(item.dataset.view);
  });
}

async function refreshUser() {
  const { data: { session } } = await supabase.auth.getSession();
  window.state.user = session?.user || null;
  window.state.profile = session ? await getProfile() : null;
}

function renderDashboard() {
  const p = window.state.profile;
  document.getElementById('dash-name').textContent = p.username;
  
  // Topbar stats
  document.getElementById('tb-grade').textContent = p.grade_level || '-';
  document.getElementById('tb-notes').textContent = p.note_balance || 0;
  document.getElementById('tb-rhythm').textContent = p.current_rhythm || 0;
  
  // Sidebar
  document.getElementById('sb-username').textContent = p.username;
  document.getElementById('sb-role').textContent = p.role;
  document.getElementById('sb-avatar').textContent = p.username.charAt(0).toUpperCase();
}

// Global Events
document.getElementById('btn-signout').onclick = async () => {
  await supabase.auth.signOut();
  window.location.reload();
};

document.getElementById('btn-practice').onclick = () => showView('practice');
document.getElementById('card-go-practice').onclick = () => showView('practice');

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
  if (!name || !passcode) return;
  try {
    const r = await createClass(name, passcode);
    msg.innerHTML = `Created! Code: <span style="color:var(--accent);font-weight:bold;">${r.join_code}</span>`;
    msg.className = 'msg ok';
    await refreshUser();
    renderSidebar();
    initTeacherView();
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

// Auth Logic
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
  msg.textContent = 'Signing in…'; msg.className = 'msg text-center';
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('si-email').value, password: document.getElementById('si-pass').value,
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg text-center err'; return; }
  await refreshUser(); bootApp();
};

document.getElementById('form-signup').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Creating account…'; msg.className = 'msg text-center';
  const { error } = await supabase.auth.signUp({
    email: document.getElementById('su-email').value, password: document.getElementById('su-pass').value,
    options: { data: { username: document.getElementById('su-username').value } },
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg text-center err'; return; }
  await refreshUser();
  if (window.state.user) bootApp();
  else { msg.textContent = 'Check your email to confirm, then sign in.'; msg.className = 'msg text-center ok'; }
};

// Boot
async function bootApp() {
  if (!window.state.user) {
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('view-auth').classList.add('active');
    return;
  }
  
  if (!window.state.profile.diagnostic_complete) {
    showView('assessment');
  } else {
    document.getElementById('view-auth').classList.remove('active');
    renderSidebar();
    renderDashboard();
    showView('dashboard');
  }
}

refreshUser().then(bootApp);
supabase.auth.onAuthStateChange(async () => {
  await refreshUser();
  bootApp();
});
