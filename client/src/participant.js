// Participant identity is scoped to one session and lives in localStorage,
// keyed by session id (joining a different session = a different identity).

const keyFor = (sessionId) => `fmt_participant_${sessionId}`;

export function getParticipant(sessionId) {
  const raw = localStorage.getItem(keyFor(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setParticipant(sessionId, participant) {
  localStorage.setItem(keyFor(sessionId), JSON.stringify(participant));
}
