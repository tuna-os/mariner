# Observability Assessment & Telemetry Guidelines: `mariner`

## Executive Summary

`mariner` (`org.tunaos.mariner`) is a GTK4 / Libadwaita file manager web component / TypeScript application.

As an operator-confirmed constraint, **no telemetry backend is configured** for the environment. Per Telemetry policy for `ISSUES_AND_PRS` mode:
- Exporters sending data off-box without an explicitly configured backend must **not** be introduced.
- Unbounded label or span cardinalities must be avoided.
- Recommendations and non-invasive diagnostic capabilities are outlined below.

---

## Current Observability Baseline

- **Application Type**: TypeScript / GTK4 frontend file management utility.
- **Backend Exporters**: None configured or active.
- **Logging**: Standard console / GObject structured logging streams.
- **Metrics / Tracing**: No OpenTelemetry or external analytics collection framework present in `src/`.

---

## Diagnostic & Observability Stack Recommendations

Should operator requirements evolve to require local diagnostic tracing or centralized telemetry, the following guidelines must be followed:

### 1. Structured Client Diagnostic Logging
- Adopt standard structured logging patterns for file operations (navigation, sorting, searching, custom actions).
- Scope log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`) appropriately for development and diagnostic builds.
- Ensure file paths, user data directory structures, and sensitive file names are excluded or sanitized from logs.

### 2. OpenTelemetry & Metrics (Conditional)
- **Tracing**: If client-side span tracing is integrated in the future, bound attributes to operational metrics (e.g., `directory.item_count`, `action.type`, `view.mode`).
- **Metrics**: Track performance counters (e.g., directory scan latency, tab load timing) locally without off-box export.
- **Zero Remote Exporters**: Do not wire external telemetry SDKs (OTLP, GA4, Sentry) unless an explicit backend is configured by operators.

---

## Guidelines for Telemetry Contributions

1. **No External Data Exporters**: Never introduce background network telemetry transmitters without explicit operator approval.
2. **Cardinality Safeguards**: Any future telemetry metrics must avoid high-cardinality keys such as arbitrary document filenames, user paths, or full search strings.
3. **Hold-Gated PR Workflow**: All telemetry pull requests must maintain `hold` labels and adhere to non-merging policy rules.
