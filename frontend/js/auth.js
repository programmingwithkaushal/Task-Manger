/**
 * Auth Page Logic (login.html & signup.html)
 * 
 * JWT Authentication Flow:
 * 1. User submits login/signup form
 * 2. Credentials are sent to POST /api/auth/login or /api/auth/signup
 * 3. Server validates credentials, hashes password (signup), or compares hash (login)
 * 4. Server returns a JWT token + user object
 * 5. Client stores both in localStorage
 * 6. All subsequent API requests include "Authorization: Bearer <token>"
 * 7. Auth middleware on the server decodes the token to identify the user
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (getToken()) {
    window.location.href = '/pages/dashboard.html';
    return;
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/pages/dashboard.html';
      } catch (err) {
        showAlert('authAlert', err.message);
      }
    });
  }

  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;

      if (password.length < 6) {
        showAlert('authAlert', 'Password must be at least 6 characters.');
        return;
      }

      try {
        const data = await api.post('/auth/signup', { name, email, password, role });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/pages/dashboard.html';
      } catch (err) {
        showAlert('authAlert', err.message);
      }
    });
  }
});
