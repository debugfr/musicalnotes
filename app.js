import { 
  supabase, getProfile, submitAnswer, completeDiagnostic, 
  createClass, joinClass, getMyClasses, getClassStudents, 
  getClassAttempts, getAdminStats, getGlobalAttempts, renderMath, toast 
} from './supabase.js';

window.state = { user: null, profile: null };

// ==========================================
// 1. QUESTION GENERATOR ENGINE
// ==========================================
function generateQuestion(diff) {
  let d = Math.max(1, Math.round(diff));
  let prompt = "", answer = 0;
  let type = ['numeric', 'mc', 'text', 'voice'][Math.floor(Math.random() * 4)];

  if (d === 1) {
    let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a} + ${b}`; answer = a + b;
  } else if (d === 2) {
    let a = Math.floor(Math.random() * 20) + 1, b = Math.floor(Math.random() * 20) + 1;
    if (Math.random() > 0.5) { prompt = `${a} + ${b}`; answer = a + b; }
    else { prompt = `${a + b} - ${b}`; answer = a; }
  } else if (d === 3) {
    let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a} \\times ${b}`; answer = a * b;
  } else if (d === 4) {
    let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a * b} \\div ${a}`; answer = b;
  } else if (d === 5) {
    let x = Math.floor(Math.random() * 10) + 1;
    let a = Math.floor(Math.random() * 5) + 2;
    let b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a}x + ${b} = ${a * x + b}`; answer = x;
  } else if (d === 6) {
    let p = Math.floor(Math.random() * 8 + 2) * 10;
    let n = Math.floor(Math.random() * 10 + 2) * 10;
    prompt = `${p}\\% \\text{ of } ${n}`; answer = (p / 100) * n;
  } else if (d === 7) {
    let a = Math.floor(Math.random() * 20) - 10;
    let b = Math.floor(Math.random() * 20) - 10;
    prompt = `(${a}) + (${b})`; answer = a + b;
  } else {
    let a = Math.floor(Math.random() * 5) + 2;
    let b = Math.floor(Math.random() * 3) + 2;
    prompt = `${a}^{${b}}`; answer = Math.pow(a, b);
  }

  let finalAnswer = answer;
  let displayPrompt = `$${prompt} = \\text{?}$`;
  let options = [];

  if (type === 'mc') options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
  else if (type === 'text') {
    if (answer > 0 && answer <= 10) {
       const words = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
       finalAnswer = words[answer];
       displayPrompt = `Write the answer to $${prompt}$ in words.`;
    } else { type = 'numeric'; }
  } else if (type === 'voice') {
    displayPrompt = `Say the answer to $${prompt}$ out loud.`;
  }

  return { prompt: displayPrompt, answer: finalAnswer, originalAnswer: answer, type, options, difficulty: d };
}

// ==========================================
// 2. ASSESSMENT LOGIC
// ==========================================
let assessCount = 0, assessDiff = 3.0, assessQ = null;
const TOTAL_Q = 15;

function initAssessmentView() {
  document.getElementById('assess-intro').style.display = 'block';
  document.getElementById('assess-active').style.display = 'none';
  document.getElementById('btn-start-assess').onclick = () => {
    document.getElementById('assess-intro').style.display = 'none';
    document.getElementById('assess-active').style.display = 'block';
    assessCount = 0; assessDiff = 3.0;
    loadAssessQ();
  };
}

function loadAssessQ() {
  if (assessCount >= TOTAL_Q) return finishAssessment();
  assessCount++;
  document.getElementById('assess-progress-text').textContent = `Question ${assessCount} of ${TOTAL_Q}`;
  document.getElementById('assess-progress-bar').style.width = `${(assessCount / TOTAL_Q) * 100}%`;
  
  assessQ = generateQuestion(assessDiff);
  document.getElementById('q-type-badge').textContent = assessQ.type;
  document.getElementById('q-diff-label').textContent = `Level ${assessQ.difficulty}`;
  
  const pEl = document.getElementById('assess-prompt');
  pEl.textContent = assessQ.prompt;
  renderMath(pEl);

  const area = document.getElementById('assess-input-area');
  area.innerHTML = '';
  
  if (assessQ.type === 'mc') {
    const grid = document.createElement('div'); grid.className = 'mc-grid';
    assessQ.options.forEach(opt => {
      const b = document.createElement('button'); b.className = 'mc-btn'; b.textContent = opt;
      b.onclick = () => submitAssess(opt); grid.appendChild(b);
    });
    area.appendChild(grid);
  } else {
    const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Your answer'; inp.className = 'numeric-input';
    inp.onkeydown = (e) => { if (e.key === 'Enter') submitAssess(inp.value); };
    area.appendChild(inp);
    const btn = document.createElement('button'); btn.className = 'btn primary mt-2'; btn.textContent = 'Submit';
    btn.onclick = () => submitAssess(inp.value); area.appendChild(btn);
    setTimeout(() => inp.focus(), 50);
  }
}

