# Open Source Readiness

This repository is prepared for public release from `v1.0.1`.

## Audit Summary

- No tracked `.env`, key, certificate, npm token, or service-account files were found.
- Local `.env` files are ignored and examples are provided in `.env.example` files.
- Internal publish handoff notes, private deployment notes, local design-system paths, and personal machine paths were removed.
- Package metadata and release automation target the public npm registry.
- Package versions reflect the current npm registry baselines: `@aigentive/wire-core@1.0.2`, `@aigentive/wire-mcp@1.0.6`, and unpublished workspace packages at `1.0.1`.
- Repository license metadata and docs use Apache-2.0.
- Git author metadata should use `8708742+adriandemian@users.noreply.github.com`.

## Release Tasks

1. Set the repository visibility to public.
2. Add an npm automation token as `NPM_TOKEN` in GitHub Actions secrets.
3. Confirm the Apache-2.0 license is the intended public license before announcing the repository.
4. Protect `main` after the rewritten branch is pushed.
5. Create and push `v1.0.1` after verifying the public package contents; the release workflow skips package versions already present on npm.
6. Delete stale remote branches that still point at pre-cleanup history.
7. For the next release after this cleanup, bump the root release version/tag and any changed package versions above the latest npm-published versions before merging to `main`.
