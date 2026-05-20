import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { clips } = req.body
    if (!Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'clips array required' })
    }

    const sessionId = randomUUID().replace(/-/g, '').slice(0, 16)
    const manifest = JSON.stringify({ clips, createdAt: Date.now() })

    await put(`sessions/${sessionId}.json`, manifest, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })

    return res.status(200).json({ sessionId })
  } catch (err) {
    console.error('save-session error:', err)
    return res.status(500).json({ error: err.message })
  }
}
