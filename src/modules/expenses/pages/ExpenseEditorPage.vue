<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import AmountText from '@/shared/components/AmountText.vue'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { digitsOnly, parseAmountInput, isAmountOverflow } from '@/shared/utils/format'
import { translateMessageKey } from '@/shared/i18n/strings'
import { splitEqually, validateExpenseDraft } from '@/shared/utils/expense'

interface MemberDraftUi {
  memberId: string
  username: string
  includedInSplit: boolean
  payerAmountInput: string
  exactShareInput: string
}

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const expenseId = route.params.expenseId as string | undefined
const isEdit = computed(() => Boolean(expenseId))

const membersStore = useMembersStore()
const expensesStore = useExpensesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: expensesByGroupId } = storeToRefs(expensesStore)

const form = reactive({
  title: '',
  note: '',
  totalAmountInput: '',
  splitType: 'EQUAL' as 'EQUAL' | 'EXACT',
  members: [] as MemberDraftUi[],
})

const errorMessage = ref('')
const isSaving = ref(false)

const members = computed(() => membersByGroupId.value[groupId] ?? [])
const existingExpense = computed(() => (expensesByGroupId.value[groupId] ?? []).find((item) => item.id === expenseId))

function syncDraftMembers() {
  const previousById = new Map(form.members.map((item) => [item.memberId, item]))
  const payers = new Map(existingExpense.value?.payers.map((item) => [item.member_id, item.amount]) ?? [])
  const shares = new Map(existingExpense.value?.shares.map((item) => [item.member_id, item.amount]) ?? [])

  form.members = members.value.map((member) => ({
    memberId: member.id,
    username: member.username,
    includedInSplit: previousById.get(member.id)?.includedInSplit ?? (shares.has(member.id) || !isEdit.value),
    payerAmountInput: previousById.get(member.id)?.payerAmountInput ?? (payers.has(member.id) ? String(payers.get(member.id) ?? '') : ''),
    exactShareInput: previousById.get(member.id)?.exactShareInput ?? (shares.has(member.id) ? String(shares.get(member.id) ?? '') : ''),
  }))
}

watch(members, syncDraftMembers)

