import { getMyClasses, getClassStudents, getClassAttempts } from './supabase.js';

export async function initTeacherView() {
  const container = document.getElementById('teacher-content');
  container.innerHTML = '<p class="text-muted">Loading…</p>';
  const classes = await getMyClasses();

  if (!classes.length) {
    container.innerHTML = `<div class="card"><p>You haven't created a class yet.</p></div>`;
    return;
  }

  let html = '';
  for (const c of classes) {
    const [students, attempts] = await Promise.all([
      getClassStudents(c.id),
      getClassAttempts(c.id),
    ]);

    html += `<div class="card" style="margin-bottom: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3>${c.name}</h3>
        <span class="code">${c.join_code}</span>
      </div>
      <p class="text-muted mb-2">${students.length} student(s)</p>
      
      ${students.length ? `
        <table>
          <tr><th>Username</th><th>Grade</th><th>Notes</th><th>Rhythm</th></tr>
          ${students.map(s => `<tr>
            <td>${s.username || '—'}</td>
            <td>Grade ${s.grade_level || 1}</td>
            <td>${s.note_balance}</td>
            <td>${s.current_rhythm} days</td>
          </tr>`).join('')}
        </table>` : ''}
      
      <h4 style="margin-top:2rem; font-size: 1rem;">Recent Answers</h4>
      ${attempts.length ? `
        <table>
          <tr><th>When</th><th>Student</th><th>Question</th><th>Result</th></tr>
          ${attempts.slice(0, 20).map(a => `<tr>
            <td style="white-space:nowrap; color:var(--muted);">${new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${a.username || '—'}</td>
            <td>${escapeHtml(a.prompt)}</td>
            <td>${a.is_correct ? '<span style="color:var(--success);font-weight:600;">Correct</span>' : '<span style="color:var(--error);">Incorrect</span>'}</td>
          </tr>`).join('')}
        </table>` : '<p class="text-muted mt-2">No attempts logged yet.</p>'}
    </div>`;
  }
  container.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