function submitAssess(val) {
  if (!val) return;
  let isCorrect = (assessQ.type === 'mc') ? (val == assessQ.answer) : (String(val).toLowerCase().trim() === String(assessQ.answer).toLowerCase().trim());
  if (isCorrect) assessDiff = Math.min(10, assessDiff + 1.0);
  else assessDiff = Math.max(1, assessDiff - 0.5);
  loadAssessQ();
}

async function finishAssessment() {
  document.getElementById('assess-active').style.display = 'none';
  document.getElementById('assess-intro').style.display = 'block';
  document.getElementById('assess-intro').innerHTML = `<h2>Complete!</h2><p class="text-muted mt-2">Calculating placement...</p>`;
  const finalGrade = Math.max(1, Math.min(8, Math.round(assessDiff)));
  await completeDiagnostic(finalGrade);
  const p = await getProfile(); window.state.profile = p;
  toast(`Placed in Grade ${p.grade_level}!`);
  setTimeout(() => { window.location.reload(); }, 1500);
}

// ==========================================
// 3. PRACTICE LOGIC
// ==========================================
let pracQ = null, pracDiff = 3.0, pracStreak = 0, pracStart = 0;

async function initPracticeView() {
  const p = await getProfile(); window.state.profile = p;
  document.getElementById('tb-notes').textContent = p.note_balance;
  document.getElementById('tb-rhythm').textContent = p.current_rhythm;
  pracDiff = p.grade_level; pracStreak = 0;
  loadPracQ();
}

