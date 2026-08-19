import { describe, it, expect } from 'vitest'
import { PROTOCOL_PACKAGE } from './index'

describe('protocol', () => {
  it('exports the protocol package placeholder', () => {
    expect(PROTOCOL_PACKAGE).toBe('@freevilisation/protocol')
  })
})