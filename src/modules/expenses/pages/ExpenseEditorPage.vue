<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import CalculatorAmountInput from '@/shared/components/CalculatorAmountInput.vue'
import AmountText from '@/shared/components/AmountText.vue'
import { useMembersStore } from '@/modules/members/store'
import { useExpensesStore } from '@/modules/expenses/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { formatAmount, isAmountOverflow, parseAmountInput } from '@/shared/utils/format'
import { translateMessageKey } from '@/shared/i18n/strings'
import { resolveAppErrorMessage } from '@/shared/utils/apiErrors'
import { validateExpenseDraft } from '@/shared/utils/expense'
import {
  computeExpenseEditorState,
  type ExpenseEditorMemberDraft,
  type ServiceChargeDraftUi,
} from '@/modules/expenses/expenseEditor'

interface EnrichedMemberDraft extends ExpenseEditorMemberDraft {
  suggestedRemainingPayer: number | null
  suggestedRemainingShare: number | null
  equalRemainingShare: number | null
  baseSharePreview: number
  taxSharePreview: number
  serviceChargeSharePreview: number
  finalSharePreview: number
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
  splitType: 'EXACT' as 'EQUAL' | 'EXACT',
  taxEnabled: false,
  taxPercentInput: '',
  serviceCharges: [] as ServiceChargeDraftUi[],
  members: [] as ExpenseEditorMemberDraft[],
})

const errorMessage = ref('')
const isSaving = ref(false)
const summaryDetailsExpanded = ref(false)
const expandedMemberIds = ref<string[]>([])

const members = computed(() => membersByGroupId.value[groupId] ?? [])
const existingExpense = computed(() => (expensesByGroupId.value[groupId] ?? []).find((item) => item.id === expenseId))
const canCreateTransactions = computed(() => members.value.length >= 2 || isEdit.value)

