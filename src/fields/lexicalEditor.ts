import { lexicalEditor, BlocksFeature } from '@payloadcms/richtext-lexical'
import { VideoEmbed } from '../blocks/VideoEmbed/config'
import { Callout } from '../blocks/Callout/config'
import { CodeBlock } from '../blocks/CodeBlock/config'

export const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({
      blocks: [VideoEmbed, Callout, CodeBlock],
    }),
  ],
})
