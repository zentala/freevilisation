import { describe, it, expect } from 'vitest'
import { MAPGEN_PACKAGE } from './index'

describe('mapgen', () => {
  it('exports the mapgen package placeholder', () => {
    expect(MAPGEN_PACKAGE).toBe('@freevilisation/mapgen')
  })
})