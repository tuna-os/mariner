# Mariner Flatpak Release & Rollback Runbook

## 1. Release & Distribution Pipeline Overview

The release pipeline for **Mariner** packages the Node.js / `node-gtk` application as a Flatpak OCI bundle and publishes it to GHCR and the central catalog index.

### Key Pipeline Components
- **Flatpak Manifest**: `org.tunaos.mariner.json` (`org.gnome.Platform` version `50`, Node.js 22 runtime).
- **CI Workflows**:
  - `.github/workflows/ci.yml`: Unit test execution on Node 22.
  - `.github/workflows/publish-flatpak.yml`: Flatpak bundle build and GHCR push.
- **Central Index Catalog**: updated via the reusable `publish-flatpak.yml` workflow this repo calls from [`tuna-os/.github`](https://github.com/tuna-os/.github) (see `.github/workflows/publish-flatpak.yml` in this repo) — there is no locally vendored `update-index.py`.

---

## 2. Release & Deployment Steps

1. **Pre-release Verification**:
   - Run `npm test` and `npm run typecheck` locally.
   - Verify all GitHub Actions checks pass on `master` (this repo's default branch; see `AGENTS.md`).
2. **Tagging Release**:
   ```bash
   git tag -a v0.2.0 -m "Release Mariner v0.2.0"
   git push origin v0.2.0
   ```
3. **Workflow Execution**:
   - Monitor `publish-flatpak.yml` workflow execution on GitHub Actions.

---

## 3. Failure Troubleshooting & Rollback

### 3.1 Failure: Index Update Failure
- If central index update in `tuna-os/docs` fails due to authorization or conflict, the failing step runs inside the reusable workflow in `tuna-os/.github`, not a script in this repo — check that workflow's run log in the Actions tab of this run.
- Re-run the `publish-flatpak.yml` workflow step after verifying `FLATPAK_INDEX_TOKEN`.

### 3.2 Emergency Rollback Procedure
1. Re-tag previous known-good OCI container on GHCR as `latest`:
   ```bash
   skopeo copy docker://ghcr.io/tuna-os/mariner:v0.1.9 docker://ghcr.io/tuna-os/mariner:latest
   ```
2. Revert `tuna-os/docs` central index file (`static/flatpak/index/static`).
