import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

export default function Watch() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [watchedClips, setWatchedClips] = useState(new Set())
  const videoRef = useRef(null)

  useEffect(() => {
    fetch(`/api/get-session?id=${sessionId}`)
      .then(r => {
        if (!r.ok) throw new Error('Session not found')
        return r.json()
      })
      .then(setSession)
      .catch(err => setError(err.message))
  }, [sessionId])

  const goToClip = (index) => {
    if (!session?.clips?.[index]) return
    setCurrentClipIndex(index)
    const v = videoRef.current
    if (v) {
      v.src = session.clips[index].url
      v.load()
      v.play().catch(() => {})
    }
  }

  const handleClipEnded = () => {
    setWatchedClips(prev => new Set([...prev, currentClipIndex]))
    if (session && currentClipIndex < session.clips.length - 1) {
      goToClip(currentClipIndex + 1)
    }
  }

  // Auto-start first clip once session loads
  useEffect(() => {
    if (session?.clips?.length > 0) {
      const v = videoRef.current
      if (v) {
        v.src = session.clips[0].url
        v.load()
      }
    }
  }, [session])

  if (error) {
    return (
      <div className="error-screen">
        <span style={{ fontSize: 40 }}>⚠️</span>
        <h2>Session Not Found</h2>
        <p>{error}</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Check that the link is correct, or ask your coach to re-share it.
        </p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading your session...</p>
      </div>
    )
  }

  const clips = session.clips || []
  const clip = clips[currentClipIndex]
  const progressPct = clips.length > 0 ? ((watchedClips.size) / clips.length) * 100 : 0

  return (
    <div className="watch-page">
      <header className="watch-header">
        <div className="logo">SwimCoach Studio</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {clips.length} clip{clips.length !== 1 ? 's' : ''}
        </span>
      </header>

      <div className="watch-body">
        <div className="watch-player">
          <video
            ref={videoRef}
            className="watch-video"
            controls
            onEnded={handleClipEnded}
            onPlay={() => setWatchedClips(prev => new Set([...prev, currentClipIndex]))}
          />

          {clips.length > 1 && (
            <div className="watch-clip-nav">
              <span className="watch-clip-nav-label">Clips</span>
              {clips.map((_, i) => (
                <button
                  key={i}
                  className={`watch-clip-pip ${i === currentClipIndex ? 'active' : ''} ${watchedClips.has(i) && i !== currentClipIndex ? 'done' : ''}`}
                  onClick={() => goToClip(i)}
                  title={`Clip ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="watch-notes">
          <span className="watch-notes-eyebrow">Coach Notes</span>
          <div className="watch-clip-label">
            Clip {currentClipIndex + 1} of {clips.length}
          </div>
          {clip?.note
            ? <p className="watch-note-text">{clip.note}</p>
            : <p className="watch-note-empty">No note for this clip.</p>
          }

          <div className="watch-progress">
            <div className="watch-progress-bar">
              <div className="watch-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="watch-progress-label">
              {watchedClips.size} of {clips.length} clip{clips.length !== 1 ? 's' : ''} watched
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
