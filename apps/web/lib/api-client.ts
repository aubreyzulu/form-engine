export type ApiErrorDetail = {
  field?: string;
  message: string;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
  message?: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  return apiUrl.replace(/\/+$/, '');
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as ApiErrorEnvelope;
    const error = body.error;
    return new ApiClientError(
      error?.message ?? body.message ?? `Request failed with status ${response.status}.`,
      response.status,
      error?.code,
      error?.details,
    );
  } catch {
    return new ApiClientError(`Request failed with status ${response.status}.`, response.status);
  }
}
