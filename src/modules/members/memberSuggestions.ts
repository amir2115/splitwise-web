import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type { MemberSuggestion } from '@/shared/api/types'

export const MIN_MEMBER_SUGGESTION_QUERY_LENGTH = 3

export function normalizeMemberSuggestionQuery(query: string) {
  return query.trim().toLowerCase()
}

type SearchSuggestions = (query: string) => Promise<MemberSuggestion[]>

export function useMemberSuggestions(searchSuggestions: SearchSuggestions, debounceMs = 250) {
  const suggestions = ref<MemberSuggestion[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const activeIndex = ref(-1)
  const hasResolvedQuery = ref(false)

  let debounceTimer: number | null = null
  let requestId = 0

  const hasSuggestions = computed(() => suggestions.value.length > 0)

  function clearDebounceTimer() {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function resetResults() {
    suggestions.value = []
    activeIndex.value = -1
    isLoading.value = false
    errorMessage.value = null
    hasResolvedQuery.value = false
  }

  function dismissSuggestions() {
    clearDebounceTimer()
    requestId += 1
    resetResults()
  }

  function setActiveIndex(nextIndex: number) {
    if (suggestions.value.length === 0) {
      activeIndex.value = -1
      return
    }
    activeIndex.value = ((nextIndex % suggestions.value.length) + suggestions.value.length) % suggestions.value.length
  }

  function moveSelection(step: 1 | -1) {
    if (suggestions.value.length === 0) return
    if (activeIndex.value === -1) {
      activeIndex.value = step === 1 ? 0 : suggestions.value.length - 1
      return
    }
    setActiveIndex(activeIndex.value + step)
  }

  function selectActiveSuggestion() {
    if (activeIndex.value < 0) return null
    return suggestions.value[activeIndex.value] ?? null
  }

  function applySelection(suggestion: MemberSuggestion) {
    dismissSuggestions()
    return suggestion.username
  }

  function scheduleSearch(rawQuery: string) {
    const normalizedQuery = normalizeMemberSuggestionQuery(rawQuery)

    clearDebounceTimer()
    requestId += 1
    const nextRequestId = requestId

    if (normalizedQuery.length < MIN_MEMBER_SUGGESTION_QUERY_LENGTH) {
      resetResults()
      return
    }

    suggestions.value = []
    activeIndex.value = -1
    errorMessage.value = null
    hasResolvedQuery.value = false
    isLoading.value = true

    debounceTimer = window.setTimeout(async () => {
      try {
        const nextSuggestions = await searchSuggestions(normalizedQuery)
        if (nextRequestId !== requestId) return
        suggestions.value = nextSuggestions
        activeIndex.value = nextSuggestions.length > 0 ? 0 : -1
        hasResolvedQuery.value = true
      } catch (error) {
        if (nextRequestId !== requestId) return
        suggestions.value = []
        activeIndex.value = -1
        errorMessage.value = error instanceof Error ? error.message : 'Request failed'
        hasResolvedQuery.value = true
      } finally {
        if (nextRequestId === requestId) {
          isLoading.value = false
          debounceTimer = null
        }
      }
    }, debounceMs)
  }

  return {
    activeIndex: activeIndex as Ref<number>,
    applySelection,
    dismissSuggestions,
    errorMessage: errorMessage as Ref<string | null>,
    hasResolvedQuery: hasResolvedQuery as Ref<boolean>,
    hasSuggestions,
    isLoading: isLoading as Ref<boolean>,
    moveSelection,
    scheduleSearch,
    selectActiveSuggestion,
    setActiveIndex,
    suggestions: suggestions as Ref<MemberSuggestion[]>,
  }
}
