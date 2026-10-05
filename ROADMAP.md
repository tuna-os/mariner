# Mariner Roadmap

**Last updated**: 2026-10-05 | **Maintainer**: tuna-os (hanthor)

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

- **Maturity**: BETA per repo description; `PLAN.md` reports nautilus parity
  reached plus net-new features (dual pane, Quick Look, command palette,
  ripgrep content search, disk-usage sunburst, batch rename).
- **Distribution**: **BLOCKED — zero releases**. No GitHub Releases page, no tags.
  Flatpak path exists (TunaOS remote) but nothing versioned. `publish-flatpak.yml`
  waits for `v*` tag that has never been pushed. **First release is P0 blocker.**
- **Upstream sync**: **CRITICAL BLOCKER — 13/13 consecutive workflow failures** (08-11 → 08-24)
  on identity conflict: upstream renamed `com.github.romgrk` → `io.github.romgrk`
  while TunaOS fork uses `org.tunaos`. Fork is 75+ commits behind and cannot
  auto-sync without manual conflict resolution. **Strategy decision needed (#5):
  follow upstream or maintain fork identity.** This decision gates all releases.
- **Roadmap maturity**: Last updated 2026-08-24; P0 items not started. Q4 goals undefined.
  Needs strategic refresh post-#5 resolution.
- **Open issues**: 1 (ci baseline #4). No release tracker, no milestone.

### Priorities

| Priority | Item | Tracking | Status |
|----------|------|----------|--------|
| P0 | **FORK-IDENTITY DECISION** — upstream-following vs. tuna-os owned; blocks all release/sync work | #5 | 🔴 **Blocker since 08-11** |
| P0 | **First tagged release** — cut `v0.1.0` + GitHub Release with checksums so BETA distributable | (new) | ⬜ **Blocked on #5** |
| P1 | Flatpak publish pipeline validation (post-first-release) | #5 | ⬜ Not started |
| P2 | Roadmap coverage entry in org ROADMAP tally | #1295 | ⬜ Not started |

---

## Quarterly Goals

### Current Quarter (2026 Q3) — Status: BLOCKED

**Theme**: make BETA installable

**Blocker**: Upstream-sync identity conflict (#5) must be resolved before any release work can proceed.

| Goal | Owner | Tracking | Status |
|------|-------|----------|--------|
| **DECISION**: Resolve fork-identity policy (upstream-following vs. tuna-os owned) | hanthor | #5 | 🔴 **REQUIRED — 13/13 failing** |
| First tagged release + GitHub Release (post-decision) | hanthor | (new) | ⬜ **Blocked on decision** |
| Sync workflow green (post-decision) | hanthor | #5 | ⬜ **Blocked on decision** |

### Next Quarter (2026 Q4) — Contingent on #5 Resolution

**Theme**: release cadence and adoption

| Goal | Owner | Tracking | Status |
|------|-------|----------|--------|
| **Implement chosen strategy** (upstream sync or fork fork stewardship) | hanthor | #5 | ⬜ **Blocked on decision** |
| Cut v0.1.0 release with first GitHub Release | hanthor | (new) | ⬜ **Blocked on v0.1.0 decision** |
| Release cadence aligned with org (weekly/monthly tags) | tuna-os | (new) | ⬜ **Blocked on v0.1.0** |
| Surface in ADOPTION-METRICS snapshot | tuna-os | #1174 | ⬜ **Blocked on first release** |

---

## Technical Debt

*No active items outside release decision (#5).*

---

## Escalation Path

Issue #5 has been open and failing CI for 25+ days (08-11 → 10-05). This is a
strategic decision point that must be resolved by a human maintainer to unblock
all Q3 and Q4 work. Escalate if decision authority or capacity is unclear.

---

*ROADMAP refreshed by strategist agent (ACMM L6 — full mode). Signed-off-by: hanthor-hive-agent[bot] <290068839+hanthor-hive-agent[bot]@users.noreply.github.com>*
