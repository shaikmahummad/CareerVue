# Dependency security review

## Current review — 2026-11-03

The CI/CD implementation re-ran `npm audit --omit=dev --audit-level=critical`
after the Expo SDK 57 compatibility patches and clean `npm ci`. The current npm
advisory database reports 55 production-tree findings: 2 low, 35 moderate, 15
high, and 3 critical. The critical advisories currently reach Next.js 16.3.2,
`proxy-addr`, and `shell-quote`. npm proposes a mixture of compatible transitive
updates and forced framework/Expo changes; `npm audit fix --force` was not used.

This supersedes the August counts below. Production web deployment must remain
disabled until the critical runtime paths are upgraded and regression-tested or
an owner records a time-bounded risk acceptance. Add a required SCA gate after
the compatible upgrade is merged; enabling it now would intentionally keep all
CI runs red.

## Historical review — 2026-08-25

The earlier review used `npm audit --omit=dev --json`, package metadata, and a
non-force audit-fix dry run.

## Changes applied

- Next.js, `@next/env`, and `eslint-config-next`: `16.2.6` to `16.3.2`.
  This is a non-major framework update that resolves the reported Next.js,
  bundled PostCSS, and bundled Sharp advisories. The repository now requires
  Node.js 20.9 or newer, matching Next.js 16.3.2's engine requirement.
- Expo: upgraded to supported SDK 57 (`expo` 57.0.16, React Native 0.86.2,
  React 19.2.3). The repository and frontend CI now require Node.js 22.13 or
  newer, matching Expo SDK 57's minimum.
- Reviewed `npm audit fix` without `--force`, updating 14 transitives within
  their declared compatible ranges, including `brace-expansion`, `fast-uri`,
  `hono`, `ip-address`, `js-yaml`, and `shell-quote`.

| Severity | Before | Fixed | Remaining |
| --- | ---: | ---: | ---: |
| Low | 1 | 1 | 0 |
| Moderate | 12 | 1 | 11 |
| High | 14 | 10 | 4 |
| Critical | 0 | 0 | 0 |

## Remaining findings

The four high findings are the `image-size`/Metro chain used by the Expo mobile
bundler (`image-size`, `metro`, `metro-config`, and `metro-transform-worker`).
They concern malicious image parsing during development/build and are not part
of the deployed FastAPI or Next.js server runtime. Expo SDK 56 currently pins
the affected Metro line; overriding it independently would risk an unsupported
mobile toolchain combination.

The eleven moderate findings are Expo CLI/config tooling plus `uuid` through the
`xcode` project-file build tool. npm's proposed forced remediation installs
Expo 46, a breaking and incompatible SDK downgrade, so it was rejected.

These findings are not false positives, but their affected paths are mobile
build-time tooling rather than request-handling code. Expo Doctor 1.20.3 passes
all 21 checks on SDK 57. Recheck the audit whenever Expo publishes a compatible
Metro/config update; do not use npm's proposed Expo 46 downgrade.
