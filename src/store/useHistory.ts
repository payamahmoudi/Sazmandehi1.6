import { useState, useCallback, useEffect } from 'react';
import { apiGetHistory, apiAddHistory } from '../services/api';

export interface HistoryEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

const MAX_HISTORY = 50;

export function useHistory(_workspaceId: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  // Load from backend
  useEffect(() => {
    apiGetHistory()
      .then((data: any) => setEntries(data || []))
      .catch(() => {});
  }, []);

  const addEntry = useCallback((action: string, detail: string) => {
    const entry: HistoryEntry = {
      id: `h-${Date.now()}`,
      action,
      detail,
      timestamp: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev].slice(0, MAX_HISTORY));
    apiAddHistory(action, detail).catch(() => {});
  }, []);

  const removeEntry = useCallback((entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
  }, []);

  const undoEntry = useCallback((_entryId: string) => {
    alert('بازگشت در نسخه تحت وب پشتیبانی نمی‌شود. از پشتیبان‌گیری استفاده کنید.');
    return false;
  }, []);

  return { entries, addEntry, undoEntry, removeEntry, clearHistory };
}