const pageText = computed(() => {
  if (language.value === 'fa') {
    return {
      completeExpenseForm: 'فرم خرج را کامل کن',
      taxSetupEyebrow: 'پیکربندی مالیات',
      selectiveCostsEyebrow: 'هزینه‌های انتخابی',
      splitModeEyebrow: 'نحوه تقسیم',
      liveSnapshotEyebrow: 'خلاصه زنده',
      memberCardHint: 'پرداخت و سهم این عضو',
      serviceChargeEmptyTitle: 'سرویس اضافه‌ای ثبت نشده',
      serviceChargeCardHint: 'عنوان، مبلغ و اعضای مشمول را مشخص کن.',
      splitModeTitle: 'روش تقسیم مبلغ پایه',
      summaryReady: 'آماده',
      summaryNeedsInput: 'نیاز به تکمیل',
      taxToggleTitle: 'مالیات را از مبلغ کل جدا کن',
      taxToggleSubtitle: 'در صورت روشن بودن، مبلغ پایه و مالیات به‌صورت خودکار محاسبه می‌شود.',
      taxPercentLabel: 'درصد مالیات',
      taxBreakdownTitle: 'تفکیک مالیات',
      baseAmountLabel: 'مبلغ پایه',
      taxAmountLabel: 'مبلغ مالیات',
      serviceChargesTitle: 'سرویس‌های اضافه',
      serviceChargesSubtitle: 'مثل حق سرویس، ورودی یا هزینه‌ای که فقط بین بعضی اعضا تقسیم می‌شود.',
      addServiceChargeLabel: 'افزودن سرویس',
      serviceChargeNameLabel: 'عنوان سرویس',
      serviceChargeAmountLabel: 'مبلغ سرویس',
      serviceChargeMembersLabel: 'اعضای مشمول',
      serviceChargeHint: 'برای معتبر شدن، مبلغ و حداقل یک عضو را انتخاب کن.',
      serviceChargePreview: (count: number, amount: string) => `${count} نفر انتخاب شده‌اند، سهم هر نفر ${amount} است.`,
      serviceChargeItemTitle: (index: number) => `سرویس اضافه ${index}`,
      expenseSummaryTitle: 'جمع‌بندی زنده خرج',
      enteredPayersTitle: 'جمع پرداخت‌ها',
      remainingPayersTitle: 'باقی‌مانده پرداخت',
      enteredSharesTitle: 'جمع سهم پایه',
      remainingSharesTitle: 'باقی‌مانده سهم پایه',
      serviceChargesTotalLabel: 'جمع سرویس‌ها',
      finalSharesTitle: 'جمع سهم نهایی',
      baseShareLabel: 'سهم پایه',
      taxShareLabel: 'سهم مالیات',
      serviceChargeShareLabel: 'سهم سرویس',
      finalShareLabel: 'سهم نهایی',
      paidHowMuchHint: 'جمع پرداخت‌ها باید با مبلغ کل برابر شود.',
      payerRemainingHint: (amount: string) => `${amount} دیگر برای پرداخت باقی مانده است.`,
      payerOverflowMessage: (amount: string) => `${amount} بیشتر از مبلغ کل وارد شده است.`,
      shareAmountHint: 'جمع سهم‌های پایه باید با مبلغ پایه برابر شود.',
      shareRemainingHint: (amount: string) => `${amount} دیگر برای سهم پایه باقی مانده است.`,
      shareOverflowMessage: (amount: string) => `${amount} بیشتر از مبلغ پایه وارد شده است.`,
      applyRemainingPayer: (amount: string) => `قرار دادن ${amount}`,
      applyRemainingShare: (amount: string) => `قرار دادن ${amount}`,
      applyEqualRemainingShare: (amount: string) => `تقسیم برابر ${amount}`,
      clearAmountLabel: 'پاک کردن مبلغ',
      invalidTaxPercent: 'درصد مالیات باید بین ۰ تا ۱۰۰ باشد.',
      invalidServiceCharge: 'برای هر سرویس، مبلغ و حداقل یک عضو را انتخاب کن.',
    }
  }

  return {
    completeExpenseForm: 'Complete the expense form',
    taxSetupEyebrow: 'Tax setup',
    selectiveCostsEyebrow: 'Selective costs',
    splitModeEyebrow: 'Split mode',
    liveSnapshotEyebrow: 'Live snapshot',
    memberCardHint: 'Payer and share details',
    serviceChargeEmptyTitle: 'No service charge added yet',
    serviceChargeCardHint: 'Set the title, amount, and applicable members.',
    splitModeTitle: 'How the base amount should split',
    summaryReady: 'Ready',
    summaryNeedsInput: 'Needs input',
    taxToggleTitle: 'Extract tax from the total amount',
    taxToggleSubtitle: 'When enabled, the base amount and tax are calculated automatically.',
    taxPercentLabel: 'Tax percentage',
    taxBreakdownTitle: 'Tax breakdown',
    baseAmountLabel: 'Base amount',
    taxAmountLabel: 'Tax amount',
    serviceChargesTitle: 'Extra service charges',
    serviceChargesSubtitle: 'Use this for service fees, entry fees, or costs shared by selected members only.',
    addServiceChargeLabel: 'Add service',
    serviceChargeNameLabel: 'Service name',
    serviceChargeAmountLabel: 'Service amount',
    serviceChargeMembersLabel: 'Applicable members',
    serviceChargeHint: 'Pick an amount and at least one member to make this valid.',
    serviceChargePreview: (count: number, amount: string) => `${count} members selected, ${amount} per member.`,
    serviceChargeItemTitle: (index: number) => `Service charge ${index}`,
    expenseSummaryTitle: 'Live expense summary',
    enteredPayersTitle: 'Entered payer total',
    remainingPayersTitle: 'Remaining payer amount',
    enteredSharesTitle: 'Entered base shares',
    remainingSharesTitle: 'Remaining base shares',
    serviceChargesTotalLabel: 'Service charges total',
    finalSharesTitle: 'Final shares total',
    baseShareLabel: 'Base share',
    taxShareLabel: 'Tax share',
    serviceChargeShareLabel: 'Service charge share',
    finalShareLabel: 'Final share',
    paidHowMuchHint: 'Payer totals must match the total amount.',
    payerRemainingHint: (amount: string) => `${amount} is still left to assign to payers.`,
    payerOverflowMessage: (amount: string) => `${amount} exceeds the total amount.`,
    shareAmountHint: 'Base shares must match the base amount.',
    shareRemainingHint: (amount: string) => `${amount} is still left to assign as base share.`,
    shareOverflowMessage: (amount: string) => `${amount} exceeds the base amount.`,
    applyRemainingPayer: (amount: string) => `Apply ${amount}`,
    applyRemainingShare: (amount: string) => `Apply ${amount}`,
    applyEqualRemainingShare: (amount: string) => `Equal split ${amount}`,
    clearAmountLabel: 'Clear amount',
    invalidTaxPercent: 'Tax percentage must be between 0 and 100.',
    invalidServiceCharge: 'Each service charge needs an amount and at least one member.',
  }
})

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

const computedState = computed(() =>
  computeExpenseEditorState({
    totalAmount: parseAmountInput(form.totalAmountInput),
    splitType: form.splitType,
    members: form.members,
    taxEnabled: form.taxEnabled,
    taxPercentInput: form.taxPercentInput,
    serviceCharges: form.serviceCharges,
  }),
)

