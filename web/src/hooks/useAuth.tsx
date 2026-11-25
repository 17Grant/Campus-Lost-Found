'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
      setUnavailable(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setUnavailable(false);
      } else {
        // A server or network problem is not the same as being signed out
        setUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  if (unavailable && !loading) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold">Can&apos;t reach the server</h1>
        <p className="mb-4 text-gray-600">
          Check your connection. If it keeps happening, the service may be starting up, so wait a
          few seconds and try again.
        </p>
        <button
          onClick={() => {
            setUnavailable(false);
            setLoading(true);
            refresh();
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </main>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}