import { ref } from 'vue'
import { defineStore } from 'pinia'

interface SnackbarItem {
  id: number
  message: string
  tone: 'info' | 'error'
}

let nextId = 1

export const useSnackbarStore = defineStore('snackbar', () => {
  const items = ref<SnackbarItem[]>([])

  function push(message: string, tone: 'info' | 'error' = 'info') {
    const item = { id: nextId++, message, tone }
    items.value.push(item)
    window.setTimeout(() => {
      items.value = items.value.filter((entry) => entry.id !== item.id)
    }, 3500)
  }

  return { items, push }
})