const enrichedMembers = computed<EnrichedMemberDraft[]>(() => {
  const state = computedState.value
  const totalAmount = parseAmountInput(form.totalAmountInput)
  const blankShareMembers = form.members
    .filter((member) => member.includedInSplit && member.exactShareInput === '')
    .sort((a, b) => a.memberId.localeCompare(b.memberId))

  return form.members.map((member) => {
    const payerWithoutCurrent = state.payerTotal - parseAmountInput(member.payerAmountInput)
    const remainingPayer = totalAmount - payerWithoutCurrent
    const baseShareTarget = state.baseAmountPreview
    const baseShareWithoutCurrent = form.members
      .filter((item) => item.includedInSplit && item.memberId !== member.memberId)
      .reduce((sum, item) => sum + parseAmountInput(item.exactShareInput), 0)
    const remainingBaseShare = baseShareTarget - baseShareWithoutCurrent
    const equalRemainingShare =
      form.splitType === 'EXACT' &&
      member.includedInSplit &&
      member.exactShareInput === '' &&
      state.remainingBaseShareAmount > 0 &&
      blankShareMembers.length > 0
        ? Math.floor(state.remainingBaseShareAmount / blankShareMembers.length) +
          (blankShareMembers.findIndex((item) => item.memberId === member.memberId) < state.remainingBaseShareAmount % blankShareMembers.length
            ? 1
            : 0)
        : null
    const breakdown = state.memberBreakdowns[member.memberId] ?? {
      baseShare: 0,
      taxShare: 0,
      serviceChargeShare: 0,
      finalShare: 0,
    }

    return {
      ...member,
      suggestedRemainingPayer: totalAmount > 0 && remainingPayer > 0 ? remainingPayer : null,
      suggestedRemainingShare:
        form.splitType === 'EXACT' && member.includedInSplit && baseShareTarget > 0 && remainingBaseShare > 0 ? remainingBaseShare : null,
      equalRemainingShare,
      baseSharePreview: breakdown.baseShare,
      taxSharePreview: breakdown.taxShare,
      serviceChargeSharePreview: breakdown.serviceChargeShare,
      finalSharePreview: breakdown.finalShare,
    }
  })
})

const canSubmit = computed(() => {
  const state = computedState.value
  return (
    canCreateTransactions.value &&
    state.remainingPayerAmount === 0 &&
    !state.isPayerOverflow &&
    state.remainingBaseShareAmount === 0 &&
    !state.isBaseShareOverflow &&
    !state.hasInvalidServiceCharges &&
    !state.hasInvalidTaxPercent &&
    state.finalShareTotal === parseAmountInput(form.totalAmountInput)
  )
})

const summaryAlert = computed(() => {
  const state = computedState.value
  if (state.hasInvalidTaxPercent) return pageText.value.invalidTaxPercent
  if (state.hasInvalidServiceCharges) return pageText.value.invalidServiceCharge
  if (state.isPayerOverflow) return pageText.value.payerOverflowMessage(formatAmount(-state.remainingPayerAmount, language.value))
  if (state.isBaseShareOverflow) return pageText.value.shareOverflowMessage(formatAmount(-state.remainingBaseShareAmount, language.value))
  return ''
})

function isMemberExpanded(memberId: string) {
  return expandedMemberIds.value.includes(memberId)
}

function toggleMemberExpanded(memberId: string) {
  expandedMemberIds.value = isMemberExpanded(memberId)
    ? expandedMemberIds.value.filter((item) => item !== memberId)
    : [...expandedMemberIds.value, memberId]
}

function updateMember(memberId: string, patch: Partial<ExpenseEditorMemberDraft>) {
  form.members = form.members.map((member) => (member.memberId === memberId ? { ...member, ...patch } : member))
}

function assignFullAmount(memberId: string) {
  const total = form.totalAmountInput
  if (!total || parseAmountInput(total) <= 0) {
    errorMessage.value = translateMessageKey(language.value, 'EXPENSE_TOTAL_POSITIVE') ?? strings.value.genericError
    return
  }
  form.members = form.members.map((member) => ({
    ...member,
    payerAmountInput: member.memberId === memberId ? total : '',
  }))
  errorMessage.value = ''
}

function addServiceCharge() {
  form.serviceCharges.push({
    id: crypto.randomUUID(),
    title: '',
    amountInput: '',
    selectedMemberIds: [],
  })
}

function removeServiceCharge(id: string) {
  form.serviceCharges = form.serviceCharges.filter((charge) => charge.id !== id)
}

function updateServiceCharge(id: string, patch: Partial<ServiceChargeDraftUi>) {
  form.serviceCharges = form.serviceCharges.map((charge) => (charge.id === id ? { ...charge, ...patch } : charge))
}

function toggleServiceChargeMember(id: string, memberId: string) {
  form.serviceCharges = form.serviceCharges.map((charge) => {
    if (charge.id !== id) return charge
    return {
      ...charge,
      selectedMemberIds: charge.selectedMemberIds.includes(memberId)
        ? charge.selectedMemberIds.filter((item) => item !== memberId)
        : [...charge.selectedMemberIds, memberId],
    }
  })
}

function applySuggestedPayer(memberId: string) {
  const member = enrichedMembers.value.find((item) => item.memberId === memberId)
  if (member?.suggestedRemainingPayer) updateMember(memberId, { payerAmountInput: String(member.suggestedRemainingPayer) })
}

function applySuggestedShare(memberId: string) {
  const member = enrichedMembers.value.find((item) => item.memberId === memberId)
  if (member?.suggestedRemainingShare) updateMember(memberId, { exactShareInput: String(member.suggestedRemainingShare) })
}

function applyEqualRemainingShare(memberId: string) {
  const member = enrichedMembers.value.find((item) => item.memberId === memberId)
  if (member?.equalRemainingShare) updateMember(memberId, { exactShareInput: String(member.equalRemainingShare) })
}

