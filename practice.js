import { generateQuestion } from './questions.js';
import { submitAnswer, getProfile, renderMath, toast } from './supabase.js';

let currentQ = null;
let currentDiff = 3.0;
let streak = 0;
let startTime = 0;
let recognition = null;

export async function initPracticeView() {
  const p = await getProfile();
  window.state.profile = p;
  document.getElementById('tb-notes').textContent = p.note_balance;
  document.getElementById('tb-rhythm').textContent = p.current_rhythm;
  document.getElementById('tb-grade').textContent = p.grade_level;
  
  currentDiff = p.grade_level;
  streak = 0;
  loadQuestion();
}

function loadQuestion() {
  document.getElementById('prac-feedback').style.display = 'none';
  document.getElementById('prac-actions').style.display = 'none';
  
  currentQ = generateQuestion(currentDiff);
  startTime = Date.now();

  document.getElementById('prac-type-badge').textContent = currentQ.type;
  document.getElementById('prac-diff-label').textContent = `Level ${currentQ.difficulty}`;

  const pEl = document.getElementById('prac-prompt');
  pEl.textContent = currentQ.prompt;
  renderMath(pEl);

  const area = document.getElementById('prac-input-area');
  area.innerHTML = '';
  
  if (currentQ.type === 'mc') {
    const grid = document.createElement('div');
    grid.className = 'mc-grid';
    currentQ.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'mc-btn'; b.textContent = opt;
      b.onclick = (e) => {
        document.querySelectorAll('.mc-btn').forEach(x => x.classList.remove('selected'));
        e.target.classList.add('selected');
        submit(opt);
      };
      grid.appendChild(b);
    });
    area.appendChild(grid);
  } 
  else if (currentQ.type === 'text') {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.placeholder = 'Type the word...'; inp.className = 'text-input';
    inp.id = 'prac-input';
    inp.onkeydown = (e) => { if (e.key === 'Enter') submit(inp.value); };
    area.appendChild(inp);
    const btn = document.createElement('button');
    btn.className = 'btn primary mt-2'; btn.textContent = 'Submit';
    btn.onclick = () => submit(inp.value);
    area.appendChild(btn);
    setTimeout(() => inp.focus(), 50);
  }
  else if (currentQ.type === 'voice') {
    const btn = document.createElement('button');
    btn.className = 'voice-btn';
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
    btn.onclick = startVoiceRecognition;
    area.appendChild(btn);
    const status = document.createElement('p');
    status.className = 'text-muted mt-2'; status.id = 'voice-status'; status.textContent = 'Tap mic to speak';
    area.appendChild(status);
  } 
  else {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.placeholder = 'Answer'; inp.className = 'numeric-input';
    inp.id = 'prac-input'; inp.step = 'any';
    inp.onkeydown = (e) => { if (e.key === 'Enter') submit(inp.value); };
    area.appendChild(inp);
    const btn = document.createElement('button');
    btn.className = 'btn primary mt-2'; btn.textContent = 'Submit';
    btn.onclick = () => submit(inp.value);
    area.appendChild(btn);
    setTimeout(() => inp.focus(), 50);
  }
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { toast('Voice not supported in this browser'); return; }
  
  const btn = document.querySelector('.voice-btn');
  const status = document.getElementById('voice-status');
  
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;

  recognition.onstart = () => { btn.classList.add('listening'); status.textContent = 'Listening...'; };
  recognition.onresult = (event) => {
    const speech = event.results[0][0].transcript;
    status.textContent = `Heard: "${speech}"`;
    submit(speech);
  };
  recognition.onerror = (e) => { toast('Error: ' + e.error); btn.classList.remove('listening'); };
  recognition.onend = () => { btn.classList.remove('listening'); };
  recognition.start();
}

async function submit(val) {
  if (!val) return;
  
  document.getElementById('prac-input-area').innerHTML = ''; // Prevent double clicks
  const timeMs = Date.now() - startTime;

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

  if (isCorrect) {
    streak++;
    if (streak >= 3) { currentDiff = Math.min(8, currentDiff + 0.3); streak = 0; }
  } else {
    streak = 0; currentDiff = Math.max(1, currentDiff - 0.4);
  }

  try {
    const r = await submitAnswer(isCorrect, currentQ.prompt, currentQ.difficulty, false, timeMs);
    const fb = document.getElementById('prac-feedback');
    fb.style.display = 'block';
    
    if (isCorrect) {
      fb.className = 'feedback-box ok';
      fb.innerHTML = `Correct! +${r.notes_awarded} notes.`;
      if (r.new_chord >= 3) toast(`🔥 ${r.new_chord} in a row!`);
    } else {
      fb.className = 'feedback-box err';
      fb.textContent = `Incorrect. The answer was ${currentQ.answer}`;
    }
    
    const p = await getProfile();
    document.getElementById('tb-notes').textContent = p.note_balance;
    document.getElementById('tb-rhythm').textContent = p.current_rhythm;
    
    document.getElementById('prac-actions').style.display = 'block';
    document.getElementById('btn-next-prac').onclick = loadQuestion;
    
  } catch (e) {
    toast(e.message);
  }
}
