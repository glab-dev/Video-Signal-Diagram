# Video Signal Flow - Project Guide

## Quick Start

```bash
# Always pull latest first (either collaborator may have pushed)
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Development server
npm run dev

# Build (TypeScript check + Vite production build)
npm run build

# Lint
npm run lint
```

## Project Overview

A React-based visual editor for designing video signal routing diagrams. Users place equipment nodes (sources, processors, switchers, routers, LED walls) on a canvas and connect them to map signal flow. Built as a PWA deployed to GitHub Pages.

**Tech stack:** React 19, TypeScript 5.9, Vite 7, @xyflow/react 12 (React Flow), IndexedDB (via `idb`), PWA (Workbox)

## Architecture

### Directory Structure

```
src/
  App.tsx              - Main component: node/edge state, event handlers, JSX layout
  App.css              - All styles (single file)
  main.tsx             - React entry point
  changelog.ts         - Version changelog data
  types/index.ts       - All TypeScript interfaces/types
  contexts/
    CascadeLockContext.ts  - Context for cascade-locked node groups
  data/
    nodeCategories.ts      - Equipment preset definitions (sources, processors, etc.)
  hooks/
    useCanvasSettings.ts   - Paper size, orientation, minimap, viewport
    useCascadeLock.ts      - Cascade lock detection and toggling
    useClipboard.ts        - Copy/paste with label incrementing
    useEdgeColorSync.ts    - Edge color tracing through pass-through nodes
    useExportPNG.ts        - PNG export with 2x resolution
    useGearBuilder.ts      - Gear node creation and preset application
    useHistory.ts          - Undo/redo with debounced tracking
    useNodeScale.ts        - Content scaling for resized nodes
    useNodeSummaries.ts    - Lightweight node metadata for dropdowns
    usePageGrid.ts         - Background grid rendering
    usePermanentSources.ts - Category overrides (source/destination)
    useProjectTally.ts     - Equipment count tracking
    useSidebarCustomization.ts - Hidden/moved sidebar items
  utils/
    createNodeFromPreset.ts - Pure function: PresetItem + position -> Node
  store/
    db.ts                  - IndexedDB operations (projects, presets)
  components/
    Sidebar.tsx            - Project actions, node palette, presets
    RightPanel.tsx         - Right-side info panel
    PresetMenu.tsx         - Per-node save/load/rename/delete menu
    PageOverlay.tsx        - Paper size overlay
    EdgeLabelEditor.tsx    - Inline edge label editing
    EdgeStyleEditor.tsx    - Edge style customization
    EditableSelect.tsx     - Combobox with color indicators
    EditableTitle.tsx      - Inline-editable text
    UpdateNotification.tsx - PWA update prompt
    PermanentSourcesSection.tsx - Category override drag targets
    ProjectTallySection.tsx     - Equipment count display
    nodes/
      index.ts             - Node type registry (nodeTypes object)
      GenericIONode.tsx     - Generic I/O device (sources, destinations, converters)
      ProcessorNode.tsx     - LED processor (Brompton, etc.)
      SwitcherNode.tsx      - Video switcher (Barco, ATEM, etc.)
      RouterNode.tsx        - Signal router with routing table
      BarcoE3Node.tsx       - Barco E3 with card slots
      CardNode.tsx          - I/O card (for E3 slots)
      LEDWallNode.tsx       - LED wall destination
      NoteNode.tsx          - Text annotation
      ImageNode.tsx         - Image embed
    edges/
      StyledEdge.tsx        - Custom edge with color and labels
    GearBuilder/
      GearBuilder.tsx       - Build custom equipment from templates
      GearPreview.tsx       - Visual preview
      GearSettings.tsx      - Configuration form
      IOCardBuilder.tsx     - Card configuration
```

### Key Patterns

