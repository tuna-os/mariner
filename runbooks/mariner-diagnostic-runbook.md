# Mariner Client Diagnostic & Operational Runbook

## 1. Overview & Architecture

**Mariner** (`org.tunaos.mariner`) is a GNOME Files alternative built with Node.js, `node-gtk`, GTK4, Libadwaita, and TypeScript (`src/main.ts`).

### Core Subsystems
- **Node-GTK Runtime Bridge**: Loads GTK4 and Libadwaita GObject introspection typings (`gi.require('Gtk', '4.0')`, `gi.require('Adw', '1')`) via `node-gtk`.
- **Core File Operations (`src/core/`)**: Pure TypeScript logic for path resolution, file system browsing, bookmark management, and accelerator key binding formatting.
- **Asynchronous GIO Integration (`src/services/`)**: GIO file enumeration, thumbnail generation, and desktop file launch operations.
- **Flatpak Packaging**: `org.tunaos.mariner.json` bundling Node.js 22 runtime and `node-gtk` native bindings.

---

## 2. Environment Diagnostics & CLI Flags

When investigating user-reported application crashes or file browser failures, launch Mariner from terminal with diagnostic flags:

### 2.1 Verbose Debug Execution
```bash
# Enable GLib and GTK debug messages
G_MESSAGES_DEBUG=all flatpak run org.tunaos.mariner

# Enable Node.js internal debug tracing
NODE_DEBUG=fs,module flatpak run org.tunaos.mariner
```

### 2.2 Software Rendering & Display Debugging
If GPU acceleration causes UI artifacting or `node-gtk` rendering crashes:
```bash
GSK_RENDERER=cairo WEBKIT_DISABLE_COMPOSITING_MODE=1 flatpak run org.tunaos.mariner
```

---

## 3. Incident Troubleshooting Procedures

### 3.1 Scenario A: Application Fails to Launch (`node-gtk` Native Module Error)

#### Symptoms
- App fails immediately on launch with `Error: Cannot find module 'node-gtk'` or `symbol lookup error`.

#### Diagnostic Steps
1. Verify `node-gtk` build inside Flatpak sandbox:
   ```bash
   flatpak run --command=node org.tunaos.mariner -e "require('node-gtk')"
   ```
2. Verify GTK4 runtime library availability:
   ```bash
   flatpak run --command=ldconfig org.tunaos.mariner -p | grep libgtk-4
   ```

#### Remediation
- Rebuild `node-gtk` native binary against the runtime Node.js version (`22.x`) specified in `org.tunaos.mariner.json`.

---

### 3.2 Scenario B: GIO Asynchronous File Enumeration Freeze / Crash

#### Symptoms
- File list panel hangs indefinitely when navigating to heavy directories or network mounts.
- Terminal output logs `GGio-WARNING` or uncaught promise rejection.

#### Diagnostic Steps
1. Execute Node unit tests to verify core logic:
   ```bash
   node --test tests/*.test.ts
   ```
2. Run TypeScript type checker:
   ```bash
   npm run typecheck
   ```

#### Remediation
- Ensure GIO async enumerator handles cancellation tokens cleanly when directory navigation changes mid-load.

---

## 4. Verification & Validation Commands

Run local validation suite before submitting code or configuration updates:
```bash
# 1. Run unit tests
npm test

# 2. Run TypeScript type checking
npm run typecheck

# 3. Validate Flatpak manifest structure
python3 -c "
import json
with open('org.tunaos.mariner.json') as f:
    data = json.load(f)
assert data['id'] == 'org.tunaos.mariner'
print('Flatpak manifest valid:', data['id'])
"
```
