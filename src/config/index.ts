// Centralized Gear Configuration System
// This is the main entry point for all equipment configuration

// Connector types
export {
  CONNECTOR_TYPES,
  CONNECTORS,
  getConnectorById,
  getConnectorsByCategory,
  type ConnectorType,
  type ConnectorTypeId,
} from './connectors';

// Resolution presets
export {
  RESOLUTIONS,
  RESOLUTION_PRESETS,
  getResolutionById,
  getResolutionsByCategory,
  parseResolution,
  type Resolution,
  type ResolutionId,
} from './resolutions';

// Refresh rate options
export {
  REFRESH_RATES,
  REFRESH_RATE_PRESETS,
  getRefreshRateById,
  getRefreshRatesByStandard,
  getRefreshRatesByRegion,
  type RefreshRate,
  type RefreshRateId,
} from './refreshRates';

// Signal colors
export {
  SIGNAL_COLORS,
  SECTION_COLORS,
  getSignalColorById,
  getSignalColorHex,
  type SignalColor,
  type SectionType,
} from './signalColors';

// Platform options
export {
  PLATFORMS,
  PLATFORM_PRESETS,
  getPlatformById,
  getPlatformsByManufacturer,
  type Platform,
  type PlatformId,
} from './platforms';

// Software options
export {
  SOFTWARE_PRESETS,
  SOFTWARE_CATALOG,
  getSoftwareById,
  getSoftwareByCategory,
  getSoftwareByPlatform,
  getSoftwareLabel,
  type Software,
  type SoftwareId,
} from './software';

// Capture card options
export {
  CAPTURE_CARDS,
  CAPTURE_CARD_CATALOG,
  getCaptureCardById,
  getCaptureCardsByManufacturer,
  getCaptureCardsByType,
  getCaptureCardLabel,
  type CaptureCard,
  type CaptureCardId,
} from './captureCards';

// Card presets
export {
  CARD_PRESETS,
  getCardPresetsByCategory,
  getCardPresetById,
  getCardPresetIds,
  type CardPreset,
  type CardPresetPort,
} from './cardPresets';

// Column definitions
export {
  COLUMN_DEFS,
  DATA_COLUMNS,
  SIZES,
  getFullColumnOrder,
  getColumnById,
  getDraggableColumns,
  type ColumnDef,
  type DataColumnId,
} from './columns';
