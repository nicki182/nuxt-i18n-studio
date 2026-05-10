export interface FetchError extends Error {
  response?: { status?: number };
}
