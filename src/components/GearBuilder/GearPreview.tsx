import type { GearConfig } from '../../types';

interface GearPreviewProps {
  config: GearConfig;
}

function GearPreview({ config }: GearPreviewProps) {
  const isStacked = config.layout === 'stacked';

  return (
    <div className="gear-preview">
      <div className="gear-preview-label">Preview</div>
      <div className="gear-preview-container">
        <div
          className={`gear-preview-node ${isStacked ? '' : 'side-by-side'}`}
          style={{ borderColor: config.color }}
        >
          <div
            className="gear-preview-header"
            style={{ backgroundColor: config.color }}
          >
            <span className="gear-preview-title">{config.label || 'Node Label'}</span>
          </div>

          <div className="gear-preview-content">
            {isStacked ? (
              <>
                {config.inputs.length > 0 && (
                  <div className="gear-preview-section">
                    <div className="gear-preview-section-label">INPUTS</div>
                    {config.inputs.map((port, idx) => (
                      <div
                        key={port.id}
                        className="gear-preview-port"
                        style={{ marginTop: idx > 0 ? `${config.verticalSpacing || 0}px` : 0 }}
                      >
                        <span className="gear-preview-handle left" />
                        <span className="gear-preview-port-name">{port.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {config.outputs.length > 0 && (
                  <div className="gear-preview-section">
                    <div className="gear-preview-section-label">OUTPUTS</div>
                    {config.outputs.map((port, idx) => (
                      <div
                        key={port.id}
                        className="gear-preview-port"
                        style={{ marginTop: idx > 0 ? `${config.verticalSpacing || 0}px` : 0 }}
                      >
                        <span className="gear-preview-port-name">{port.name}</span>
                        <span className="gear-preview-handle right" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="gear-preview-side-by-side">
                <div className="gear-preview-column">
                  {config.inputs.length > 0 && (
                    <>
                      <div className="gear-preview-section-label">INPUTS</div>
                      {config.inputs.map((port, idx) => (
                        <div
                          key={port.id}
                          className="gear-preview-port"
                          style={{ marginTop: idx > 0 ? `${config.verticalSpacing || 0}px` : 0 }}
                        >
                          <span className="gear-preview-handle left" />
                          <span className="gear-preview-port-name">{port.name}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div className="gear-preview-column">
                  {config.outputs.length > 0 && (
                    <>
                      <div className="gear-preview-section-label">OUTPUTS</div>
                      {config.outputs.map((port, idx) => (
                        <div
                          key={port.id}
                          className="gear-preview-port"
                          style={{ marginTop: idx > 0 ? `${config.verticalSpacing || 0}px` : 0 }}
                        >
                          <span className="gear-preview-port-name">{port.name}</span>
                          <span className="gear-preview-handle right" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {config.inputs.length === 0 && config.outputs.length === 0 && (
              <div className="gear-preview-empty">
                Add inputs or outputs
              </div>
            )}
          </div>

          {config.ipAddress && (
            <div className="gear-preview-footer">
              <span className="gear-preview-ip">{config.ipAddress}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GearPreview;
