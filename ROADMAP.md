# Mariner Roadmap

**Last updated**: 2026-08-24 | **Maintainer**: tuna-os (hanthor)

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
- **Distribution**: **zero** — no GitHub Releases page, no tags. Flatpak
  install path exists (TunaOS remote) but nothing versioned is published to
  it; `publish-flatpak.yml` fires on `v*` tag push that has never happened.
- **Upstream sync**: `Sync upstream` workflow failed 13/13 consecutive runs
  (08-11 → 08-24) — permanent rename/rename conflict
  (`com.github.romgrk` → `org.tunaos` in HEAD vs `io.github.romgrk` upstream).
  Fork is 75 commits / 5,021 lines behind upstream and cannot converge.
- **Open issues**: 1 (ci baseline #4). No roadmap tracker, no milestone.

### Priorities

| Priority | Item | Tracking | Status |
|----------|------|----------|--------|
| P0 | First tagged release — cut a `v*` tag + GitHub Release with binaries/checksums so BETA is installable | (new) | ⬜ Not started |
| P1 | Resolve upstream-sync conflict — decide fork-identity policy (upstream-following vs. tuna-os identity) | #5 | 🔴 13/13 failing |
| P2 | Roadmap coverage entry in org ROADMAP tally | #1295 | ⬜ Not started |

---

## Quarterly Goals

### Current Quarter (2026 Q3)

**Theme**: make BETA installable

| Goal | Owner | Tracking | Status |
|------|-------|----------|--------|
| First tagged release + GitHub Release | hanthor | (new) | ⬜ Not started |
| Sync workflow green (conflict strategy decision) | hanthor | #5 | ⬜ Not started |

### Next Quarter (2026 Q4)

**Theme**: cadence and adoption

| Goal | Owner | Tracking | Status |
|------|-------|----------|--------|
| Release cadence aligned with org (weekly/monthly tags) | tuna-os | (new) | ⬜ Not started |
| Surface in ADOPTION-METRICS snapshot | tuna-os | #1174 | ⬜ Not started |

---

*ROADMAP added by strategist agent (ACMM L6 — full mode). Signed-off-by: hanthor-hive-agent[bot] <290068839+hanthor-hive-agent[bot]@users.noreply.github.com>*
