import { getNextQuestion, submitAnswer, getTopics, getProfile, renderMath, toast, supabase } from './supabase.js';

let current = null;
let hintShown = false;
let startTime = 0;
let selectedValue = null;

export async function initPracticeView() {
  const sel = document.getElementById('topic-select');
  if (sel.options.length <= 1) {
    const topics = await getTopics();
    topics.forEach(t => {
      const o = document.createElement('option');
      o.value = t.slug; o.textContent = t.title;
      sel.appendChild(o);
    });
    sel.onchange = () => loadQuestion(sel.value || null);
  }
  await refreshStats();
  
  document.getElementById('btn-hint').onclick = () => {
    if (!current?.hint) return;
    hintShown = true;
    document.getElementById('q-hint').textContent = current.hint;
  };
  
  document.getElementById('btn-next').onclick = () => loadQuestion(sel.value || null);
  
  await loadQuestion(sel.value || null);
}

async function refreshStats() {
  const p = await getProfile();
  window.state.profile = p || window.state.profile;
  document.getElementById('p-notes').textContent = p?.note_balance ?? 0;
  document.getElementById('p-rhythm').textContent = p?.current_rhythm ?? 0;
  
  const { data: chord } = await supabase
    .from('chord_state')
    .select('current_chord')
    .eq('user_id', p.id)
    .single();
    
  document.getElementById('p-chord').textContent = chord?.current_chord ?? 0;
}

async function loadQuestion(topic) {
  hintShown = false;
  selectedValue = null;
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('q-hint').textContent = '';
  document.getElementById('btn-next').disabled = true;
  document.getElementById('btn-hint').disabled = false;
  document.getElementById('q-answers').innerHTML = '';
  document.getElementById('q-prompt').textContent = 'Loading…';
  document.getElementById('q-topic').textContent = '';

  try {
    current = await getNextQuestion(topic);
  } catch (e) {
    document.getElementById('q-prompt').textContent = 'No questions available.';
    return;
  }

  document.getElementById('q-topic').textContent = current.topic || '';
  const promptEl = document.getElementById('q-prompt');
  promptEl.textContent = current.prompt;
  renderMath(promptEl);
  startTime = Date.now();

  const answers = document.getElementById('q-answers');
  if (current.answer_type === 'multiple_choice') {
    (current.distractors || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.onclick = () => {
        answers.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedValue = opt;
      };
      answers.appendChild(btn);
    });
  } else {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Your answer';
    inp.id = 'num-input';
    inp.oninput = () => {
      const v = parseFloat(inp.value);
      selectedValue = isNaN(v) ? null : v;
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') doSubmit(); };
    answers.appendChild(inp);
    setTimeout(() => inp.focus(), 50);
  }

  const submit = document.createElement('button');
  submit.className = 'btn primary';
  submit.textContent = 'Submit Answer';
  submit.id = 'btn-submit';
  submit.onclick = doSubmit;
  answers.appendChild(submit);
}

async function doSubmit() {
  if (selectedValue === null || selectedValue === undefined) {
    toast('Enter an answer first');
    return;
  }
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-hint').disabled = true;
  const timeMs = Date.now() - startTime;

  try {
    const r = await submitAnswer(current.id, selectedValue, hintShown, timeMs);
    const fb = document.getElementById('feedback');
    
    // SVG Icons for feedback
    const checkSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const crossSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    if (r.is_correct) {
      fb.className = 'feedback ok show';
      fb.innerHTML = `${checkSvg} Correct! +${r.notes_awarded} notes · Chord: ${r.new_chord} · Multiplier ×${r.multiplier}`;
      if (r.new_chord >= 3) toast(`Chord built: ${r.new_chord} in a row!`);
    } else {
      fb.className = 'feedback err show';
      fb.innerHTML = `${crossSvg} Not quite. Correct answer: <strong>${JSON.stringify(r.correct_answer.value)}</strong>`;
    }
    document.getElementById('btn-next').disabled = false;
    await refreshStats();
  } catch (e) {
    toast(e.message);
    document.getElementById('btn-submit').disabled = false;
  }
}
