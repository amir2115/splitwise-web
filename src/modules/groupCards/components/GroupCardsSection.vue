<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/shared/components/BaseModal.vue'
import EmptyStateCard from '@/shared/components/EmptyStateCard.vue'
import Avatar from '@/shared/components/Avatar.vue'
import type { AppLanguage, GroupCard, Member } from '@/shared/api/types'
import { useGroupCardsStore } from '@/modules/groupCards/store'
import { fillCardChunksFromInput, mergeCardChunks, normalizeCardChunkInput, splitCardNumberIntoChunks } from '@/modules/groupCards/cardNumber'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'

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
    cardholderLabel: string
    cardSelectMemberHint: string
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
const memberPickerOpen = ref(false)

const activeMembers = computed(() => props.members.filter((member) => member.membership_status === 'ACTIVE'))
const isEditMode = computed(() => Boolean(editingCardId.value))
const modalOpen = computed(() => editingCardId.value !== null)

function memberById(memberId: string) {
  return props.members.find((member) => member.id === memberId)
}

function memberName(memberId: string) {
  return memberById(memberId)?.username ?? memberId
}

function selectedMember() {
  return memberById(selectedMemberId.value)
}

// 4-digit chunk display with bank-color side stripe
const cardRows = computed(() =>
  props.groupCards.map((card) => ({
    card,
    chunks: splitCardNumberIntoChunks(card.card_number),
    bankColor: bankColorForCardNumber(card.card_number),
  })),
)

// Detect bank by Iranian card BIN (first 6) — best-effort, falls back to brand color
function bankColorForCardNumber(cardNumber: string): string {
  const bin = cardNumber.slice(0, 6)
  // Common Iranian bank BINs → CSS variable references (so dark/light theme adapts)
  const map: Record<string, string> = {
    '603799': 'var(--bank-melli, #00754A)',     // Melli
    '589210': 'var(--bank-sepah, #C8102E)',     // Sepah
    '627412': 'var(--bank-eghtesad, #862633)',  // Eghtesad-e-Novin
    '627353': 'var(--bank-tejarat, #1F4E79)',   // Tejarat
    '585983': 'var(--bank-tejarat, #1F4E79)',
    '627648': 'var(--bank-tose, #00A651)',      // Tose'e
    '621986': 'var(--bank-saman, #0A8F76)',     // Saman
    '589463': 'var(--bank-refah, #C00)',        // Refah
    '502938': 'var(--bank-day, #6E2C91)',       // Day
    '603770': 'var(--bank-keshavarzi, #FFB81C)', // Keshavarzi
    '628023': 'var(--bank-maskan, #003DA5)',    // Maskan
    '610433': 'var(--bank-mellat, #C8102E)',    // Mellat
    '991975': 'var(--bank-mellat, #C8102E)',
    '627760': 'var(--bank-post, #FECC00)',      // Post
    '622106': 'var(--bank-parsian, #C00)',      // Parsian
    '502908': 'var(--bank-tose, #00A651)',
    '627488': 'var(--bank-karafarin, #002B56)', // Karafarin
    '505785': 'var(--bank-iranzamin, #00A0DC)', // Iran Zamin
    '627381': 'var(--bank-ansar, #013220)',     // Ansar
    '505416': 'var(--bank-gardeshgari, #B7995A)', // Gardeshgari
    '636949': 'var(--bank-hekmat, #1B365D)',    // Hekmat
    '502229': 'var(--bank-pasargad, #FECC00)',  // Pasargad
    '639347': 'var(--bank-pasargad, #FECC00)',
    '627884': 'var(--bank-sina, #002B56)',      // Sina
    '639607': 'var(--bank-sarmaye, #006094)',   // Sarmaye
    '505801': 'var(--bank-kosar, #4B0082)',     // Kosar
    '606373': 'var(--bank-mehre-iran, #008080)', // Mehr-e-Iran
    '504172': 'var(--bank-resalat, #FFC72C)',   // Resalat
  }
  return map[bin] ?? 'var(--brand)'
}

