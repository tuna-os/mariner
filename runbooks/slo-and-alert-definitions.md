# Service Level Objectives (SLOs) & Alert Definitions

## 1. Core Service Level Objectives

### 1.1 Desktop Application Reliability

| Objective | Service Level Indicator (SLI) | Target SLO | Evaluation Window | Diagnostic Runbook |
| :--- | :--- | :--- | :--- | :--- |
| **Crash-Free Sessions** | Ratio of app runs without uncaught GIO/node-gtk crashes | `99.9%` | 7-day rolling window | `runbooks/mariner-diagnostic-runbook.md#31-scenario-a-application-fails-to-launch-node-gtk-native-module-error` |
| **Directory Navigation Latency** | Local directory enumeration completed `< 200 ms` | `98.5%` | 30-day window | `runbooks/mariner-diagnostic-runbook.md#32-scenario-b-gio-asynchronous-file-enumeration-freeze--crash` |

---

### 1.2 Build & Distribution Reliability

| Objective | Service Level Indicator (SLI) | Target SLO | Evaluation Window | Diagnostic Runbook |
| :--- | :--- | :--- | :--- | :--- |
| **CI Unit Test Pass Rate** | `ci.yml` workflow success rate on `main` | `100.0%` | 7-day window | `runbooks/flatpak-release-and-rollback.md#31-failure-index-update-failure-update-indexpy` |
| **Flatpak OCI Build Success** | `publish-flatpak.yml` workflow success rate | `99.0%` | 30-day window | `runbooks/flatpak-release-and-rollback.md#2-release--deployment-steps` |

---

## 2. Operational Alert Rules

- **`MarinerCIBuildFailure`** (P1 Critical): `ci.yml` unit tests failing on `main`. Action: Revert breaking commit.
- **`MarinerGtkBridgeCrash`** (P2 High): Elevated `node-gtk` segmentation fault rate on startup. Action: Refer to [Diagnostic Runbook](file:///data/agents/operations/mariner/runbooks/mariner-diagnostic-runbook.md#31-scenario-a-application-fails-to-launch-node-gtk-native-module-error).
- **`MarinerIndexSyncFailure`** (P3 Moderate): OCI index push failure to `tuna-os/docs`. Action: Refer to [Release Runbook](file:///data/agents/operations/mariner/runbooks/flatpak-release-and-rollback.md#31-failure-index-update-failure-update-indexpy).
