<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import type { AppLanguage, GroupCard, Member } from '@/shared/api/types'
import { useGroupCardsStore } from '@/modules/groupCards/store'
import { fillCardChunksFromInput, formatReadableCardNumber, mergeCardChunks, normalizeCardChunkInput } from '@/modules/groupCards/cardNumber'
import { useSnackbarStore } from '@/shared/stores/snackbar'

const props = defineProps<{
  groupId: string
  members: Member[]
  groupCards: GroupCard[]
  language: AppLanguage
  strings: {
    groupCardsTitle: string
    groupCardsSubtitle: string
    addGroupCard: string
    editGroupCard: string
    noGroupCardsTitle: string
    noGroupCardsSubtitle: string
    cardOwnerLabel: string
    cardNumberLabel: string
    copyCardNumber: string
    cardCopied: string
    saveGroupCard: string
    saveGroupCardChanges: string
    cancel: string
    save: string
    edit: string
    delete: string
    confirmDelete: string
    genericError: string
  }
}>()

const groupCardsStore = useGroupCardsStore()
const snackbarStore = useSnackbarStore()

const editingCardId = ref<string | null>(null)
const selectedMemberId = ref('')
const cardChunks = ref(['', '', '', ''])
const cardChunkRefs = ref<Array<HTMLInputElement | null>>([])

const activeMembers = computed(() => props.members.filter((member) => member.membership_status === 'ACTIVE'))

function memberName(memberId: string) {
  return props.members.find((member) => member.id === memberId)?.username ?? memberId
}

function openCreate() {
  editingCardId.value = ''
  selectedMemberId.value = activeMembers.value[0]?.id ?? ''
  cardChunks.value = ['', '', '', '']
}

function openEdit(groupCard: GroupCard) {
  editingCardId.value = groupCard.id
  selectedMemberId.value = groupCard.member_id
  cardChunks.value = fillCardChunksFromInput(groupCard.card_number)
}

function closeModal() {
  editingCardId.value = null
  selectedMemberId.value = ''
  cardChunks.value = ['', '', '', '']
}

function setCardChunkRef(index: number, element: Element | null) {
  cardChunkRefs.value[index] = element instanceof HTMLInputElement ? element : null
}

function focusChunk(index: number) {
  cardChunkRefs.value[index]?.focus()
  cardChunkRefs.value[index]?.select()
}

function updateChunk(index: number, value: string) {
  const normalized = normalizeCardChunkInput(value)
  cardChunks.value[index] = normalized
  if (normalized.length === 4 && index < 3) {
    focusChunk(index + 1)
  }
}

function onChunkKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && cardChunks.value[index].length === 0 && index > 0) {
    event.preventDefault()
    focusChunk(index - 1)
  }
}

function onChunkPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text') ?? ''
  const chunks = fillCardChunksFromInput(pasted)
  if (chunks.join('').length !== 16) return
  event.preventDefault()
  cardChunks.value = chunks
  focusChunk(3)
}

async function saveCard() {
  try {
    await groupCardsStore.save({
      existingId: editingCardId.value || undefined,
      group_id: props.groupId,
      member_id: selectedMemberId.value,
      card_number: mergeCardChunks(cardChunks.value),
    })
    closeModal()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : props.strings.genericError, 'error')
  }
}

async function removeCard(groupCard: GroupCard) {
  if (!window.confirm(props.strings.confirmDelete)) return
  try {
    await groupCardsStore.remove(groupCard)
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : props.strings.genericError, 'error')
  }
}

async function copyCardNumber(cardNumber: string) {
  try {
    await navigator.clipboard.writeText(cardNumber)
    snackbarStore.push(props.strings.cardCopied, 'info')
  } catch {
    snackbarStore.push(props.strings.genericError, 'error')
  }
}
</script>