function loadPracQ() {
  document.getElementById('prac-feedback').style.display = 'none';
  document.getElementById('prac-actions').style.display = 'none';
  
  pracQ = generateQuestion(pracDiff);
  pracStart = Date.now();
  document.getElementById('prac-type-badge').textContent = pracQ.type;
  document.getElementById('prac-diff-label').textContent = `Level ${pracQ.difficulty}`;

  const pEl = document.getElementById('prac-prompt');
  pEl.textContent = pracQ.prompt;
  renderMath(pEl);

  const area = document.getElementById('prac-input-area');
  area.innerHTML = '';
  
  if (pracQ.type === 'mc') {
    const grid = document.createElement('div'); grid.className = 'mc-grid';
    pracQ.options.forEach(opt => {
      const b = document.createElement('button'); b.className = 'mc-btn'; b.textContent = opt;
      b.onclick = () => submitPrac(opt); grid.appendChild(b);
    });
    area.appendChild(grid);
  } else if (pracQ.type === 'voice') {
    const btn = document.createElement('button'); btn.className = 'voice-btn';
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
    btn.onclick = startVoice; area.appendChild(btn);
    const st = document.createElement('p'); st.className = 'text-muted mt-2'; st.id = 'voice-status'; st.textContent = 'Tap mic to speak';
    area.appendChild(st);
  } else {
    const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Answer'; inp.className = 'numeric-input';
    inp.onkeydown = (e) => { if (e.key === 'Enter') submitPrac(inp.value); };
    area.appendChild(inp);
    const btn = document.createElement('button'); btn.className = 'btn primary mt-2'; btn.textContent = 'Submit';
    btn.onclick = () => submitPrac(inp.value); area.appendChild(btn);
    setTimeout(() => inp.focus(), 50);
  }
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { toast('Voice not supported'); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US'; recognition.interimResults = false;
  recognition.onstart = () => { document.querySelector('.voice-btn').classList.add('listening'); document.getElementById('voice-status').textContent = 'Listening...'; };
  recognition.onresult = (e) => { document.getElementById('voice-status').textContent = `Heard: "${e.results[0][0].transcript}"`; submitPrac(e.results[0][0].transcript); };
  recognition.onerror = (e) => { toast('Error: ' + e.error); document.querySelector('.voice-btn').classList.remove('listening'); };
  recognition.onend = () => { document.querySelector('.voice-btn').classList.remove('listening'); };
  recognition.start();
}

async function submitPrac(val) {
  if (!val) return;
  document.getElementById('prac-input-area').innerHTML = '';
  const timeMs = Date.now() - pracStart;
  let isCorrect = (pracQ.type === 'mc') ? (val == pracQ.answer) : (String(val).toLowerCase().trim() === String(pracQ.answer).toLowerCase().trim());

  if (isCorrect) { pracStreak++; if (pracStreak >= 3) { pracDiff = Math.min(8, pracDiff + 0.3); pracStreak = 0; } }
  else { pracStreak = 0; pracDiff = Math.max(1, pracDiff - 0.4); }

  try {
    const r = await submitAnswer(isCorrect, pracQ.prompt, pracQ.difficulty, false, timeMs);
    const fb = document.getElementById('prac-feedback'); fb.style.display = 'block';
    if (isCorrect) { fb.className = 'feedback-box ok'; fb.innerHTML = `Correct! +${r.notes_awarded} notes.`; if (r.new_chord >= 3) toast(`🔥 ${r.new_chord} in a row!`); }
    else { fb.className = 'feedback-box err'; fb.textContent = `Incorrect. The answer was ${pracQ.answer}`; }
    
    const p = await getProfile();
    document.getElementById('tb-notes').textContent = p.note_balance;
    document.getElementById('tb-rhythm').textContent = p.current_rhythm;
    document.getElementById('prac-actions').style.display = 'block';
    document.getElementById('btn-next-prac').onclick = loadPracQ;
  } catch (e) { toast(e.message); }
}

// ==========================================
// 4. TEACHER & ADMIN LOGIC
// ==========================================
async function initTeacherView() {
  const container = document.getElementById('teacher-classes');
  container.innerHTML = '<p class="text-muted">Loading classes...</p>';
  const classes = await getMyClasses();
  if (!classes.length) { container.innerHTML = `<p class="text-muted">No classes created yet.</p>`; return; }
  
  let html = '';
  for (const c of classes) {
    const [students, attempts] = await Promise.all([getClassStudents(c.id), getClassAttempts(c.id)]);
    html += `<div class="card" style="margin-bottom:2rem;">
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem;">
        <h3 style="margin:0;">${c.name}</h3>
        <span class="chip" style="font-family:monospace; font-size:1.1rem; background:var(--surface2); color:var(--text);">CODE: ${c.join_code}</span>
      </div>
      <p class="text-muted mb-2">${students.length} student(s) enrolled</p>
      ${students.length ? `<div class="table-wrap"><table><tr><th>Username</th><th>Grade</th><th>Notes</th><th>Rhythm</th></tr>
        ${students.map(s => `<tr><td><strong>${s.username}</strong></td><td>Grade ${s.grade_level || 1}</td><td>${s.note_balance}</td><td>${s.current_rhythm} days</td></tr>`).join('')}</table></div>` : ''}
      <h4 style="margin-top:2rem; margin-bottom:1rem;">Live Feed</h4>
      ${attempts.length ? `<div class="table-wrap"><table><tr><th>Time</th><th>Student</th><th>Question</th><th>Result</th></tr>
        ${attempts.slice(0, 20).map(a => `<tr><td style="color:var(--muted);">${new Date(a.created_at).toLocaleTimeString()}</td><td>${a.username}</td><td>${escapeHtml(a.prompt)}</td><td>${a.is_correct ? '<span style="color:var(--success);">Correct</span>' : '<span style="color:var(--error);">Incorrect</span>'}</td></tr>`).join('')}</table></div>` : '<p class="text-muted">No attempts yet.</p>'}
    </div>`;
  }
  container.innerHTML = html;
}

async function initAdminView() {
  try {
    const stats = await getAdminStats();
    document.getElementById('admin-users').textContent = stats.total_users;
    document.getElementById('admin-attempts').textContent = stats.total_attempts;
    document.getElementById('admin-classes').textContent = stats.total_classes;
    const attempts = await getGlobalAttempts();
    const tbody = document.querySelector('#admin-feed tbody');
    tbody.innerHTML = attempts.map(a => `<tr><td style="color:var(--muted);">${new Date(a.created_at).toLocaleTimeString()}</td><td><strong>${a.username}</strong></td><td>${escapeHtml(a.prompt)}</td><td>${a.is_correct ? '<span style="color:var(--success);">Correct</span>' : '<span style="color:var(--error);">Incorrect</span>'}</td></tr>`).join('');
  } catch (e) { console.error(e); }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ==========================================
// 5. APP ROUTING & AUTH
// ==========================================
const views = { dashboard: 'Dashboard', practice: 'Practice', teacher: 'Teacher', admin: 'Admin', assessment: 'Assessment' };

function showView(name) {
  if (name === 'assessment') {
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('view-auth').classList.remove('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-assessment').classList.add('active');
    initAssessmentView(); return;
  }
  document.getElementById('app-shell').style.display = 'flex';
  document.getElementById('view-auth').classList.remove('active');
  document.getElementById('view-assessment').style.display = 'none';
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.getElementById('topbar-title').textContent = views[name] || 'Dashboard';
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name));
  
  if (name === 'practice') initPracticeView();
  if (name === 'teacher') initTeacherView();
  if (name === 'admin') initAdminView();
  if (name === 'dashboard') renderDashboard();
}

