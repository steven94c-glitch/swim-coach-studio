import { useState } from 'react'
import { upload } from '@vercel/blob/client'
import VideoAnnotator from '../components/VideoAnnotator'
import ClipTray from '../components/ClipTray'
import ShareModal from '../components/ShareModal'

export default function Studio() {
  const [videoUrl, setVideoUrl] = useState(null)
  const [clips, setClips] = useState([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#ff3b30')
  const [strokeSize, setStrokeSize] = useState(4)
  const [isRecording, setIsRecording] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')

  const handleFileLoad = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setClips([])
    setShareUrl(null)
  }

  const handleClipRecorded = (clip) => {
    setClips(prev => [...prev, clip])
  }

  const handleClipNoteChange = (id, note) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, note } : c))
  }

  const handleClipDelete = (id) => {
    setClips(prev => {
      const clip = prev.find(c => c.id === id)
      if (clip?.blobUrl) URL.revokeObjectURL(clip.blobUrl)
      return prev.filter(c => c.id !== id)
    })
  }

  const handleClipsReorder = (newClips) => setClips(newClips)

  const handleExport = async () => {
    if (clips.length === 0) return
    setIsExporting(true)
    try {
      const uploadedClips = []
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]
        setExportProgress(`Uploading clip ${i + 1} of ${clips.length}...`)
        const blob = await upload(`clips/clip-${clip.id}.webm`, clip.blob, {
          access: 'public',
          handleUploadUrl: '/api/upload-clip',
        })
        uploadedClips.push({ url: blob.url, note: clip.note || '' })
      }
      setExportProgress('Saving session...')
      const sessionRes = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clips: uploadedClips }),
      })
      if (!sessionRes.ok) throw new Error('Failed to save session')
      const { sessionId } = await sessionRes.json()
      setShareUrl(`${window.location.origin}/watch/${sessionId}`)
    } catch (err) {
      console.error(err)
      alert(`Export failed: ${err.message}\n\nMake sure BLOB_READ_WRITE_TOKEN is set in your environment.`)
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  return (
    <div className="studio">
      <header className="studio-header">
        <div className="logo">SwimCoach Studio</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isExporting && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exportProgress}</span>
          )}
          {videoUrl && clips.length > 0 && (
            <button className="btn-export" onClick={handleExport} disabled={isExporting || isRecording}>
              {isExporting ? 'Exporting...' : `Share Session (${clips.length} clip${clips.length !== 1 ? 's' : ''})`}
            </button>
          )}
          {videoUrl && (
            <label style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              Load new video
              <input type="file" accept="video/*" onChange={handleFileLoad} hidden />
            </label>
          )}
        </div>
      </header>

      {!videoUrl ? (
        <div className="drop-zone">
          <div className="drop-zone-inner">
            <div className="drop-icon">🎬</div>
            <h2>Load Student Video</h2>
            <p>Pick the swim video you received from your student to start your analysis.</p>
            <label className="btn-primary">
              Choose Video
              <input type="file" accept="video/*" onChange={handleFileLoad} hidden />
            </label>
          </div>
        </div>
      ) : (
        <div className="studio-workspace">
          <VideoAnnotator
            videoUrl={videoUrl}
            tool={tool}
            color={color}
            strokeSize={strokeSize}
            onTool={setTool}
            onColor={setColor}
            onStrokeSize={setStrokeSize}
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
            onClipRecorded={handleClipRecorded}
          />
          <ClipTray
            clips={clips}
            onNoteChange={handleClipNoteChange}
            onDelete={handleClipDelete}
            onReorder={handleClipsReorder}
          />
        </div>
      )}

      {shareUrl && (
        <ShareModal url={shareUrl} onClose={() => setShareUrl(null)} />
      )}
    </div>
  )
}
