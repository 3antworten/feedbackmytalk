import { db } from "./db/index.js";

export function getSignupsEnabled() {
  const row = db.prepare("SELECT signups_enabled FROM app_settings WHERE id = 1").get();
  return !!row?.signups_enabled;
}

export function setSignupsEnabled(enabled) {
  db.prepare("UPDATE app_settings SET signups_enabled = ? WHERE id = 1").run(enabled ? 1 : 0);
}

export function speakerCount() {
  return db.prepare("SELECT COUNT(*) AS n FROM speakers").get().n;
}
