import { getAdminStats, getGlobalAttempts } from './supabase.js';

export async function initAdminView() {
  // 1. Fetch Stats
  try {
    const stats = await getAdminStats();
    document.getElementById('admin-users').textContent = stats.total_users;
    document.getElementById('admin-attempts').textContent = stats.total_attempts;
    document.getElementById('admin-classes').textContent = stats.total_classes;
  } catch (e) {
    console.error(e);
  }

  // 2. Fetch Live Feed
  const feedContainer = document.querySelector('#admin-feed tbody');
  feedContainer.innerHTML = '<tr><td colspan="4" class="text-muted">Loading live feed...</td></tr>';
  
  try {
    const attempts = await getGlobalAttempts();
    
    if (!attempts.length) {
      feedContainer.innerHTML = '<tr><td colspan="4" class="text-muted">No attempts yet.</td></tr>';
      return;
    }

    feedContainer.innerHTML = attempts.map(a => `
      <tr>
        <td style="color:var(--muted); white-space:nowrap;">${new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
        <td><strong>${a.username || 'Unknown'}</strong></td>
        <td>${escapeHtml(a.prompt)}</td>
        <td>${a.is_correct ? '<span style="color:var(--success);font-weight:600;">Correct</span>' : '<span style="color:var(--error);">Incorrect</span>'}</td>
      </tr>
    `).join('');

  } catch (e) {
    feedContainer.innerHTML = `<tr><td colspan="4" style="color:var(--error)">Failed to load feed: ${e.message}</td></tr>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
