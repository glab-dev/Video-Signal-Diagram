# Video Signal Flow Diagram

A Progressive Web App (PWA) for designing and documenting video signal flow diagrams. Built for AV professionals, broadcast engineers, and LED technicians to quickly map out signal routing between sources, processors, switchers, and destinations.

## Features

- **Drag & Drop Interface** - Intuitive node-based canvas powered by React Flow
- **Equipment Presets** - Pre-configured nodes for common gear:
  - Brompton LED processors (SX40, S8, M2, S4)
  - Barco switchers (E2, S3)
  - Blackmagic (ATEM 4 M/E, ATEM Mini Pro, SDI Routers)
  - Generic sources, destinations, and custom devices
- **Visual Connections** - Draw signal paths between inputs and outputs with labeled connections
- **Notes & Images** - Add sticky notes and import raster images (LED layout PNGs, venue maps, etc.)
- **Offline Support** - Works without internet, save projects locally via IndexedDB
- **Import/Export** - Save and share diagrams as JSON files
- **PWA** - Install on desktop or mobile for native app experience

## Tech Stack

- React + TypeScript
- React Flow (@xyflow/react)
- Vite + PWA plugin
- IndexedDB for local storage

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

Automatically deploys to GitHub Pages via GitHub Actions on push to main.

## License

MIT
