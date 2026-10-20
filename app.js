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
    initAssessmentView();
    return;
  }

  document.getElementById('app-shell').style.display = 'flex';
  document.getElementById('view-auth').classList.remove('active');
  document.getElementById('view-assessment').style.display = 'none';

  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.getElementById('topbar-title').textContent = views[name]?.title || 'Dashboard';
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === name);
  });

  if (views[name]?.init) views[name].init();
  if (name === 'dashboard') renderDashboard();
};

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  
  const p = window.state.profile;
  
  let html = `
    <button type="button" class="nav-item active" data-view="dashboard">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
      Dashboard
    </button>
    <button type="button" class="nav-item" data-view="practice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      Practice
    </button>
  `;

  if (p.role === 'teacher' || p.role === 'admin') {
    html += `<button type="button" class="nav-item" data-view="teacher">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
      Teacher Dashboard
    </button>`;
  }

  if (p.role === 'admin') {
    html += `<button type="button" class="nav-item" data-view="admin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      Admin God Mode
    </button>`;
  }

  nav.innerHTML = html;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => showView(item.dataset.view);
  });
}

async function refreshUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    window.state.user = session?.user || null;
    window.state.profile = session ? await getProfile() : null;
  } catch (e) {
    console.error(e);
  }
}

function renderDashboard() {
  const p = window.state.profile;
  if (!p) return;
  
  if (document.getElementById('dash-name')) document.getElementById('dash-name').textContent = p.username;
  if (document.getElementById('tb-grade')) document.getElementById('tb-grade').textContent = p.grade_level || '-';
  if (document.getElementById('tb-notes')) document.getElementById('tb-notes').textContent = p.note_balance || 0;
  if (document.getElementById('tb-rhythm')) document.getElementById('tb-rhythm').textContent = p.current_rhythm || 0;
  
  if (document.getElementById('sb-username')) document.getElementById('sb-username').textContent = p.username;
  if (document.getElementById('sb-role')) document.getElementById('sb-role').textContent = p.role;
  if (document.getElementById('sb-avatar')) document.getElementById('sb-avatar').textContent = p.username.charAt(0).toUpperCase();
}

// --- Bind Events Safely ---
document.getElementById('btn-signout')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

document.getElementById('btn-practice')?.addEventListener('click', () => showView('practice'));
document.getElementById('card-go-practice')?.addEventListener('click', () => showView('practice'));

document.getElementById('btn-join')?.addEventListener('click', async () => {
  const code = document.getElementById('join-code').value.trim();
  const msg = document.getElementById('join-msg');
  try {
    const r = await joinClass(code);
    msg.textContent = `Joined ${r.name}!`; msg.className = 'msg ok';
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
});

document.getElementById('btn-create')?.addEventListener('click', async () => {
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
});

// Auth Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById('form-' + tab.dataset.tab).classList.add('active');
  });
});

// Forms
document.getElementById('form-signin')?.addEventListener('submit', async (e) => {
  e.preventDefault(); // This stops the page refresh
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Signing in…'; msg.className = 'msg text-center';
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('si-email').value, password: document.getElementById('si-pass').value,
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg text-center err'; return; }
  await refreshUser(); bootApp();
});

document.getElementById('form-signup')?.addEventListener('submit', async (e) => {
  e.preventDefault(); // This stops the page refresh
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
});

async function bootApp() {
  if (!window.state.user) {
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('view-auth').classList.add('active');
    return;
  }
  
  if (!window.state.profile?.diagnostic_complete) {
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
