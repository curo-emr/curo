# Contributing to Curo

Thanks for helping build Curo. This guide covers how changes get in. For setting up,
running and testing the code, see the [README](README.md).

## Before you start

- **Never put real patient data in this project.** That covers code, tests, seed data,
  screenshots, logs, issues and pull requests. Use made-up data or the
  [seed accounts](docs/TEST_CREDENTIALS.md).
- Report security problems privately, as described in [SECURITY.md](SECURITY.md), not
  in an issue.
- For anything bigger than a small fix, open an issue first so we can agree on the
  approach before you spend time on it.

## Making a change

1. **Branch from `main`**, named by type: `feat/`, `fix/`, `docs/`, `ci/`, `chore/`,
   `refactor/`, `test/` (e.g. `feat/nurse-vitals-history`). Release branches are
   `dev-release/<x.y.z>`, `qa-release/<x.y.z>` and `stg-release/<x.y.z>`.
2. **Write commit messages** as `type(scope): summary`, using the same types, with the
   service or portal as the scope: `fix(lab): alert on QC controls whose latest run failed`.
   Explain why in the body when the summary alone doesn't.
3. **Change the schema only through a migration.** See
   [Database schema](README.md#database-schema).
4. **Add or update tests** for the behaviour you change. See [Tests](README.md#tests).
5. **Run the checks CI runs** before you push. The commands are in
   [CI](README.md#ci).
6. **Open a pull request into `main`** and fill in the template. CI must pass before
   it is merged.

Keep pull requests small and focused on one change; they get reviewed faster.

## License

Curo is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE).
By contributing, you agree that your contribution is licensed under the same terms.

## Code of conduct

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
