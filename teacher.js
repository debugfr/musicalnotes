import { getMyClasses, getClassStudents, getClassAttempts } from './supabase.js';

export async function initTeacherView() {
  const container = document.getElementById('teacher-content');
  container.innerHTML = '<p class="text-muted">Loading…</p>';
  const classes = await getMyClasses();

  if (!classes.length) {
    container.innerHTML = `
      <div class="card">
        <p>You haven't created a class yet. Go to the dashboard and use "Create a class".</p>
      </div>`;
    return;
  }

  let html = '';
  for (const c of classes) {
    const [students, attempts] = await Promise.all([
      getClassStudents(c.id),
      getClassAttempts(c.id),
    ]);

    html += `<div class="class-card">
      <h3>${c.name} <span class="code">${c.join_code}</span></h3>
      <p class="text-muted mb-2">${students.length} student(s) enrolled</p>
      
      <h4 style="margin-top:1rem; font-size: 0.95rem;">Students</h4>
      ${students.length ? `
        <table>
          <tr><th>Username</th><th>Notes</th><th>Rhythm</th><th>Last Practice</th></tr>
          ${students.map(s => `<tr>
            <td>${s.username || '—'}</td>
            <td>${s.note_balance}</td>
            <td>${s.current_rhythm}</td>
            <td>${s.last_practice_date || '—'}</td>
          </tr>`).join('')}
        </table>` : '<p class="text-muted mt-2">No students yet.</p>'}
      
      <h4 style="margin-top:2rem; font-size: 0.95rem;">Recent Answers</h4>
      ${attempts.length ? `
        <table>
          <tr><th>When</th><th>Student</th><th>Question</th><th>Their Answer</th><th>Result</th></tr>
          ${attempts.slice(0, 25).map(a => `<tr>
            <td style="white-space:nowrap;">${new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${a.username || '—'}</td>
            <td>${escapeHtml(a.prompt)}</td>
            <td>${escapeHtml(JSON.stringify(a.submitted_answer?.value ?? a.submitted_answer))}</td>
            <td>${a.is_correct ? '<span style="color:var(--success);font-weight:600;">Correct</span>' : '<span style="color:var(--error);">Correct: ' + escapeHtml(JSON.stringify(a.correct_answer?.value)) + '</span>'}</td>
          </tr>`).join('')}
        </table>` : '<p class="text-muted mt-2">No attempts logged yet.</p>'}
    </div>`;
  }
  container.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
