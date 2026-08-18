// Shared row -> API-shape formatters, kept in one place so every route returns the same
// camelCase shape for the same underlying row.

export function formatSlide(row) {
  return {
    id: row.id,
    orderIndex: row.order_index,
    imagePath: row.image_path,
    title: row.title || null,
    isGeneral: !!row.is_general,
  };
}

export function formatSession(row) {
  return {
    id: row.id,
    deckId: row.deck_id,
    name: row.name || null,
    joinCode: row.join_code,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function displayAuthor(displayName, joinOrder) {
  return displayName && displayName.trim() ? displayName.trim() : `Anonymous #${joinOrder}`;
}

export function formatSpeaker(row) {
  return { id: row.id, email: row.email, isAdmin: !!row.is_admin, emailConfirmed: !!row.email_confirmed_at };
}
