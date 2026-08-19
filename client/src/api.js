// Thin fetch wrapper. Speaker auth rides on an httpOnly cookie (credentials: include).
// Participant identity rides on an X-Participant-Token header, resolved per-session
// from localStorage by the caller (see participant.js).

async function request(path, { method = "GET", body, participantToken, isForm = false } = {}) {
  const headers = {};
  if (participantToken) headers["X-Participant-Token"] = participantToken;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data; // lets callers inspect extra fields, e.g. { requiresConfirmation, email }
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  signupStatus: () => request("/auth/signup-status"),
  register: (email, password) => request("/auth/register", { method: "POST", body: { email, password } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  confirmEmail: (token) => request(`/auth/confirm-email/${token}`, { method: "POST" }),
  resendConfirmation: (email) => request("/auth/resend-confirmation", { method: "POST", body: { email } }),

  // Admin
  adminGetSettings: () => request("/admin/settings"),
  adminUpdateSettings: (patch) => request("/admin/settings", { method: "PATCH", body: patch }),
  adminListSpeakers: () => request("/admin/speakers"),
  adminDeleteSpeaker: (id) => request(`/admin/speakers/${id}`, { method: "DELETE" }),
  adminListDecks: () => request("/admin/decks"),
  adminDeleteDeck: (id) => request(`/admin/decks/${id}`, { method: "DELETE" }),

  // Decks
  listDecks: () => request("/decks"),
  getDeck: (deckId) => request(`/decks/${deckId}`),
  uploadDeck: (file, name) => {
    const form = new FormData();
    form.append("pdf", file);
    if (name) form.append("name", name);
    return request("/decks", { method: "POST", body: form, isForm: true });
  },
  deleteDeck: (deckId) => request(`/decks/${deckId}`, { method: "DELETE" }),

  // Sessions (speaker)
  createSession: (deckId, name) => request(`/sessions/for-deck/${deckId}`, { method: "POST", body: { name } }),
  getSession: (sessionId) => request(`/sessions/${sessionId}`),
  updateSession: (sessionId, patch) => request(`/sessions/${sessionId}`, { method: "PATCH", body: patch }),
  deleteSession: (sessionId) => request(`/sessions/${sessionId}`, { method: "DELETE" }),
  reviewPractice: (sessionId) => request(`/sessions/${sessionId}/review/practice`),
  deleteCommentAsSpeaker: (id) => request(`/comments/${id}`, { method: "DELETE" }),
  deleteQuestionAsSpeaker: (id) => request(`/questions/${id}`, { method: "DELETE" }),

  // Feedback (comments/questions), flat + session-wide — shared by the speaker's review
  // pages and the participant's Comments/Questions tabs. `token` is omitted for the speaker
  // (cookie auth) and passed for participants.
  sessionComments: (sessionId, token) => request(`/sessions/${sessionId}/comments`, { participantToken: token }),
  sessionQuestions: (sessionId, token) => request(`/sessions/${sessionId}/questions`, { participantToken: token }),
  voteComment: (id, value, token) =>
    request(`/comments/${id}/vote`, { method: "PUT", body: { value }, participantToken: token }),
  voteQuestion: (id, value, token) =>
    request(`/questions/${id}/vote`, { method: "PUT", body: { value }, participantToken: token }),

  // Prepared (practice) questions — speaker manages, participant responds.
  listPreparedQuestions: (sessionId, token) =>
    request(`/sessions/${sessionId}/prepared-questions`, { participantToken: token }),
  addPreparedQuestion: (sessionId, text) =>
    request(`/sessions/${sessionId}/prepared-questions`, { method: "POST", body: { text } }),
  deletePreparedQuestion: (id) => request(`/prepared-questions/${id}`, { method: "DELETE" }),
  respondToPreparedQuestion: (sessionId, id, patch, token) =>
    request(`/sessions/${sessionId}/prepared-questions/${id}/response`, {
      method: "PATCH",
      body: patch,
      participantToken: token,
    }),

  // Join / participant
  lookupJoinCode: (joinCode) => request(`/join/${joinCode}`),
  join: (joinCode, displayName) => request(`/join/${joinCode}`, { method: "POST", body: { displayName } }),
  participantSlides: (sessionId, token) => request(`/sessions/${sessionId}/slides`, { participantToken: token }),

  listComments: (sessionId, slideId, token) =>
    request(`/sessions/${sessionId}/slides/${slideId}/comments`, { participantToken: token }),
  addComment: (sessionId, slideId, text, token) =>
    request(`/sessions/${sessionId}/slides/${slideId}/comments`, {
      method: "POST",
      body: { text },
      participantToken: token,
    }),
  deleteComment: (id, token) => request(`/comments/${id}`, { method: "DELETE", participantToken: token }),

  listQuestions: (sessionId, slideId, token) =>
    request(`/sessions/${sessionId}/slides/${slideId}/questions`, { participantToken: token }),
  addQuestion: (sessionId, slideId, text, token) =>
    request(`/sessions/${sessionId}/slides/${slideId}/questions`, {
      method: "POST",
      body: { text },
      participantToken: token,
    }),
  deleteQuestion: (id, token) => request(`/questions/${id}`, { method: "DELETE", participantToken: token }),
  updateQuestion: (id, patch, token) =>
    request(`/questions/${id}`, { method: "PATCH", body: patch, participantToken: token }),
  saveQuestionResponse: (id, answerNote, token) =>
    request(`/questions/${id}/response`, { method: "PATCH", body: { answerNote }, participantToken: token }),
};
