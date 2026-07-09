export function isInvalidRefreshTokenError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('refresh token has expired') ||
    message.includes('already used')
  );
}

export function isRetryableAuthFetchError(error: unknown) {
  const value = error as { status?: unknown; message?: unknown; name?: unknown };
  const status = typeof value?.status === 'number' ? value.status : undefined;
  const message = getErrorMessage(error).toLowerCase();
  return (
    status === 521 ||
    status === 522 ||
    status === 523 ||
    status === 524 ||
    message.includes('authretryablefetcherror') ||
    message.includes('retryable')
  );
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return String(error);
}
