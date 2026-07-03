# Security Policy

## Supported Versions

This is an actively developed portfolio project. Only the latest version on `main` is supported.

## Reporting a Vulnerability

If you discover a security vulnerability (e.g., exposed secrets, injection risk, auth bypass), please open a private report:

1. Do **not** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly (see profile) or use GitHub's "Report a vulnerability" (Security tab)
3. Include steps to reproduce and potential impact

You can expect an initial response within a few days.

## Known Considerations

- API keys (e.g., LLM provider keys) are managed via environment variables / hosting platform configuration and are never committed to the repository
- JWT secrets are rotated per environment (local/staging/production differ)
- **LLM Prompt Injection**: The Gemini integration (`GeminiCargoParser`) strictly enforces a fixed JSON-schema response contract, and the backend sanitizes the raw AI output (stripping markdown code fences, validating required fields) before it is ever deserialized. Regardless of what the model returns, parsed output is never written to the database automatically — the UI enforces a **parse-then-confirm** flow, requiring explicit user confirmation before any AI-derived cargo record is committed. This means a successful prompt injection against the parser could, at worst, produce an incorrect preview for the user to reject — it cannot silently write to the database.
