import { getMyClasses, getClassStudents, getClassAttempts } from './supabase.js';

export async function initTeacherView() {
  const container = document.getElementById('teacher-classes');
  container.innerHTML = '<p class="text-muted">Loading classes...</p>';
  const classes = await getMyClasses();

  if (!classes.length) {
    container.innerHTML = `<p class="text-muted">You haven't created any classes yet.</p>`;
    return;
  }

  let html = '';
  for (const c of classes) {
    const [students, attempts] = await Promise.all([
      getClassStudents(c.id),
      getClassAttempts(c.id),
    ]);

    html += `<div class="card" style="margin-bottom: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
        <h3 style="margin:0;">${c.name}</h3>
        <span class="chip" style="font-family: monospace; font-size: 1.1rem; letter-spacing: 2px; background: var(--surface2); color: var(--text); font-weight: bold;">CODE: ${c.join_code}</span>
      </div>
      <p class="text-muted mb-2">${students.length} student(s) enrolled</p>
      
      ${students.length ? `
        <div class="table-wrap">
          <table>
            <tr><th>Username</th><th>Grade Level</th><th>Notes</th><th>Rhythm</th></tr>
            ${students.map(s => `<tr>
              <td><strong>${s.username || '—'}</strong></td>
              <td>Grade ${s.grade_level || 1}</td>
              <td>${s.note_balance}</td>
              <td>${s.current_rhythm} days</td>
            </tr>`).join('')}
          </table>
        </div>` : ''}
      
      <h4 style="margin-top:2rem; margin-bottom:1rem;">Live Feed (Last 20 Answers)</h4>
      ${attempts.length ? `
        <div class="table-wrap">
          <table>
            <tr><th>Time</th><th>Student</th><th>Question</th><th>Result</th></tr>
            ${attempts.slice(0, 20).map(a => `<tr>
              <td style="color:var(--muted);">${new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
              <td>${a.username || '—'}</td>
              <td>${escapeHtml(a.prompt)}</td>
              <td>${a.is_correct ? '<span style="color:var(--success);font-weight:600;">Correct</span>' : '<span style="color:var(--error);">Incorrect</span>'}</td>
            </tr>`).join('')}
          </table>
        </div>` : '<p class="text-muted">No attempts logged yet.</p>'}
    </div>`;
  }
  container.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
