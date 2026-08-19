import { nanoid } from "nanoid";
import { db } from "./db/index.js";

// Identifies a voter regardless of role, so participants and the owning speaker share one
// vote per item — "participant:<id>" or "speaker:<id>".
export function voterKeyFor(req) {
  if (req.participant) return `participant:${req.participant.id}`;
  if (req.speaker) return `speaker:${req.speaker.id}`;
  return null;
}

const emptySummary = { up: 0, down: 0, score: 0, myVote: 0 };

// Batch vote aggregation for a list of item ids — one query for totals, one for "my vote",
// instead of N+1 per-row lookups.
export function voteSummaries(table, idColumn, ids, voterKey) {
  const map = new Map();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  const totals = db
    .prepare(
      `SELECT ${idColumn} AS itemId,
              COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS up,
              COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS down
       FROM ${table} WHERE ${idColumn} IN (${placeholders}) GROUP BY ${idColumn}`
    )
    .all(...ids);
  const mineById = new Map();
  if (voterKey) {
    const mine = db
      .prepare(
        `SELECT ${idColumn} AS itemId, value FROM ${table}
         WHERE ${idColumn} IN (${placeholders}) AND voter_key = ?`
      )
      .all(...ids, voterKey);
    for (const row of mine) mineById.set(row.itemId, row.value);
  }
  const totalsById = new Map(totals.map((r) => [r.itemId, r]));
  for (const id of ids) {
    const t = totalsById.get(id);
    const up = t?.up || 0;
    const down = t?.down || 0;
    map.set(id, { up, down, score: up - down, myVote: mineById.get(id) || 0 });
  }
  return map;
}

export function voteSummary(table, idColumn, id, voterKey) {
  return voteSummaries(table, idColumn, [id], voterKey).get(id) || emptySummary;
}

// Upserts (or, for value 0, removes) a single voter's vote on one item.
export function castVote(table, idColumn, id, voterKey, value) {
  if (!voterKey) {
    const err = new Error("Must be joined as a participant or signed in as speaker to vote");
    err.status = 401;
    throw err;
  }
  if (![1, -1, 0].includes(value)) {
    const err = new Error("value must be 1, -1, or 0");
    err.status = 400;
    throw err;
  }
  if (value === 0) {
    db.prepare(`DELETE FROM ${table} WHERE ${idColumn} = ? AND voter_key = ?`).run(id, voterKey);
    return;
  }
  db.prepare(
    `INSERT INTO ${table} (id, ${idColumn}, voter_key, value) VALUES (?, ?, ?, ?)
     ON CONFLICT(${idColumn}, voter_key) DO UPDATE SET value = excluded.value`
  ).run(nanoid(), id, voterKey, value);
}
