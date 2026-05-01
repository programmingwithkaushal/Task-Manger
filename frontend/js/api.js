/**
 * API Helper Module
 * 
 * Centralizes all API requests. Automatically attaches the JWT token
 * from localStorage to every request and handles 401 (token expired)
 * by redirecting to the login page.
 */

const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  // Remove headers from options to avoid duplication
  delete config.headers;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  // If unauthorized, redirect to login
  if (response.status === 401) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/pages/login.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Convenience methods
const api = {
  get: (endpoint) => apiRequest(endpoint),
  
  post: (endpoint, body) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  
  put: (endpoint, body) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  
  delete: (endpoint) => apiRequest(endpoint, {
    method: 'DELETE'
  })
};

// Auth helpers
function getToken() {
  return sessionStorage.getItem('token');
}

function getUser() {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function isAdmin() {
  const user = getUser();
  return user && user.role === 'Admin';
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  window.location.href = '/pages/login.html';
}

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

// Show/hide alerts
function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}
