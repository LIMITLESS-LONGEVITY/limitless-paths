import { describe, it, expect } from 'vitest'
import { extractTextFromLexical } from '@/ai/utils'
import { buildTutorSystemPrompt } from '@/ai/prompts/tutor'
import { buildQuizPrompt, parseQuizResponse } from '@/ai/prompts/quizGenerator'

describe('Lexical text extraction', () => {
  it('extracts text from a simple Lexical document', () => {
    const lexical = {
      root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello world' }] }] },
    }
    expect(extractTextFromLexical(lexical)).toBe('Hello world')
  })

  it('extracts text from nested nodes', () => {
    const lexical = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'First paragraph.' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Second paragraph.' }] },
        ],
      },
    }
    expect(extractTextFromLexical(lexical)).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('returns empty string for null/undefined', () => {
    expect(extractTextFromLexical(null)).toBe('')
    expect(extractTextFromLexical(undefined)).toBe('')
  })
})

describe('Tutor prompt', () => {
  it('builds system prompt with title and content', () => {
    const prompt = buildTutorSystemPrompt('Mitochondria 101', 'The mitochondria is the powerhouse of the cell.')
    expect(prompt).toContain('Mitochondria 101')
    expect(prompt).toContain('The mitochondria is the powerhouse of the cell.')
    expect(prompt).toContain('tutor')
    expect(prompt).toContain('outside the scope')
  })
})

describe('Quiz prompt', () => {
  it('builds quiz generation prompt', () => {
    const prompt = buildQuizPrompt('Cell Biology Basics', 'Cells are the basic unit of life.', 5)
    expect(prompt).toContain('5')
    expect(prompt).toContain('multiple-choice')
    expect(prompt).toContain('Cells are the basic unit of life.')
  })

  it('parses valid quiz JSON response', () => {
    const response = JSON.stringify({
      questions: [{
        question: 'What is the basic unit of life?',
        options: ['Atom', 'Cell', 'Molecule', 'Organ'],
        correctAnswer: 1,
        explanation: 'Cells are the fundamental unit of life.',
      }],
    })
    const result = parseQuizResponse(response)
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].options).toHaveLength(4)
    expect(result.questions[0].correctAnswer).toBe(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseQuizResponse('not json')).toThrow()
  })

  it('throws on missing questions array', () => {
    expect(() => parseQuizResponse(JSON.stringify({ data: [] }))).toThrow()
  })
})
