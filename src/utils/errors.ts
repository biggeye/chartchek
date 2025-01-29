export class APIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function handleError(error: unknown): APIError {
  if (isAPIError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new APIError(error.message);
  }

  return new APIError('An unexpected error occurred');
}

export const REALTIME_SUBSCRIBE_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR',
  TIMED_OUT: 'TIMED_OUT',
  UNSUBSCRIBED: 'UNSUBSCRIBED'
} as const;

export type RealtimeSubscribeState = typeof REALTIME_SUBSCRIBE_STATES[keyof typeof REALTIME_SUBSCRIBE_STATES];
