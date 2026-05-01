/**
 * Dashboard Page Logic
 *
 * Dashboard Logic:
 * - Fetches stats from GET /api/tasks/dashboard/stats
 * - Admin sees aggregate stats for ALL tasks
 * - Member sees stats only for their assigned tasks
 * - Overdue count: tasks where status != 'Completed' AND dueDate < now
 * - "My Tasks" section shows up to 10 tasks assigned to the logged-in user
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initSidebar('dashboard');

  const user = getUser();
  document.getElementById('welcomeName').textContent = user.name;

  await loadDashboard();
});

async function loadDashboard() {
  try {
    const stats = await api.get('/tasks/dashboard/stats');

    document.getElementById('totalTasks').textContent = stats.totalTasks;
    document.getElementById('completedTasks').textContent = stats.completedTasks;
    document.getElementById('pendingTasks').textContent = stats.pendingTasks;
    document.getElementById('overdueTasks').textContent = stats.overdueTasks;
    document.getElementById('inProgressTasks').textContent = stats.inProgressTasks;
    document.getElementById('totalMembers').textContent = stats.totalSystemMembers || '0';

    renderMyTasks(stats.myTasks);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderMyTasks(tasks) {
  const container = document.getElementById('myTasksList');

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <h3>No tasks assigned</h3>
        <p>Tasks assigned to you will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Project</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => {
            const isOverdue = task.status !== 'Completed' && new Date(task.dueDate) < new Date();
            const statusClass = task.status === 'Completed' ? 'status-completed' : task.status === 'In Progress' ? 'status-in-progress' : 'status-pending';
            const priorityClass = task.priority === 'High' ? 'priority-high' : task.priority === 'Medium' ? 'priority-medium' : 'priority-low';
            return `
              <tr>
                <td><strong>${task.title}</strong></td>
                <td>${task.projectId?.title || '—'}</td>
                <td><span class="badge ${statusClass}">${task.status}</span></td>
                <td><span class="badge ${priorityClass}">${task.priority}</span></td>
                <td style="${isOverdue ? 'color: var(--danger-500); font-weight: 600;' : ''}">${formatDate(task.dueDate)}${isOverdue ? ' ⚠' : ''}</td>
                <td>
                  ${task.status === 'Pending' ? `
                    <button class="btn btn-sm btn-success" onclick="updateTaskStatusDashboard('${task._id}', 'In Progress')">Accept</button>
                  ` : task.status === 'In Progress' ? `
                    <button class="btn btn-sm btn-primary" onclick="updateTaskStatusDashboard('${task._id}', 'Completed')">Finish</button>
                  ` : `
                    <span class="text-muted">Done</span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function updateTaskStatusDashboard(taskId, status) {
  if (status === 'In Progress') {
    if (!confirm('Do you want to accept this task?')) return;
  }

  try {
    await api.put(`/tasks/${taskId}`, { status });
    await loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}
