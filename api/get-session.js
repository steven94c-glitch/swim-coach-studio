import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })

  try {
    const { blobs } = await list({ prefix: `sessions/${id}.json` })
    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const manifestRes = await fetch(blobs[0].url)
    if (!manifestRes.ok) throw new Error('Could not fetch manifest')
    const manifest = await manifestRes.json()

    return res.status(200).json(manifest)
  } catch (err) {
    console.error('get-session error:', err)
    return res.status(500).json({ error: err.message })
  }
}
