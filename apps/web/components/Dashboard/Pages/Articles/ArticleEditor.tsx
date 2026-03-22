'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { getArticle, updateArticle, getArticleVersions, restoreArticleVersion } from '@services/articles/articles'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { OrgProvider } from '@components/Contexts/OrgContext'
import ArticleStatusBar from './ArticleStatusBar'
import ArticleMetaSidebar from './ArticleMetaSidebar'
import ArticleReviewPanel from './ArticleReviewPanel'
import { ToolbarButtons } from '@components/Objects/Editor/Toolbar/ToolbarButtons'
import { getLinkExtension } from '@components/Objects/Editor/EditorConf'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Youtube from '@tiptap/extension-youtube'
import { common, createLowlight } from 'lowlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import toast from 'react-hot-toast'
import Toast from '@components/Objects/StyledElements/Toast/Toast'
import { Save, History, X, Clock, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import InfoCallout from '@components/Objects/Editor/Extensions/Callout/Info/InfoCallout'
import WarningCallout from '@components/Objects/Editor/Extensions/Callout/Warning/WarningCallout'
import ImageBlock from '@components/Objects/Editor/Extensions/Image/ImageBlock'
import VideoBlock from '@components/Objects/Editor/Extensions/Video/VideoBlock'
import AudioBlock from '@components/Objects/Editor/Extensions/Audio/AudioBlock'
import PDFBlock from '@components/Objects/Editor/Extensions/PDF/PDFBlock'
import MathEquationBlock from '@components/Objects/Editor/Extensions/MathEquation/MathEquationBlock'
import EmbedObjects from '@components/Objects/Editor/Extensions/EmbedObjects/EmbedObjects'
import Flipcard from '@components/Objects/Editor/Extensions/Flipcard/Flipcard'
import Buttons from '@components/Objects/Editor/Extensions/Buttons/Buttons'
import WebPreview from '@components/Objects/Editor/Extensions/WebPreview/WebPreview'
import { SlashCommands } from '@components/Objects/Editor/Extensions/SlashCommands'
import DragHandle from '@components/Objects/Editor/Extensions/DragHandle/DragHandle'
import PasteFileHandler from '@components/Objects/Editor/Extensions/PasteFileHandler/PasteFileHandler'
import AIStreamingMark from '@components/Objects/Editor/Extensions/AIStreaming/AIStreamingMark'
import AISelectionHighlight from '@components/Objects/Editor/Extensions/AISelectionHighlight/AISelectionHighlight'
import EditorOptionsProvider from '@components/Contexts/Editor/EditorContext'

const lowlight = createLowlight(common)

// Normalize AI-generated mark types (same as EditorWrapper)
function normalizeMarkTypes(content: any): any {
  if (!content || typeof content !== 'object') return content
  if (Array.isArray(content)) return content.map(normalizeMarkTypes)
  const normalized: any = { ...content }
  if (normalized.marks && Array.isArray(normalized.marks)) {
    normalized.marks = normalized.marks.map((mark: any) => {
      if (mark.type === 'strong') return { ...mark, type: 'bold' }
      if (mark.type === 'em') return { ...mark, type: 'italic' }
      return mark
    })
  }
  if (normalized.content && Array.isArray(normalized.content)) {
    normalized.content = normalizeMarkTypes(normalized.content)
  }
  return normalized
}

interface ArticleEditorInnerProps {
  articleUuid: string
  org: any
  orgslug: string
}

function ArticleEditorInner({ articleUuid, org, orgslug }: ArticleEditorInnerProps) {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const editorRef = useRef<any>(null)

  // Load article
  async function loadArticle() {
    if (!access_token) return
    try {
      const data = await getArticle(`article_${articleUuid}`, access_token)
      setArticle(data)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load article')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (access_token) {
      loadArticle()
    }
  }, [access_token, articleUuid])

  // Initialize editor
  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        bulletList: { HTMLAttributes: { class: 'bullet-list' } },
        orderedList: { HTMLAttributes: { class: 'ordered-list' } },
      }),
      InfoCallout.configure({ editable: true }),
      WarningCallout.configure({ editable: true }),
      Youtube.configure({ controls: true, modestBranding: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      getLinkExtension(),
      // Media blocks
      ImageBlock.configure({
        context: { type: 'article' as const, uuid: `article_${articleUuid}` },
      }),
      VideoBlock.configure({
        context: { type: 'article' as const, uuid: `article_${articleUuid}` },
      }),
      AudioBlock.configure({
        context: { type: 'article' as const, uuid: `article_${articleUuid}` },
      }),
      PDFBlock.configure({
        context: { type: 'article' as const, uuid: `article_${articleUuid}` },
      }),
      MathEquationBlock,
      // Content blocks
      EmbedObjects,
      Flipcard,
      Buttons,
      WebPreview,
      // Editor UX
      SlashCommands,
      DragHandle,
      PasteFileHandler.configure({
        context: { type: 'article' as const, uuid: `article_${articleUuid}` },
        getAccessToken: () => access_token,
      }),
      // AI
      AIStreamingMark,
      AISelectionHighlight,
    ],
    content: '',
    immediatelyRender: false,
  })

  // Set editor content once article loads
  useEffect(() => {
    if (editor && article?.content) {
      try {
        const parsed = typeof article.content === 'string'
          ? JSON.parse(article.content)
          : article.content
        const normalized = normalizeMarkTypes(parsed)
        editor.commands.setContent(normalized)
      } catch (_e) {
        editor.commands.setContent(article.content)
      }
    }
  }, [editor, article?.article_uuid])

  // Keep editor ref in sync
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!access_token) return
    autoSaveTimerRef.current = setInterval(async () => {
      const ed = editorRef.current
      if (!ed || !article) return
      const uuid = article.article_uuid || article.uuid
      try {
        await updateArticle(uuid, { content: ed.getJSON() }, access_token, true)
      } catch (_e) {
        // Silently fail auto-save
      }
    }, 30_000)

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [access_token, article?.article_uuid])

  // Manual save (creates version)
  async function handleSave() {
    if (!editor || !article || !access_token) return
    const uuid = article.article_uuid || article.uuid
    setIsSaving(true)
    try {
      const res = await updateArticle(uuid, { content: editor.getJSON() }, access_token, false)
      if (res.success) {
        toast.success('Article saved')
        setArticle(res.data)
      } else {
        toast.error(res.data?.detail || 'Failed to save')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Load version history
  async function handleShowVersionHistory() {
    setShowVersionHistory(true)
    if (!access_token || !article) return
    const uuid = article.article_uuid || article.uuid
    setLoadingVersions(true)
    try {
      const data = await getArticleVersions(uuid, access_token)
      const arr = Array.isArray(data) ? data : (data?.items || data?.data || [])
      setVersions(arr)
    } catch (_e) {
      setVersions([])
    } finally {
      setLoadingVersions(false)
    }
  }

  // Restore version
  async function handleRestoreVersion(versionNumber: number) {
    if (!access_token || !article) return
    const uuid = article.article_uuid || article.uuid
    if (!confirm(`Restore version ${versionNumber}? Current unsaved changes will be overwritten.`)) return
    try {
      const res = await restoreArticleVersion(uuid, versionNumber, access_token)
      if (res.success) {
        toast.success(`Restored to version ${versionNumber}`)
        await loadArticle()
        setShowVersionHistory(false)
      } else {
        toast.error('Failed to restore version')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to restore version')
    }
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f8f8f8]">
        <div className="text-gray-400 text-sm">Loading article...</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f8f8f8]">
        <div className="text-red-500 text-sm">Article not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8f8f8] overflow-hidden">
      <Toast />

      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 shrink-0 z-10">
        {/* Back link */}
        <Link
          href="/dash/articles"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors mr-2"
        >
          ← Articles
        </Link>

        {/* Toolbar */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          <ToolbarButtons editor={editor} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShowVersionHistory}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <ArticleStatusBar
        article={article}
        access_token={access_token}
        onRefresh={loadArticle}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none min-h-[400px] focus:outline-none"
            />
          </div>
        </div>

        {/* Meta sidebar */}
        <ArticleMetaSidebar
          article={article}
          access_token={access_token}
          onUpdate={(updated) => setArticle(updated)}
        />
      </div>

      {/* Review panel */}
      <ArticleReviewPanel
        article={article}
        access_token={access_token}
        onRefresh={loadArticle}
      />

      {/* Version History Drawer */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end pointer-events-none">
          <div
            className="flex-1 bg-black/30 pointer-events-auto"
            onClick={() => setShowVersionHistory(false)}
          />
          <div className="w-80 bg-white shadow-2xl pointer-events-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Version History
              </h3>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingVersions ? (
                <p className="text-xs text-gray-400">Loading versions...</p>
              ) : versions.length === 0 ? (
                <p className="text-xs text-gray-400">No saved versions yet.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v: any) => (
                    <div key={v.version_number} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          Version {v.version_number}
                        </span>
                        <button
                          onClick={() => handleRestoreVersion(v.version_number)}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Restore
                        </button>
                      </div>
                      {v.created_at && (
                        <p className="text-xs text-gray-400">
                          {new Date(v.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ArticleEditorProps {
  articleUuid: string
  org: any
  orgslug: string
}

export default function ArticleEditor({ articleUuid, org, orgslug }: ArticleEditorProps) {
  return (
    <OrgProvider orgslug={orgslug}>
      <EditorOptionsProvider options={{ isEditable: true }}>
        <ArticleEditorInner articleUuid={articleUuid} org={org} orgslug={orgslug} />
      </EditorOptionsProvider>
    </OrgProvider>
  )
}
