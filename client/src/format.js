// A short label for a slide in dropdowns/references: prefer the heuristically extracted
// title, fall back to a plain slide number, and special-case the trailing "general" slide.
export function slideLabel(slide) {
  if (!slide) return "";
  if (slide.isGeneral) return "Wrap-up (general)";
  if (slide.title) return `${slide.orderIndex + 1}. ${slide.title}`;
  return `Slide ${slide.orderIndex + 1}`;
}

// "Alice" -> "Alice's", "Chris" -> "Chris'"
export function possessive(name) {
  if (!name) return "Their";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}
