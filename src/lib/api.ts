import { auth } from './firebase';
import { FullPlayerState } from '../types/system';
import { handleLocalApiRequest } from './localEngine';

const OFFLINE_QUEUE_KEY = 'the_system_offline_progress_queue';

export interface QueuedProgressItem {
  questId: number;
  missionId: number;
  amount: number;
  queuedAt: number;
}

export function isCapacitorNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (win.Capacitor?.isNativePlatform?.()) return true;
  if (window.location.protocol === 'capacitor:') return true;
  if (window.location.hostname === 'localhost' && window.location.port === '') return true;
  return false;
}

let remoteApiHealthy: boolean | null = null;

export async function isStandaloneLocalMode(): Promise<boolean> {
  if (!isCapacitorNativeApp()) return false;
  if (remoteApiHealthy === true) return false;
  if (remoteApiHealthy === false) return true;

  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    remoteApiHealthy = false;
    return true;
  }

  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(`${base}/api/health`, { signal: ctrl.signal });
    window.clearTimeout(timer);
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.status === 'ok') {
        remoteApiHealthy = true;
        return false;
      }
    }
  } catch {
    // Remote server unreachable or blocked
  }

  remoteApiHealthy = false;
  return true;
}

export function getOfflineQueue(): QueuedProgressItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineProgress(item: QueuedProgressItem) {
  try {
    const queue = getOfflineQueue();
    queue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // Ignore
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function apiRequest<T = FullPlayerState>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  if (await isStandaloneLocalMode()) {
    return handleLocalApiRequest<T>(path, method, body);
  }

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function flushOfflineProgressQueue(): Promise<FullPlayerState | null> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return null;
  }
  const standalone = await isStandaloneLocalMode();
  if (!standalone && (!navigator.onLine || !auth.currentUser)) {
    return null;
  }
  let latestState: FullPlayerState | null = null;
  const remaining: QueuedProgressItem[] = [];
  for (const item of queue) {
    try {
      latestState = await apiRequest<FullPlayerState>('/api/player/quest/progress', 'POST', {
        questId: item.questId,
        missionId: item.missionId,
        amount: item.amount,
      });
    } catch {
      remaining.push(item);
    }
  }
  if (remaining.length === 0) {
    clearOfflineQueue();
  } else {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }
  return latestState;
}
