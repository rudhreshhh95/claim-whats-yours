export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Fetch JSON from the API with a timeout.
 * Throws an Error with `network = true` when the request fails or times out,
 * and with `status` set to the HTTP status when the response is not ok.
 * Returns parsed JSON, or null for an empty body.
 */
export async function apiFetch(path, options = {}, timeoutMs = 3000) {
  const { headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(API_BASE + path, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      signal: controller.signal,
    });
  } catch (cause) {
    const err = new Error(cause?.name === 'AbortError' ? 'Request timed out' : 'Network error');
    err.network = true;
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Delete all of a household's data. Refuses to call the API without a householdId,
 * because the server wipes everything when householdId is missing.
 */
export async function deleteMyData(householdId, token) {
  if (!householdId) throw new Error('householdId required');
  return apiFetch(`/api/me?householdId=${encodeURIComponent(householdId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ householdId }),
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
}
