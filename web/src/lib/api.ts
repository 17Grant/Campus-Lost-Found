export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const details = data?.details as Record<string, string[]> | undefined;
    const firstDetail = details ? Object.values(details).flat()[0] : undefined;
    throw new ApiError(firstDetail ?? data?.error ?? 'Something went wrong', res.status);
  }

  return data as T;
}