function openCreate() {
  editingCardId.value = ''
  selectedMemberId.value = activeMembers.value[0]?.id ?? ''
  cardChunks.value = ['', '', '', '']
  memberPickerOpen.value = false
}

function openEdit(groupCard: GroupCard) {
  editingCardId.value = groupCard.id
  selectedMemberId.value = groupCard.member_id
  cardChunks.value = fillCardChunksFromInput(groupCard.card_number)
  memberPickerOpen.value = false
}

function closeModal() {
  editingCardId.value = null
  selectedMemberId.value = ''
  cardChunks.value = ['', '', '', '']
  memberPickerOpen.value = false
}

function setCardChunkRef(index: number, element: unknown) {
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
  if (event.key !== 'Backspace') return
  if (cardChunks.value[index].length > 0) return
  if (index > 0) {
    event.preventDefault()
    cardChunks.value[index - 1] = cardChunks.value[index - 1].slice(0, -1)
    focusChunk(index - 1)
  }
}

function onChunkPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text') ?? ''
  const chunks = fillCardChunksFromInput(pasted)
  if (chunks.join('').length < 1) return
  event.preventDefault()
  cardChunks.value = chunks
  focusChunk(3)
}

const canSave = computed(() => Boolean(selectedMemberId.value) && cardChunks.value.join('').length === 16)

async function saveCard() {
  if (!canSave.value) return
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

function pickMember(memberId: string) {
  selectedMemberId.value = memberId
  memberPickerOpen.value = false
}
</script>

<template>
  <section class="cards-section">
    <div class="cards-section__head">
      <h3 class="cards-section__title">{{ strings.groupCardsTitle }}</h3>
      <span class="cards-section__count num">{{ groupCards.length }}</span>
    </div>

    <div v-if="groupCards.length > 0" class="cards-section__list">
      <article v-for="row in cardRows" :key="row.card.id" class="card-item">
        <span class="card-item__stripe" :style="{ background: row.bankColor }" aria-hidden="true"></span>
        <div class="card-item__head">
          <Avatar :name="memberName(row.card.member_id)" :size="28" tone="brand" />
          <div class="card-item__meta">
            <strong><UsernameHandle :username="memberName(row.card.member_id)" /></strong>
          </div>
          <div class="card-item__icons">
            <button class="card-item__icon-btn" type="button" :title="strings.copyCardNumber" :aria-label="strings.copyCardNumber" @click="copyCardNumber(row.card.card_number)">
              <Icon name="copy" :size="13" />
            </button>
            <button class="card-item__icon-btn" type="button" :title="strings.edit" :aria-label="strings.edit" @click="openEdit(row.card)">
              <Icon name="edit" :size="13" />
            </button>
            <button class="card-item__icon-btn card-item__icon-btn--danger" type="button" :title="strings.delete" :aria-label="strings.delete" @click="removeCard(row.card)">
              <Icon name="trash" :size="13" />
            </button>
          </div>
        </div>
        <div class="card-item__chunks">
          <div v-for="(chunk, i) in row.chunks" :key="`chunk-${row.card.id}-${i}`" class="card-item__chunk">{{ chunk }}</div>
        </div>
      </article>
    </div>

    <EmptyStateCard
      v-else
      :title="strings.noGroupCardsTitle"
      :subtitle="strings.noGroupCardsSubtitle"
      icon="◫"
    />

    <button class="cards-section__add" type="button" @click="openCreate">
      <Icon name="plus" :size="16" />
      {{ strings.addGroupCard }}
    </button>

    <BaseModal v-if="modalOpen" :title="isEditMode ? strings.editGroupCard : strings.addGroupCard" @close="closeModal">
      <div class="card-form">
        <!-- Cardholder picker -->
        <div class="card-form__field">
          <label class="card-form__label">{{ strings.cardholderLabel }}</label>
          <button
            class="card-form__picker"
            type="button"
            :aria-haspopup="'listbox'"
            :aria-expanded="memberPickerOpen"
            @click="memberPickerOpen = !memberPickerOpen"
          >
            <Avatar v-if="selectedMember()" :name="selectedMember()?.username ?? ''" :size="22" tone="brand" />
            <span v-if="selectedMember()" class="card-form__picker-label"><UsernameHandle :username="selectedMember()?.username ?? ''" /></span>
            <span v-else class="card-form__picker-placeholder">{{ strings.cardSelectMemberHint }}</span>
            <Icon name="chevron-down" :size="16" class="card-form__picker-chevron" :class="{ 'is-open': memberPickerOpen }" />
          </button>

          <Transition name="card-picker-fade">
            <ul v-if="memberPickerOpen" class="card-form__picker-list" role="listbox">
              <li v-for="member in activeMembers" :key="member.id">
                <button
                  type="button"
                  class="card-form__picker-option"
                  :class="{ 'is-active': member.id === selectedMemberId }"
                  role="option"
                  :aria-selected="member.id === selectedMemberId"
                  @click="pickMember(member.id)"
                >
                  <Avatar :name="member.username" :size="28" tone="brand" />
                  <span class="card-form__picker-option-meta">
                    <strong><UsernameHandle :username="member.username" /></strong>
                  </span>
                  <span v-if="member.id === selectedMemberId" class="card-form__picker-option-check" aria-hidden="true">
                    <Icon name="check" :size="14" />
                  </span>
                </button>
              </li>
            </ul>
          </Transition>
        </div>

        <!-- Card number chunks -->
        <div class="card-form__field">
          <label class="card-form__label">{{ strings.cardNumberLabel }}</label>
          <div class="card-form__chunks" @paste="onChunkPaste">
            <input
              v-for="(_, index) in cardChunks"
              :key="`card-chunk-${index}`"
              :ref="(element) => setCardChunkRef(index, element)"
              :value="cardChunks[index]"
              class="card-form__chunk"
              type="text"
              inputmode="numeric"
              maxlength="4"
              placeholder="0000"
              @input="updateChunk(index, ($event.target as HTMLInputElement).value)"
              @keydown="onChunkKeydown(index, $event)"
            />
          </div>
        </div>

        <div class="card-form__actions">
          <button class="card-form__btn card-form__btn--primary" type="button" :disabled="!canSave" @click="saveCard">
            {{ isEditMode ? strings.saveGroupCardChanges : strings.saveGroupCard }}
          </button>
          <button class="card-form__btn card-form__btn--ghost" type="button" @click="closeModal">{{ strings.cancel }}</button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>

<style scoped>
.cards-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cards-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}
.cards-section__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
  color: var(--fg);
}
.cards-section__count {
  font-size: 12px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
}

