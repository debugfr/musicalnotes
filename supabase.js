const SUPABASE_URL = 'https://ykxzlelroficdotgvgdo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlreHpsZWxyb2ZpY2RvdGd2Z2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NDM1NzIsImV4cCI6MjEwODAxOTU3Mn0.dn0vBsoU0LpsgYcv4-2OTtIA8YB03VtBeLwIhIZ3Qko';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function submitAnswer(isCorrect, prompt, difficulty, hintUsed, timeMs) {
  const { data, error } = await supabase.rpc('submit_answer', {
    p_is_correct: isCorrect, p_prompt: prompt, p_difficulty: difficulty, p_hint_used: hintUsed, p_time_ms: timeMs,
  });
  if (error) throw error; return data;
}

export async function completeDiagnostic(grade) {
  const { error } = await supabase.rpc('complete_diagnostic', { p_grade: grade });
  if (error) throw error;
}

export async function createClass(name, passcode) {
  const { data, error } = await supabase.rpc('create_class', { p_name: name, p_passcode: passcode });
  if (error) throw error; return data;
}

export async function joinClass(code) {
  const { data, error } = await supabase.rpc('join_class', { p_code: code });
  if (error) throw error; return data;
}

export async function getMyClasses() {
  const { data } = await supabase.from('classes').select('id,name,join_code,created_at').order('created_at', { ascending: false });
  return data || [];
}

export async function getClassStudents(classId) {
  const { data } = await supabase.from('class_enrollments')
    .select('student:profiles!class_enrollments_student_id_fkey(id,username,grade_level,note_balance,current_rhythm)')
    .eq('class_id', classId);
  return (data || []).map(r => r.student);
}

export async function getClassAttempts(classId) {
  const { data, error } = await supabase.rpc('get_class_recent_attempts', { p_class_id: classId, p_limit: 50 });
  if (error) throw error; return data || [];
}

export async function getAdminStats() {
  const { data, error } = await supabase.rpc('get_admin_stats');
  if (error) throw error; return data;
}

export async function getGlobalAttempts() {
  const { data, error } = await supabase.rpc('get_global_attempts', { p_limit: 50 });
  if (error) throw error; return data || [];
}

export function renderMath(el) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
      });
    } catch (e) {}
  }
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 2500);
}
