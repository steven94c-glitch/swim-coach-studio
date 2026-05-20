import { useRef, useState, useEffect, useCallback } from 'react'
import ToolPanel from './ToolPanel'

const FADE_START_MS = 3500
const FADE_DURATION_MS = 1200
const ARROW_SIZE = 16

function drawArrowHead(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
    y2 - ARROW_SIZE * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    x2 - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
    y2 - ARROW_SIZE * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}

function renderStroke(ctx, stroke, alpha) {
  const pts = stroke.points
  if (pts.length === 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (stroke.tool) {
    case 'pen':
      if (pts.length < 2) {
        ctx.beginPath()
        ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.stroke()
      }
      break
    case 'line': {
      const end = pts[pts.length - 1]
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      break
    }
    case 'arrow': {
      if (pts.length >= 2) {
        const end = pts[pts.length - 1]
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        drawArrowHead(ctx, pts[0].x, pts[0].y, end.x, end.y)
      }
      break
    }
    case 'circle': {
      if (pts.length >= 2) {
        const end = pts[pts.length - 1]
        const rx = Math.abs(end.x - pts[0].x) / 2
        const ry = Math.abs(end.y - pts[0].y) / 2
        const cx = (pts[0].x + end.x) / 2
        const cy = (pts[0].y + end.y) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }
    case 'rect': {
      if (pts.length >= 2) {
        const end = pts[pts.length - 1]
        const x = Math.min(pts[0].x, end.x)
        const y = Math.min(pts[0].y, end.y)
        const w = Math.abs(end.x - pts[0].x)
        const h = Math.abs(end.y - pts[0].y)
        ctx.strokeRect(x, y, w, h)
      }
      break
    }
  }
  ctx.restore()
}

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoAnnotator({
  videoUrl, tool, color, strokeSize,
  onTool, onColor, onStrokeSize,
  isRecording, onRecordingChange, onClipRecorded,
}) {
  const videoRef = useRef(null)
  const annotationCanvasRef = useRef(null)
  const compositeCanvasRef = useRef(null)
  const rafRef = useRef(null)
  const compositeRafRef = useRef(null)
  const strokesRef = useRef([])
  const currentStrokeRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const recordingStartRef = useRef(null)
  const thumbnailRef = useRef(null)
  const [isPersist, setIsPersist] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [recSeconds, setRecSeconds] = useState(0)
  const recTimerRef = useRef(null)

  // Keep mutable refs in sync so event handlers always read latest values
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const strokeSizeRef = useRef(strokeSize)
  const isPersistRef = useRef(isPersist)
  const isRecordingRef = useRef(isRecording)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { strokeSizeRef.current = strokeSize }, [strokeSize])
  useEffect(() => { isPersistRef.current = isPersist }, [isPersist])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  // Resize canvas to match video natural dims when metadata loads
  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    for (const c of [annotationCanvasRef.current, compositeCanvasRef.current]) {
      if (c) { c.width = w; c.height = h }
    }
  }, [])

  // Main annotation render loop
  useEffect(() => {
    const loop = () => {
      const canvas = annotationCanvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return }
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = Date.now()
      for (const stroke of strokesRef.current) {
        const age = now - stroke.createdAt
        let alpha = 1
        if (!stroke.persist) {
          if (age > FADE_START_MS + FADE_DURATION_MS) continue
          if (age > FADE_START_MS) alpha = 1 - (age - FADE_START_MS) / FADE_DURATION_MS
        }
        renderStroke(ctx, stroke, alpha)
      }
      if (currentStrokeRef.current) renderStroke(ctx, currentStrokeRef.current, 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Composite loop: blit video + annotation → hidden canvas for recording
  useEffect(() => {
    if (!isRecording) {
      cancelAnimationFrame(compositeRafRef.current)
      return
    }
    const loop = () => {
      const comp = compositeCanvasRef.current
      const vid = videoRef.current
      const ann = annotationCanvasRef.current
      if (comp && vid && ann) {
        const ctx = comp.getContext('2d')
        ctx.drawImage(vid, 0, 0, comp.width, comp.height)
        ctx.drawImage(ann, 0, 0, comp.width, comp.height)
      }
      compositeRafRef.current = requestAnimationFrame(loop)
    }
    compositeRafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(compositeRafRef.current)
  }, [isRecording])

  // Convert pointer position to canvas coordinate space
  const getCanvasPos = (e) => {
    const canvas = annotationCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handlePointerDown = (e) => {
    if (toolRef.current === 'eraser') {
      strokesRef.current = []
      return
    }
    e.preventDefault()
    annotationCanvasRef.current.setPointerCapture(e.pointerId)
    const pos = getCanvasPos(e)
    currentStrokeRef.current = {
      id: Date.now(),
      tool: toolRef.current,
      color: colorRef.current,
      size: strokeSizeRef.current,
      points: [pos],
      createdAt: Date.now(),
      persist: isPersistRef.current,
    }
  }

  const handlePointerMove = (e) => {
    if (!currentStrokeRef.current) return
    e.preventDefault()
    const pos = getCanvasPos(e)
    if (currentStrokeRef.current.tool === 'pen') {
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, pos],
      }
    } else {
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [currentStrokeRef.current.points[0], pos],
      }
    }
  }

  const handlePointerUp = () => {
    if (!currentStrokeRef.current) return
    strokesRef.current = [...strokesRef.current, { ...currentStrokeRef.current }]
    currentStrokeRef.current = null
  }

  const captureThumbnail = () => {
    const comp = compositeCanvasRef.current
    if (!comp) return null
    const thumb = document.createElement('canvas')
    thumb.width = 160; thumb.height = 90
    const ctx = thumb.getContext('2d')
    // Fill video frame at this moment
    const vid = videoRef.current
    const ann = annotationCanvasRef.current
    if (vid) ctx.drawImage(vid, 0, 0, 160, 90)
    if (ann) ctx.drawImage(ann, 0, 0, 160, 90)
    return thumb.toDataURL('image/jpeg', 0.75)
  }

  const startRecording = async () => {
    strokesRef.current = []
    currentStrokeRef.current = null
    chunksRef.current = []
    thumbnailRef.current = captureThumbnail()
    syncCanvasSize()

    const comp = compositeCanvasRef.current
    const canvasStream = comp.captureStream(30)

    let finalStream = canvasStream
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ])
    } catch {
      // Recording continues without audio if mic denied
    }

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'

    const recorder = new MediaRecorder(finalStream, { mimeType })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      onClipRecorded({
        id: `clip-${Date.now()}`,
        blob,
        blobUrl: URL.createObjectURL(blob),
        thumbnail: thumbnailRef.current,
        note: '',
        duration: Date.now() - recordingStartRef.current,
      })
    }

    recorder.start(200)
    mediaRecorderRef.current = recorder
    recordingStartRef.current = Date.now()
    setRecSeconds(0)
    recTimerRef.current = setInterval(() => {
      setRecSeconds(s => s + 1)
    }, 1000)
    onRecordingChange(true)
  }

  const stopRecording = () => {
    clearInterval(recTimerRef.current)
    setRecSeconds(0)
    mediaRecorderRef.current?.stop()
    onRecordingChange(false)
  }

  // Video time tracking
  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (v) setCurrentTime(v.currentTime)
  }

  const handleScrub = (e) => {
    const v = videoRef.current
    if (v) v.currentTime = e.target.value
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play() : v.pause()
  }

  return (
    <div className="annotator">
      <ToolPanel
        tool={tool}
        color={color}
        strokeSize={strokeSize}
        isPersist={isPersist}
        onTool={onTool}
        onColor={onColor}
        onStrokeSize={onStrokeSize}
        onPersist={setIsPersist}
        onClear={() => { strokesRef.current = [] }}
        isRecording={isRecording}
        recSeconds={recSeconds}
        onStartRecord={startRecording}
        onStopRecord={stopRecording}
      />

      <div className="video-area">
        <div className="video-container">
          <video
            ref={videoRef}
            src={videoUrl}
            className="student-video"
            onLoadedMetadata={() => {
              syncCanvasSize()
              setDuration(videoRef.current?.duration || 0)
            }}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          <canvas
            ref={annotationCanvasRef}
            className="annotation-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {isRecording && (
            <>
              <div className="recording-border" />
              <div className="recording-badge">
                ● REC &nbsp; {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
              </div>
            </>
          )}
        </div>

        {/* Hidden composite canvas used for recording */}
        <canvas ref={compositeCanvasRef} style={{ display: 'none' }} />

        {/* Custom video controls */}
        <div className="video-controls">
          <button className="btn-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <input
            type="range"
            className="scrubber"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleScrub}
          />
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
