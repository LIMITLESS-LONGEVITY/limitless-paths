import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyFormWithAuthHeader,
  RequestBodyWithAuthHeader,
} from '@services/utils/ts/requests'
import type { BlockContext } from '@services/blocks/blockContext'

export async function uploadNewImageFile(
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
    url = `${getAPIUrl()}blocks/image`
  } else if (context.type === 'article') {
    url = `${getAPIUrl()}articles/${context.uuid}/blocks/image`
  } else {
    formData.append('activity_uuid', context.uuid)
    url = `${getAPIUrl()}blocks/image`
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

export async function getImageFile(file_id: string, access_token: string) {
  return fetch(
    `${getAPIUrl()}blocks/image?file_id=${file_id}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
    .then((result) => result.json())
    .catch((error) => console.log('error', error))
}