async function submit() {
  errorMessage.value = ''
  if (!canCreateTransactions.value) {
    errorMessage.value = strings.value.needSecondMemberMessage
    return
  }

  const amountInputs = [
    form.totalAmountInput,
    form.taxEnabled ? form.taxPercentInput : '',
    ...form.serviceCharges.map((charge) => charge.amountInput),
    ...form.members.flatMap((member) => [member.payerAmountInput, form.splitType === 'EXACT' ? member.exactShareInput : '']),
  ]
  if (amountInputs.some((input) => input && isAmountOverflow(input))) {
    errorMessage.value = strings.value.amountTooLarge
    return
  }
  if (computedState.value.hasInvalidTaxPercent) {
    errorMessage.value = pageText.value.invalidTaxPercent
    return
  }
  if (computedState.value.hasInvalidServiceCharges) {
    errorMessage.value = pageText.value.invalidServiceCharge
    return
  }

  const totalAmount = parseAmountInput(form.totalAmountInput)
  const payers = form.members
    .map((member) => ({ member_id: member.memberId, amount: parseAmountInput(member.payerAmountInput) }))
    .filter((item) => item.amount > 0)
  const normalizedMembers = enrichedMembers.value
    .filter((member) => member.includedInSplit)
    .map((member) => ({ member_id: member.memberId, amount: member.finalSharePreview }))
    .filter((item) => item.amount > 0)

  const persistedSplitType = form.taxEnabled || form.serviceCharges.length > 0 ? 'EXACT' : form.splitType
  const validation = validateExpenseDraft({
    title: form.title,
    totalAmount,
    splitType: persistedSplitType,
    payers,
    shares: normalizedMembers,
  })

  if (!validation.isValid) {
    errorMessage.value = translateMessageKey(language.value, validation.messageKey) ?? strings.value.genericError
    return
  }
  if (computedState.value.remainingPayerAmount !== 0 || computedState.value.isPayerOverflow) {
    errorMessage.value = translateMessageKey(language.value, 'EXPENSE_PAYER_TOTAL_MISMATCH') ?? strings.value.genericError
    return
  }
  if (computedState.value.remainingBaseShareAmount !== 0 || computedState.value.isBaseShareOverflow) {
    errorMessage.value = translateMessageKey(language.value, 'EXPENSE_SHARE_TOTAL_MISMATCH') ?? strings.value.genericError
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
      split_type: persistedSplitType,
      payers,
      shares: validation.normalizedShares,
    })
    snackbarStore.push(translateMessageKey(language.value, 'EXPENSE_SAVED') ?? strings.value.saveExpense)
    router.back()
  } catch (error) {
    errorMessage.value = resolveAppErrorMessage(error, strings.value, language.value)
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

function helperText(member: EnrichedMemberDraft) {
  if (computedState.value.isPayerOverflow) {
    return {
      text: pageText.value.payerOverflowMessage(formatAmount(-computedState.value.remainingPayerAmount, language.value)),
      tone: 'error' as const,
    }
  }
  if (member.suggestedRemainingPayer) {
    return {
      text: pageText.value.payerRemainingHint(formatAmount(member.suggestedRemainingPayer, language.value)),
      tone: 'info' as const,
    }
  }
  return {
    text: pageText.value.paidHowMuchHint,
    tone: 'info' as const,
  }
}

function shareHelperText(member: EnrichedMemberDraft) {
  if (computedState.value.isBaseShareOverflow) {
    return {
      text: pageText.value.shareOverflowMessage(formatAmount(-computedState.value.remainingBaseShareAmount, language.value)),
      tone: 'error' as const,
    }
  }
  if (member.suggestedRemainingShare) {
    return {
      text: pageText.value.shareRemainingHint(formatAmount(member.suggestedRemainingShare, language.value)),
      tone: 'info' as const,
    }
  }
  return {
    text: pageText.value.shareAmountHint,
    tone: 'info' as const,
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
      <InlineAlert v-if="!canCreateTransactions" :title="strings.membersAction" :message="strings.needSecondMemberMessage" tone="info" />

      <div class="page-stack">
        <div class="form-field">
          <label class="form-field__label">{{ strings.expenseTitleLabel }}</label>
          <input v-model="form.title" class="text-input" type="text" />
        </div>

        <div class="form-field">
          <label class="form-field__label">{{ strings.expenseNoteLabel }}</label>
          <textarea v-model="form.note" class="text-area" />
        </div>

        <CalculatorAmountInput v-model="form.totalAmountInput" :label="strings.totalAmountLabel" />

        <section class="editor-section page-stack">
          <div class="tax-toggle-row">
            <div class="page-stack tax-toggle-row__copy">
              <span class="editor-section__eyebrow">{{ pageText.taxSetupEyebrow }}</span>
              <div class="page-stack" style="gap: 4px;">
                <strong>{{ pageText.taxToggleTitle }}</strong>
                <span class="muted">{{ pageText.taxToggleSubtitle }}</span>
              </div>
            </div>
            <label class="switch-button" :class="{ 'is-on': form.taxEnabled }">
              <input v-model="form.taxEnabled" class="switch-button__input" type="checkbox" />
            </label>
          </div>

          <Transition name="feature-transition">
            <div v-if="form.taxEnabled" class="page-stack">
              <CalculatorAmountInput v-model="form.taxPercentInput" :label="pageText.taxPercentLabel" mode="percent" />
              <div class="surface-card tax-breakdown-card">
                <div class="tax-breakdown-card__header">
                  <div class="tax-breakdown-card__copy">
                    <strong>{{ pageText.taxBreakdownTitle }}</strong>
                    <span class="muted">{{ language === 'fa' ? 'نمایش پایه، مالیات و جمع کل' : 'Preview of base, tax, and final total' }}</span>
                  </div>
                  <span class="tax-breakdown-card__icon">%</span>
                </div>
                <div class="tax-breakdown-card__rows">
                  <div class="tax-breakdown-row tax-breakdown-row--base">
                    <span>{{ pageText.baseAmountLabel }}</span>
                    <AmountText :amount="computedState.baseAmountPreview" :language="language" size="md" />
                  </div>
                  <div class="tax-breakdown-row tax-breakdown-row--tax">
                    <span>{{ pageText.taxAmountLabel }}</span>
                    <AmountText :amount="computedState.taxAmountPreview" :language="language" size="md" />
                  </div>
                  <div class="tax-breakdown-row tax-breakdown-row--strong">
                    <span>{{ strings.totalAmountStat }}</span>
                    <AmountText :amount="computedState.baseAmountPreview + computedState.taxAmountPreview" :language="language" size="md" tone="primary" />
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <section class="editor-section page-stack">
          <div class="service-charge-header">
            <div class="page-stack service-charge-header__copy">
              <span class="editor-section__eyebrow">{{ pageText.selectiveCostsEyebrow }}</span>
              <div class="page-stack" style="gap: 4px;">
                <strong>{{ pageText.serviceChargesTitle }}</strong>
                <span class="muted">{{ pageText.serviceChargesSubtitle }}</span>
              </div>
            </div>
            <button class="outline-button service-charge-header__action" type="button" @click="addServiceCharge">
              {{ pageText.addServiceChargeLabel }}
            </button>
          </div>

          <div v-for="(charge, index) in form.serviceCharges" :key="charge.id" class="surface-card service-charge-card page-stack">
            <div class="service-charge-card__header">
              <div class="page-stack" style="gap: 4px;">
                <strong>{{ pageText.serviceChargeItemTitle(index + 1) }}</strong>
                <span class="muted">{{ pageText.serviceChargeCardHint }}</span>
              </div>
              <button class="icon-button" type="button" @click="removeServiceCharge(charge.id)">🗑</button>
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ pageText.serviceChargeNameLabel }}</label>
              <input :value="charge.title" class="text-input" type="text" @input="updateServiceCharge(charge.id, { title: ($event.target as HTMLInputElement).value })" />
            </div>

            <CalculatorAmountInput
              :model-value="charge.amountInput"
              :label="pageText.serviceChargeAmountLabel"
              @update:model-value="updateServiceCharge(charge.id, { amountInput: $event })"
            />

            <div class="page-stack service-charge-members">
              <span class="form-field__label">{{ pageText.serviceChargeMembersLabel }}</span>
              <div class="chip-row">
                <button
                  v-for="member in enrichedMembers.filter((item) => item.includedInSplit)"
                  :key="`${charge.id}-${member.memberId}`"
                  class="pill-button"
                  :class="{ 'is-selected': charge.selectedMemberIds.includes(member.memberId) }"
                  type="button"
                  @click="toggleServiceChargeMember(charge.id, member.memberId)"
                >
                  @{{ member.username }}
                </button>
              </div>
              <div
                class="service-charge-preview"
                :class="{ 'service-charge-preview--error': charge.amountInput && charge.selectedMemberIds.length === 0 }"
              >
                {{
                  charge.selectedMemberIds.length > 0 && parseAmountInput(charge.amountInput) > 0
                    ? pageText.serviceChargePreview(
                        charge.selectedMemberIds.length,
                        formatAmount(
                          Math.floor(parseAmountInput(charge.amountInput) / charge.selectedMemberIds.length) +
                            (parseAmountInput(charge.amountInput) % charge.selectedMemberIds.length > 0 ? 1 : 0),
                          language,
                        ),
                      )
                    : pageText.serviceChargeHint
                }}
              </div>
            </div>
          </div>

          <div v-if="form.serviceCharges.length === 0" class="service-charge-empty">
            <strong>{{ pageText.serviceChargeEmptyTitle }}</strong>
            <span class="muted">{{ pageText.serviceChargesSubtitle }}</span>
          </div>
        </section>

        <section class="editor-section page-stack">
          <div class="split-type-panel">
            <div class="page-stack" style="gap: 4px;">
              <span class="editor-section__eyebrow">{{ pageText.splitModeEyebrow }}</span>
              <strong>{{ pageText.splitModeTitle }}</strong>
            </div>
            <div class="chip-row">
              <button class="pill-button" :class="{ 'is-selected': form.splitType === 'EQUAL' }" type="button" @click="form.splitType = 'EQUAL'">
                {{ strings.equalSplitLabel }}
              </button>
              <button class="pill-button" :class="{ 'is-selected': form.splitType === 'EXACT' }" type="button" @click="form.splitType = 'EXACT'">
                {{ strings.exactSplitLabel }}
              </button>
            </div>
          </div>
        </section>

        <SectionHeader :title="strings.membersAndPayersTitle" />

        <div class="surface-card expense-summary-card page-stack">
          <div class="expense-summary-card__header">
            <div class="page-stack" style="gap: 4px;">
              <span class="editor-section__eyebrow">{{ pageText.liveSnapshotEyebrow }}</span>
              <strong>{{ pageText.expenseSummaryTitle }}</strong>
            </div>
            <div class="expense-summary-card__header-actions">
              <span class="expense-summary-card__badge" :class="{ 'expense-summary-card__badge--warning': Boolean(summaryAlert) }">
                {{ summaryAlert ? pageText.summaryNeedsInput : pageText.summaryReady }}
              </span>
              <button class="outline-button expense-summary-card__toggle" type="button" @click="summaryDetailsExpanded = !summaryDetailsExpanded">
                {{ summaryDetailsExpanded ? (language === 'fa' ? 'بستن جزئیات' : 'Hide details') : (language === 'fa' ? 'جزئیات' : 'Details') }}
              </button>
            </div>
          </div>

          <div class="expense-summary-card__grid">
            <div class="expense-summary-tile">
              <span class="muted">{{ strings.totalAmountStat }}</span>
              <AmountText :amount="parseAmountInput(form.totalAmountInput)" :language="language" size="md" />
            </div>
            <div class="expense-summary-tile">
              <span class="muted">{{ pageText.enteredPayersTitle }}</span>
              <AmountText :amount="computedState.payerTotal" :language="language" size="md" />
            </div>
            <div class="expense-summary-tile expense-summary-tile--accent">
              <span class="muted">{{ pageText.remainingPayersTitle }}</span>
              <AmountText :amount="Math.max(computedState.remainingPayerAmount, 0)" :language="language" size="md" tone="primary" />
            </div>
            <div class="expense-summary-tile expense-summary-tile--strong">
              <span class="muted">{{ pageText.finalSharesTitle }}</span>
              <AmountText :amount="computedState.finalShareTotal" :language="language" size="md" tone="primary" />
            </div>
          </div>

          <Transition name="feature-transition">
            <div v-if="summaryDetailsExpanded" class="expense-summary-card__details">
              <div class="expense-summary-tile">
                <span class="muted">{{ pageText.enteredPayersTitle }}</span>
                <AmountText :amount="computedState.payerTotal" :language="language" size="md" />
              </div>
              <div class="expense-summary-tile">
                <span class="muted">{{ pageText.enteredSharesTitle }}</span>
                <AmountText :amount="computedState.baseShareTotal" :language="language" size="md" />
              </div>
              <div class="expense-summary-tile expense-summary-tile--accent">
                <span class="muted">{{ pageText.remainingSharesTitle }}</span>
                <AmountText :amount="Math.max(computedState.remainingBaseShareAmount, 0)" :language="language" size="md" tone="primary" />
              </div>
              <div class="expense-summary-tile">
                <span class="muted">{{ pageText.taxAmountLabel }}</span>
                <AmountText :amount="computedState.taxAmountPreview" :language="language" size="md" />
              </div>
              <div class="expense-summary-tile">
                <span class="muted">{{ pageText.serviceChargesTotalLabel }}</span>
                <AmountText :amount="computedState.serviceChargeTotalPreview" :language="language" size="md" />
              </div>
            </div>
          </Transition>

          <div v-if="summaryAlert" class="expense-summary-card__alert">{{ summaryAlert }}</div>
        </div>

        <TransitionGroup name="feature-transition" tag="div" class="list-stack">
          <article
            v-for="member in enrichedMembers"
            :key="member.memberId"
            class="member-editor-card"
            :class="{ 'member-editor-card--collapsed': !member.includedInSplit }"
          >
            <div class="page-stack member-editor-card__content">
              <div class="member-editor-card__header">
                <div class="page-stack" style="gap: 4px;">
                  <strong>@{{ member.username }}</strong>
                  <span class="muted">{{ pageText.memberCardHint }}</span>
                </div>
                <label class="switch-button" :class="{ 'is-on': member.includedInSplit }">
                  <input
                    :checked="member.includedInSplit"
                    class="switch-button__input"
                    type="checkbox"
                    @change="updateMember(member.memberId, { includedInSplit: ($event.target as HTMLInputElement).checked })"
                  />
                </label>
              </div>

              <Transition name="feature-transition">
                <div v-if="member.includedInSplit" class="page-stack member-editor-card__body">
                  <div class="quick-inline-actions">
                    <button class="pill-button" type="button" @click="assignFullAmount(member.memberId)">
                      {{ strings.payFullAmountAction }}
                    </button>
                    <button v-if="member.payerAmountInput" class="outline-button" type="button" @click="updateMember(member.memberId, { payerAmountInput: '' })">
                      {{ pageText.clearAmountLabel }}
                    </button>
                  </div>

                  <CalculatorAmountInput
                    :model-value="member.payerAmountInput"
                    :label="strings.paidHowMuchLabel"
                    @update:model-value="updateMember(member.memberId, { payerAmountInput: $event })"
                  />
                  <span class="muted" :class="{ 'text-danger': helperText(member).tone === 'error' }">{{ helperText(member).text }}</span>
                  <div v-if="member.suggestedRemainingPayer" class="helper-action-row">
                    <button class="pill-button" type="button" @click="applySuggestedPayer(member.memberId)">
                      {{ pageText.applyRemainingPayer(formatAmount(member.suggestedRemainingPayer, language)) }}
                    </button>
                  </div>

                  <template v-if="form.splitType === 'EXACT'">
                    <CalculatorAmountInput
                      :model-value="member.exactShareInput"
                      :label="pageText.baseShareLabel"
                      @update:model-value="updateMember(member.memberId, { exactShareInput: $event })"
                    />
                    <span class="muted" :class="{ 'text-danger': shareHelperText(member).tone === 'error' }">{{ shareHelperText(member).text }}</span>
                    <div class="quick-inline-actions">
                      <button v-if="member.suggestedRemainingShare" class="pill-button" type="button" @click="applySuggestedShare(member.memberId)">
                        {{ pageText.applyRemainingShare(formatAmount(member.suggestedRemainingShare, language)) }}
                      </button>
                      <button v-if="member.equalRemainingShare" class="pill-button" type="button" @click="applyEqualRemainingShare(member.memberId)">
                        {{ pageText.applyEqualRemainingShare(formatAmount(member.equalRemainingShare, language)) }}
                      </button>
                    </div>
                  </template>

                  <div class="member-breakdown-grid">
                    <div class="member-breakdown-tile member-breakdown-tile--strong">
                      <span class="muted">{{ pageText.finalShareLabel }}</span>
                      <AmountText :amount="member.finalSharePreview" :language="language" size="md" tone="primary" />
                    </div>
                    <button class="outline-button member-breakdown-toggle" type="button" @click="toggleMemberExpanded(member.memberId)">
                      {{ isMemberExpanded(member.memberId) ? (language === 'fa' ? 'بستن جزئیات' : 'Hide details') : (language === 'fa' ? 'جزئیات' : 'Details') }}
                    </button>
                  </div>

                  <Transition name="feature-transition">
                    <div v-if="isMemberExpanded(member.memberId)" class="member-breakdown-grid member-breakdown-grid--details">
                      <div class="member-breakdown-tile">
                        <span class="muted">{{ pageText.baseShareLabel }}</span>
                        <AmountText :amount="member.baseSharePreview" :language="language" size="md" />
                      </div>
                      <div class="member-breakdown-tile">
                        <span class="muted">{{ pageText.taxShareLabel }}</span>
                        <AmountText :amount="member.taxSharePreview" :language="language" size="md" />
                      </div>
                      <div class="member-breakdown-tile">
                        <span class="muted">{{ pageText.serviceChargeShareLabel }}</span>
                        <AmountText :amount="member.serviceChargeSharePreview" :language="language" size="md" />
                      </div>
                    </div>
                  </Transition>
                </div>
              </Transition>
            </div>
          </article>
        </TransitionGroup>

        <button class="filled-button" type="button" :disabled="isSaving || !canCreateTransactions" @click="submit">
          <span v-if="isSaving" class="button-loader" aria-hidden="true"></span>
          {{ canSubmit && form.title.trim() ? (isEdit ? strings.saveExpenseChanges : strings.saveExpense) : pageText.completeExpenseForm }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-section {
  padding: 18px;
  border-radius: 28px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-surface) 84%, var(--color-primary) 6%),
      color-mix(in srgb, var(--color-surface) 92%, var(--color-primary) 4%)
    );
  border: 1px solid var(--color-border-soft);
}

