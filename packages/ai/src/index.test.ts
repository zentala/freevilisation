import { describe, it, expect } from 'vitest'
import { AI_PACKAGE } from './index'

describe('ai', () => {
  it('exports the ai package placeholder', () => {
    expect(AI_PACKAGE).toBe('@freevilisation/ai')
  })
})