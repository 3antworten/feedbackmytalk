// Resolves legal content at build time: prefer legalContent.local.js (gitignored, real
// operator details) if it exists on disk, otherwise fall back to the generic placeholder in
// legalContent.js. import.meta.glob only matches files that actually exist, so a fresh clone
// with no legalContent.local.js simply falls through to the template — no missing-module error.
import * as template from "./legalContent.js";

const overrides = import.meta.glob("./legalContent.local.js", { eager: true });
const local = overrides["./legalContent.local.js"];

export const imprintMd = local?.imprintMd ?? template.imprintMd;
export const privacyMd = local?.privacyMd ?? template.privacyMd;
export const cookieBannerText = local?.cookieBannerText ?? template.cookieBannerText;
