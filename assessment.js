import { generateQuestion } from './questions.js';
import { completeDiagnostic, getProfile, renderMath, toast } from './supabase.js';

let qCount = 0;
let currentDiff = 3.0;
let currentQ = null;
const TOTAL_QUESTIONS = 15;

export function initAssessmentView() {
  document.getElementById('assess-intro').style.display = 'block';
  document.getElementById('assess-active').style.display = 'none';
  
  document.getElementById('btn-start-assess').onclick = () => {
    document.getElementById('assess-intro').style.display = 'none';
    document.getElementById('assess-active').style.display = 'block';
    qCount = 0; currentDiff = 3.0;
    loadQuestion();
  };
}

function loadQuestion() {
  if (qCount >= TOTAL_QUESTIONS) return finish();
  
  qCount++;
  document.getElementById('assess-progress-text').textContent = `Question ${qCount} of ${TOTAL_QUESTIONS}`;
  document.getElementById('assess-progress-bar').style.width = `${(qCount / TOTAL_QUESTIONS) * 100}%`;
  
  currentQ = generateQuestion(currentDiff);
  
  document.getElementById('q-type-badge').textContent = currentQ.type;
  document.getElementById('q-diff-label').textContent = `Level ${currentQ.difficulty}`;
  
  const pEl = document.getElementById('assess-prompt');
  pEl.textContent = currentQ.prompt;
  renderMath(pEl);

  const area = document.getElementById('assess-input-area');
  area.innerHTML = '';
  
  if (currentQ.type === 'mc') {
    const grid = document.createElement('div');
    grid.className = 'mc-grid';
    currentQ.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'mc-btn'; b.textContent = opt;
      b.onclick = () => submit(opt);
      grid.appendChild(b);
    });
    area.appendChild(grid);
  } else {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.placeholder = 'Your answer'; inp.className = 'numeric-input';
    inp.id = 'assess-input';
    inp.onkeydown = (e) => { if (e.key === 'Enter') submit(inp.value); };
    area.appendChild(inp);
    
    const btn = document.createElement('button');
    btn.className = 'btn primary mt-2'; btn.textContent = 'Submit Answer';
    btn.onclick = () => submit(inp.value);
    area.appendChild(btn);
    setTimeout(() => inp.focus(), 50);
  }
}

function submit(val) {
  if (!val) return;
  
  // Strict comparison
  let isCorrect = false;
  if (currentQ.type === 'mc') {
    isCorrect = (val == currentQ.answer);
  } else {
    const numVal = parseFloat(val);
    if (!isNaN(numVal) && typeof currentQ.answer === 'number') {
      isCorrect = Math.abs(numVal - currentQ.answer) < 0.01;
    } else {
      isCorrect = (String(val).toLowerCase().trim() === String(currentQ.answer).toLowerCase().trim());
    }
  }

  // Adapt difficulty
  if (isCorrect) currentDiff = Math.min(10, currentDiff + 1.0);
  else currentDiff = Math.max(1, currentDiff - 0.5);
  
  loadQuestion();
}

async function finish() {
  document.getElementById('assess-active').style.display = 'none';
  document.getElementById('assess-intro').style.display = 'block';
  document.getElementById('assess-intro').innerHTML = `<h2>Assessment Complete!</h2><p class="text-muted mt-2 mb-2">Calculating your exact grade placement...</p>`;
  
  const finalGrade = Math.max(1, Math.min(8, Math.round(currentDiff)));
  await completeDiagnostic(finalGrade);
  
  const p = await getProfile();
  window.state.profile = p;
  toast(`Placed in Grade ${p.grade_level}!`);
  setTimeout(() => { window.location.reload(); }, 1500);
}