- **State lives in App.tsx**: `useNodesState` and `useEdgesState` from React Flow hold all node/edge data. Custom hooks receive `nodes`/`edges`/`setNodes`/`setEdges` as parameters.
- **Node data types**: Each node type has a corresponding data interface in `types/index.ts` (e.g., `ProcessorNodeData`, `SwitcherNodeData`).
- **IDs**: All IDs use UUID v4 (`import { v4 as uuidv4 } from 'uuid'`).
- **Colors**: Nodes have a user-selectable `color` field. Edges inherit color from their source node. `useEdgeColorSync` traces colors through pass-through nodes recursively.
- **Cascade lock**: Groups of GenericIO nodes with sequential labels (e.g., "Brompton 1", "Brompton 2") can be locked to move together. Managed by `useCascadeLock` + `CascadeLockContext`.
- **Persistence**: Projects save to IndexedDB. File export uses `.vsf` extension (JSON). Sidebar customization uses localStorage.
- **Node registration**: Add to `src/components/nodes/index.ts` `nodeTypes` object and add the TypeScript types to `types/index.ts`.

### Node Types

| Type | Component | Description |
|------|-----------|-------------|
| `genericIO` | GenericIONode | Flexible I/O device with typed connectors |
| `processor` | ProcessorNode | LED processor with input/output tables |
| `switcher` | SwitcherNode | Video switcher with routing tables |
| `router` | RouterNode | Signal router with source/destination matrix |
| `barcoE3` | BarcoE3Node | Barco E3 with swappable card slots |
| `card` | CardNode | I/O card for E3 card slots |
| `ledWall` | LEDWallNode | LED wall destination with panel config |
| `note` | NoteNode | Text annotation |
| `image` | ImageNode | Image embed |

### Deployment

- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`)
- Auto version bump on push to main (`.github/workflows/version-bump.yml`)
- PWA with Workbox service worker for offline support

## Development Environment

A VS Code task (`.vscode/tasks.json`) runs automatically when the project folder is opened:
1. `git pull origin main` — pulls latest changes
2. `npm install` — installs any new/changed dependencies
3. `npm run dev` — starts the Vite dev server

The dev server runs at `http://localhost:5173/Video-Signal-Diagram/`.

## Pre-Commit Workflow

**IMPORTANT: Always follow this workflow before committing changes.**

1. **Pull latest and check for conflicts:**
   ```bash
   git pull origin main
   ```
   If there are merge conflicts, resolve them before proceeding. Do NOT commit with unresolved conflicts.

2. **Run the build to verify TypeScript + Vite:**
   ```bash
   npm run build
   ```
   Do NOT commit if the build fails. Fix all errors first.

3. **Run the smoke test:**
   ```bash
   python3 tests/smoke-test.py
   ```
   Do NOT commit if any FAIL results appear. Warnings are acceptable.

4. **Run unit tests:**
   ```bash
   npm run test:unit
   ```
   Do NOT commit if any tests fail.

5. **Run E2E tests:**
   ```bash
   npm run test:e2e
   ```
   Do NOT commit if any tests fail. If the dev server is not already running, Playwright will start it automatically.

6. **Manual visual check:**
   ```bash
   npm run test:check
   ```
   Open the app in a browser and ask the user to visually confirm:
   - Sidebar renders with all categories
   - Clicking a node button places a node on the canvas
   - Nodes render at the correct size (not collapsed or oversized)
   - Node labels are readable

   Wait for user confirmation before proceeding to commit.

7. **Stage, commit, and push:**
   ```bash
   git add <changed-files>
   git commit -m "descriptive message here"
   git push origin main
   ```

If `git pull` brings in changes that conflict with local work, show the conflicts to the user and resolve together before committing.

## Testing

```bash
npm run test:unit        # Vitest unit tests (fast, no browser)
npm run test:e2e         # Playwright E2E tests (launches Chromium)
npm run test:e2e:headed  # Playwright with visible browser (for debugging)
npm run test             # Run both unit + E2E in sequence
npm run test:check       # Open app in browser for manual inspection
```

- **Unit tests** (`tests/unit/`): Test pure functions and module consistency. Fast, no browser needed.
- **E2E tests** (`tests/e2e/`): Launch a real browser, load the app, click buttons, verify nodes render with correct dimensions. Catches visual/sizing regressions.
- **Smoke test** (`tests/smoke-test.py`): Static file validation (package.json, HTML structure, node type registry sync, dangerous patterns).

## Conventions

- Always `npm run build` after changes to verify TypeScript + Vite
- Always `git pull origin main` before starting work
- Always run `python3 tests/smoke-test.py` before committing
- Always run `npm run test:unit` and `npm run test:e2e` before committing
- Commit messages: lowercase, imperative style (e.g., "add connector type dropdown")
- Version bump commits use `[skip ci]` to avoid deploy loop
