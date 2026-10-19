import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ REPLACE WITH YOUR PROJECT VALUES (Supabase → Settings → API)
const SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function getNextQuestion(topic = null) {
  const { data, error } = await supabase.rpc('get_next_question', { p_topic: topic });
  if (error) throw error;
  return data;
}

export async function submitAnswer(questionId, answerValue, hintUsed, timeMs) {
  const { data, error } = await supabase.rpc('submit_answer', {
    p_question_id: questionId,
    p_answer: { value: answerValue },
    p_hint_used: hintUsed,
    p_time_ms: timeMs,
  });
  if (error) throw error;
  return data;
}

export async function getTopics() {
  const { data } = await supabase.from('topics').select('slug,title').order('title');
  return data || [];
}

export async function createClass(name) {
  const { data, error } = await supabase.rpc('create_class', { p_name: name });
  if (error) throw error;
  return data;
}

export async function joinClass(code) {
  const { data, error } = await supabase.rpc('join_class', { p_code: code });
  if (error) throw error;
  return data;
}

export async function getMyClasses() {
  const { data } = await supabase.from('classes').select('id,name,join_code,created_at').order('created_at', { ascending: false });
  return data || [];
}

export async function getClassStudents(classId) {
  const { data } = await supabase.from('class_enrollments')
    .select('student:profiles!class_enrollments_student_id_fkey(id,username,note_balance,current_rhythm,last_practice_date)')
    .eq('class_id', classId);
  return (data || []).map(r => r.student);
}

export async function getClassAttempts(classId) {
  const { data, error } = await supabase.rpc('get_class_recent_attempts', { p_class_id: classId, p_limit: 50 });
  if (error) throw error;
  return data || [];
}

export function renderMath(el) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      });
    } catch (e) { /* noop */ }
  }
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 2500);
}