.editor-section__eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
}

.tax-toggle-row,
.service-charge-header,
.split-type-panel,
.expense-summary-card__header,
.service-charge-card__header,
.tax-breakdown-card__header,
.member-editor-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.tax-toggle-row__copy,
.service-charge-header__copy {
  flex: 1;
  min-width: 0;
  gap: 6px;
}

.service-charge-header__action {
  flex-shrink: 0;
}

.tax-breakdown-card,
.service-charge-card,
.expense-summary-card {
  padding: 16px;
}

.tax-breakdown-card {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)),
      color-mix(in srgb, var(--color-surface) 96%, transparent)
    );
  gap: 18px;
}

.tax-breakdown-card__copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.tax-breakdown-card__header {
  align-items: center;
  gap: 14px;
}

.tax-breakdown-card__icon {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  background: color-mix(in srgb, var(--color-primary) 24%, transparent);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.tax-breakdown-card__rows {
  display: grid;
  gap: 14px;
}

.tax-breakdown-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  border-radius: 20px;
  border: 1px solid var(--color-border-soft);
}

.tax-breakdown-row--base {
  background: var(--color-surface-strong);
}

.tax-breakdown-row--tax {
  background: var(--color-surface-soft);
}

.tax-breakdown-row--strong {
  background: var(--color-surface-accent);
}

