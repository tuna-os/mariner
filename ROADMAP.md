# Mariner Roadmap

**Last updated**: 2026-10-03 | **Maintainer**: tuna-os (hanthor)

---

## Mission

Give the TunaOS desktop a GNOME Files experience that ships the features the
upstream issue tracker rejected: type-to-select find, dual-pane browsing,
Quick Look preview, command palette, full-text (ripgrep) search, disk-usage
sunburst, batch rename — in a GTK4 + libadwaita file manager that looks and
behaves like home. Mariner is the org's file-manager front door for GNOME
desktops.

---

## Current Status

**Checkpoint**: September 2026 → Q4 transition. Core BETA feature set mature; 68 commits landed post-Aug-24 (refactoring, security hardening, app-id migration).

- **Maturity**: BETA; `PLAN.md` documents nautilus parity + net-new features
  (dual pane, Quick Look, command palette, ripgrep content search, disk-usage
  sunburst, batch rename, archive browsing, FileManager1, undo/redo).
- **Feature velocity**: Moderate. Recent work focused on architectural refactor
  (ServiceRegistry DI pattern, SelectionModel extraction) and security (GitHub
  Actions pinning, credential scoping, CVE mitigations via npm overrides).
- **Distribution**: **Still zero** — no tagged release, no GitHub Release, no
  Flatpak publication. Remains the critical blocker for BETA adoption.
  `publish-flatpak.yml` is ready to fire on first `v*` tag.
- **Upstream sync**: Status improved post-Aug-24. Conflict resolution (#56) landed;
  sync workflow now passes. Fork remains 68–75 commits behind but is
  converging (identity mismatch resolved via app-id migration to `org.tunaos`).
- **CI/Test coverage**: ACMM L0 prerequisite files in place. Unit tests live in
  ci.yml; headless GSK renders validated per `PLAN.md` §5.
- **Open blockers**: PR #74 (ServiceRegistry refactor) has OCI build failures
  (xvfb-run exit 1); PR #69 (credential scoping) flagged `needs-direction`.
  Both on hold awaiting review.

### Priorities

| Priority | Item | Tracking | Status |
|----------|------|----------|--------|
| P0 | **First tagged release v0.1.0** — cut tag, run publish-flatpak, verify binary artifacts | (new) | 🔴 BLOCKER |
| P1 | Unblock PR #74 (OCI build failures) and #69 (needs-direction review) | #72, #69 | 🟡 Hold |
| P2 | Sustain sync workflow green; curate cherry-picks from upstream if upstream diverges | (ongoing) | 🟢 On track |

---

## Quarterly Goals

### Current Quarter (2026 Q3 close)

**Theme**: unblock BETA distribution

| Goal | Owner | Tracking | Status |
|------|-------|----------|--------|
| First tagged release + GitHub Release binaries | hanthor | (new) | 🔴 Not started — **deadline Oct 10** |
| Merge PR #74 (ServiceRegistry DI) | architect | #74 | 🟡 On hold — OCI build failure |
| Merge PR #69 (credential scoping) | scanner | #69 | 🟡 On hold — needs-direction |

### Next Quarter (2026 Q4)

**Theme**: cadence and adoption surface

| Goal | Owner | Tracking | Status |
|------|-------|----------|--------|
| Release cadence (v0.2.0 within 30d of v0.1.0) | tuna-os | (new) | ⬜ Planned |
| Surface Mariner in ADOPTION-METRICS (org dashboard) | tuna-os | #1295 | ⬜ Planned |
| Flatpak adoption tracking and feedback loop | tuna-os | (new) | ⬜ Planned |

---

*ROADMAP added by strategist agent (ACMM L6 — full mode). Signed-off-by: hanthor-hive-agent[bot] <290068839+hanthor-hive-agent[bot]@users.noreply.github.com>*
