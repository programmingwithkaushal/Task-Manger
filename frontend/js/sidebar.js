/**
 * Sidebar Component Generator
 * 
 * Shared across all authenticated pages.
 * Generates the sidebar HTML and initializes mobile toggle behavior.
 */

function initSidebar(activePage) {
  const user = getUser();
  if (!user) return;

  const navItems = [
    { href: '/pages/dashboard.html', label: 'Dashboard', icon: 'dashboard', id: 'dashboard' },
    { href: '/pages/projects.html', label: 'Projects', icon: 'projects', id: 'projects' },
    { href: '/pages/tasks.html', label: 'Tasks', icon: 'tasks', id: 'tasks' },
    { href: '/pages/profile.html', label: 'Profile', icon: 'profile', id: 'profile' },
  ];

  const icons = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    projects: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  };

  // Generate sidebar HTML
  const sidebarHTML = `
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="mobile-header">
      <h2>TaskFlow</h2>
      <button class="hamburger" id="hamburgerBtn">☰</button>
    </div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h2>TaskFlow</h2>
        <div class="user-tag">${user.name} • ${user.role}</div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(item => `
          <a href="${item.href}" class="${item.id === activePage ? 'active' : ''}" id="nav-${item.id}">
            ${icons[item.icon]}
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" id="logoutBtn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Mobile toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburgerBtn');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}
