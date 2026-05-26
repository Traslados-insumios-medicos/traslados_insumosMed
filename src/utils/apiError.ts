export interface ApiValidationError {
  message?: string;
  path?: string | string[];
}

export interface ApiErrorBody {
  message?: string;
  errors?: ApiValidationError[];
}

export function getApiErrorBody(err: unknown): ApiErrorBody | undefined {
  if (typeof err !== "object" || err === null || !("response" in err)) {
    return undefined;
  }
  return (err as { response?: { data?: ApiErrorBody } }).response?.data;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorBody(err)?.message ?? fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("response" in err)) {
    return undefined;
  }
  return (err as { response?: { status?: number } }).response?.status;
}
