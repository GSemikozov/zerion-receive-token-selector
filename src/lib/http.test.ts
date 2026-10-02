import { HttpError, shouldRetryRequest } from '@/lib/http';

describe('shouldRetryRequest', () => {
  it.each([
    ['a network failure', new TypeError('Failed to fetch'), true],
    ['a server error', new HttpError(503, 'down'), true],
    ['rate limiting', new HttpError(429, 'slow down'), true],
    ['a bad request', new HttpError(400, 'bad'), false],
    ['an auth error', new HttpError(401, 'nope'), false],
  ])('on %s → %s', (_, error, expected) => {
    expect(shouldRetryRequest(0, error)).toBe(expected);
  });

  it('gives up after 3 retries', () => {
    const error = new HttpError(500, 'down');
    expect(shouldRetryRequest(2, error)).toBe(true);
    expect(shouldRetryRequest(3, error)).toBe(false);
  });
});
