// ━━━━━━━━ Centralized API Client ━━━━━━━━
// All backend communication goes through this file.
// No component may contain a hardcoded URL.

import { API_BASE_URL } from '../config/api';

const TOKEN_KEY = 'saman-edu-token';

// ━━━ Token Management ━━━

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ━━━ Request Helper ━━━

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    removeToken();
    window.location.reload();
    throw new Error('unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'خطای سرور' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ━━━ Auth API ━━━

export async function apiLogin(username: string, password: string) {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'خطا' }));
    throw new Error(err.detail || 'خطای ورود');
  }
  return res.json();
}

export async function apiGetMe() {
  return request('/api/auth/me');
}

// ━━━ Users API (Admin only - backend enforces) ━━━

export async function apiGetUsers() {
  return request('/api/users');
}

export async function apiCreateUser(data: any) {
  // Never send owner_id - backend assigns from JWT
  return request('/api/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateUser(userId: string, data: any) {
  return request(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteUser(userId: string) {
  return request(`/api/users/${userId}`, { method: 'DELETE' });
}

// ━━━ Workspace API (owner_id from JWT - backend enforces) ━━━

export async function apiGetWorkspace() {
  return request('/api/workspace');
}

export async function apiSaveWorkspace(data: any) {
  // Never send user_id - backend extracts from JWT
  return request('/api/workspace', { method: 'POST', body: JSON.stringify({ data }) });
}

// ━━━ History API (user_id from JWT - backend enforces) ━━━

export async function apiGetHistory() {
  return request('/api/history');
}

export async function apiAddHistory(action: string, detail: string) {
  return request('/api/history', { method: 'POST', body: JSON.stringify({ action, detail }) });
}
