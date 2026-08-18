import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { requireSpeaker } from "../auth.js";
import { renderPdfToImages } from "../pdfRender.js";
import { formatSlide, formatSession } from "../format.js";
import { uploadsRoot, removeDeckFiles } from "../uploads.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are accepted"));
    }
    cb(null, true);
  },
});

const router = Router();

router.use(requireSpeaker);

router.get("/", (req, res) => {
  const decks = db
    .prepare(
      `SELECT d.id, d.name, d.created_at,
              (SELECT COUNT(*) FROM slides s WHERE s.deck_id = d.id AND s.is_general = 0) AS slide_count,
              (SELECT COUNT(*) FROM sessions se WHERE se.deck_id = d.id) AS session_count
       FROM decks d WHERE d.speaker_id = ? ORDER BY d.created_at DESC`
    )
    .all(req.speaker.id);
  res.json({ decks });
});

router.post("/", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A PDF file is required (field name 'pdf')" });
  const name = (req.body?.name || req.file.originalname.replace(/\.pdf$/i, "")).trim() || "Untitled deck";

  const deckId = nanoid();
  const outDir = path.join(uploadsRoot, deckId);

  let rendered;
  try {
    rendered = renderPdfToImages(req.file.buffer, outDir);
  } catch (err) {
    return res.status(400).json({ error: `Could not render PDF: ${err.message}` });
  }
  if (rendered.length === 0) {
    return res.status(400).json({ error: "PDF has no pages" });
  }

  const insertDeck = db.prepare("INSERT INTO decks (id, speaker_id, name) VALUES (?, ?, ?)");
  const insertSlide = db.prepare(
    "INSERT INTO slides (id, deck_id, order_index, image_path, title, is_general) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    insertDeck.run(deckId, req.speaker.id, name);
    for (const slide of rendered) {
      insertSlide.run(
        nanoid(),
        deckId,
        slide.orderIndex,
        `/uploads/${deckId}/${slide.fileName}`,
        slide.title,
        0
      );
    }
    // Trailing pseudo-slide: a "General" thread for feedback not tied to any one slide,
    // shown after the last real slide in the participant viewer.
    insertSlide.run(nanoid(), deckId, rendered.length, null, "General", 1);
  });
  tx();

  const deck = db.prepare("SELECT * FROM decks WHERE id = ?").get(deckId);
  const slides = db
    .prepare("SELECT * FROM slides WHERE deck_id = ? ORDER BY order_index")
    .all(deckId)
    .map(formatSlide);
  res.status(201).json({ deck, slides });
});

router.get("/:deckId", (req, res) => {
  const deck = db
    .prepare("SELECT * FROM decks WHERE id = ? AND speaker_id = ?")
    .get(req.params.deckId, req.speaker.id);
  if (!deck) return res.status(404).json({ error: "Deck not found" });
  const slides = db
    .prepare("SELECT * FROM slides WHERE deck_id = ? ORDER BY order_index")
    .all(deck.id)
    .map(formatSlide);
  const sessions = db
    .prepare("SELECT * FROM sessions WHERE deck_id = ? ORDER BY created_at DESC")
    .all(deck.id)
    .map(formatSession);
  res.json({ deck, slides, sessions });
});

// Speaker: delete their own deck — cascades sessions/slides/comments/questions/etc. via FK,
// and removes its rendered slide images from disk.
router.delete("/:deckId", (req, res) => {
  const deck = db
    .prepare("SELECT * FROM decks WHERE id = ? AND speaker_id = ?")
    .get(req.params.deckId, req.speaker.id);
  if (!deck) return res.status(404).json({ error: "Deck not found" });
  db.prepare("DELETE FROM decks WHERE id = ?").run(deck.id);
  removeDeckFiles(deck.id);
  res.status(204).end();
});

export default router;
