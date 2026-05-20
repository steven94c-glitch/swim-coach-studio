import { useState } from 'react'

export default function ShareModal({ url, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Session Ready to Share</h2>
        <p>Copy the link below and send it to your student. They can open it in any browser — no app needed.</p>
        <div className="share-url-box">
          <input
            className="share-url-input"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Preview
          </a>
        </div>
      </div>
    </div>
  )
}