function renderSidebar() {
  const p = window.state.profile;
  let html = `<button type="button" class="nav-item active" data-view="dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Dashboard</button>
  <button type="button" class="nav-item" data-view="practice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Practice</button>`;
  if (p.role === 'teacher' || p.role === 'admin') html += `<button type="button" class="nav-item" data-view="teacher"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>Teacher</button>`;
  if (p.role === 'admin') html += `<button type="button" class="nav-item" data-view="admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Admin</button>`;
  document.getElementById('sidebar-nav').innerHTML = html;
  document.querySelectorAll('.nav-item').forEach(item => item.onclick = () => showView(item.dataset.view));
}

function renderDashboard() {
  const p = window.state.profile;
  document.getElementById('dash-name').textContent = p.username;
  document.getElementById('tb-grade').textContent = p.grade_level || '-';
  document.getElementById('tb-notes').textContent = p.note_balance || 0;
  document.getElementById('tb-rhythm').textContent = p.current_rhythm || 0;
  document.getElementById('sb-username').textContent = p.username;
  document.getElementById('sb-role').textContent = p.role;
  document.getElementById('sb-avatar').textContent = p.username.charAt(0).toUpperCase();
}

// Event Listeners
document.getElementById('btn-signout').onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };
document.getElementById('btn-practice').onclick = () => showView('practice');
document.getElementById('card-go-practice').onclick = () => showView('practice');

document.getElementById('btn-join').onclick = async () => {
  const code = document.getElementById('join-code').value.trim();
  const msg = document.getElementById('join-msg');
  try { const r = await joinClass(code); msg.textContent = `Joined ${r.name}!`; msg.className = 'msg ok'; } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

document.getElementById('btn-create').onclick = async () => {
  const name = document.getElementById('class-name').value.trim();
  const passcode = document.getElementById('teacher-passcode').value.trim();
  const msg = document.getElementById('create-msg');
  if (!name || !passcode) return;
  try {
    const r = await createClass(name, passcode);
    msg.innerHTML = `Created! Code: ${r.join_code}`; msg.className = 'msg ok';
    await refreshUser(); renderSidebar(); initTeacherView();
  } catch (err) { msg.textContent = err.message; msg.className = 'msg err'; }
};

document.querySelectorAll('.tab').forEach(tab => tab.onclick = () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('form-' + tab.dataset.tab).classList.add('active');
});

document.getElementById('form-signin').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg'); msg.textContent = 'Signing in…';
  const { error } = await supabase.auth.signInWithPassword({ email: document.getElementById('si-email').value, password: document.getElementById('si-pass').value });
  if (error) { msg.textContent = error.message; msg.className = 'msg text-center err'; return; }
  await refreshUser(); bootApp();
};

document.getElementById('form-signup').onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById('auth-msg'); msg.textContent = 'Creating account…';
  const { error } = await supabase.auth.signUp({
    email: document.getElementById('su-email').value, password: document.getElementById('su-pass').value,
    options: { data: { username: document.getElementById('su-username').value } },
  });
  if (error) { msg.textContent = error.message; msg.className = 'msg text-center err'; return; }
  await refreshUser();
  if (window.state.user) bootApp(); else { msg.textContent = 'Check email to confirm, then sign in.'; msg.className = 'msg text-center ok'; }
};

async function refreshUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    window.state.user = session?.user || null;
    window.state.profile = session ? await getProfile() : null;
  } catch (e) { console.error(e); }
}

async function bootApp() {
  if (!window.state.user) {
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('view-auth').classList.add('active');
    return;
  }
  if (!window.state.profile?.diagnostic_complete) { showView('assessment'); }
  else { document.getElementById('view-auth').classList.remove('active'); renderSidebar(); renderDashboard(); showView('dashboard'); }
}

refreshUser().then(bootApp);
supabase.auth.onAuthStateChange(async () => { await refreshUser(); bootApp(); });
