import { NsbApiError } from '../http'
import { errorResult, type McpToolDefinition, textResult } from '../registry'

/**
 * Media tools. Two supported flows:
 *
 * 1. CDN configured (Uploadcare keys set): `upload_media_from_url` re-uploads a source URL
 *    into the app's media library and returns the CDN URL to embed in Markdown.
 * 2. No CDN: the tool returns a clear error — ask the admin to upload the file manually
 *    (the article editor supports "insert by URL"), then use that URL in `![alt](url)`.
 */
export const mediaTools: McpToolDefinition[] = [
  {
    name: 'list_media',
    description: 'List uploaded media assets (id, url, resourceType). Use existing assets before uploading new ones. Requires scope media:read.',
    scope: 'media:read',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Page size (default 25)' },
        offset: { type: 'number' },
      },
    },
    handler: async (args, ctx) => {
      const data = await ctx.api.get('/api/v1/media/list', {
        limit: typeof args.limit === 'number' ? args.limit : 25,
        offset: typeof args.offset === 'number' ? args.offset : 0,
      })

      return textResult(data)
    },
  },
  {
    name: 'upload_media_from_url',
    description:
      'Download a file from a URL and upload it into the app media library (CDN). Returns the asset with its CDN URL to embed in article Markdown. Requires scope media:write and a configured CDN (Uploadcare). If the CDN is not configured, ask the admin to upload the file manually and give you the final URL.',
    scope: 'media:write',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Source file URL (image/audio/video)' },
        filename: { type: 'string', description: 'Filename with extension, e.g. cover.png (optional)' },
        resourceType: { type: 'string', enum: ['image', 'audio', 'video'], description: 'Default: inferred from content-type' },
      },
      required: ['url'],
    },
    handler: async (args, ctx) => {
      const sourceUrl = String(args.url)

      let sourceResponse: Response

      try {
        sourceResponse = await fetch(sourceUrl)
      } catch (error) {
        return errorResult(`Failed to download source URL: ${error instanceof Error ? error.message : 'unknown error'}`)
      }

      if (!sourceResponse.ok) {
        return errorResult(`Failed to download source URL: HTTP ${sourceResponse.status}`)
      }

      const contentType = sourceResponse.headers.get('content-type') || 'application/octet-stream'
      const buffer = await sourceResponse.arrayBuffer()

      const inferredType = contentType.startsWith('image/')
        ? 'image'
        : contentType.startsWith('audio/')
          ? 'audio'
          : contentType.startsWith('video/')
            ? 'video'
            : null
      const resourceType = typeof args.resourceType === 'string' ? args.resourceType : inferredType

      if (!resourceType) {
        return errorResult(`Unsupported content-type "${contentType}". Provide resourceType explicitly (image/audio/video).`)
      }

      const extension = contentType.split('/')[1]?.split(';')[0] || 'bin'
      const filename = typeof args.filename === 'string' && args.filename ? args.filename : `upload.${extension}`

      const form = new FormData()

      form.set('file', new File([buffer], filename, { type: contentType }))
      form.set('resourceType', resourceType)

      try {
        const data = await ctx.api.postFormData('/api/v1/media/upload', form)

        return textResult(data)
      } catch (error) {
        if (error instanceof NsbApiError) {
          return errorResult(
            `Upload failed (${error.status}): ${error.message}. ` +
              'If the CDN is not configured on the server, ask the admin to upload the file manually and provide the final URL — ' +
              'then embed it in Markdown as ![alt](url).',
          )
        }

        throw error
      }
    },
  },
]
