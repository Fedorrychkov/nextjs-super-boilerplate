import { CDN_CONFIG } from '@config/env'
import { ValidationError } from '@lib/error/custom-errors'

import { jsonParseSafety } from '~/utils/jsonSafe'

type UploadcareFileInfo = {
  uuid: string
  original_filename?: string | null
  mime_type?: string | null
  size?: number | null
  image_info?: {
    width?: number
    height?: number
  } | null
}

const UPLOADCARE_UPLOAD_API = 'https://upload.uploadcare.com/base/'
const UPLOADCARE_REST_API = 'https://api.uploadcare.com/files'

function ensureUploadcareConfig() {
  if (!CDN_CONFIG.publicKey || !CDN_CONFIG.secretKey) {
    throw new ValidationError('Uploadcare config is missing')
  }
}

function getAuthHeader() {
  return `Uploadcare.Simple ${CDN_CONFIG.publicKey}:${CDN_CONFIG.secretKey}`
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text()

  if (!text) return {} as T

  return jsonParseSafety<T>(text)
}

export async function uploadFileToUploadcare(file: File): Promise<{ fileId: string }> {
  ensureUploadcareConfig()

  const formData = new FormData()
  formData.append('UPLOADCARE_PUB_KEY', CDN_CONFIG.publicKey)
  formData.append('UPLOADCARE_STORE', '1')
  formData.append('file', file)

  const response = await fetch(UPLOADCARE_UPLOAD_API, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Uploadcare upload failed with status ${response.status}`)
  }

  const data = await parseJsonSafe<{ file?: string }>(response)

  if (!data?.file) {
    throw new Error('Uploadcare upload response does not contain file id')
  }

  return { fileId: data.file }
}

export async function getUploadcareFileInfo(fileId: string): Promise<UploadcareFileInfo> {
  ensureUploadcareConfig()

  const response = await fetch(`${UPLOADCARE_REST_API}/${fileId}/`, {
    headers: {
      Accept: 'application/vnd.uploadcare-v0.7+json',
      Authorization: getAuthHeader(),
    },
  })

  if (!response.ok) {
    throw new Error(`Uploadcare file info failed with status ${response.status}`)
  }

  const data = await parseJsonSafe<UploadcareFileInfo>(response)

  if (!data) {
    throw new Error('Uploadcare file info response is null')
  }

  return data
}

export async function deleteUploadcareFile(fileId: string): Promise<void> {
  ensureUploadcareConfig()

  const response = await fetch(`${UPLOADCARE_REST_API}/${fileId}/storage/`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.uploadcare-v0.7+json',
      Authorization: getAuthHeader(),
    },
  })

  if (!response.ok) {
    throw new Error(`Uploadcare delete failed with status ${response.status}`)
  }
}

export function buildUploadcareCdnUrl(fileId: string, operations = ''): string {
  if (!operations) {
    return `https://ucarecdn.com/${fileId}/`
  }

  const trimmed = operations.trim().replace(/\/+$/, '')
  const withPrefix = trimmed.startsWith('-/') ? trimmed : `-/${trimmed.replace(/^\/+/, '')}`
  const normalizedOps = `${withPrefix}/`

  return `https://ucarecdn.com/${fileId}/${normalizedOps}`
}
