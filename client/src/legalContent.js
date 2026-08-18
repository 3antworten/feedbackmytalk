// Generic placeholder legal content, safe to publish as open-source — no real operator data.
//
// A real deployment should NOT edit this file. Instead, copy legalContent.local.example.js to
// legalContent.local.js (gitignored) and fill in your own details there; legalLoader.js prefers
// that file automatically when it exists. This file is only what ships when no such override is
// present, e.g. right after cloning the repo.

export const imprintMd = `# Imprint / Legal Notice

**This instance has not configured an imprint yet.**

Whoever operates this deployment of Feedback My Talk is legally responsible for providing an
accurate imprint here (many jurisdictions, including Germany's, require one for any
non-purely-private website).

If you are that operator: copy \`client/src/legalContent.local.example.js\` to
\`client/src/legalContent.local.js\` and fill in your own details — it will automatically replace
this placeholder. See the "Self-hosting: legal pages" section of the project README.
`;

export const privacyMd = `# Privacy Policy

**This instance has not configured a privacy policy yet.**

Whoever operates this deployment of Feedback My Talk is the data controller for it and is
responsible for providing an accurate privacy policy describing what data they collect and why
(see the app's own behavior for reference — speaker accounts, participant tokens, uploaded
decks, comments/questions, and optionally email confirmation if a mail server is configured).

If you are that operator: copy \`client/src/legalContent.local.example.js\` to
\`client/src/legalContent.local.js\` and fill in your own details — it will automatically replace
this placeholder. See the "Self-hosting: legal pages" section of the project README.
`;

export const cookieBannerText = {
  de: {
    body: "Diese App verwendet ausschließlich technisch notwendige Speichertechnologien: einen Login-Cookie für Vortragende und ein Teilnahme-Token im lokalen Speicher Ihres Browsers für Teilnehmende. Beide sind erforderlich, damit die App funktioniert. Es werden keine Tracking-, Marketing- oder Analyse-Cookies eingesetzt. Weitere Informationen finden Sie in unserer",
    linkLabel: "Datenschutzerklärung",
    button: "Verstanden",
  },
  en: {
    body: "This app only uses strictly necessary storage: a login cookie for speakers and a participant token in your browser's local storage for participants. Both are required for the app to function. We use no tracking, marketing, or analytics cookies. See our",
    linkLabel: "Privacy Policy",
    button: "Got it",
  },
};