.cards-section__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Card item — Swiply design */
.card-item {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 16px;
  overflow: hidden;
  transition: box-shadow var(--d-fast) var(--ease-standard), transform var(--d-fast) var(--ease-standard);
}
.card-item:hover { box-shadow: var(--shadow-2); }

.card-item__stripe {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  width: 4px;
  height: 100%;
}

.card-item__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-inline-start: 6px;
}

.card-item__meta {
  flex: 1;
  min-width: 0;
}
.card-item__meta strong {
  font-size: 13px;
  font-weight: var(--fw-semibold);
  color: var(--fg);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-item__icons {
  display: flex;
  gap: 4px;
}

.card-item__icon-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: var(--surface-sunk);
  color: var(--fg-muted);
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), color var(--d-fast) var(--ease-standard);
}
.card-item__icon-btn:hover { background: color-mix(in srgb, var(--brand) 14%, transparent); color: var(--brand); }
.card-item__icon-btn svg { width: 13px; height: 13px; }

.card-item__icon-btn--danger { color: var(--neg); }
.card-item__icon-btn--danger:hover { background: var(--neg-soft); color: var(--neg); }

.card-item__chunks {
  display: flex;
  gap: 8px;
  direction: ltr;
}
.card-item__chunk {
  flex: 1;
  padding: 10px 4px;
  background: var(--surface-sunk);
  border: 1px solid var(--divider);
  border-radius: var(--r-sm);
  text-align: center;
  font-family: var(--font-num);
  font-size: 18px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.05em;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  min-height: 40px;
}

