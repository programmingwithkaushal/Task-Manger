/**
 * Projects Page Logic
 * 
 * Mongoose Schema Relationships:
 * - project.createdBy → User ObjectId (who created it)
 * - project.members[] → Array of User ObjectIds (team members)
 * - Populated via .populate('members', 'name email role')
 * 
 * Role-Based Access:
 * - Admin: full CRUD on projects, can add/remove members
 * - Member: view only projects they're a member of
 */

let allUsers = [];
let allProjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initSidebar('projects');

  // Show/hide admin controls
  if (!isAdmin()) {
    document.getElementById('addProjectBtn')?.classList.add('hidden');
  }

  await loadUsers();
  await loadProjects();

  // Add project button
  document.getElementById('addProjectBtn')?.addEventListener('click', () => openProjectModal());

  // Modal close
  document.getElementById('projectModalClose')?.addEventListener('click', closeProjectModal);
  document.getElementById('projectCancelBtn')?.addEventListener('click', closeProjectModal);
  document.getElementById('projectModalOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProjectModal();
  });

  // Form submit
  document.getElementById('projectForm')?.addEventListener('submit', handleProjectSubmit);
});

async function loadUsers() {
  try {
    allUsers = await api.get('/users');
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

async function loadProjects() {
  try {
    allProjects = await api.get('/projects');
    renderProjects(allProjects);
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

function renderProjects(projects) {
  const container = document.getElementById('projectsGrid');

  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <h3>No projects yet</h3>
        <p>${isAdmin() ? 'Create your first project to get started.' : 'You haven\'t been added to any projects yet.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = projects.map(project => {
    const isExpired = new Date(project.deadline) < new Date();
    const memberCount = project.members?.length || 0;
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h3>${project.title}</h3>
          ${isExpired ? '<span class="badge badge-red">Overdue</span>' : '<span class="badge badge-green">Active</span>'}
        </div>
        <p>${project.description || 'No description provided.'}</p>
        <div class="data-card-meta">
          <span class="badge badge-purple">👥 ${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
          <span class="badge badge-gray">📅 ${formatDate(project.deadline)}</span>
        </div>
        <div class="data-card-meta">
          <span style="font-size:.78rem;color:var(--text-muted);">Created by ${project.createdBy?.name || 'Unknown'}</span>
        </div>
        ${isAdmin() ? `
          <div class="data-card-actions">
            <button class="btn btn-sm btn-secondary" onclick="openProjectModal('${project._id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProject('${project._id}')">Delete</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function openProjectModal(projectId = null) {
  const modal = document.getElementById('projectModalOverlay');
  const title = document.getElementById('projectModalTitle');
  const form = document.getElementById('projectForm');
  const idInput = document.getElementById('projectId');
  const membersContainer = document.getElementById('membersCheckboxes');

  form.reset();
  idInput.value = '';

  // Populate members checkboxes
  membersContainer.innerHTML = allUsers.map(u => `
    <label>
      <input type="checkbox" name="members" value="${u._id}">
      ${u.name} (${u.email}) — ${u.role}
    </label>
  `).join('');

  if (projectId) {
    title.textContent = 'Edit Project';
    const project = allProjects.find(p => p._id === projectId);
    if (project) {
      idInput.value = project._id;
      document.getElementById('projectTitle').value = project.title;
      document.getElementById('projectDescription').value = project.description || '';
      document.getElementById('projectDeadline').value = formatDateInput(project.deadline);

      // Check existing members
      const memberIds = project.members.map(m => m._id);
      membersContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (memberIds.includes(cb.value)) cb.checked = true;
      });
    }
  } else {
    title.textContent = 'New Project';
  }

  modal.classList.add('active');
}

function closeProjectModal() {
  document.getElementById('projectModalOverlay').classList.remove('active');
}

async function handleProjectSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('projectId').value;
  const title = document.getElementById('projectTitle').value.trim();
  const description = document.getElementById('projectDescription').value.trim();
  const deadline = document.getElementById('projectDeadline').value;

  const checkedBoxes = document.querySelectorAll('#membersCheckboxes input[type="checkbox"]:checked');
  const members = Array.from(checkedBoxes).map(cb => cb.value);

  const body = { title, description, deadline, members };

  try {
    if (id) {
      await api.put(`/projects/${id}`, body);
    } else {
      await api.post('/projects', body);
    }
    closeProjectModal();
    await loadProjects();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProject(id) {
  if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
  try {
    await api.delete(`/projects/${id}`);
    await loadProjects();
  } catch (err) {
    alert(err.message);
  }
}