.tax-breakdown-row span {
  color: color-mix(in srgb, var(--color-on-surface) 88%, white);
  font-weight: 600;
}

.tax-breakdown-card .detail-line strong,
.expense-summary-tile strong,
.member-breakdown-tile strong {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: end;
  overflow-wrap: anywhere;
}

.tax-breakdown-row :deep(.amount-text),
.expense-summary-tile :deep(.amount-text),
.member-breakdown-tile :deep(.amount-text) {
  direction: ltr;
  unicode-bidi: isolate;
  justify-content: flex-end;
  text-align: end;
  overflow-wrap: anywhere;
}

.service-charge-card {
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-primary) 5%);
  gap: 14px;
}

.service-charge-members {
  gap: 10px;
}

.service-charge-preview {
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--color-surface-soft);
  color: var(--color-on-surface-variant);
  font-size: 14px;
  line-height: 24px;
}

.service-charge-preview--error {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
}

.service-charge-empty {
  border: 1px dashed color-mix(in srgb, var(--color-outline) 28%, transparent);
  border-radius: 22px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.expense-summary-card {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)),
      color-mix(in srgb, var(--color-surface) 94%, transparent)
    );
  gap: 16px;
}

.expense-summary-card__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.expense-summary-card__toggle,
.member-breakdown-toggle {
  white-space: nowrap;
}

