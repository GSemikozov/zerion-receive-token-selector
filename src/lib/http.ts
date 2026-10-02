export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const MAX_RETRIES = 3;

/**
 * React Query retry policy. Client errors won't fix themselves on retry (and burn rate-limited
 * quota), except 429. Network failures and 5xx are worth retrying.
 */
export function shouldRetryRequest(failureCount: number, error: unknown) {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof HttpError) return error.status === 429 || error.status >= 500;
  return true;
}
