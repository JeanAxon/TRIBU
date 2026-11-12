---
name: clean-test-artifacts
description: >-
  Cleans up leftover test files, mock client folders, temporary test artifacts, and dangling test data created during test runs. Use whenever tests finish running, when cleaning up the workspace, or when asked to remove test files, test clients, or temporary test data.
---

# Clean Test Artifacts Skill

Automated skill to detect, isolate, and remove leftover artifacts, mock client directories, temporary test files, and test records generated during automated testing or manual script validation.

## Purpose

When running test suites (such as `npm test`, Electron headless tests, or Jest/Mocha scripts), tests may instantiate mock clients (e.g. `Prueba Empresa S.A.`, `PEREZ LOPEZ JUAN CARLOS`), temporary session files (`tribu_session.enc`), or temporary XML batches. This skill ensures that:
1. **Real client directories and data are strictly protected** (e.g. `RUIZ ESPINOZA JEAN PIERRE`, `Espinoza Azanza Dolores Maricela`).
2. **All test-generated folders** in the client repository (`SRI_Clientes`) are identified and purged.
3. **Orphaned test entries** in persistent storage (`tribu_clients.json`) are safely pruned.
4. **Temporary operating system folders** (`os.tmpdir()/tribu_test_*`) and debug dumps in the workspace are wiped.

---

## When to Use

Activate and run this skill:
- Immediately after running `npm test` or ad-hoc integration tests.
- When the user asks to clean up test files, remove test debris, or verify disk cleanliness.
- Before preparing a build, release, or git commit to ensure no mock client directories or debug logs pollute the environment.

---

## Automated Execution

To run the cleanup script directly:

### 1. Standard Cleanup
```bash
node .agents/skills/clean-test-artifacts/scripts/clean-test-artifacts.js
```

### 2. Preview Mode (Dry-Run)
To inspect what would be cleaned without modifying disk contents:
```bash
node .agents/skills/clean-test-artifacts/scripts/clean-test-artifacts.js --dry-run
```

---

## Procedures and Verification

1. **Verify Storage Integrity**:
   Inspect `C:\Users\Jean\AppData\Roaming\tribu-sri\tribu_clients.json` to ensure only legitimate user clients remain registered.
2. **Verify Client Documents Directory**:
   List `C:\Users\Jean\Documents\SRI_Clientes` and ensure no folders matching `Prueba Empresa*`, `Test*`, or test RUCs exist.
3. **Verify Zero Impact on Real Data**:
   Ensure legitimate clients with registered credentials are never deleted or modified.
