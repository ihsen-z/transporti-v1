export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  code: string; // e.g. 'UNAUTHORIZED', 'NETWORK_ERROR', 'VALIDATION_ERROR', 'SERVER_ERROR', 'UNKNOWN_ERROR'
  message: string;
  details?: Record<string, string[]>; // field-level validation errors
  status?: number; // HTTP status code
}
