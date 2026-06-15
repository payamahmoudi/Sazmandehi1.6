import { useCallback, useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { apiLogin, apiGetMe, apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser, getToken, setToken, removeToken } from '../services/api';

const THEME_KEY = 'saman-edu-theme';

// Fallback local admin for when backend is not available
const LOCAL_ADMIN: UserAccount = {
  id: 'admin-master-paya',
  username: 'paya',
  fullName: 'پایا محمودی',
  role: 'admin',
  panelTitle: 'پنل مدیریت کل سامانه',
  isActive: true,
  createdAt: new Date().toISOString(),
  password: '',
  organization: {
    ministry: 'وزارت آموزش و پرورش',
    province: 'استان چهارمحال و بختیاری',
    office: 'اداره آموزش و پرورش شهرستان سامان',
  },
};

function hashLocal(password: string): string {
  let hash = 0;
  const salt = 'SamanEdu@1406#PayaSecure';
  const salted = salt + password + salt;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) - hash) + salted.charCodeAt(i);
    hash = hash & hash;
  }
  return 'h$' + Math.abs(hash).toString(36) + '$' + salted.length.toString(36);
}

const LOCAL_ADMIN_HASH = hashLocal('Mahmoudi80');

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // On mount: check token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiGetMe()
      .then(user => {
        setCurrentUser(user);
        setBackendAvailable(true);
        setLoading(false);
      })
      .catch(() => {
        removeToken();
        setBackendAvailable(false);
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    // Try backend first
    try {
      const res = await apiLogin(username, password);
      setToken(res.access_token);
      setCurrentUser(res.user);
      setBackendAvailable(true);
      return { ok: true, message: 'ورود موفق بود.' };
    } catch (err: any) {
      // If backend returned a real error (wrong password), show it
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('Load failed')) {
        return { ok: false, message: err.message };
      }
    }

    // Fallback: local admin login when backend is not available
    setBackendAvailable(false);
    const normalized = username.trim().toLowerCase();
    if (normalized === 'paya' && hashLocal(password) === LOCAL_ADMIN_HASH) {
      setToken('local-admin-token');
      setCurrentUser(LOCAL_ADMIN);
      return { ok: true, message: 'ورود موفق (حالت آفلاین).' };
    }

    return { ok: false, message: 'نام کاربری یا رمز عبور اشتباه است.' };
  }, []);

  const logout = useCallback(() => {
    removeToken();
    document.documentElement.classList.remove('dark');
    setCurrentUser(null);
  }, []);

  // User management
  const loadUsers = useCallback(async () => {
    if (!backendAvailable) {
      setUsers([LOCAL_ADMIN]);
      return;
    }
    try {
      const list = await apiGetUsers();
      setUsers(list);
    } catch {
      setUsers([LOCAL_ADMIN]);
    }
  }, [backendAvailable]);

  useEffect(() => {
    if (currentUser?.role === 'admin') loadUsers();
  }, [currentUser, loadUsers]);

  const addUser = useCallback(async (input: any) => {
    if (!backendAvailable) return { ok: false, message: 'سرور در دسترس نیست.' };
    try {
      const res = await apiCreateUser(input);
      await loadUsers();
      return { ok: true, message: res.message || 'کاربر ایجاد شد.' };
    } catch (err: any) {
      return { ok: false, message: err.message || 'خطا' };
    }
  }, [backendAvailable, loadUsers]);

  const updateUser = useCallback(async (userId: string, updates: any) => {
    if (!backendAvailable) return;
    try {
      await apiUpdateUser(userId, updates);
      await loadUsers();
      if (currentUser?.id === userId) {
        try {
          const me = await apiGetMe();
          setCurrentUser(me);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [backendAvailable, loadUsers, currentUser]);

  const removeUser = useCallback(async (userId: string) => {
    if (!backendAvailable) return { ok: false, message: 'سرور در دسترس نیست.' };
    try {
      const res = await apiDeleteUser(userId);
      await loadUsers();
      return { ok: true, message: res.message || 'حذف شد.' };
    } catch (err: any) {
      return { ok: false, message: err.message || 'خطا' };
    }
  }, [backendAvailable, loadUsers]);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem(THEME_KEY) as any) || 'light';
  });

  const changeTheme = useCallback((t: 'light' | 'dark' | 'system') => {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  // Admin impersonate: view user's panel without them knowing
  const [impersonating, setImpersonating] = useState<UserAccount | null>(null);
  const [realAdmin, setRealAdmin] = useState<UserAccount | null>(null);

  const impersonate = useCallback(async (userId: string) => {
    if (currentUser?.role !== 'admin') return;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    setRealAdmin(currentUser);
    setImpersonating(targetUser);
    setCurrentUser(targetUser);
  }, [currentUser, users]);

  const stopImpersonating = useCallback(() => {
    if (realAdmin) {
      setCurrentUser(realAdmin);
      setImpersonating(null);
      setRealAdmin(null);
    }
  }, [realAdmin]);

  const effectiveUser = currentUser;

  return { users, currentUser: effectiveUser, loading, login, logout, addUser, updateUser, removeUser, theme, changeTheme, impersonate, stopImpersonating, impersonating, realAdmin };
}
