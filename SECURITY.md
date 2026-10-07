# Security policy

Curo stores medical records, so a vulnerability can expose patients' private health
information. Thank you for reporting one responsibly.

## Supported versions

Curo has no releases yet. Security fixes land on `main` only.

## Reporting a vulnerability

Please don't report a vulnerability in a public issue, discussion or pull request.

Report it privately on GitHub instead:
**[Report a vulnerability](https://github.com/curo-emr/curo/security/advisories/new)**.

Include:

- what an attacker can do, and which role, portal or endpoint is affected
- steps to reproduce against a local install with the seed data
  (accounts in [docs/TEST_CREDENTIALS.md](docs/TEST_CREDENTIALS.md))
- the commit you tested

**Never include real patient data** in a report, even redacted. Reproduce with seed
data instead.

## What happens next

- We aim to acknowledge your report within 7 days.
- We'll confirm whether it's a vulnerability, agree a disclosure date with you, and
  fix it in a private fork before publishing an advisory.
- We'll credit you in the advisory unless you'd rather stay anonymous.

## Scope

In scope: the backends in `services/`, the portals in `apps/`, the shared packages in
`packages/`, and the database migrations.

Out of scope:

- The development defaults in `.env.example` and the seed accounts. They are public by
  design and documented as unsafe for production; production images refuse to start
  without real secrets.
- Deployments of Curo run by other people. Report those to whoever runs them.
