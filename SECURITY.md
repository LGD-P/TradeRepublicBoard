# Security & privacy

Security and privacy are **first-class goals** of this project, not an
afterthought. This document states the posture we hold ourselves to and how to
report an issue.

## Privacy by architecture

The strongest privacy guarantee is the one you don't have to trust — it's
structural:

- The **web app runs entirely in your browser**. Your Trade Republic CSV is
  parsed and computed client-side; **it never leaves your device**.
- **No useless data retention.** Data is processed in memory and discarded; the
  CLI writes only the workbook you asked for; the directory watcher **deletes the
  export after processing**; the web app keeps nothing after the session.
- **Zero network by default.** Nothing is sent anywhere unless you explicitly opt
  in to price refresh — and that request only ever carries an **ISIN** (a public
  identifier), never your holdings, amounts, or the CSV.
- **No CDN, no analytics, no telemetry, no cookies.** All assets are self-hosted.

## Secure engineering practices

- **OWASP Top 10 aware.** The CSV is treated as **untrusted input**: size cap,
  extension/encoding checks, required-column validation, row/field caps, and
  **spreadsheet formula-injection neutralisation** (`= + - @`) before any value is
  written to a workbook or the DOM. No `eval`, no shell, no dynamic import.
- **Web hardening** (for the upcoming web app): strict `Content-Security-Policy`
  (`default-src 'self'`, no inline scripts), `connect-src` limited to the optional
  price proxy, `frame-ancestors 'none'`, `nosniff`, `no-referrer`; no server-side
  session to forge.
- **Supply chain.** Minimal, pinned dependencies; committed lockfiles; automated
  dependency updates; a deliberately small CVE surface. Containers run non-root.
- **Tested (TDD).** The portfolio logic is a pure data layer with a
  **cross-language contract**: Python and TypeScript cores must produce an
  identical model on the shared `fixtures/`, enforced in CI. New logic ships with
  tests first.

## Threat model (what this tool is and isn't)

- It reads a CSV **you** export and produces a local workbook / local dashboard.
- It does **not** connect to your broker, store credentials, or move money.
- The only optional outbound call is a public price lookup by ISIN.

## Reporting a vulnerability

Please report security issues **privately**, not in public issues:

- Preferred: open a private advisory via GitHub → *Security* → *Report a
  vulnerability* on this repository.
- Include a description, reproduction steps, affected version/commit, and impact.

We aim to acknowledge within a few days and to credit reporters (unless you prefer
to stay anonymous). Please give us reasonable time to fix before any public
disclosure.

## Scope

In scope: the CLI, the shared data model/fixtures, and the web app + optional
price proxy once released. Out of scope: third-party price sources themselves, and
anything requiring physical/OS-level access to a user's machine.
