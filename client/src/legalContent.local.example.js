// Starting point for your own instance's legal pages.
//
// Copy this file to legalContent.local.js (same folder) and fill in the [bracketed] parts.
// That filename is gitignored, so your real details never get committed or pushed — see
// legalLoader.js for how it's picked up automatically once it exists, in preference over the
// generic placeholder in legalContent.js.
//
// This is a structural starting point, not legal advice — the section headings below follow
// German law (Impressumspflicht / DSGVO) since that's what this project was first built for.
// Adapt, remove, or add sections as required in your own jurisdiction, and have a lawyer check
// the result if this is a real, publicly-reachable deployment.

export const imprintMd = `# Imprint / Legal Notice

**Operator:**

> [Your name or company name]
> [Street address]
> [Postal code, city, country]

**Contact:** [email address]

<!-- If a business entity: registration court/number, VAT ID, managing directors, etc. -->

**Content responsibility:**

> [Name of the person responsible for editorial content, if different from the operator]

### Disclaimer

**Liability for content:** [Your standard liability-for-own-content disclaimer.]

**Liability for links:** [Your standard liability-for-third-party-links disclaimer.]

**Copyright:** [Your copyright notice — who owns the content on this site, terms for reuse.]
`;

export const privacyMd = `# Privacy Policy

**Last updated:** [DATE]

### 1. Data Controller

> [Your name or company name]
> [Address]
> [Contact email]

### 2. What data we process

Feedback My Talk, as shipped, handles roughly this data — adjust to match what your instance
actually does (e.g. if you've enabled email confirmation, or changed upload limits):

| Who | Data | Source |
|---|---|---|
| Speakers (account) | Email address; password (bcrypt hash only); account creation date; admin flag | Provided at registration |
| Speakers (usage) | Uploaded PDF decks and rendered slide images; session names/join codes/status; Practice Q&A questions | Entered while using the app |
| Participants | A random, non-identifying token in the browser's \`localStorage\`, scoped to one session | Issued on joining |
| Participants (content) | Comments and questions on slides; askedLive flags and private answer notes | Entered by the participant |

### 3. Legal basis

[Cite whatever legal basis applies in your jurisdiction for each purpose above — e.g. contract
performance / legitimate interest under GDPR Art. 6, if that applies to you.]

### 4. Hosting and third parties

[Where do your servers run? Any third-party processors — e.g. an SMTP provider, if you've
configured email confirmation? Any data leaving your jurisdiction?]

### 5. Cookies and local storage

| Mechanism | Who | Purpose |
|---|---|---|
| httpOnly JWT cookie | Speakers | Maintains login session |
| \`localStorage\` participant token | Participants | Associates a participant's own submissions within one session |

No analytics, marketing, or third-party tracking cookies are used by the app itself.

### 6. Retention and deletion

Speakers can delete their own decks and sessions (cascading, irreversible); an admin can delete
any speaker account or deck the same way. [State how long you actually keep data, and any
retention/deletion schedule you run beyond what users delete themselves.]

### 7. Your rights

[List the rights that apply in your jurisdiction — e.g. under GDPR: access, rectification,
erasure, restriction, portability, objection — and how someone exercises them for your instance.]

### 8. Contact

> [Contact email for privacy inquiries]
`;