onMounted(async () => {
  try {
    await membersStore.load(groupId)
    await expensesStore.load(groupId)

    if (existingExpense.value) {
      form.title = existingExpense.value.title
      form.note = existingExpense.value.note ?? ''
      form.totalAmountInput = String(existingExpense.value.total_amount)
      form.splitType = existingExpense.value.split_type
    }

    syncDraftMembers()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

const equalPreview = computed(() => {
  const total = parseAmountInput(form.totalAmountInput)
  return splitEqually(total, form.members.filter((item) => item.includedInSplit).map((item) => item.memberId))
})

function previewFor(memberId: string) {
  return equalPreview.value.find((item) => item.member_id === memberId)?.amount ?? 0
}

function assignFullAmount(memberId: string) {
  const total = parseAmountInput(form.totalAmountInput)
  form.members.forEach((member) => {
    member.payerAmountInput = member.memberId === memberId && total > 0 ? String(total) : ''
  })
}

function clearPayerAmount(memberId: string) {
  const target = form.members.find((member) => member.memberId === memberId)
  if (target) target.payerAmountInput = ''
}

function toggleMemberIncluded(memberId: string, value: boolean) {
  const target = form.members.find((member) => member.memberId === memberId)
  if (target) target.includedInSplit = value
}

async function submit() {
  errorMessage.value = ''
  if (isAmountOverflow(form.totalAmountInput) || form.members.some((item) => isAmountOverflow(item.payerAmountInput) || isAmountOverflow(item.exactShareInput))) {
    errorMessage.value = strings.value.amountTooLarge
    return
  }

  const totalAmount = parseAmountInput(form.totalAmountInput)
  const payers = form.members
    .map((item) => ({ member_id: item.memberId, amount: parseAmountInput(item.payerAmountInput) }))
    .filter((item) => item.amount > 0)
  const shares = form.members
    .filter((item) => item.includedInSplit)
    .map((item) => ({ member_id: item.memberId, amount: form.splitType === 'EXACT' ? parseAmountInput(item.exactShareInput) : 0 }))

  const validation = validateExpenseDraft({
    title: form.title,
    totalAmount,
    splitType: form.splitType,
    payers,
    shares,
  })

  if (!validation.isValid) {
    errorMessage.value = translateMessageKey(language.value, validation.messageKey) ?? strings.value.genericError
    return
  }

  try {
    isSaving.value = true
    await expensesStore.save({
      existingId: expenseId,
      group_id: groupId,
      title: form.title.trim(),
      note: form.note.trim() || null,
      total_amount: totalAmount,
      split_type: form.splitType,
      payers,
      shares: validation.normalizedShares,
    })
    snackbarStore.push(translateMessageKey(language.value, 'EXPENSE_SAVED') ?? strings.value.saveExpense)
    router.back()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : strings.value.genericError
  } finally {
    isSaving.value = false
  }
}

async function removeExpense() {
  const expense = existingExpense.value
  if (!expense || !window.confirm(strings.value.confirmDelete)) return
  try {
    await expensesStore.remove(expense)
    router.back()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}
</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="isEdit ? strings.editExpenseTitle : strings.addExpenseTitle" can-go-back @back="router.back()">
      <template #actions>
        <button v-if="isEdit" class="icon-button" type="button" @click="removeExpense">🗑</button>
      </template>
    </PageTopBar>

    <HeroCard :title="strings.expenseHeroTitle" :subtitle="strings.expenseHeroSubtitle" icon="◧" />

    <div class="surface-card editor-card page-stack">
      <Transition name="feature-transition">
        <InlineAlert v-if="errorMessage" :title="strings.formErrorTitle" :message="errorMessage" />
      </Transition>

      <div class="page-stack">
        <div class="form-field">
          <label class="form-field__label">{{ strings.expenseTitleLabel }}</label>
          <input v-model="form.title" class="text-input" type="text" />
        </div>
        <div class="form-field">
          <label class="form-field__label">{{ strings.expenseNoteLabel }}</label>
          <textarea v-model="form.note" class="text-area" />
        </div>
        <div class="form-field">
          <label class="form-field__label">{{ strings.totalAmountLabel }}</label>
          <input
            :value="form.totalAmountInput"
            class="text-input"
            inputmode="numeric"
            @input="form.totalAmountInput = digitsOnly(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="chip-row">
          <button class="pill-button" :class="{ 'is-selected': form.splitType === 'EQUAL' }" type="button" @click="form.splitType = 'EQUAL'">
            {{ strings.equalSplitLabel }}
          </button>
          <button class="pill-button" :class="{ 'is-selected': form.splitType === 'EXACT' }" type="button" @click="form.splitType = 'EXACT'">
            {{ strings.exactSplitLabel }}
          </button>
        </div>
        <SectionHeader :title="strings.membersAndPayersTitle" />
        <TransitionGroup name="feature-transition" tag="div" class="list-stack">
        <article v-for="member in form.members" :key="member.memberId" class="member-editor-card">
          <div class="page-stack" style="gap: 12px;">
            <div class="member-editor-card__header">
              <strong>@{{ member.username }}</strong>
              <label class="switch-button" :class="{ 'is-on': member.includedInSplit }">
                <input
                  :checked="member.includedInSplit"
                  class="switch-button__input"
                  type="checkbox"
                  @change="toggleMemberIncluded(member.memberId, ($event.target as HTMLInputElement).checked)"
                />
              </label>
            </div>
            <div class="quick-inline-actions">
              <button class="pill-button" type="button" @click="assignFullAmount(member.memberId)">
                {{ strings.payFullAmountAction }}
              </button>
              <button v-if="member.payerAmountInput" class="outline-button" type="button" @click="clearPayerAmount(member.memberId)">
                {{ strings.clearAmountAction }}
              </button>
            </div>
            <div class="form-field">
              <label class="form-field__label">{{ strings.paidHowMuchLabel }}</label>
              <input
                :value="member.payerAmountInput"
                class="text-input"
                inputmode="numeric"
                @input="member.payerAmountInput = digitsOnly(($event.target as HTMLInputElement).value)"
              />
            </div>
            <Transition name="feature-transition">
              <div v-if="member.includedInSplit" class="form-field">
                <label class="form-field__label">{{ form.splitType === 'EXACT' ? strings.shareAmountLabel : strings.equalShareLabel }}</label>
                <template v-if="form.splitType === 'EXACT'">
                  <input
                    :value="member.exactShareInput"
                    class="text-input"
                    inputmode="numeric"
                    @input="member.exactShareInput = digitsOnly(($event.target as HTMLInputElement).value)"
                  />
                </template>
                <div v-else class="detail-line detail-line--start">
                  <AmountText :amount="previewFor(member.memberId)" :language="language" tone="primary" />
                </div>
              </div>
            </Transition>
          </div>
        </article>
        </TransitionGroup>
        <button class="filled-button" type="button" :disabled="isSaving" @click="submit">
          <span v-if="isSaving" class="button-loader" aria-hidden="true"></span>
          {{ isEdit ? strings.saveExpenseChanges : strings.saveExpense }}
        </button>
      </div>
    </div>
  </div>
</template>
