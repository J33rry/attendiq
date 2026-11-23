import { API_BASE } from "./config";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Fired when a request comes back 401 so the auth layer can send the user to login. */
export const UNAUTHORIZED_EVENT = "attendiq:unauthorized";

function messageFor(status, data) {
  if (data?.details?.length) return data.details.map((d) => d.message).join(". ");
  if (data?.error) return data.error;
  if (status >= 500) return "The AttendIQ server ran into a problem. Please try again.";
  return "Something went wrong. Please try again.";
}

/**
 * Calls the AttendIQ API. The session lives in an httpOnly cookie set by the backend,
 * so we only need to send cookies along (credentials: "include"). Nothing is stored here.
 */
export async function api(path, { method = "GET", body, query, signal, silent401 = false } = {}) {
  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    if ([...qs].length) url += `?${qs}`;
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError("Can't reach the AttendIQ server. Check that the backend is running.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !silent401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(messageFor(res.status, data), res.status, data);
  }
  return data;
}

export const authApi = {
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password }, silent401: true }),
  me: () => api("/auth/me", { silent401: true }),
  logout: () => api("/auth/logout", { method: "POST", silent401: true }),
};

export const studentApi = {
  dashboard: () => api("/student/dashboard"),
  attendance: (subjectId) => api("/student/attendance", { query: { subjectId } }),
  bunk: (skip = 1, subjectId) => api("/student/planner/bunk", { query: { skip, subjectId } }),
  recovery: () => api("/student/planner/recovery"),
  ask: (question) => api("/student/assistant", { method: "POST", body: { question } }),
  holidays: () => api("/holidays"),
};

export const facultyApi = {
  dashboard: () => api("/faculty/dashboard"),
  subject: (id) => api(`/faculty/subjects/${id}/students`),
  sessions: (query) => api("/faculty/sessions", { query }),
  createSession: (body) => api("/faculty/sessions", { method: "POST", body }),
  updateSession: (id, body) => api(`/faculty/sessions/${id}`, { method: "PATCH", body }),
  cancelSession: (id) => api(`/faculty/sessions/${id}/cancel`, { method: "POST" }),
  sessionAttendance: (id) => api(`/faculty/sessions/${id}/attendance`),
  saveAttendance: (id, records) => api(`/faculty/sessions/${id}/attendance`, { method: "PUT", body: { records } }),
  addHoliday: (date, name) => api("/faculty/holidays", { method: "POST", body: { date, name } }),
  holidays: () => api("/holidays"),
};
