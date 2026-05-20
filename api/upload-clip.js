import { put } from '@vercel/blob'

export const config = { api: { bodyParser: false, responseLimit: false } }

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const filename = `clips/clip-${Date.now()}.webm`
    // Stream req directly into Vercel Blob — no body size limit issues
    const blob = await put(filename, req, {
      access: 'public',
      contentType: 'video/webm',
    })
    return res.status(200).json({ url: blob.url })
  } catch (err) {
    console.error('upload-clip error:', err)
    return res.status(500).json({ error: err.message })
  }
}