<template>
  <section class="page-stack">
    <SectionHeader :title="strings.groupCardsTitle" />
    <div class="list-stack group-cards-list">
      <article v-for="groupCard in groupCards" :key="groupCard.id" class="surface-card surface-card--flat group-card-item">
        <div class="detail-line detail-line--keep-row group-card-item__top">
          <div style="min-width: 0; flex: 1;">
            <div class="page-topbar__title group-card-item__owner">@{{ memberName(groupCard.member_id) }}</div>
          </div>
          <div class="card-actions card-actions--inline group-card-item__actions">
            <button class="icon-button" type="button" :title="strings.edit" @click="openEdit(groupCard)">✎</button>
            <button class="icon-button" type="button" :title="strings.delete" @click="removeCard(groupCard)">🗑</button>
            <button class="icon-button" type="button" :title="strings.copyCardNumber" @click="copyCardNumber(groupCard.card_number)">⧉</button>
          </div>
        </div>
        <div class="group-card-item__number">{{ formatReadableCardNumber(groupCard.card_number) }}</div>
      </article>
      <EmptyStateCard v-if="groupCards.length === 0" :title="strings.noGroupCardsTitle" :subtitle="strings.noGroupCardsSubtitle" />
    </div>

    <button class="filled-button group-cards-add-button" type="button" @click="openCreate">
      {{ strings.addGroupCard }}
    </button>
  </section>

  <BaseModal v-if="editingCardId !== null" :title="editingCardId ? strings.editGroupCard : strings.addGroupCard" @close="closeModal">
    <div class="form-field">
      <label class="form-field__label">{{ strings.cardOwnerLabel }}</label>
      <select v-model="selectedMemberId" class="text-input group-card-form__select">
        <option v-for="member in activeMembers" :key="member.id" :value="member.id">@{{ member.username }}</option>
      </select>
    </div>

    <div class="form-field">
      <label class="form-field__label">{{ strings.cardNumberLabel }}</label>
      <div class="group-card-form__chunks" @paste="onChunkPaste">
        <input
          v-for="(_, index) in cardChunks"
          :key="`group-card-chunk-${index}`"
          :ref="(element) => setCardChunkRef(index, element)"
          :value="cardChunks[index]"
          class="text-input group-card-form__chunk"
          type="text"
          inputmode="numeric"
          maxlength="4"
          @input="updateChunk(index, ($event.target as HTMLInputElement).value)"
          @keydown="onChunkKeydown(index, $event)"
        />
      </div>
    </div>

    <div class="modal-actions">
      <button class="outline-button" type="button" style="flex: 1;" @click="closeModal">{{ strings.cancel }}</button>
      <button class="filled-button" type="button" style="flex: 1; height: 48px;" @click="saveCard">
        {{ editingCardId ? strings.saveGroupCardChanges : strings.saveGroupCard }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.group-cards-list {
  gap: 12px;
}

.group-cards-add-button {
  width: 100%;
  height: 50px;
}

.group-card-item {
  padding: 14px 16px 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-surface-soft) 88%, var(--color-surface)), color-mix(in srgb, var(--color-surface) 92%, black 8%));
  border-radius: 26px;
}

.group-card-item__owner {
  font-size: 15px;
  line-height: 24px;
}

.group-card-item__top {
  align-items: center;
}

.group-card-item__actions {
  gap: 6px;
}

.group-card-item__number {
  margin-top: 12px;
  text-align: center;
  font-size: 21px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: 0.08em;
  direction: ltr;
}

.group-card-form__select {
  appearance: none;
  padding-inline-end: 44px;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    left 20px center,
    left 14px center;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.group-card-form__chunks {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  direction: ltr;
}

.group-card-form__chunk {
  text-align: center;
  font-size: 20px;
  letter-spacing: 0.08em;
}

@media (max-width: 640px) {
  .group-card-item {
    padding: 14px;
  }

  .group-card-item__number {
    font-size: 18px;
    line-height: 28px;
  }

  .group-card-item__actions {
    gap: 4px;
  }
}
</style>
