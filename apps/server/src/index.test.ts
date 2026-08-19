import { describe, it, expect } from 'vitest'
import worker from './index'

describe('server', () => {
  it('default-exports a Worker with a fetch function', () => {
    expect(typeof worker.fetch).toBe('function')
  })
})