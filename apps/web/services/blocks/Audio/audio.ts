import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyFormWithAuthHeader,
} from '@services/utils/ts/requests'
import type { BlockContext } from '@services/blocks/blockContext'

export async function uploadNewAudioFile(
  file: any,
  context: BlockContext | string,
  access_token: string
) {
  const formData = new FormData()
  formData.append('file_object', file)

  let url: string
  if (typeof context === 'string') {
    // Legacy: activity_uuid passed directly
    formData.append('activity_uuid', context)
    url = `${getAPIUrl()}blocks/audio`
  } else if (context.type === 'article') {
    url = `${getAPIUrl()}articles/${context.uuid}/blocks/audio`
  } else {
    formData.append('activity_uuid', context.uuid)
    url = `${getAPIUrl()}blocks/audio`
  }

  const result = await fetch(
    url,
    RequestBodyFormWithAuthHeader('POST', formData, null, access_token)
  )

  const data = await result.json()

  if (!result.ok) {
    const errorMessage = typeof data?.detail === 'string'
      ? data.detail
      : Array.isArray(data?.detail)
        ? data.detail.map((e: any) => e.msg).join(', ')
        : 'Upload failed'
    throw new Error(errorMessage)
  }

  return data
}
