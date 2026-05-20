const TOOLS = [
  { id: 'pen',    icon: '✏️', label: 'Pen' },
  { id: 'line',   icon: '╱',  label: 'Line' },
  { id: 'arrow',  icon: '→',  label: 'Arrow' },
  { id: 'circle', icon: '○',  label: 'Circle' },
  { id: 'rect',   icon: '□',  label: 'Rect' },
  { id: 'eraser', icon: '⌫',  label: 'Clear' },
]

const COLORS = [
  '#ff3b30', // red
  '#ff9500', // orange
  '#ffcc00', // yellow
  '#34c759', // green
  '#007aff', // blue
  '#ffffff', // white
]

const SIZES = [
  { size: 2,  dot: 4 },
  { size: 5,  dot: 8 },
  { size: 10, dot: 13 },
]

export default function ToolPanel({
  tool, color, strokeSize, isPersist,
  onTool, onColor, onStrokeSize, onPersist, onClear,
  isRecording, onStartRecord, onStopRecord,
}) {
  return (
    <div className="tool-panel">
      {/* Drawing tools */}
      <div className="tool-section">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => t.id === 'eraser' ? onClear() : onTool(t.id)}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="tool-divider" />

      {/* Colors */}
      <div className="color-grid">
        {COLORS.map(c => (
          <div
            key={c}
            className={`color-swatch ${color === c ? 'active' : ''}`}
            style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #555' : 'none' }}
            onClick={() => onColor(c)}
            title={c}
          />
        ))}
      </div>

      <div className="tool-divider" />

      {/* Stroke sizes */}
      <div className="size-btns">
        {SIZES.map(s => (
          <button
            key={s.size}
            className={`size-btn ${strokeSize === s.size ? 'active' : ''}`}
            onClick={() => onStrokeSize(s.size)}
            title={`Size ${s.size}`}
          >
            <span
              className="size-dot"
              style={{ width: s.dot, height: s.dot }}
            />
          </button>
        ))}
      </div>

      <div className="tool-divider" />

      {/* Persist toggle */}
      <button
        className={`persist-btn ${isPersist ? 'active' : ''}`}
        onClick={() => onPersist(!isPersist)}
        title={isPersist ? 'Drawings stay on screen' : 'Drawings fade out (NFL style)'}
      >
        {isPersist ? 'KEEP' : 'FADE'}
      </button>
      <span className="tool-label" style={{ marginTop: 2 }}>mode</span>

      <div className="tool-divider" />

      {/* Record */}
      <button
        className={`btn-record ${isRecording ? 'recording' : ''}`}
        onClick={isRecording ? onStopRecord : onStartRecord}
        title={isRecording ? 'Stop clip' : 'Start recording clip'}
      >
        {isRecording ? '⏹' : '⏺'}
      </button>
      <span className="tool-label">{isRecording ? 'stop' : 'rec'}</span>
    </div>
  )
}
