import { put } from '@vercel/blob'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Collect raw body chunks
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)

    // Parse multipart/form-data manually — extract the first file part
    const boundary = (() => {
      const ct = req.headers['content-type'] || ''
      const m = ct.match(/boundary=(.+)$/)
      return m ? m[1] : null
    })()

    if (!boundary) return res.status(400).json({ error: 'No boundary in content-type' })

    const sep = Buffer.from(`--${boundary}`)
    const parts = []
    let start = 0
    while (start < body.length) {
      const idx = body.indexOf(sep, start)
      if (idx === -1) break
      const next = body.indexOf(sep, idx + sep.length)
      const part = body.slice(idx + sep.length, next === -1 ? body.length : next)
      parts.push(part)
      start = next === -1 ? body.length : next
    }

    let fileBuffer = null
    let filename = `clip-${Date.now()}.webm`

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n')
      if (headerEnd === -1) continue
      const header = part.slice(0, headerEnd).toString()
      if (!header.includes('filename=')) continue
      const fnMatch = header.match(/filename="([^"]+)"/)
      if (fnMatch) filename = fnMatch[1]
      // Skip \r\n\r\n header separator and trailing \r\n
      fileBuffer = part.slice(headerEnd + 4, part.length - 2)
      break
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file in request' })

    const blob = await put(`clips/${filename}`, fileBuffer, {
      access: 'public',
      contentType: 'video/webm',
    })

    return res.status(200).json({ url: blob.url })
  } catch (err) {
    console.error('upload-clip error:', err)
    return res.status(500).json({ error: err.message })
  }
}
