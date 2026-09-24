// Shared helpers for the /api functions. Files under api/_lib are not deployed as routes.

export const USER_AGENT = 'PostStudio/0.1 (personal content drafting tool)'

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export function fail(message, status = 400) {
  return json({ error: message }, status)
}

export class HttpError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}
