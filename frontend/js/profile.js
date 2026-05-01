/**
 * Profile Page Logic
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initSidebar('profile');

  try {
    const user = await api.get('/auth/me');
    
    // Avatar initials
    const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileRole').textContent = user.role;
    document.getElementById('profileJoined').textContent = formatDate(user.createdAt);
  } catch (err) {
    console.error('Profile error:', err);
  }
});
