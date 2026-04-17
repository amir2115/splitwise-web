import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMemberSuggestions } from '@/modules/members/memberSuggestions'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('member suggestions controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  it('debounces rapid typing into a single search', async () => {
    const searchSuggestions = vi.fn().mockResolvedValue([])
    const controller = useMemberSuggestions(searchSuggestions, 250)

    controller.scheduleSearch('ali')
    controller.scheduleSearch('alice')

    expect(searchSuggestions).not.toHaveBeenCalled()
    expect(controller.isLoading.value).toBe(true)

    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()

    expect(searchSuggestions).toHaveBeenCalledTimes(1)
    expect(searchSuggestions).toHaveBeenCalledWith('alice')
  })

  it('keeps loading state until the current request resolves', async () => {
    const pendingRequest = deferred<[]>() 
    const searchSuggestions = vi.fn().mockReturnValue(pendingRequest.promise)
    const controller = useMemberSuggestions(searchSuggestions, 250)

    controller.scheduleSearch('alice')
    await vi.advanceTimersByTimeAsync(250)

    expect(controller.isLoading.value).toBe(true)

    pendingRequest.resolve([])
    await flushPromises()

    expect(controller.isLoading.value).toBe(false)
    expect(controller.hasResolvedQuery.value).toBe(true)
  })

  it('exposes an empty state after a successful search with no matches', async () => {
    const searchSuggestions = vi.fn().mockResolvedValue([])
    const controller = useMemberSuggestions(searchSuggestions, 250)

    controller.scheduleSearch('alice')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()

    expect(controller.errorMessage.value).toBe(null)
    expect(controller.hasResolvedQuery.value).toBe(true)
    expect(controller.suggestions.value).toEqual([])
  })

  it('ignores stale responses from older requests', async () => {
    const firstRequest = deferred<Array<{ id: string; username: string; name: string | null }>>()
    const secondRequest = deferred<Array<{ id: string; username: string; name: string | null }>>()
    const searchSuggestions = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)
    const controller = useMemberSuggestions(searchSuggestions, 250)

    controller.scheduleSearch('ali')
    await vi.advanceTimersByTimeAsync(250)

    controller.scheduleSearch('alic')
    await vi.advanceTimersByTimeAsync(250)

    firstRequest.resolve([{ id: 'user-1', username: 'ali', name: 'Ali' }])
    await flushPromises()
    expect(controller.suggestions.value).toEqual([])

    secondRequest.resolve([{ id: 'user-2', username: 'alice', name: 'Alice' }])
    await flushPromises()
    expect(controller.suggestions.value).toEqual([{ id: 'user-2', username: 'alice', name: 'Alice' }])
  })

  it('applies a selected suggestion into the input value payload', () => {
    const controller = useMemberSuggestions(vi.fn().mockResolvedValue([]), 250)

    const appliedUsername = controller.applySelection({
      id: 'user-1',
      username: 'alice',
      name: 'Alice',
    })

    expect(appliedUsername).toBe('alice')
    expect(controller.suggestions.value).toEqual([])
    expect(controller.activeIndex.value).toBe(-1)
  })
})