.expense-summary-card__badge {
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 16%, transparent);
  color: var(--color-primary);
  font-weight: 700;
  white-space: nowrap;
}

.expense-summary-card__badge--warning {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
}

.expense-summary-card__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.expense-summary-card__grid,
.member-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.expense-summary-tile,
.member-breakdown-tile {
  border-radius: 22px;
  padding: 14px;
  background: var(--color-surface-strong);
  border: 1px solid var(--color-border-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.expense-summary-tile strong,
.member-breakdown-tile strong {
  font-size: 18px;
  line-height: 28px;
}

.expense-summary-tile--accent {
  background: var(--color-surface-soft);
}

.expense-summary-tile--strong,
.member-breakdown-tile--strong {
  background: var(--color-surface-accent);
}

.expense-summary-card__alert {
  padding: 12px 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  font-weight: 600;
}

.member-editor-card {
  background: var(--color-surface-strong);
  border-radius: 28px;
  border: 1px solid var(--color-border-soft);
  box-shadow: 0 10px 24px rgba(18, 32, 35, 0.06);
}

.member-editor-card__content {
  gap: 14px;
  padding: 16px;
}

.member-editor-card__body {
  gap: 14px;
}

.member-editor-card--collapsed .member-editor-card__content {
  gap: 8px;
  padding-block: 14px;
}

.member-breakdown-grid--details {
  margin-top: -2px;
}

.member-breakdown-toggle {
  justify-self: flex-start;
}

.helper-action-row {
  display: flex;
  justify-content: flex-start;
}

.text-danger {
  color: var(--color-error);
}

@media (max-width: 640px) {
  .editor-section,
  .expense-summary-card,
  .member-editor-card__content {
    padding: 14px;
  }

  .tax-breakdown-card,
  .service-charge-card {
    padding: 14px;
  }

  .expense-summary-card__grid,
  .member-breakdown-grid,
  .expense-summary-card__details {
    grid-template-columns: minmax(0, 1fr);
  }

  .tax-toggle-row,
  .service-charge-header,
  .split-type-panel,
  .expense-summary-card__header,
  .service-charge-card__header,
  .tax-breakdown-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .member-editor-card__header {
    flex-direction: row;
    align-items: center;
  }

  .expense-summary-card__header-actions {
    justify-content: flex-start;
  }

  .expense-summary-card__badge {
    align-self: flex-start;
  }

  .expense-summary-tile,
  .member-breakdown-tile {
    min-height: 0;
    border-radius: 18px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
  }

  .expense-summary-tile strong,
  .member-breakdown-tile strong {
    font-size: 16px;
    line-height: 24px;
    flex: 0 1 auto;
    max-width: 58%;
  }

  .expense-summary-tile .muted,
  .member-breakdown-tile .muted {
    flex: 1 1 auto;
  }

  .tax-breakdown-card__header {
    flex-direction: row;
    align-items: center;
  }

  .tax-breakdown-row {
    padding: 11px 12px;
  }

  .tax-breakdown-row :deep(.amount-text),
  .expense-summary-tile :deep(.amount-text),
  .member-breakdown-tile :deep(.amount-text) {
    max-width: 56%;
  }

  .tax-toggle-row {
    gap: 10px;
  }

  .tax-toggle-row :deep(.switch-button) {
    align-self: flex-start;
  }

  .helper-action-row {
    margin-top: -2px;
  }
}
</style>
