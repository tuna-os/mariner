# Mariner Flatpak Release & Rollback Runbook

## 1. Current release surface

Mariner is published as a Flatpak OCI image and served through the TunaOS
Flatpak remote. The repository's `.github/workflows/publish-flatpak.yml` is a
thin caller around the pinned reusable workflow in `tuna-os/.github`.

The caller currently behaves as follows:

- A pull request runs a build-only validation (`publish=false`).
- A push to `main` or `master` publishes, as does a push of a `v*` tag.
- A manual dispatch publishes only when its `publish` input is explicitly
  `true`.
- A publish pushes `latest-x86_64`, `latest-aarch64`, and `latest` (the
  primary `x86_64` image). A tag push also pushes the release tag with
  `-x86_64` and `-aarch64` architecture suffixes.
- The publish job updates `tuna-os/docs` through the shared
  `publish-flatpak-index` action. The index stores a digest and Flatpak labels
  for each architecture; a registry retag alone does not roll back the served
  remote.

At the time this runbook was written, `master` had no Git tags and
`ROADMAP.md` still described distribution as not yet released. Do not use a
sample or guessed version tag during an incident. A rollback is possible only
after a successful publish has produced a known-good image reference and a
corresponding index update.

## 2. Release checklist

1. Run the repository checks locally:
   ```sh
   npm test
   npm run typecheck
   ```
2. For a release, update `package.json` and the AppStream release metadata to
   the intended version. Run the checks again, then create and push the
   `v`-prefixed release tag from the reviewed commit:
   ```sh
   read -r -p 'Release tag (for example, v0.2.0): ' RELEASE_TAG
   case "$RELEASE_TAG" in v*) ;; *) echo 'release tag must start with v' >&2; exit 1;; esac
   git tag -a "$RELEASE_TAG" -m "Release Mariner $RELEASE_TAG"
   git push origin "$RELEASE_TAG"
   ```
3. For a non-publishing validation, dispatch the wrapper with `publish=false`:
   ```sh
   gh workflow run publish-flatpak.yml \
     --repo tuna-os/mariner --ref master -f publish=false
   ```
4. Wait for both architecture build legs and the publish/index steps to pass.
   Record the workflow URL, source commit, release tag (when applicable), the
   image digests for both architecture-qualified tags, and the commit pushed to
   `tuna-os/docs` for `static/flatpak/index/static`.
5. Confirm the remote exposes the application before announcing the release:
   ```sh
   flatpak remote-info --user tuna-os org.tunaos.mariner
   ```

## 3. Failure handling

### 3.1 Build or publish failure

A failed build does not publish an image. A failed publish can leave one or
more registry tags updated while the central index remains at its previous
revision. Treat the release as indeterminate until the workflow log and the
registry/index state have both been checked. Do not rerun a failed publish with
`publish=true` until the source commit and intended tag are confirmed.

If the index step reports an authorization or push conflict, the failing step
runs in `tuna-os/.github` and writes `tuna-os/docs`. A maintainer with access to
those repositories must resolve the token or conflict; capture the workflow
run URL and the docs-repository commit in the incident record.

### 3.2 Preferred rollback: republish a known-good tag

Use a tag whose successful workflow run and both architecture digests were
recorded before the incident. Do not substitute `latest`, a guessed version,
or an unverified tag.

1. Verify both immutable source references exist and record their digests:
   ```sh
   IMAGE=ghcr.io/tuna-os/mariner
   read -r -p 'Known-good release tag from the successful workflow run: ' KNOWN_GOOD_TAG
   case "$KNOWN_GOOD_TAG" in v*) ;; *) echo 'known-good tag must start with v' >&2; exit 1;; esac

   X86_DIGEST="$(skopeo inspect --format '{{.Digest}}' \
     "docker://${IMAGE}:${KNOWN_GOOD_TAG}-x86_64")"
   ARM_DIGEST="$(skopeo inspect --format '{{.Digest}}' \
     "docker://${IMAGE}:${KNOWN_GOOD_TAG}-aarch64")"
   test -n "$X86_DIGEST" && test -n "$ARM_DIGEST"
   printf 'x86_64=%s\naarch64=%s\n' "$X86_DIGEST" "$ARM_DIGEST"
   ```
2. Dispatch the same publish workflow from that tag. This rebuilds the known-
   good source, writes the `latest` registry tags, and regenerates both
   architecture entries in the central index in one operation:
   ```sh
   gh workflow run publish-flatpak.yml \
     --repo tuna-os/mariner --ref "$KNOWN_GOOD_TAG" -f publish=true
   ```
3. Monitor the dispatched run. Require success for both architecture builds,
   all registry pushes, and both index-update steps. Record the resulting
   workflow URL and the new `tuna-os/docs` commit.

### 3.3 Emergency registry-only recovery (index still required)

Use this path only when the workflow cannot be dispatched. It restores the
registry tags by immutable digest but is **not** a complete rollback until the
central index has been regenerated from the same known-good OCI layouts.

Export the recorded `X86_DIGEST` and `ARM_DIGEST` values in the shell before
running these commands:

```sh
IMAGE=ghcr.io/tuna-os/mariner

skopeo copy "docker://${IMAGE}@${X86_DIGEST}" \
  "docker://${IMAGE}:latest-x86_64"
skopeo copy "docker://${IMAGE}@${ARM_DIGEST}" \
  "docker://${IMAGE}:latest-aarch64"
skopeo copy "docker://${IMAGE}@${X86_DIGEST}" \
  "docker://${IMAGE}:latest"
```

A maintainer with `tuna-os/docs` access must then regenerate
`static/flatpak/index/static` from the known-good `x86_64` and `aarch64` OCI
layouts using the shared `publish-flatpak-index` action (or its equivalent)
and push that change to `main`. A registry retag without this index update
leaves clients resolving the bad digest.

## 4. Post-rollback verification

1. Confirm the registry points at the recorded digests:
   ```sh
   skopeo inspect "docker://${IMAGE}:latest-x86_64"
   skopeo inspect "docker://${IMAGE}:latest-aarch64"
   ```
2. Confirm the central index update reached `tuna-os/docs`:
   ```sh
   gh api \
     'repos/tuna-os/docs/commits?path=static/flatpak/index/static&per_page=1' \
     --jq '.[0].sha'
   ```
3. Install or update from the TunaOS remote in a clean user scope and record
   the installed commit:
   ```sh
   flatpak install --user --or-update -y tuna-os org.tunaos.mariner
   flatpak info --user org.tunaos.mariner
   ```
4. Launch Mariner from the desktop and verify that the main window opens. If
   it does not, collect the terminal output with the diagnostic commands in
   `runbooks/mariner-diagnostic-runbook.md` and attach it to the incident.
5. Record the bad and restored digests, workflow URLs, index commit, observed
   client commit, impact window, and follow-up owner using the incident and
   postmortem templates under `.github/ISSUE_TEMPLATE/`.
