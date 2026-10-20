import { submitAnswer, getProfile, renderMath, toast, completeDiagnostic } from './supabase.js';

// --- MATH GENERATOR ---
// Generates infinite questions from Grade 1 to 8 based on difficulty
function generateMath(diff) {
  let d = Math.max(1, Math.round(diff));
  let prompt = "", answer = 0;

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
  return { prompt: `$${prompt} = \\text{?}$`, answer, difficulty: d };
}

// --- DIAGNOSTIC LOGIC ---
let diagQCount = 0;
let diagDiff = 3.0;
let diagCurrentQ = null;

export function initDiagnosticView() {
  document.getElementById('diag-intro').style.display = 'block';
  document.getElementById('diag-active').style.display = 'none';
  
  document.getElementById('btn-start-diag').onclick = () => {
    document.getElementById('diag-intro').style.display = 'none';
    document.getElementById('diag-active').style.display = 'block';
    diagQCount = 0; diagDiff = 3.0;
    loadDiagQuestion();
  };
}

function loadDiagQuestion() {
  if (diagQCount >= 10) return finishDiagnostic();
  
  diagQCount++;
  document.getElementById('diag-progress').textContent = diagQCount;
  diagCurrentQ = generateMath(diagDiff);
  
  const pEl = document.getElementById('diag-prompt');
  pEl.textContent = diagCurrentQ.prompt;
  renderMath(pEl);

  const ansEl = document.getElementById('diag-answers');
  ansEl.innerHTML = '';
  const inp = document.createElement('input');
  inp.type = 'number'; inp.placeholder = 'Your answer'; inp.step = 'any';
  inp.id = 'diag-input';
  inp.onkeydown = (e) => { if (e.key === 'Enter') submitDiag(); };
  
  const btn = document.createElement('button');
  btn.className = 'btn primary'; btn.textContent = 'Submit'; btn.onclick = submitDiag;
  
  ansEl.appendChild(inp);
  ansEl.appendChild(btn);
  setTimeout(() => inp.focus(), 50);
}

function submitDiag() {
  const val = parseFloat(document.getElementById('diag-input').value);
  if (isNaN(val)) return;
  
  const isCorrect = Math.abs(val - diagCurrentQ.answer) < 0.01;
  
  // Adapt difficulty silently
  if (isCorrect) diagDiff = Math.min(10, diagDiff + 1.0);
  else diagDiff = Math.max(1, diagDiff - 0.5);
  
  loadDiagQuestion();
}

async function finishDiagnostic() {
  document.getElementById('diag-active').style.display = 'none';
  document.getElementById('diag-intro').style.display = 'block';
  document.getElementById('diag-intro').innerHTML = `<h2>Assessment Complete!</h2><p class="text-muted mb-2">Calculating your placement...</p>`;
  
  const finalGrade = Math.max(1, Math.min(8, Math.round(diagDiff)));
  await completeDiagnostic(finalGrade);
  
  const p = await getProfile();
  window.state.profile = p;
  toast(`Placed in Grade ${p.grade_level}!`);
  setTimeout(() => { window.showView('dashboard'); }, 1500);
}

// --- STANDARD PRACTICE LOGIC ---
let currentQ = null;
let currentDiff = 3.0;
let streak = 0;
let startTime = 0;

export async function initPracticeView() {
  const p = await getProfile();
  window.state.profile = p;
  document.getElementById('p-notes').textContent = p.note_balance;
  document.getElementById('q-level').textContent = p.grade_level;
  
  // Start at user's actual grade level
  currentDiff = p.grade_level;
  streak = 0;
  loadPracticeQuestion();
  
  document.getElementById('btn-next').onclick = () => {
    document.getElementById('feedback').className = 'feedback';
    loadPracticeQuestion();
  };
}

function loadPracticeQuestion() {
  document.getElementById('btn-next').disabled = true;
  currentQ = generateMath(currentDiff);
  startTime = Date.now();

  const pEl = document.getElementById('q-prompt');
  pEl.textContent = currentQ.prompt;
  renderMath(pEl);

  const ansEl = document.getElementById('q-answers');
  ansEl.innerHTML = '';
  const inp = document.createElement('input');
  inp.type = 'number'; inp.placeholder = 'Answer'; inp.step = 'any';
  inp.id = 'q-input';
  inp.onkeydown = (e) => { if (e.key === 'Enter') submitPractice(); };
  
  const btn = document.createElement('button');
  btn.className = 'btn primary'; btn.textContent = 'Submit'; btn.onclick = submitPractice;
  
  ansEl.appendChild(inp);
  ansEl.appendChild(btn);
  setTimeout(() => inp.focus(), 50);
}

async function submitPractice() {
  const val = parseFloat(document.getElementById('q-input').value);
  if (isNaN(val)) { toast('Enter a number'); return; }
  
  document.getElementById('btn-submit').disabled = true; // Prevent double clicks
  const isCorrect = Math.abs(val - currentQ.answer) < 0.01;
  const timeMs = Date.now() - startTime;

  // Adaptive Logic
  if (isCorrect) {
    streak++;
    if (streak >= 3) { currentDiff = Math.min(8, currentDiff + 0.3); streak = 0; }
  } else {
    streak = 0;
    currentDiff = Math.max(1, currentDiff - 0.4);
  }

  try {
    const r = await submitAnswer(isCorrect, currentQ.prompt, currentQ.difficulty, false, timeMs);
    const fb = document.getElementById('feedback');
    
    if (isCorrect) {
      fb.className = 'feedback ok show';
      fb.textContent = `Correct! +${r.notes_awarded} notes. (Chord: ${r.new_chord})`;
      if (r.new_chord >= 3) toast(`🔥 ${r.new_chord} in a row!`);
    } else {
      fb.className = 'feedback err show';
      fb.textContent = `Incorrect. The answer was ${currentQ.answer}`;
    }
    
    // Refresh top stats
    const p = await getProfile();
    document.getElementById('p-notes').textContent = p.note_balance;
    document.getElementById('p-chord').textContent = r.new_chord;
    
    document.getElementById('btn-next').disabled = false;
  } catch (e) {
    toast(e.message);
    document.getElementById('btn-next').disabled = false;
  }
}
