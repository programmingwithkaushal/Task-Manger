/**
 * Tasks Page Logic
 * 
 * Task Assignment Logic:
 * - Admin creates tasks and assigns them to a user via the assignedTo dropdown
 * - The dropdown is populated from GET /api/users
 * - When a task is assigned, the assignedTo field stores a User ObjectId
 * - Members can only see tasks assigned to them (filtered server-side)
 * - Members can only update the STATUS field (Pending → In Progress → Completed)
 * - Admin can update all fields
 * 
 * Overdue Task Logic:
 * - Determined by: status !== 'Completed' && dueDate < current date/time
 * - Displayed with a red "Overdue" badge in the UI
 * - The Task model computes this via a virtual field 'isOverdue'
 */

let allUsers = [];
let allProjects = [];
let allTasks = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initSidebar('tasks');

  // Show/hide admin controls
  if (!isAdmin()) {
    document.getElementById('addTaskBtn')?.classList.add('hidden');
  }

  await Promise.all([loadUsers(), loadProjectsList()]);
  await loadTasks();

  // Add task button
  document.getElementById('addTaskBtn')?.addEventListener('click', () => openTaskModal());

  // Modal events
  document.getElementById('taskModalClose')?.addEventListener('click', closeTaskModal);
  document.getElementById('taskCancelBtn')?.addEventListener('click', closeTaskModal);
  document.getElementById('taskModalOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTaskModal();
  });

  // Form submit
  document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);

  // Filters
  document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
  document.getElementById('filterPriority')?.addEventListener('change', applyFilters);
  document.getElementById('filterProject')?.addEventListener('change', applyFilters);
});

async function loadUsers() {
  try {
    allUsers = await api.get('/users');
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

async function loadProjectsList() {
  try {
    allProjects = await api.get('/projects');
    // Populate project filter
    const filterProject = document.getElementById('filterProject');
    if (filterProject) {
      filterProject.innerHTML = '<option value="">All Projects</option>' +
        allProjects.map(p => `<option value="${p._id}">${p.title}</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

async function loadTasks() {
  try {
    allTasks = await api.get('/tasks');
    renderTasks(allTasks);
  } catch (err) {
    console.error('Failed to load tasks:', err);
  }
}

function applyFilters() {
  const status = document.getElementById('filterStatus')?.value || '';
  const priority = document.getElementById('filterPriority')?.value || '';
  const projectId = document.getElementById('filterProject')?.value || '';

  let filtered = [...allTasks];
  if (status) filtered = filtered.filter(t => t.status === status);
  if (priority) filtered = filtered.filter(t => t.priority === priority);
  if (projectId) filtered = filtered.filter(t => (t.projectId?._id || t.projectId) === projectId);

  renderTasks(filtered);
}

function renderTasks(tasks) {
  const container = document.getElementById('tasksGrid');
  const admin = isAdmin();

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <h3>No tasks found</h3>
        <p>${admin ? 'Create your first task to get started.' : 'No tasks assigned to you yet.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const isOverdue = task.status !== 'Completed' && new Date(task.dueDate) < new Date();
    const statusClass = task.status === 'Completed' ? 'status-completed' : task.status === 'In Progress' ? 'status-in-progress' : 'status-pending';
    const priorityClass = task.priority === 'High' ? 'priority-high' : task.priority === 'Medium' ? 'priority-medium' : 'priority-low';

    return `
      <div class="data-card" style="${isOverdue ? 'border-left: 3px solid var(--danger-500);' : ''}">
        <div class="data-card-header">
          <h3>${task.title}</h3>
          <div class="flex gap-1">
            <span class="badge ${priorityClass}">${task.priority}</span>
            ${isOverdue ? '<span class="badge badge-red">Overdue</span>' : ''}
          </div>
        </div>
        <p>${task.description || 'No description.'}</p>
        <div class="data-card-meta">
          <span class="badge ${statusClass}">${task.status}</span>
          <span class="badge badge-purple">📁 ${task.projectId?.title || '—'}</span>
          <span class="badge badge-gray">📅 ${formatDate(task.dueDate)}</span>
        </div>
        <div class="data-card-meta">
          <span style="font-size:.78rem;color:var(--text-muted);">👤 ${task.assignedTo?.name || 'Unassigned'}</span>
        </div>
        <div class="data-card-actions">
          ${admin ? `
            <button class="btn btn-sm btn-secondary" onclick="openTaskModal('${task._id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteTask('${task._id}')">Delete</button>
          ` : `
            ${task.status === 'Pending' ? `
              <button class="btn btn-sm btn-success" onclick="updateTaskStatus('${task._id}', 'In Progress')">Accept Task</button>
            ` : task.status === 'In Progress' ? `
              <button class="btn btn-sm btn-primary" onclick="updateTaskStatus('${task._id}', 'Completed')">Mark as Completed</button>
            ` : `
              <span class="badge badge-green">Task Finalized</span>
            `}
          `}
        </div>
      </div>
    `;
  }).join('');
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModalOverlay');
  const title = document.getElementById('taskModalTitle');
  const form = document.getElementById('taskForm');
  const idInput = document.getElementById('taskId');

  form.reset();
  idInput.value = '';

  // Populate project dropdown
  const projectSelect = document.getElementById('taskProject');
  projectSelect.innerHTML = '<option value="">Select project...</option>' +
    allProjects.map(p => `<option value="${p._id}">${p.title}</option>`).join('');

  // Populate assignedTo dropdown
  const assignSelect = document.getElementById('taskAssignedTo');
  assignSelect.innerHTML = '<option value="">Unassigned</option>' +
    allUsers.map(u => `<option value="${u._id}">${u.name} (${u.role})</option>`).join('');

  if (taskId) {
    title.textContent = 'Edit Task';
    const task = allTasks.find(t => t._id === taskId);
    if (task) {
      idInput.value = task._id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDescription').value = task.description || '';
      projectSelect.value = task.projectId?._id || task.projectId || '';
      assignSelect.value = task.assignedTo?._id || '';
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskDueDate').value = formatDateInput(task.dueDate);
    }
  } else {
    title.textContent = 'New Task';
  }

  modal.classList.add('active');
}

function closeTaskModal() {
  document.getElementById('taskModalOverlay').classList.remove('active');
}

async function handleTaskSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('taskId').value;
  const body = {
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDescription').value.trim(),
    projectId: document.getElementById('taskProject').value,
    assignedTo: document.getElementById('taskAssignedTo').value || null,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    dueDate: document.getElementById('taskDueDate').value
  };

  try {
    if (id) {
      await api.put(`/tasks/${id}`, body);
    } else {
      await api.post('/tasks', body);
    }
    closeTaskModal();
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function updateTaskStatus(taskId, status) {
  if (status === 'In Progress') {
    if (!confirm('Do you want to accept this task and start working on it?')) return;
  }
  
  try {
    await api.put(`/tasks/${taskId}`, { status });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await api.delete(`/tasks/${id}`);
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}
