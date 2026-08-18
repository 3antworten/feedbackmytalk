import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.join(__dirname, "..", "uploads");

// Removes a deck's rendered slide images from disk. Safe to call even if the folder is
// already gone.
export function removeDeckFiles(deckId) {
  fs.rmSync(path.join(uploadsRoot, deckId), { recursive: true, force: true });
}
