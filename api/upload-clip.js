import { handleUpload } from '@vercel/blob/client'

export default async function handler(req, res) {
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString())

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/webm', 'video/mp4', 'application/octet-stream'],
        maximumSizeInBytes: 500 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    })
    return res.status(200).json(jsonResponse)
  } catch (err) {
    console.error('upload-clip error:', err)
    return res.status(400).json({ error: err.message })
  }
}