/* Add button — full-width primary */
.cards-section__add {
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 var(--s-5);
  background: var(--brand);
  color: var(--brand-on);
  border: 0;
  border-radius: var(--r-md);
  font-weight: var(--fw-semibold);
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
  transition: background var(--d-fast) var(--ease-standard), transform var(--d-instant) var(--ease-standard);
}
.cards-section__add:hover { background: var(--brand-strong); }
.cards-section__add:active { transform: scale(0.985); }

/* Edit modal */
.card-form { display: flex; flex-direction: column; gap: 16px; }

.card-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}
.card-form__label {
  font-size: 11px;
  color: var(--fg-subtle);
  font-weight: var(--fw-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card-form__picker {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  width: 100%;
  text-align: start;
  color: var(--fg);
  font: inherit;
  transition: border-color var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
}
.card-form__picker:hover { border-color: var(--border-strong); }
.card-form__picker:focus-visible {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--ring);
}

.card-form__picker-label {
  flex: 1;
  font-size: 14px;
  font-weight: var(--fw-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-form__picker-placeholder {
  flex: 1;
  font-size: 14px;
  color: var(--fg-subtle);
}
.card-form__picker-chevron {
  width: 16px;
  height: 16px;
  color: var(--fg-subtle);
  transition: transform var(--d-fast) var(--ease-standard);
  flex-shrink: 0;
}
.card-form__picker-chevron.is-open { transform: rotate(180deg); }

.card-form__picker-list {
  position: absolute;
  inset-inline: 0;
  top: 100%;
  margin-top: 6px;
  list-style: none;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-2);
  z-index: 10;
  max-height: 220px;
  overflow-y: auto;
}

.card-form__picker-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: var(--r-sm);
  text-align: start;
  color: var(--fg);
  font: inherit;
  transition: background var(--d-fast) var(--ease-standard);
}
.card-form__picker-option:hover { background: var(--surface-sunk); }
.card-form__picker-option.is-active { background: var(--brand-soft); }
.card-form__picker-option.is-active strong { color: var(--brand); }

.card-form__picker-option-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.card-form__picker-option-meta strong {
  font-size: 13px;
  font-weight: var(--fw-semibold);
  color: var(--fg);
}
.card-form__picker-option-meta span {
  font-size: 11px;
  color: var(--fg-muted);
}

.card-form__picker-option-check {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
}
.card-form__picker-option-check svg { width: 14px; height: 14px; }

.card-form__chunks {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  direction: ltr;
}
.card-form__chunk {
  padding: 10px 4px;
  text-align: center;
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  font-family: var(--font-num);
  font-size: 15px;
  font-weight: var(--fw-semibold);
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
}
.card-form__chunk:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--ring);
}
.card-form__chunk::placeholder { color: var(--fg-subtle); opacity: 0.5; }

.card-form__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.card-form__btn {
  flex: 1;
  min-height: 44px;
  padding: 0 16px;
  border-radius: var(--r-md);
  font-weight: var(--fw-semibold);
  font-size: 14px;
  cursor: pointer;
  border: 0;
  transition: background var(--d-fast) var(--ease-standard), transform var(--d-instant) var(--ease-standard);
}
.card-form__btn:active { transform: scale(0.985); }

.card-form__btn--primary {
  background: var(--brand);
  color: var(--brand-on);
}
.card-form__btn--primary:hover { background: var(--brand-strong); }
.card-form__btn--primary:disabled {
  background: color-mix(in srgb, var(--brand) 35%, transparent);
  cursor: not-allowed;
}

.card-form__btn--ghost {
  background: transparent;
  color: var(--fg-muted);
}
.card-form__btn--ghost:hover { color: var(--fg); background: var(--surface-sunk); }

/* Picker fade transition */
.card-picker-fade-enter-active,
.card-picker-fade-leave-active {
  transition: opacity var(--d-fast) var(--ease-standard), transform var(--d-fast) var(--ease-standard);
}
.card-picker-fade-enter-from,
.card-picker-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 480px) {
  .card-item__chunk { font-size: 16px; padding: 9px 2px; }
  .card-item__head { gap: 8px; }
}
</style>
