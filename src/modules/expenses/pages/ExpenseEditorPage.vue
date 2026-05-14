<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import AmountText from '@/shared/components/AmountText.vue'
import AmountField from '@/shared/components/AmountField.vue'
import Avatar from '@/shared/components/Avatar.vue'
import ShareExtrasRow from '@/modules/expenses/components/ShareExtrasRow.vue'
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
  distributeProportionally,
  splitAmountDeterministically,
  type AmountMode,
  type DiscountDraft,
  type ExpenseEditorMemberDraft,
  type ServiceChargeDraftUi,
  type TaxDraft,
} from '@/modules/expenses/expenseEditor'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'
import Icon from '@/shared/components/Icon.vue'

interface EnrichedMemberDraft extends ExpenseEditorMemberDraft {
  baseSharePreview: number
  taxSharePreview: number
  serviceChargeSharePreview: number
  discountSharePreview: number
  finalSharePreview: number
  payerPercent: number
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

const isRtl = computed(() => settingsStore.direction === 'rtl')

const form = reactive({
  title: '',
  note: '',
  totalAmountInput: '',
  splitType: 'EQUAL' as 'EQUAL' | 'EXACT' | 'SHARE',
  tax: { enabled: false, mode: 'percent', valueInput: '' } as TaxDraft,
  serviceCharges: [] as ServiceChargeDraftUi[],
  discount: { enabled: false, mode: 'percent', valueInput: '' } as DiscountDraft,
  members: [] as ExpenseEditorMemberDraft[],
})

const errorMessage = ref('')
const isSaving = ref(false)
const noteOpen = ref(false)

// Snapshot of EXACT shares before extras-driven rebalance, to allow revert
type ShareSnapshot = Record<string, string>
const shareSnapshot = ref<ShareSnapshot | null>(null)

// Independent snapshot for the "Apply Tax" action so its revert lifecycle doesn't
// interfere with the auto-balance / extras snapshot above. Stays set after apply
// and is cleared either by the explicit revert button or when the user types in
// any share field (so the revert button doesn't mislead them after manual edits).
const taxApplySnapshot = ref<ShareSnapshot | null>(null)

// Per-row breakdown expansion state for share rows that have a service charge or
// other non-zero non-base components. Tap the row's badge to toggle.
const expandedBreakdowns = ref(new Set<string>())

// Sheets
const payersSheetOpen = ref(false)
const extrasSheetOpen = ref(false)
const editingServiceId = ref<string | null>(null)

/**
 * Draft state for the Extras sheet. While the sheet is open, every input —
 * tax toggle/mode/value, discount, service charges — mutates this draft
 * instead of `form.*`. Nothing reaches the main expense form (and therefore
 * the share calculations / inline notice / submit validation) until the
 * user taps the "Done" button, which copies the draft into `form` via
 * `applyExtrasDraft()`. Tapping the close icon or the backdrop discards
 * the draft via `cancelExtrasSheet()`.
 *
 * The draft is initialised from `form.*` whenever the sheet opens so that
 * the UI starts from the currently committed state.
 */
const extrasDraft = reactive<{
  tax: TaxDraft
  discount: DiscountDraft
  serviceCharges: ServiceChargeDraftUi[]
}>({
  tax: { enabled: false, mode: 'percent', valueInput: '' },
  discount: { enabled: false, mode: 'percent', valueInput: '' },
  serviceCharges: [],
})

const members = computed(() => membersByGroupId.value[groupId] ?? [])
const existingExpense = computed(() => (expensesByGroupId.value[groupId] ?? []).find((item) => item.id === expenseId))
const canCreateTransactions = computed(() => members.value.length >= 2 || isEdit.value)

const text = computed(() => {
  if (language.value === 'fa') {
    return {
      newExpense: 'خرج جدید',
      editExpense: 'ویرایش خرج',
      titlePlaceholder: 'مثلا شام اون شب',
      notePlaceholder: 'یادداشت دلخواه',
      addNote: 'افزودن یادداشت',
      noteLabel: 'توضیح',
      removeNote: 'حذف توضیح',
      paidByLabel: 'پرداخت کرد',
      multiplePayersTitle: 'چند پرداخت‌کننده',
      multiplePayersHint: 'چند نفر پرداخت کردند؟',
      multiplePayersOne: '۱ نفر',
      multiplePayersMany: (n: number) => `${n} نفر`,
      splitLabel: 'تقسیم',
      splitEqual: 'مساوی',
      splitExact: 'دقیق',
      eachLabel: 'هر نفر',
      noShare: 'بدون سهم',
      extrasLabel: 'افزونه‌ها',
      extrasNone: 'بدون افزونه',
      extrasSummary: (parts: string[]) => parts.join(' · '),
      tax: 'مالیات',
      services: 'سرویس‌ها',
      discount: 'تخفیف',
      save: 'ثبت خرج',
      saveChanges: 'ذخیره',
      delete: 'حذف',
      cancel: 'انصراف',
      done: 'تایید',
      // Sheets
      payersSheetTitle: 'پرداخت‌کننده‌ها',
      payersSheetSubtitle: 'کی چقدر پرداخت کرده؟',
      paidSoFar: 'مجموع پرداخت',
      remaining: 'باقی‌مانده',
      balanced: 'مطابقت دارد',
      overBy: (amount: string) => `${amount} اضافه`,
      remainingAmount: (amount: string) => `${amount} باقی‌مانده`,
      addPayer: 'افزودن پرداخت‌کننده',
      fillRemaining: 'بقیه',
      evenShare: 'سهم برابر',
      fullAmount: 'کل خرج',
      clear: 'پاک',
      extrasSheetTitle: 'افزونه‌ها',
      extrasSheetSubtitle: 'مالیات، یک یا چند سرویس، و تخفیف',
      taxToggleSubtitle: 'روی مبلغ پایه (پس از کسر سرویس‌ها)',
      percent: '%',
      amount: 'مبلغ',
      addService: 'افزودن سرویس',
      serviceName: 'عنوان سرویس',
      serviceMembers: 'اعضای مشمول',
      everyone: 'همه اعضا',
      members: 'عضو',
      editService: 'ویرایش',
      removeService: 'حذف سرویس',
      discountSubtitle: 'به‌صورت درصد یا مبلغ ثابت',
      taxSubtitle: 'به‌صورت درصد یا مبلغ ثابت',
      byPercent: 'با درصد',
      byAmount: 'با مبلغ',
      subtotal: 'مبلغ پایه',
      grandTotal: 'مبلغ نهایی',
      autoFix: 'تنظیم خودکار سهم‌ها',
      autoFixHint: 'تقسیم متناسب طبق سهم‌های فعلی',
      revert: 'برگرداندن',
      summaryNeedsInput: 'فرم را تکمیل کن',
      noticeNoMembers: 'برای ثبت خرج به حداقل دو عضو نیاز است.',
      shareOverflow: (amount: string) => `${amount} بیشتر از مبلغ پایه وارد شده است.`,
      shareUnder: (amount: string) => `${amount} مانده تا تکمیل سهم‌ها.`,
      shareUnderHint: 'می‌توانی بقیه را بین اعضا تقسیم کنی.',
      shareOverHint: 'تقسیم متناسب طبق سهم‌های فعلی',
      fillEmptiesAction: (amount: string, count: number) => `تقسیم ${amount} بین ${count} عضو خالی`,
      fillEmptiesActionShort: 'تقسیم بقیه',
      applyTax: 'اعمال مالیات',
      applyTaxTitle: (amount: string) => `${amount} اضافی به‌اندازهٔ مالیات وارد شده`,
      applyTaxHint: 'به نظر می‌رسد سهم‌ها شامل مالیات هستند. با اعمال مالیات، سهم‌های پایه به‌صورت متناسب از داخل آن‌ها استخراج می‌شوند.',
      taxAppliedTitle: 'مالیات از سهم‌ها استخراج شد',
      taxAppliedHint: 'سهم‌ها به مبلغ پیش از مالیات تنظیم شدند.',
      serviceLabel: 'سرویس',
      serviceShareBadge: (amount: string) => `+ ${amount} سرویس`,
      serviceBreakdownLabel: 'جزئیات سهم',
      serviceBreakdownBase: 'پایه',
      serviceBreakdownTax: 'مالیات',
      serviceBreakdownDiscount: 'تخفیف',
      serviceBreakdownService: 'سرویس',
      serviceBreakdownFinal: 'سهم نهایی',
      payerOverflow: (amount: string) => `${amount} بیشتر از مبلغ کل وارد شده است.`,
      invalidTaxPercent: 'درصد مالیات باید بین ۰ تا ۱۰۰ باشد.',
      invalidServiceCharge: 'برای هر سرویس، مبلغ و حداقل یک عضو را انتخاب کن.',
      invalidDiscount: 'مقدار تخفیف معتبر نیست.',
    }
  }
  return {
    newExpense: 'New expense',
    editExpense: 'Edit expense',
    titlePlaceholder: 'e.g. Dinner Thursday',
    notePlaceholder: 'Optional note',
    addNote: 'Add a note',
    noteLabel: 'Note',
    removeNote: 'Remove note',
    paidByLabel: 'Paid by',
    multiplePayersTitle: 'Multiple payers',
    multiplePayersHint: 'Split the payment?',
    multiplePayersOne: '1 person',
    multiplePayersMany: (n: number) => `${n} people`,
    splitLabel: 'Split',
    splitEqual: 'Equal',
    splitExact: 'Exact',
    eachLabel: 'Each',
    noShare: 'no share',
    extrasLabel: 'Extras',
    extrasNone: 'None',
    extrasSummary: (parts: string[]) => parts.join(' · '),
    tax: 'Tax',
    services: 'Services',
    discount: 'Discount',
    save: 'Save',
    saveChanges: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    done: 'Done',
    payersSheetTitle: 'Who paid',
    payersSheetSubtitle: 'Who paid how much?',
    paidSoFar: 'Paid so far',
    remaining: 'Remaining',
    balanced: 'Matches total',
    overBy: (amount: string) => `Over by ${amount}`,
    remainingAmount: (amount: string) => `${amount} remaining`,
    addPayer: 'Add payer',
    fillRemaining: 'Fill remaining',
    evenShare: 'Even share',
    fullAmount: 'Full amount',
    clear: 'Clear',
    extrasSheetTitle: 'Extras',
    extrasSheetSubtitle: 'Tax, one or more services, and a discount',
    taxToggleSubtitle: 'Applied to the base amount (after services are removed)',
    percent: '%',
    amount: 'Amount',
    addService: 'Add service',
    serviceName: 'Service name',
    serviceMembers: 'Applicable members',
    everyone: 'Everyone',
    members: 'people',
    editService: 'Edit',
    removeService: 'Remove service',
    discountSubtitle: 'As a percentage or a fixed amount',
    taxSubtitle: 'As a percentage or a fixed amount',
    byPercent: 'By %',
    byAmount: 'By amount',
    subtotal: 'Subtotal',
    grandTotal: 'Grand total',
    autoFix: 'Auto-balance shares',
    autoFixHint: 'Distribute proportionally based on current shares',
    revert: 'Revert',
    summaryNeedsInput: 'Complete the form',
    noticeNoMembers: 'You need at least two members to record an expense.',
    shareOverflow: (amount: string) => `${amount} exceeds the base amount.`,
    shareUnder: (amount: string) => `${amount} left to complete the shares.`,
    shareUnderHint: 'You can distribute the remainder across members.',
    shareOverHint: 'Distribute proportionally based on current shares.',
    fillEmptiesAction: (amount: string, count: number) => `Split ${amount} among ${count} empty member${count === 1 ? '' : 's'}`,
    fillEmptiesActionShort: 'Split remainder',
    applyTax: 'Apply tax',
    applyTaxTitle: (amount: string) => `${amount} extra — looks like the tax amount`,
    applyTaxHint: 'It looks like the entered shares include tax. Applying tax extracts the pre-tax base proportionally from each share.',
    taxAppliedTitle: 'Tax extracted from shares',
    taxAppliedHint: 'Shares are now adjusted to pre-tax amounts.',
    serviceLabel: 'service',
    serviceShareBadge: (amount: string) => `+ ${amount} service`,
    serviceBreakdownLabel: 'Share breakdown',
    serviceBreakdownBase: 'Base',
    serviceBreakdownTax: 'Tax',
    serviceBreakdownDiscount: 'Discount',
    serviceBreakdownService: 'Service',
    serviceBreakdownFinal: 'Final',
    payerOverflow: (amount: string) => `${amount} exceeds the total amount.`,
    invalidTaxPercent: 'Tax percentage must be between 0 and 100.',
    invalidServiceCharge: 'Each service charge needs an amount and at least one member.',
    invalidDiscount: 'The discount value is invalid.',
  }
})

const currencyLabel = computed(() => (language.value === 'fa' ? 'تومان' : 'T'))

function syncDraftMembers() {
  const previousById = new Map(form.members.map((item) => [item.memberId, item]))
  const payers = new Map(existingExpense.value?.payers.map((item) => [item.member_id, item.amount]) ?? [])
  const shares = new Map(existingExpense.value?.shares.map((item) => [item.member_id, item.amount]) ?? [])
  const weights = new Map(existingExpense.value?.shares.map((item) => [item.member_id, item.weight ?? null]) ?? [])

  form.members = members.value.map((member) => ({
    memberId: member.id,
    username: member.username,
    includedInSplit: previousById.get(member.id)?.includedInSplit ?? (shares.has(member.id) || !isEdit.value),
    payerAmountInput: previousById.get(member.id)?.payerAmountInput ?? (payers.has(member.id) ? String(payers.get(member.id) ?? '') : ''),
    exactShareInput: previousById.get(member.id)?.exactShareInput ?? (shares.has(member.id) ? String(shares.get(member.id) ?? '') : ''),
    weight: previousById.get(member.id)?.weight ?? (weights.has(member.id) ? (weights.get(member.id) ?? null) : null),
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
      const savedSplitType = existingExpense.value.split_type
      const hasShareWeights = existingExpense.value.shares.some((s) => s.weight != null && s.weight > 0)
      form.splitType = savedSplitType === 'SHARE' || hasShareWeights ? 'SHARE' : savedSplitType
      if (form.note) noteOpen.value = true
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
    tax: form.tax,
    serviceCharges: form.serviceCharges,
    discount: form.discount,
  }),
)

/**
 * Computed state used inside the Extras sheet so the in-modal Grand Total
 * card can preview the impact of the user's draft edits without having
 * applied them to `form` yet. When the sheet is closed it falls through to
 * the committed `computedState` to avoid wasted recomputation.
 */
const draftComputedState = computed(() => {
  if (!extrasSheetOpen.value) return computedState.value
  return computeExpenseEditorState({
    totalAmount: parseAmountInput(form.totalAmountInput),
    splitType: form.splitType,
    members: form.members,
    tax: extrasDraft.tax,
    serviceCharges: extrasDraft.serviceCharges,
    discount: extrasDraft.discount,
  })
})

const enrichedMembers = computed<EnrichedMemberDraft[]>(() => {
  const state = computedState.value
  const totalAmount = parseAmountInput(form.totalAmountInput)

  return form.members.map((member) => {
    const payerAmount = parseAmountInput(member.payerAmountInput)
    const breakdown = state.memberBreakdowns[member.memberId] ?? {
      baseShare: 0,
      taxShare: 0,
      serviceChargeShare: 0,
      discountShare: 0,
      finalShare: 0,
    }
    const payerPercent = totalAmount > 0 ? Math.round((payerAmount / totalAmount) * 100) : 0
    return {
      ...member,
      baseSharePreview: breakdown.baseShare,
      taxSharePreview: breakdown.taxShare,
      serviceChargeSharePreview: breakdown.serviceChargeShare,
      discountSharePreview: breakdown.discountShare,
      finalSharePreview: breakdown.finalShare,
      payerPercent,
    }
  })
})

const includedMembers = computed(() => enrichedMembers.value.filter((item) => item.includedInSplit))
const activePayers = computed(() => enrichedMembers.value.filter((item) => parseAmountInput(item.payerAmountInput) > 0))
const isMultiplePayers = computed(() => activePayers.value.length > 1)
const singlePayerId = computed<string | null>(() => {
  if (activePayers.value.length === 1) return activePayers.value[0]!.memberId
  return null
})

const totalAmountValue = computed(() => parseAmountInput(form.totalAmountInput))

// Pill indicator transform for the split-type segmented control.
// DOM order is [EQUAL, EXACT, SHARE]; the indicator is anchored at inset-inline-start: 3px,
// so it sits on the EQUAL button by default. Slide to index 1 (EXACT) or index 2 (SHARE).
const splitIndicatorStyle = computed(() => {
  if (form.splitType === 'EXACT') return { transform: isRtl.value ? 'translateX(-100%)' : 'translateX(100%)' }
  if (form.splitType === 'SHARE') return { transform: isRtl.value ? 'translateX(-200%)' : 'translateX(200%)' }
  return { transform: 'translateX(0)' }
})

const equalEachAmount = computed(() => {
  if (form.splitType !== 'EQUAL' || includedMembers.value.length === 0) return 0
  const baseAmount = computedState.value.baseAmountPreview
  return Math.floor(baseAmount / includedMembers.value.length)
})

// ---- SHARE mode computeds and helpers ----

const shareTotalWeight = computed(() =>
  form.members
    .filter((m) => m.includedInSplit !== false)
    .reduce((sum, m) => sum + (m.weight != null && m.weight > 0 ? m.weight : 0), 0),
)

const shareValuePerShare = computed(() =>
  shareTotalWeight.value > 0
    ? Math.round(parseAmountInput(form.totalAmountInput) / shareTotalWeight.value)
    : 0,
)

function selectShareSplitType() {
  form.splitType = 'SHARE'
  for (const member of form.members) {
    if (member.weight == null) member.weight = 1
  }
}

function adjustWeight(member: ExpenseEditorMemberDraft, delta: number) {
  const current = member.weight ?? 0
  const next = Math.max(0, current + delta)
  member.weight = next
}

function formatShareWeight(w?: number | null): string {
  if (w == null) return '0'
  return Number.isInteger(w) ? String(w) : w.toFixed(1)
}

function amountForShareMember(member: ExpenseEditorMemberDraft): number {
  const total = parseAmountInput(form.totalAmountInput)
  const totalWeight = shareTotalWeight.value
  if (totalWeight <= 0) return 0
  return Math.round(total * Math.max(member.weight ?? 0, 0) / totalWeight)
}

function setAllWeights(n: number) {
  for (const member of form.members) {
    member.weight = n
  }
}

// In EXACT mode, members with no value entered yet.
const emptyShareMembers = computed(() =>
  includedMembers.value.filter((m) => !m.exactShareInput),
)

// In EXACT mode, the per-empty-member fill that would actually be committed if
// the user hit "Fill empties". This uses `splitAmountDeterministically` so the
// values shown (in field placeholders and in the bulk CTA) match exactly what
// the commit produces — no off-by-one drift between hint and reality.
const suggestedFillByMemberId = computed<Record<string, number>>(() => {
  if (form.splitType !== 'EXACT') return {}
  const remaining = computedState.value.remainingBaseShareAmount
  const empties = emptyShareMembers.value
  if (remaining <= 0 || empties.length === 0) return {}
  return splitAmountDeterministically(
    remaining,
    empties.map((m) => m.memberId),
  )
})

// Total amount that would be distributed by "Fill empties" — used in the CTA copy.
const totalEmptyFillAmount = computed(() => {
  return Object.values(suggestedFillByMemberId.value).reduce((sum, v) => sum + v, 0)
})

/** Placeholder shown inside an empty AmountField for a member in EXACT mode.
 *  Returns the formatted suggested fill if any, or the language-aware "0". */
function placeholderForShare(memberId: string): string {
  const fallback = language.value === 'fa' ? '۰' : '0'
  if (form.splitType !== 'EXACT') return fallback
  const v = suggestedFillByMemberId.value[memberId]
  return v && v > 0 ? formatAmount(v, language.value) : fallback
}

/**
 * Bottom-of-form summary alert for things the inline notices don't already
 * surface. Base-share overflow is intentionally omitted — it's already shown
 * by the `baseShareNotice` block (which has its own auto-fix CTA), and
 * duplicating it at the bottom reads as a stutter.
 */
const summaryAlert = computed(() => {
  const state = computedState.value
  if (state.hasInvalidTaxPercent) return text.value.invalidTaxPercent
  if (state.hasInvalidServiceCharges) return text.value.invalidServiceCharge
  if (state.hasInvalidDiscount) return text.value.invalidDiscount
  if (state.isPayerOverflow) return text.value.payerOverflow(formatAmount(-state.remainingPayerAmount, language.value))
  return ''
})

/**
 * Inline notice driven by the relationship between entered shares and the
 * expected base amount. The four states below render distinct UI:
 *
 * - `under`            → soft hint with an "Auto-balance" CTA. The user is still
 *                        typing; this is informational, not an error.
 * - `over`             → red error bar with "Auto-balance".
 * - `tax-suggestion`   → friendly notice with an "Apply tax" CTA. Triggered when
 *                        the user appears to have entered post-tax amounts (sum
 *                        ~= totalAmount) while tax is in percent mode.
 * - `tax-applied`      → success bar with "Revert" after tax extraction.
 *
 * Returning `null` means no notice — either nothing was entered yet, or the
 * shares are perfectly balanced with the base amount.
 */
type BaseShareNotice =
  | { kind: 'under'; amount: number }
  | { kind: 'over'; amount: number }
  | { kind: 'tax-suggestion'; amount: number; taxRate: number }
  | { kind: 'tax-applied' }

const baseShareNotice = computed<BaseShareNotice | null>(() => {
  if (form.splitType !== 'EXACT') return null
  const state = computedState.value
  if (state.baseAmountPreview <= 0) return null
  const someEntered = includedMembers.value.some((m) => parseAmountInput(m.exactShareInput) > 0)
  if (!someEntered) return null

  // Tax-applied success bar lingers as long as the snapshot exists AND shares
  // still match the base — any user edit that breaks the balance flips us back
  // into a regular under/over state.
  if (taxApplySnapshot.value && state.baseShareTotal === state.baseAmountPreview) {
    return { kind: 'tax-applied' }
  }

  if (state.isBaseShareOverflow) {
    // Detect "shares were entered post-tax" — sum of shares is approximately
    // equal to totalAmount instead of baseAmountPreview, and tax is percent.
    if (form.tax.enabled && form.tax.mode === 'percent') {
      const totalAmount = parseAmountInput(form.totalAmountInput)
      // Allow a small tolerance per included member because of integer rounding.
      const tolerance = Math.max(1, includedMembers.value.length)
      const taxRate = parseAmountInput(form.tax.valueInput)
      if (taxRate > 0 && Math.abs(state.baseShareTotal - totalAmount) <= tolerance) {
        return { kind: 'tax-suggestion', amount: -state.remainingBaseShareAmount, taxRate }
      }
    }
    return { kind: 'over', amount: -state.remainingBaseShareAmount }
  }

  if (state.baseShareTotal < state.baseAmountPreview) {
    return { kind: 'under', amount: state.remainingBaseShareAmount }
  }

  return null
})

const canSubmit = computed(() => {
  const state = computedState.value
  return (
    canCreateTransactions.value &&
    !!form.title.trim() &&
    totalAmountValue.value > 0 &&
    state.remainingPayerAmount === 0 &&
    !state.isPayerOverflow &&
    state.remainingBaseShareAmount === 0 &&
    !state.isBaseShareOverflow &&
    !state.hasInvalidServiceCharges &&
    !state.hasInvalidTaxPercent &&
    !state.hasInvalidDiscount &&
    state.finalShareTotal === state.finalGrandTotal
  )
})

// ---- Extras summary text ----
/**
 * Returns true when nothing has been committed to extras yet — used by the
 * extras nav row to switch its hint between "what's committed" and "what's
 * available" copy.
 */
const hasCommittedExtras = computed(() =>
  form.tax.enabled || form.discount.enabled || form.serviceCharges.length > 0,
)

const extrasSummary = computed(() => {
  const parts: string[] = []
  if (form.tax.enabled && parseAmountInput(form.tax.valueInput) > 0) {
    if (form.tax.mode === 'percent') parts.push(`${text.value.tax} ${formatAmount(parseAmountInput(form.tax.valueInput), language.value)}%`)
    else parts.push(`${text.value.tax} +${formatAmount(parseAmountInput(form.tax.valueInput), language.value)}`)
  }
  const validServices = form.serviceCharges.filter((c) => parseAmountInput(c.amountInput) > 0 && c.selectedMemberIds.length > 0)
  if (validServices.length > 0) {
    parts.push(language.value === 'fa' ? `${validServices.length} ${text.value.services}` : `${validServices.length} ${text.value.services.toLowerCase()}`)
  }
  if (form.discount.enabled && parseAmountInput(form.discount.valueInput) > 0) {
    if (form.discount.mode === 'percent') parts.push(`-${formatAmount(parseAmountInput(form.discount.valueInput), language.value)}%`)
    else parts.push(`-${formatAmount(parseAmountInput(form.discount.valueInput), language.value)}`)
  }
  return parts.length > 0 ? text.value.extrasSummary(parts) : text.value.extrasNone
})

/**
 * Type-list shown as the nav-row hint when no extras are committed yet.
 * Same dot-separated formatter as `extrasSummary` so the visual rhythm
 * matches once the user fills something in. Mirrors the modal section
 * order (tax → services → discount) so the row is a small "table of
 * contents" of what's inside.
 */
const extrasTypesPreview = computed(() =>
  text.value.extrasSummary([text.value.tax, text.value.services, text.value.discount]),
)

// ---- Member helpers ----
function updateMember(memberId: string, patch: Partial<ExpenseEditorMemberDraft>) {
  form.members = form.members.map((m) => (m.memberId === memberId ? { ...m, ...patch } : m))
}

function setSinglePayer(memberId: string) {
  const total = totalAmountValue.value
  if (total <= 0) {
    snackbarStore.push(translateMessageKey(language.value, 'EXPENSE_TOTAL_POSITIVE') ?? strings.value.genericError, 'error')
    return
  }
  // Clear all payers, then assign full to the selected member.
  form.members = form.members.map((m) => ({
    ...m,
    payerAmountInput: m.memberId === memberId ? String(total) : '',
  }))
}

function toggleMemberIncluded(memberId: string) {
  const m = form.members.find((x) => x.memberId === memberId)
  if (!m) return
  updateMember(memberId, { includedInSplit: !m.includedInSplit })
}

function clearShare(memberId: string) {
  updateMember(memberId, { exactShareInput: '' })
}

/**
 * Fill ALL empty members at once with their deterministic share of the remaining
 * base amount. Single-tap replacement for the per-chip flow that used to require
 * N taps for N empty members.
 *
 * No snapshot is captured here on purpose — the per-row fields are still fully
 * editable after the bulk fill, so "undo" is just a manual clear or auto-fix.
 * This keeps the snapshot semantics scoped to actions that mutate already-
 * entered values (auto-balance, apply-tax) where revert is genuinely useful.
 */
function fillAllEmpties() {
  const fills = suggestedFillByMemberId.value
  const ids = Object.keys(fills)
  if (ids.length === 0) return
  form.members = form.members.map((m) => {
    const v = fills[m.memberId]
    return v && v > 0 && !m.exactShareInput ? { ...m, exactShareInput: String(v) } : m
  })
}

// Note collapse
function openNote() {
  noteOpen.value = true
}
function removeNote() {
  noteOpen.value = false
  form.note = ''
}

// ---- Payers helpers ----
function applyFillRemainingPayer(memberId: string) {
  const total = totalAmountValue.value
  if (total <= 0) return
  const otherTotal = form.members
    .filter((m) => m.memberId !== memberId)
    .reduce((sum, m) => sum + parseAmountInput(m.payerAmountInput), 0)
  const remaining = total - otherTotal
  if (remaining > 0) updateMember(memberId, { payerAmountInput: String(remaining) })
}

function applyEvenShareToPayer(memberId: string) {
  const total = totalAmountValue.value
  if (total <= 0) return

  // Determine the set of payers we want to split between:
  // - All members who already have a non-zero payer input (active), OR
  // - The clicked member (if they aren't active yet)
  const activeIds = new Set(activePayers.value.map((p) => p.memberId))
  if (!activeIds.has(memberId)) activeIds.add(memberId)

  // If only one (the current) is active, fall back to splitting between all members.
  const targetIds = activeIds.size <= 1
    ? form.members.map((m) => m.memberId)
    : Array.from(activeIds)

  const splits = splitAmountDeterministically(total, [...targetIds].sort())
  const my = splits[memberId] ?? 0

  // For all *other* active payers we want, also rewrite to their even share so totals match.
  // For members not in `targetIds`, keep their value as-is (don't disturb).
  form.members = form.members.map((m) => {
    if (!targetIds.includes(m.memberId)) return m
    if (m.memberId === memberId) return { ...m, payerAmountInput: String(my) }
    // Other members in targetIds: only set if currently empty OR if total mode is "split between members".
    // For predictability, only set the clicked one — leave others alone unless they were already zero.
    return m
  })
  // Update only the clicked member's value.
  updateMember(memberId, { payerAmountInput: String(my) })
}

function applyFullAmountToPayer(memberId: string) {
  const total = totalAmountValue.value
  if (total > 0) {
    form.members = form.members.map((m) => ({
      ...m,
      payerAmountInput: m.memberId === memberId ? String(total) : '',
    }))
  }
}

function clearPayer(memberId: string) {
  updateMember(memberId, { payerAmountInput: '' })
}

// ---- Extras sheet handlers ----
//
// Every handler below mutates `extrasDraft` (NOT `form`). Nothing reaches the
// committed expense form until `applyExtrasDraft()` is called by the Done
// button. Cancelling discards the draft via `cancelExtrasSheet()`.

// Service charges
function addServiceCharge() {
  const id = crypto.randomUUID()
  extrasDraft.serviceCharges.push({
    id,
    title: '',
    amountInput: '',
    selectedMemberIds: includedMembers.value.map((m) => m.memberId),
  })
  editingServiceId.value = id
}

function updateServiceCharge(id: string, patch: Partial<ServiceChargeDraftUi>) {
  extrasDraft.serviceCharges = extrasDraft.serviceCharges.map((c) => (c.id === id ? { ...c, ...patch } : c))
}

function removeServiceCharge(id: string) {
  extrasDraft.serviceCharges = extrasDraft.serviceCharges.filter((c) => c.id !== id)
  if (editingServiceId.value === id) editingServiceId.value = null
}

function toggleServiceMember(id: string, memberId: string) {
  extrasDraft.serviceCharges = extrasDraft.serviceCharges.map((c) => {
    if (c.id !== id) return c
    return {
      ...c,
      selectedMemberIds: c.selectedMemberIds.includes(memberId)
        ? c.selectedMemberIds.filter((x) => x !== memberId)
        : [...c.selectedMemberIds, memberId],
    }
  })
}

function selectAllForService(id: string) {
  const allIds = includedMembers.value.map((m) => m.memberId)
  extrasDraft.serviceCharges = extrasDraft.serviceCharges.map((c) => (c.id === id ? { ...c, selectedMemberIds: allIds } : c))
}

function deselectAllForService(id: string) {
  extrasDraft.serviceCharges = extrasDraft.serviceCharges.map((c) => (c.id === id ? { ...c, selectedMemberIds: [] } : c))
}

function commitService(id: string) {
  // Drop the row silently if it's still completely empty (user opened "Add"
  // then changed their mind). Otherwise just collapse the editor view.
  const c = extrasDraft.serviceCharges.find((x) => x.id === id)
  if (c && !c.title.trim() && !c.amountInput && c.selectedMemberIds.length === 0) {
    removeServiceCharge(id)
    return
  }
  editingServiceId.value = null
}

// Tax — mutates draft only; snapshot capture/revert is deferred to commit time.
function setTaxEnabled(value: boolean) {
  extrasDraft.tax.enabled = value
  if (!value) extrasDraft.tax.valueInput = ''
}

function setTaxMode(mode: AmountMode) {
  extrasDraft.tax.mode = mode
  extrasDraft.tax.valueInput = ''
}

// Discount — same draft-only semantics.
function setDiscountEnabled(value: boolean) {
  extrasDraft.discount.enabled = value
  if (!value) extrasDraft.discount.valueInput = ''
}

function setDiscountMode(mode: AmountMode) {
  extrasDraft.discount.mode = mode
  extrasDraft.discount.valueInput = ''
}

// ---- Sheet open / apply / cancel ----

function openExtrasSheet() {
  // Snapshot form.* into the draft so the modal opens at the currently
  // committed state. Deep-clone arrays so the user can edit freely without
  // accidentally aliasing form's data.
  extrasDraft.tax = { ...form.tax }
  extrasDraft.discount = { ...form.discount }
  extrasDraft.serviceCharges = form.serviceCharges.map((c) => ({
    ...c,
    selectedMemberIds: [...c.selectedMemberIds],
  }))
  editingServiceId.value = null
  extrasSheetOpen.value = true
}

function applyExtrasDraft() {
  // Auto-collapse a draft service that was being edited so the user's
  // last input is committed (or the empty row removed by `commitService`).
  if (editingServiceId.value) {
    commitService(editingServiceId.value)
    editingServiceId.value = null
  }

  // Mirror the historical snapshot semantics: capture when the user goes
  // FROM "no extras enabled" TO "any extras enabled", and revert when going
  // back to "none enabled". This way revert undoes the share rebalance the
  // user might have done after enabling extras.
  const wasAnyExtraEnabled = form.tax.enabled || form.discount.enabled
  const willBeAnyExtraEnabled = extrasDraft.tax.enabled || extrasDraft.discount.enabled
  if (!wasAnyExtraEnabled && willBeAnyExtraEnabled) {
    captureSharesSnapshot()
  } else if (wasAnyExtraEnabled && !willBeAnyExtraEnabled) {
    revertSharesSnapshot()
  }

  // Commit draft → form
  form.tax = { ...extrasDraft.tax }
  form.discount = { ...extrasDraft.discount }
  form.serviceCharges = extrasDraft.serviceCharges.map((c) => ({
    ...c,
    selectedMemberIds: [...c.selectedMemberIds],
  }))

  extrasSheetOpen.value = false
}

function cancelExtrasSheet() {
  // Drop the draft entirely — no commit. The next open re-snapshots form.*.
  editingServiceId.value = null
  extrasSheetOpen.value = false
}

// Auto-balance / revert
function captureSharesSnapshot() {
  if (form.splitType !== 'EXACT') return
  if (shareSnapshot.value !== null) return // keep oldest snapshot
  const snap: ShareSnapshot = {}
  for (const m of form.members) snap[m.memberId] = m.exactShareInput
  shareSnapshot.value = snap
}

function revertSharesSnapshot() {
  if (!shareSnapshot.value) return
  const snap = shareSnapshot.value
  form.members = form.members.map((m) => ({
    ...m,
    exactShareInput: snap[m.memberId] ?? m.exactShareInput,
  }))
  shareSnapshot.value = null
}

/**
 * Strip the tax portion out of the entered shares.
 *
 * Mechanically: distribute `baseAmountPreview` among the included members
 * proportionally to their currently entered shares. This avoids per-share
 * rounding drift — the resulting sum is guaranteed to equal `baseAmountPreview`
 * exactly, which is what the rest of the form validates against.
 */
function applyTaxToShares() {
  const state = computedState.value
  const baseTarget = state.baseAmountPreview
  if (baseTarget <= 0) return

  // Capture the exact pre-apply values so revert restores them verbatim.
  const snap: ShareSnapshot = {}
  for (const m of form.members) snap[m.memberId] = m.exactShareInput
  taxApplySnapshot.value = snap

  const inc = includedMembers.value
  if (inc.length === 0) return

  const weights: Record<string, number> = {}
  let weightTotal = 0
  for (const m of inc) {
    const v = parseAmountInput(m.exactShareInput)
    weights[m.memberId] = v
    weightTotal += v
  }
  // If nothing was entered yet, fall through — Apply Tax should never be
  // reachable in that state, but be defensive.
  if (weightTotal <= 0) {
    taxApplySnapshot.value = null
    return
  }

  const distributed = distributeProportionally(baseTarget, weights)
  form.members = form.members.map((m) => ({
    ...m,
    exactShareInput:
      m.includedInSplit && distributed[m.memberId] !== undefined && distributed[m.memberId]! > 0
        ? String(distributed[m.memberId])
        : m.exactShareInput,
  }))
}

function revertApplyTax() {
  if (!taxApplySnapshot.value) return
  const snap = taxApplySnapshot.value
  form.members = form.members.map((m) => ({
    ...m,
    exactShareInput: snap[m.memberId] ?? m.exactShareInput,
  }))
  taxApplySnapshot.value = null
}

function toggleBreakdown(memberId: string) {
  const next = new Set(expandedBreakdowns.value)
  if (next.has(memberId)) next.delete(memberId)
  else next.add(memberId)
  expandedBreakdowns.value = next
}

// Whether to render the per-row breakdown badge for a member. Only mount when
// at least one non-base component is non-zero so we don't add visual noise to
// otherwise plain rows.
function hasMemberExtras(m: EnrichedMemberDraft): boolean {
  return (
    m.serviceChargeSharePreview > 0 ||
    m.taxSharePreview > 0 ||
    m.discountSharePreview > 0
  )
}

function autoBalanceShares() {
  // Redistribute current EXACT shares proportionally so they sum to baseAmountPreview.
  const baseTarget = computedState.value.baseAmountPreview
  if (baseTarget <= 0) return
  captureSharesSnapshot()
  const inc = includedMembers.value
  if (inc.length === 0) return

  const weights: Record<string, number> = {}
  let weightTotal = 0
  for (const m of inc) {
    const v = parseAmountInput(m.exactShareInput)
    weights[m.memberId] = v
    weightTotal += v
  }
  let distributed: Record<string, number>
  if (weightTotal === 0) {
    // Spread equally
    distributed = splitAmountDeterministically(baseTarget, inc.map((m) => m.memberId).sort())
  } else {
    // Proportional distribution
    const provisional = inc.map((m) => {
      const w = weights[m.memberId] ?? 0
      const scaled = (w * baseTarget) / weightTotal
      return { id: m.memberId, base: Math.trunc(scaled), rem: scaled - Math.trunc(scaled) }
    })
    let remaining = baseTarget - provisional.reduce((s, x) => s + x.base, 0)
    const sorted = [...provisional].sort((a, b) => (b.rem === a.rem ? a.id.localeCompare(b.id) : b.rem - a.rem))
    const bonuses: Record<string, number> = {}
    for (const item of sorted) {
      bonuses[item.id] = remaining > 0 ? 1 : 0
      if (remaining > 0) remaining -= 1
    }
    distributed = Object.fromEntries(provisional.map((p) => [p.id, p.base + (bonuses[p.id] ?? 0)]))
  }

  form.members = form.members.map((m) => ({
    ...m,
    exactShareInput: m.includedInSplit && distributed[m.memberId] !== undefined
      ? String(distributed[m.memberId])
      : m.exactShareInput,
  }))
}

// Compute service charge applied-to summary
function serviceMembersSummary(charge: ServiceChargeDraftUi): { label: string; count: number } {
  const validIds = charge.selectedMemberIds.filter((id) => includedMembers.value.some((m) => m.memberId === id))
  const isEveryone = validIds.length === includedMembers.value.length && validIds.length > 0
  if (isEveryone) return { label: text.value.everyone, count: validIds.length }
  const usernames = validIds
    .map((id) => members.value.find((m) => m.id === id)?.username)
    .filter(Boolean)
  return { label: usernames.map((u) => `@${u}`).join(', '), count: validIds.length }
}

// ---- Submit / delete ----
async function submit() {
  errorMessage.value = ''
  if (!canCreateTransactions.value) {
    errorMessage.value = strings.value.needSecondMemberMessage
    return
  }

  const amountInputs = [
    form.totalAmountInput,
    form.tax.enabled ? form.tax.valueInput : '',
    form.discount.enabled ? form.discount.valueInput : '',
    ...form.serviceCharges.map((c) => c.amountInput),
    ...form.members.flatMap((m) => [m.payerAmountInput, form.splitType === 'EXACT' ? m.exactShareInput : '']),
  ]
  if (amountInputs.some((input) => input && isAmountOverflow(input))) {
    errorMessage.value = strings.value.amountTooLarge
    return
  }

  const state = computedState.value
  if (state.hasInvalidTaxPercent) { errorMessage.value = text.value.invalidTaxPercent; return }
  if (state.hasInvalidServiceCharges) { errorMessage.value = text.value.invalidServiceCharge; return }
  if (state.hasInvalidDiscount) { errorMessage.value = text.value.invalidDiscount; return }

  const finalGrandTotal = state.finalGrandTotal
  const payers = form.members
    .map((m) => ({ member_id: m.memberId, amount: parseAmountInput(m.payerAmountInput) }))
    .filter((p) => p.amount > 0)
  const persistedSplitType =
    form.tax.enabled || form.serviceCharges.some((c) => parseAmountInput(c.amountInput) > 0) || form.discount.enabled
      ? 'EXACT'
      : form.splitType
  const normalizedShares = enrichedMembers.value
    .filter((m) => m.includedInSplit)
    .map((m) => ({ member_id: m.memberId, amount: m.finalSharePreview, weight: form.splitType === 'SHARE' ? (m.weight ?? null) : null }))
    .filter((s) => s.amount > 0)
  const validation = validateExpenseDraft({
    title: form.title,
    totalAmount: finalGrandTotal,
    splitType: persistedSplitType,
    payers,
    shares: normalizedShares,
  })
  if (!validation.isValid) {
    errorMessage.value = translateMessageKey(language.value, validation.messageKey) ?? strings.value.genericError
    return
  }
  if (state.remainingPayerAmount !== 0 || state.isPayerOverflow) {
    errorMessage.value = translateMessageKey(language.value, 'EXPENSE_PAYER_TOTAL_MISMATCH') ?? strings.value.genericError
    return
  }
  if (state.remainingBaseShareAmount !== 0 || state.isBaseShareOverflow) {
    errorMessage.value = translateMessageKey(language.value, 'EXPENSE_SHARE_TOTAL_MISMATCH') ?? strings.value.genericError
    return
  }
  if (state.finalShareTotal !== finalGrandTotal) {
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
      total_amount: finalGrandTotal,
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

// Track when user manually edits exact shares — they're claiming ownership of the values,
// so an existing snapshot becomes stale.
watch(
  () => form.members.map((m) => m.exactShareInput).join('|'),
  () => {
    // If user explicitly edits while extras enabled, drop snapshot so we don't accidentally restore.
    if (form.tax.enabled || form.discount.enabled) shareSnapshot.value = null
  },
)

// Any change to the tax inputs invalidates the Apply Tax snapshot — the diff that
// "Apply Tax" was trying to extract no longer matches the user's new tax setup.
watch(
  () => `${form.tax.enabled}|${form.tax.mode}|${form.tax.valueInput}`,
  () => {
    taxApplySnapshot.value = null
  },
)
</script>

<template>
  <div class="page-shell page-stack expense-editor">
    <PageTopBar :title="isEdit ? text.editExpense : text.newExpense" can-go-back sticky @back="router.back()">
      <template #actions>
        <button
          class="filled-button filled-button--sm topbar-save"
          type="button"
          :disabled="!canSubmit || isSaving"
          @click="submit"
        >
          <span v-if="isSaving" class="button-loader" aria-hidden="true"></span>
          {{ canSubmit ? (isEdit ? text.saveChanges : text.save) : text.summaryNeedsInput }}
        </button>
        <button
          v-if="isEdit"
          class="icon-button topbar-icon"
          type="button"
          :aria-label="text.delete"
          @click="removeExpense"
        >
          <Icon name="trash" :size="14" />
        </button>
      </template>
    </PageTopBar>

    <Transition name="rise-soft">
      <InlineAlert v-if="errorMessage" :title="strings.formErrorTitle" :message="errorMessage" />
    </Transition>
    <InlineAlert v-if="!canCreateTransactions" :title="strings.membersAction" :message="text.noticeNoMembers" tone="info" />

    <!-- Title input -->
    <input
      v-model="form.title"
      class="title-input"
      :placeholder="text.titlePlaceholder"
      type="text"
      :dir="isRtl ? 'rtl' : 'ltr'"
    />

    <!-- Amount block — uses AmountField in display variant -->
    <div class="amount-block">
      <AmountField
        v-model="form.totalAmountInput"
        variant="display"
        :suffix="currencyLabel"
        :placeholder="language === 'fa' ? '۰' : '0'"
        :aria-label="strings.totalAmountLabel"
      />
    </div>

    <!-- Note (collapsible) -->
    <Transition name="rise-soft" mode="out-in">
      <button v-if="!noteOpen" key="add" class="note-toggle" type="button" @click="openNote">
        <Icon name="plus" :size="14" />
        {{ text.addNote }}
      </button>
      <div v-else key="open" class="note-block">
        <div class="note-block__header">
          <label class="form-field__label">{{ text.noteLabel }}</label>
          <button class="note-block__remove" type="button" :aria-label="text.removeNote" @click="removeNote">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/>
            </svg>
          </button>
        </div>
        <textarea v-model="form.note" class="text-area" :placeholder="text.notePlaceholder"></textarea>
      </div>
    </Transition>

    <!-- Paid by section -->
    <section class="section paid-by-section">
      <div class="section__head">
        <span class="section__label">{{ text.paidByLabel }}</span>
        <span class="section__hint">
          <template v-if="activePayers.length === 0">—</template>
          <template v-else-if="!isMultiplePayers"><span class="user-tag"><UsernameHandle :username="activePayers[0]?.username ?? ''" /></span></template>
          <template v-else>{{ text.multiplePayersMany(activePayers.length) }}</template>
        </span>
      </div>

      <div class="avatar-strip">
        <button
          v-for="m in enrichedMembers"
          :key="m.memberId"
          class="avatar-strip__btn"
          :class="{ 'is-active': singlePayerId === m.memberId, 'is-multi': isMultiplePayers && parseAmountInput(m.payerAmountInput) > 0 }"
          type="button"
          @click="setSinglePayer(m.memberId)"
        >
          <Avatar
            :name="m.username"
            :size="48"
            :tone="singlePayerId === m.memberId || (isMultiplePayers && parseAmountInput(m.payerAmountInput) > 0) ? 'brand' : 'settled'"
          />
          <span class="avatar-strip__name user-tag"><UsernameHandle :username="m.username" /></span>
        </button>
      </div>

      <button class="nav-row" type="button" @click="payersSheetOpen = true">
        <span class="nav-row__icon">
          <Icon name="users" :size="16" />
        </span>
        <span class="nav-row__label">{{ text.multiplePayersTitle }}</span>
        <span class="nav-row__hint">{{ isMultiplePayers ? text.multiplePayersMany(activePayers.length) : text.multiplePayersHint }}</span>
        <Icon :name="isRtl ? 'chevron-left' : 'chevron-right'" :size="16" class="nav-row__chevron" />
      </button>
    </section>

    <!-- Split section -->
    <section class="section">
      <div class="section__head">
        <span class="section__label">{{ text.splitLabel }}</span>
        <span class="section__hint">
          <template v-if="form.splitType === 'EQUAL' && includedMembers.length > 0 && totalAmountValue > 0">
            {{ includedMembers.length }} · {{ formatAmount(equalEachAmount, language) }} {{ text.eachLabel }}
          </template>
          <template v-else-if="form.splitType === 'EXACT'">{{ includedMembers.length }} · {{ text.splitExact }}</template>
        </span>
      </div>

      <!-- Animated segmented control. The pill indicator is inline-styled so the
           transform respects the document direction reliably (CSS rules that depend on
           [dir='rtl'] further up the DOM are flaky inside scoped styles). -->
      <div class="segmented segmented--anim" role="tablist">
        <span class="segmented__indicator" :style="splitIndicatorStyle"></span>
        <button
          class="segmented__btn"
          :class="{ 'is-active': form.splitType === 'EQUAL' }"
          type="button"
          role="tab"
          @click="form.splitType = 'EQUAL'"
        >{{ text.splitEqual }}</button>
        <button
          class="segmented__btn"
          :class="{ 'is-active': form.splitType === 'EXACT' }"
          type="button"
          role="tab"
          @click="form.splitType = 'EXACT'"
        >{{ text.splitExact }}</button>
        <button
          class="segmented__btn"
          :class="{ 'is-active': form.splitType === 'SHARE' }"
          type="button"
          role="tab"
          @click="selectShareSplitType"
        >{{ strings.shareSplitLabel }}</button>
      </div>

      <!-- Member shares preview/edit (animated content swap).
           DOM order on each row reads (start → end): check, username, avatar, value/field.
           In RTL that maps visually right→left to: check, username, avatar, field. -->
      <Transition name="fade-tab" mode="out-in">
        <div v-if="form.splitType === 'EQUAL'" key="equal" class="share-list share-list--equal">
          <div
            v-for="m in enrichedMembers"
            :key="`share-eq-${m.memberId}`"
            class="share-row"
            :class="{ 'is-excluded': !m.includedInSplit, 'has-extras': hasMemberExtras(m) }"
          >
            <button
              class="share-row__check"
              type="button"
              :aria-pressed="m.includedInSplit"
              @click="toggleMemberIncluded(m.memberId)"
            >
              <Icon v-if="m.includedInSplit" name="check" :size="14" />
            </button>
            <span class="share-row__name user-tag" :title="`@${m.username}`"><UsernameHandle :username="m.username" /></span>
            <Avatar :name="m.username" :size="32" tone="brand" />
            <span class="share-row__amount num">
              {{ m.includedInSplit ? formatAmount(m.finalSharePreview, language) : '—' }}
            </span>
            <ShareExtrasRow
              v-if="hasMemberExtras(m) && m.includedInSplit"
              :member="m"
              :expanded="expandedBreakdowns.has(m.memberId)"
              :text="text"
              :language="language"
              :currency-label="currencyLabel"
              @toggle="toggleBreakdown(m.memberId)"
            />
          </div>
        </div>

        <div v-else-if="form.splitType === 'EXACT'" key="exact" class="share-list share-list--exact">
          <div
            v-for="m in enrichedMembers"
            :key="`share-ex-${m.memberId}`"
            class="share-row"
            :class="{ 'is-excluded': !m.includedInSplit, 'has-extras': hasMemberExtras(m) }"
          >
            <button
              class="share-row__check"
              type="button"
              :aria-pressed="m.includedInSplit"
              @click="toggleMemberIncluded(m.memberId)"
            >
              <Icon v-if="m.includedInSplit" name="check" :size="14" />
            </button>
            <span class="share-row__name user-tag" :title="`@${m.username}`"><UsernameHandle :username="m.username" /></span>
            <Avatar :name="m.username" :size="32" tone="brand" />
            <div class="share-row__field">
              <AmountField
                :model-value="m.exactShareInput"
                variant="md"
                align-end
                :placeholder="placeholderForShare(m.memberId)"
                :aria-label="`@${m.username}`"
                :clearable="true"
                :with-calc="true"
                :disabled="!m.includedInSplit"
                @update:model-value="updateMember(m.memberId, { exactShareInput: $event })"
              />
            </div>
            <ShareExtrasRow
              v-if="hasMemberExtras(m) && m.includedInSplit"
              :member="m"
              :expanded="expandedBreakdowns.has(m.memberId)"
              :text="text"
              :language="language"
              :currency-label="currencyLabel"
              @toggle="toggleBreakdown(m.memberId)"
            />
          </div>
        </div>

        <div v-else key="share-weight" class="share-list share-list--share">
          <p class="share-subtitle">{{ strings.shareSplitSubtitle }}</p>

          <div class="share-summary">
            <div class="share-summary__tile share-summary__tile--brand">
              <span class="share-summary__label">{{ strings.shareValuePerShare }}</span>
              <span class="share-summary__value num">
                <template v-if="shareValuePerShare > 0">{{ formatAmount(shareValuePerShare, language) }}</template>
                <template v-else>—</template>
              </span>
            </div>
            <div class="share-summary__tile">
              <span class="share-summary__label">{{ strings.shareTotalShares }}</span>
              <span class="share-summary__value num">{{ formatShareWeight(shareTotalWeight) }}</span>
            </div>
          </div>

          <article
            v-for="m in form.members"
            :key="`share-w-${m.memberId}`"
            class="share-weight-row"
          >
            <Avatar :name="m.username" :size="28" />
            <div class="share-weight-row__body">
              <span class="share-weight-row__name"><UsernameHandle :username="m.username" /></span>
            </div>
            <div class="share-stepper">
              <button type="button" class="share-stepper__btn" aria-label="−" @click="adjustWeight(m, -0.5)">−</button>
              <span class="share-stepper__value num">{{ formatShareWeight(m.weight) }}</span>
              <button type="button" class="share-stepper__btn share-stepper__btn--brand" aria-label="+" @click="adjustWeight(m, 0.5)">+</button>
            </div>
            <span class="share-weight-row__amount num">{{ formatAmount(amountForShareMember(m), language) }}</span>
          </article>

          <div class="share-presets">
            <button type="button" class="share-preset" @click="setAllWeights(1)">{{ strings.sharePresetAllOne }}</button>
            <button type="button" class="share-preset" @click="setAllWeights(2)">{{ strings.sharePresetAdults }}</button>
            <button type="button" class="share-preset" @click="setAllWeights(0.5)">{{ strings.sharePresetKids }}</button>
            <button type="button" class="share-preset" @click="setAllWeights(0)">{{ strings.sharePresetSkip }}</button>
          </div>

          <p class="share-tip">{{ strings.shareTip }}</p>
        </div>
      </Transition>

      <!-- The per-member quick-fill chip row was replaced by:
           1) a ghost placeholder inside each empty AmountField that previews
              the deterministic fill value (see :placeholder binding above), and
           2) a single bulk "Fill empties" CTA inside the inline notice below.
           That collapses an N-tap flow into one tap and keeps the suggested
           value glued to its target row instead of duplicated in chips. -->

      <!-- Inline share-balance notice. Renders one of four kinds (under / over /
           tax-suggestion / tax-applied) — see baseShareNotice computed for the
           triggering rules and copy. -->
      <Transition name="rise-soft" mode="out-in">
        <div
          v-if="baseShareNotice"
          :key="baseShareNotice.kind"
          class="balance-notice"
          :class="`balance-notice--${baseShareNotice.kind}`"
          role="status"
        >
          <span class="balance-notice__icon" aria-hidden="true">
            <!-- under: arrow-down-circle, over: alert-triangle, tax-suggestion: sparkle/info, tax-applied: check -->
            <template v-if="baseShareNotice.kind === 'under'">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 8v8M9 13l3 3 3-3"/>
              </svg>
            </template>
            <template v-else-if="baseShareNotice.kind === 'over'">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
                <path d="M12 9v4M12 17h.01"/>
              </svg>
            </template>
            <template v-else-if="baseShareNotice.kind === 'tax-suggestion'">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v4h1"/>
              </svg>
            </template>
            <template v-else>
              <Icon name="check" :size="18" />
            </template>
          </span>
          <div class="balance-notice__body">
            <strong class="balance-notice__title">
              <template v-if="baseShareNotice.kind === 'under'">{{ text.shareUnder(formatAmount(baseShareNotice.amount, language)) }}</template>
              <template v-else-if="baseShareNotice.kind === 'over'">{{ text.shareOverflow(formatAmount(baseShareNotice.amount, language)) }}</template>
              <template v-else-if="baseShareNotice.kind === 'tax-suggestion'">{{ text.applyTaxTitle(formatAmount(baseShareNotice.amount, language)) }}</template>
              <template v-else>{{ text.taxAppliedTitle }}</template>
            </strong>
            <span class="balance-notice__hint muted">
              <template v-if="baseShareNotice.kind === 'under'">{{ text.shareUnderHint }}</template>
              <template v-else-if="baseShareNotice.kind === 'over'">{{ text.shareOverHint }}</template>
              <template v-else-if="baseShareNotice.kind === 'tax-suggestion'">{{ text.applyTaxHint }}</template>
              <template v-else>{{ text.taxAppliedHint }}</template>
            </span>
          </div>
          <div class="balance-notice__actions">
            <template v-if="baseShareNotice.kind === 'under' || baseShareNotice.kind === 'over'">
              <button v-if="shareSnapshot" class="outline-button outline-button--sm" type="button" @click="revertSharesSnapshot">{{ text.revert }}</button>
              <!-- "Fill empties" only shows when there's still room AND empty members exist —
                   i.e. the user has enough work left for a one-tap bulk fill to make sense.
                   Auto-balance handles the over case (and any imbalance among already-entered
                   values), so the two CTAs never feel redundant.
                   The button label is short to fit alongside auto-fix on narrow screens; the
                   full descriptive form is exposed via title/aria-label for accessibility. -->
              <button
                v-if="baseShareNotice.kind === 'under' && emptyShareMembers.length > 0"
                class="outline-button outline-button--sm"
                type="button"
                :title="text.fillEmptiesAction(formatAmount(totalEmptyFillAmount, language), emptyShareMembers.length)"
                :aria-label="text.fillEmptiesAction(formatAmount(totalEmptyFillAmount, language), emptyShareMembers.length)"
                @click="fillAllEmpties"
              >{{ text.fillEmptiesActionShort }}</button>
              <button class="filled-button filled-button--sm" type="button" @click="autoBalanceShares">{{ text.autoFix }}</button>
            </template>
            <template v-else-if="baseShareNotice.kind === 'tax-suggestion'">
              <button class="filled-button filled-button--sm" type="button" @click="applyTaxToShares">{{ text.applyTax }}</button>
            </template>
            <template v-else>
              <button class="outline-button outline-button--sm" type="button" @click="revertApplyTax">{{ text.revert }}</button>
            </template>
          </div>
        </div>
      </Transition>

      <!-- Equal "Each" pill -->
      <Transition name="rise-soft">
        <div v-if="form.splitType === 'EQUAL' && includedMembers.length > 0 && equalEachAmount > 0" class="each-pill">
          <span>{{ text.eachLabel }}</span>
          <span class="num">{{ formatAmount(equalEachAmount, language) }} {{ currencyLabel }}</span>
        </div>
      </Transition>
    </section>

    <!-- Extras nav row.
         When something has been committed (tax/services/discount), the hint
         is the live summary, e.g. "Tax 10% · 1 service".
         When nothing is committed, instead of the opaque "بدون افزونه" we
         show a small type-list — مالیات · سرویس‌ها · تخفیف — so the row reads
         as a table of contents and invites the user to open it. The hint
         picks up the .nav-row__hint--available modifier in this state so a
         CSS hook is available if we want to differentiate visually later. -->
    <button class="nav-row nav-row--alone" type="button" @click="openExtrasSheet">
      <span class="nav-row__icon">
        <Icon name="sparkle" :size="16" />
      </span>
      <span class="nav-row__label">{{ text.extrasLabel }}</span>
      <span
        class="nav-row__hint"
        :class="{ 'nav-row__hint--available': !hasCommittedExtras }"
      >{{ hasCommittedExtras ? extrasSummary : extrasTypesPreview }}</span>
      <Icon :name="isRtl ? 'chevron-left' : 'chevron-right'" :size="16" class="nav-row__chevron" />
    </button>

    <!-- Live alert when payer total mismatches -->
    <Transition name="rise-soft">
      <div v-if="summaryAlert" class="form-alert">{{ summaryAlert }}</div>
    </Transition>

    <!-- Grand total recap when there are extras -->
    <Transition name="rise-soft">
      <div v-if="form.tax.enabled || form.serviceCharges.length > 0 || form.discount.enabled" class="grand-total-card">
        <div class="grand-total-card__row">
          <span>{{ text.subtotal }}</span>
          <span class="num">{{ formatAmount(computedState.baseAmountPreview, language) }} {{ currencyLabel }}</span>
        </div>
        <div v-if="form.tax.enabled && computedState.taxAmountPreview > 0" class="grand-total-card__row">
          <span>+ {{ text.tax }}</span>
          <span class="num">+{{ formatAmount(computedState.taxAmountPreview, language) }}</span>
        </div>
        <div v-if="computedState.serviceChargeTotalPreview > 0" class="grand-total-card__row">
          <span>+ {{ text.services }} ({{ form.serviceCharges.filter((c) => parseAmountInput(c.amountInput) > 0).length }})</span>
          <span class="num">+{{ formatAmount(computedState.serviceChargeTotalPreview, language) }}</span>
        </div>
        <div v-if="form.discount.enabled && computedState.discountAmountPreview > 0" class="grand-total-card__row grand-total-card__row--neg">
          <span>− {{ text.discount }}</span>
          <span class="num">−{{ formatAmount(computedState.discountAmountPreview, language) }}</span>
        </div>
        <div class="grand-total-card__total">
          <span>{{ text.grandTotal }}</span>
          <span class="num">{{ formatAmount(computedState.finalGrandTotal, language) }} {{ currencyLabel }}</span>
        </div>
      </div>
    </Transition>

    <!-- ============ Bottom Sheet: Multiple Payers ============ -->
    <Teleport to="body">
      <Transition name="sheet-fade">
        <div v-if="payersSheetOpen" class="sheet-backdrop" @click.self="payersSheetOpen = false">
          <Transition name="sheet-rise">
            <div class="sheet" role="dialog" aria-modal="true">
              <div class="sheet__header">
                <button class="icon-button sheet__close" type="button" :aria-label="text.cancel" @click="payersSheetOpen = false">
                  <Icon name="close" :size="14" />
                </button>
                <strong class="sheet__title">{{ text.payersSheetTitle }}</strong>
                <button class="filled-button filled-button--sm sheet__done" type="button" @click="payersSheetOpen = false">{{ text.done }}</button>
              </div>
              <div class="sheet__body">
                <p class="sheet__sub">{{ text.payersSheetSubtitle }}</p>

                <!-- Live status -->
                <div
                  class="payers-status"
                  :class="{
                    'is-balanced': computedState.remainingPayerAmount === 0 && computedState.payerTotal > 0,
                    'is-over': computedState.isPayerOverflow,
                  }"
                >
                  <div class="payers-status__row">
                    <span class="payers-status__label">
                      <template v-if="computedState.remainingPayerAmount === 0 && computedState.payerTotal > 0">{{ text.balanced }}</template>
                      <template v-else>{{ text.paidSoFar }}</template>
                    </span>
                    <span class="payers-status__amount num">
                      {{ formatAmount(computedState.payerTotal, language) }} / {{ formatAmount(computedState.finalGrandTotal, language) }} {{ currencyLabel }}
                    </span>
                  </div>
                  <div v-if="computedState.remainingPayerAmount !== 0" class="payers-status__hint">
                    <template v-if="computedState.remainingPayerAmount > 0">{{ text.remainingAmount(formatAmount(computedState.remainingPayerAmount, language)) }} {{ currencyLabel }}</template>
                    <template v-else>{{ text.overBy(formatAmount(-computedState.remainingPayerAmount, language)) }} {{ currencyLabel }}</template>
                  </div>
                </div>

                <!-- Payer rows -->
                <div class="payer-rows">
                  <div
                    v-for="m in enrichedMembers"
                    :key="`payer-${m.memberId}`"
                    class="payer-row"
                  >
                    <Avatar :name="m.username" :size="36" tone="accent" />
                    <div class="payer-row__meta">
                      <strong class="user-tag"><UsernameHandle :username="m.username" /></strong>
                      <span class="muted num">{{ m.payerPercent }}% {{ language === 'fa' ? 'از خرج' : 'of expense' }}</span>
                    </div>
                    <div class="payer-row__field">
                      <AmountField
                        :model-value="m.payerAmountInput"
                        variant="md"
                        align-end
                        :suffix="currencyLabel"
                        :placeholder="language === 'fa' ? '۰' : '0'"
                        :aria-label="`@${m.username}`"
                        @update:model-value="updateMember(m.memberId, { payerAmountInput: $event })"
                      />
                    </div>
                    <div class="payer-row__chips">
                      <button class="chip chip--brand" type="button" @click="applyFillRemainingPayer(m.memberId)">
                        {{ text.fillRemaining }}
                      </button>
                      <button class="chip" type="button" @click="applyEvenShareToPayer(m.memberId)">
                        {{ text.evenShare }}
                      </button>
                      <button class="chip" type="button" @click="applyFullAmountToPayer(m.memberId)">
                        {{ text.fullAmount }}
                      </button>
                      <button v-if="m.payerAmountInput" class="chip chip--neg" type="button" @click="clearPayer(m.memberId)">
                        {{ text.clear }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ============ Bottom Sheet: Extras ============ -->
    <Teleport to="body">
      <Transition name="sheet-fade">
        <div v-if="extrasSheetOpen" class="sheet-backdrop" @click.self="cancelExtrasSheet">
          <Transition name="sheet-rise">
            <div class="sheet sheet--tall" role="dialog" aria-modal="true">
              <div class="sheet__header">
                <!-- Cancel: discard draft. Done: commit draft → form. -->
                <button class="icon-button sheet__close" type="button" :aria-label="text.cancel" @click="cancelExtrasSheet">
                  <Icon name="close" :size="14" />
                </button>
                <strong class="sheet__title">{{ text.extrasSheetTitle }}</strong>
                <button class="filled-button filled-button--sm sheet__done" type="button" @click="applyExtrasDraft">{{ text.done }}</button>
              </div>
              <div class="sheet__body">
                <p class="sheet__sub">{{ text.extrasSheetSubtitle }}</p>

                <!-- Tax row — bound to extrasDraft.tax; preview reads draftComputedState. -->
                <div class="extras-row">
                  <div class="extras-row__head">
                    <div class="extras-row__icon extras-row__icon--brand">%</div>
                    <div class="extras-row__copy">
                      <strong>{{ text.tax }}</strong>
                      <span class="muted">{{ text.taxSubtitle }}</span>
                    </div>
                    <label class="switch-button" :class="{ 'is-on': extrasDraft.tax.enabled }">
                      <input
                        :checked="extrasDraft.tax.enabled"
                        class="switch-button__input"
                        type="checkbox"
                        @change="setTaxEnabled(($event.target as HTMLInputElement).checked)"
                      />
                    </label>
                  </div>
                  <Transition name="rise-soft">
                    <div v-if="extrasDraft.tax.enabled" class="extras-row__body">
                      <div class="segmented">
                        <button class="segmented__btn" :class="{ 'is-active': extrasDraft.tax.mode === 'percent' }" type="button" @click="setTaxMode('percent')">{{ text.byPercent }}</button>
                        <button class="segmented__btn" :class="{ 'is-active': extrasDraft.tax.mode === 'amount' }" type="button" @click="setTaxMode('amount')">{{ text.byAmount }}</button>
                      </div>
                      <div class="dual-input">
                        <div class="dual-input__cell">
                          <AmountField
                            v-model="extrasDraft.tax.valueInput"
                            variant="md"
                            :suffix="extrasDraft.tax.mode === 'percent' ? '%' : currencyLabel"
                            mode="percent"
                            :bordered="false"
                            :placeholder="language === 'fa' ? '۰' : '0'"
                          />
                        </div>
                        <div class="dual-input__display">
                          <span class="dual-input__pos">+</span>
                          <span class="num">{{ formatAmount(draftComputedState.taxAmountPreview, language) }}</span>
                          <span>{{ currencyLabel }}</span>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Services — bound to extrasDraft.serviceCharges. -->
                <div class="extras-row">
                  <div class="extras-row__head">
                    <div class="extras-row__icon extras-row__icon--brand">✦</div>
                    <div class="extras-row__copy">
                      <strong>{{ text.services }}</strong>
                      <span class="muted">{{ language === 'fa' ? 'هزینه‌های اضافه با نام و اعضای خاص' : 'Add multiple services, each with its own members' }}</span>
                    </div>
                  </div>
                  <div class="services-list">
                    <TransitionGroup name="rise-soft">
                      <div
                        v-for="(charge, index) in extrasDraft.serviceCharges"
                        :key="charge.id"
                        class="service-item"
                      >
                        <!-- Display row: title + amount stacked, icon actions on the
                             far end, members chip below. The previous layout had
                             "Edit" and "Delete" link buttons crammed against the
                             chip — now they're proper icon buttons with hit-areas
                             and a clear visual hierarchy. -->
                        <div v-if="editingServiceId !== charge.id" class="service-item__display">
                          <div class="service-item__main">
                            <div class="service-item__title">
                              {{ charge.title || `${text.services} ${index + 1}` }}
                            </div>
                            <div class="service-item__amount num">
                              +{{ formatAmount(parseAmountInput(charge.amountInput), language) }} <span class="muted">{{ currencyLabel }}</span>
                            </div>
                          </div>
                          <div class="service-item__icon-actions">
                            <button
                              class="icon-action"
                              type="button"
                              :aria-label="text.editService"
                              :title="text.editService"
                              @click="editingServiceId = charge.id"
                            >
                              <Icon name="edit" :size="16" />
                            </button>
                            <button
                              class="icon-action icon-action--danger"
                              type="button"
                              :aria-label="text.removeService"
                              :title="text.removeService"
                              @click="removeServiceCharge(charge.id)"
                            >
                              <Icon name="trash" :size="16" />
                            </button>
                          </div>
                          <!-- Members chip — full row to itself so long username
                               lists wrap cleanly without colliding with the icons.
                               LTR-isolation keeps "@" anchored to the start of
                               every username regardless of the page direction. -->
                          <span class="chip chip--brand service-item__members">
                            <Icon name="users" :size="11" />
                            <bdi class="service-item__members-label">{{ serviceMembersSummary(charge).label }}</bdi>
                            <span class="service-item__members-count num">· {{ serviceMembersSummary(charge).count }}</span>
                          </span>
                        </div>

                        <div v-else class="service-item__edit">
                          <div class="form-field">
                            <label class="form-field__label">{{ text.serviceName }}</label>
                            <input
                              :value="charge.title"
                              class="text-input"
                              type="text"
                              @input="updateServiceCharge(charge.id, { title: ($event.target as HTMLInputElement).value })"
                            />
                          </div>
                          <div class="form-field">
                            <label class="form-field__label">{{ text.amount }}</label>
                            <AmountField
                              :model-value="charge.amountInput"
                              variant="lg"
                              :suffix="currencyLabel"
                              :placeholder="language === 'fa' ? '۰' : '0'"
                              @update:model-value="updateServiceCharge(charge.id, { amountInput: $event })"
                            />
                          </div>
                          <div class="form-field">
                            <div class="form-field__label-row">
                              <label class="form-field__label">{{ text.serviceMembers }}</label>
                              <div class="quick-pick">
                                <button class="link-button" type="button" @click="selectAllForService(charge.id)">{{ text.everyone }}</button>
                                <button class="link-button link-button--muted" type="button" @click="deselectAllForService(charge.id)">{{ text.clear }}</button>
                              </div>
                            </div>
                            <div class="chip-row">
                              <button
                                v-for="member in includedMembers"
                                :key="`${charge.id}-${member.memberId}`"
                                class="pill-button"
                                :class="{ 'is-selected': charge.selectedMemberIds.includes(member.memberId) }"
                                type="button"
                                @click="toggleServiceMember(charge.id, member.memberId)"
                              >
                                <span class="user-tag"><UsernameHandle :username="member.username" /></span>
                              </button>
                            </div>
                          </div>
                          <button class="filled-button filled-button--sm" type="button" @click="commitService(charge.id)">{{ text.done }}</button>
                        </div>
                      </div>
                    </TransitionGroup>
                  </div>
                  <button class="dashed-button" type="button" @click="addServiceCharge">
                    <Icon name="plus" :size="14" />
                    <span>{{ text.addService }}</span>
                  </button>
                </div>

                <!-- Discount — bound to extrasDraft.discount. -->
                <div class="extras-row">
                  <div class="extras-row__head">
                    <div class="extras-row__icon extras-row__icon--neg">−</div>
                    <div class="extras-row__copy">
                      <strong>{{ text.discount }}</strong>
                      <span class="muted">{{ text.discountSubtitle }}</span>
                    </div>
                    <label class="switch-button" :class="{ 'is-on': extrasDraft.discount.enabled }">
                      <input
                        :checked="extrasDraft.discount.enabled"
                        type="checkbox"
                        class="switch-button__input"
                        @change="setDiscountEnabled(($event.target as HTMLInputElement).checked)"
                      />
                    </label>
                  </div>
                  <Transition name="rise-soft">
                    <div v-if="extrasDraft.discount.enabled" class="extras-row__body">
                      <div class="segmented">
                        <button class="segmented__btn" :class="{ 'is-active': extrasDraft.discount.mode === 'percent' }" type="button" @click="setDiscountMode('percent')">{{ text.byPercent }}</button>
                        <button class="segmented__btn" :class="{ 'is-active': extrasDraft.discount.mode === 'amount' }" type="button" @click="setDiscountMode('amount')">{{ text.byAmount }}</button>
                      </div>
                      <div class="dual-input">
                        <div class="dual-input__cell">
                          <AmountField
                            v-model="extrasDraft.discount.valueInput"
                            variant="md"
                            :suffix="extrasDraft.discount.mode === 'percent' ? '%' : currencyLabel"
                            mode="percent"
                            :bordered="false"
                            :placeholder="language === 'fa' ? '۰' : '0'"
                          />
                        </div>
                        <div class="dual-input__display dual-input__display--neg">
                          <span class="dual-input__neg">−</span>
                          <span class="num">{{ formatAmount(draftComputedState.discountAmountPreview, language) }}</span>
                          <span>{{ currencyLabel }}</span>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Grand total card — previews the impact of the user's draft
                     edits via draftComputedState. The real form/state on the
                     main page only updates after Done is tapped. -->
                <div class="extras-grand">
                  <div class="extras-grand__row">
                    <span>{{ text.subtotal }}</span>
                    <span class="num">{{ formatAmount(draftComputedState.baseAmountPreview, language) }} {{ currencyLabel }}</span>
                  </div>
                  <div v-if="extrasDraft.tax.enabled && draftComputedState.taxAmountPreview > 0" class="extras-grand__row">
                    <span>+ {{ text.tax }}</span>
                    <span class="num">+{{ formatAmount(draftComputedState.taxAmountPreview, language) }}</span>
                  </div>
                  <div v-if="draftComputedState.serviceChargeTotalPreview > 0" class="extras-grand__row">
                    <span>+ {{ text.services }} ({{ extrasDraft.serviceCharges.filter((c) => parseAmountInput(c.amountInput) > 0).length }})</span>
                    <span class="num">+{{ formatAmount(draftComputedState.serviceChargeTotalPreview, language) }}</span>
                  </div>
                  <div v-if="extrasDraft.discount.enabled && draftComputedState.discountAmountPreview > 0" class="extras-grand__row extras-grand__row--neg">
                    <span>− {{ text.discount }}</span>
                    <span class="num">−{{ formatAmount(draftComputedState.discountAmountPreview, language) }}</span>
                  </div>
                  <div class="extras-grand__total">
                    <span>{{ text.grandTotal }}</span>
                    <AmountText :amount="draftComputedState.finalGrandTotal" :language="language" tone="primary" size="lg" />
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.expense-editor { padding-top: 2px; }

/* ---- Username badge — always LTR so @ stays at the start ---- */
.user-tag {
  direction: ltr;
  unicode-bidi: isolate;
  font-family: var(--font-en);
}

/* ---- Topbar ---- */
.topbar-save { padding: 0 var(--s-4); min-height: 36px; }
.topbar-icon {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 0;
  color: var(--fg-subtle);
}
.topbar-icon:hover { color: var(--neg); }

/* ---- Title input ---- */
.title-input {
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  font-size: 24px;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.02em;
  color: var(--fg);
  padding: var(--s-3) 0;
  font-family: var(--font-app);
}
.title-input::placeholder { color: var(--fg-subtle); font-weight: var(--fw-regular); }

/* ---- Amount block ---- */
.amount-block {
  padding: var(--s-5) 0 var(--s-6);
  border-bottom: 1px solid var(--divider);
}

/* ---- Note ---- */
.note-toggle {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  background: transparent;
  border: 0;
  color: var(--fg-muted);
  font-size: var(--t-label);
  cursor: pointer;
}
.note-toggle:hover { color: var(--brand); }
.note-block {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.note-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.note-block__remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface-sunk);
  border: 0;
  color: var(--fg-subtle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), color var(--d-fast) var(--ease-standard);
}
.note-block__remove:hover { background: var(--neg-soft); color: var(--neg); }

/* ---- Section ---- */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-5) 0;
  border-bottom: 1px solid var(--divider);
}
.section:first-of-type { border-top: 0; }

.section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s-3);
}
.section__label {
  font-size: var(--t-label);
  color: var(--fg-subtle);
  font-weight: var(--fw-medium);
}
.section__hint {
  font-size: var(--t-caption);
  color: var(--fg-muted);
}

/* ---- Avatar strip ---- */
.avatar-strip {
  display: flex;
  gap: var(--s-3);
  overflow-x: auto;
  padding-bottom: var(--s-1);
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
}
.avatar-strip::-webkit-scrollbar { display: none; }
.avatar-strip__btn {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: var(--s-1);
  scroll-snap-align: start;
}
.avatar-strip__btn :deep(.avatar) {
  transition: box-shadow var(--d-fast) var(--ease-standard), transform var(--d-fast) var(--ease-standard);
}
.avatar-strip__btn.is-active :deep(.avatar) {
  box-shadow: 0 0 0 3px var(--brand-soft);
  background: var(--brand);
  color: var(--brand-on);
}
.avatar-strip__btn.is-multi :deep(.avatar) {
  box-shadow: 0 0 0 2px var(--brand-soft);
}
.avatar-strip__name {
  font-size: 11px;
  color: var(--fg-muted);
  font-weight: var(--fw-regular);
  white-space: nowrap;
}
.avatar-strip__btn.is-active .avatar-strip__name {
  color: var(--fg);
  font-weight: var(--fw-semibold);
}

/* ---- Nav row ---- */
.nav-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--surface-sunk);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
  color: var(--fg);
  font-size: var(--t-label);
  cursor: pointer;
  text-align: start;
}
.nav-row--alone { margin-top: var(--s-3); }
.nav-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
}
.nav-row__label { flex: 1; font-weight: var(--fw-medium); }
.nav-row__hint {
  font-size: var(--t-caption);
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.nav-row__chevron { color: var(--fg-subtle); flex-shrink: 0; }

/* ---- Animated segmented ---- */
.segmented {
  display: flex;
  background: var(--surface-sunk);
  border-radius: var(--r-md);
  padding: 3px;
  gap: 0;
  position: relative;
}
.segmented--anim {
  isolation: isolate;
}
.segmented__indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: calc(33.333% - 2px);
  background: var(--surface);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-1);
  /* The transform is driven by an inline style from the component (splitIndicatorStyle)
     so it works reliably under both directions, and Vue scoped CSS doesn't have to
     reach the [dir] attribute on the html element. */
  transition: transform var(--d-base) var(--ease-emphasized);
  z-index: 0;
  inset-inline-start: 3px;
  will-change: transform;
}

.segmented__btn {
  flex: 1;
  padding: var(--s-2) var(--s-3);
  font-size: var(--t-body);
  font-weight: var(--fw-medium);
  background: transparent;
  color: var(--fg-muted);
  border: 0;
  border-radius: var(--r-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  transition: color var(--d-base) var(--ease-emphasized);
}
.segmented__btn.is-active {
  color: var(--fg);
}

/* ---- Share list (NEW: 2-row when needed, wider amount field) ---- */
.share-list {
  display: flex;
  flex-direction: column;
}
.share-row {
  /* Logical column order (start → end): check, username, avatar, value/field.
     EQUAL and EXACT share the same grid tracks so the rows feel identical between
     modes — only the contents of the value column differ (input vs. amount label). */
  display: grid;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) 0;
  grid-template-columns: 24px minmax(0, 1fr) 32px clamp(180px, 46%, 300px);
}
.share-row.is-excluded { opacity: 0.55; }
.share-row__check {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--brand);
  color: var(--brand-on);
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard);
}
.share-row.is-excluded .share-row__check {
  background: var(--surface);
  border: 1.5px solid var(--border-strong);
  color: transparent;
}
.share-row__name {
  font-size: var(--t-body);
  color: var(--fg);
  min-width: 0;
  /* Single-line with ellipsis when the username doesn't fit. */
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}
.share-row.is-excluded .share-row__name { color: var(--fg-subtle); }
.share-row__amount {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  /* Sits in the same grid track that the AmountField occupies in EXACT mode and is
     centered within it — matching the EXACT layout, just without a bordered input. */
  text-align: center;
  min-width: 0;
}
.share-row.is-excluded .share-row__amount { color: var(--fg-subtle); font-weight: var(--fw-regular); }
/* In EXACT mode the input fills the whole 4th column — its width is set by the grid
   track, not by the element itself, so every row stays aligned regardless of value. */
.share-row__field { width: 100%; }

/* The .quick-fill-row chip block was removed in favor of the placeholder-driven
   per-row preview + a single bulk "Fill empties" CTA in the inline notice. */

/* ---- Inline share-balance notice ---- */
/* Single component, four variants. Uses CSS custom properties so each variant
   only needs to override two colors instead of repeating the whole rule set. */
.balance-notice {
  --notice-fg: var(--fg);
  --notice-soft: var(--surface-sunk);
  --notice-strong: var(--brand);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--notice-soft);
  border-radius: var(--r-md);
  border: 1px solid color-mix(in srgb, var(--notice-strong) 18%, transparent);
}
.balance-notice__icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--notice-strong) 16%, transparent);
  color: var(--notice-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.balance-notice__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.balance-notice__title {
  font-size: var(--t-label);
  font-weight: var(--fw-semibold);
  color: var(--notice-fg);
  line-height: 1.3;
}
.balance-notice__hint {
  font-size: var(--t-caption);
  color: color-mix(in srgb, var(--notice-fg) 70%, var(--fg-muted));
  line-height: 1.35;
}
.balance-notice__actions {
  display: flex;
  gap: var(--s-2);
  flex-shrink: 0;
}
.balance-notice__actions .filled-button,
.balance-notice__actions .outline-button { width: auto; }
/* Compact button variant scoped to the notice — matches filled-button--sm height
   so the two action buttons read as a balanced pair regardless of which mix
   appears (revert + auto-fix, or just apply-tax). */
.balance-notice__actions .outline-button--sm,
.balance-notice__actions .filled-button--sm {
  min-height: 36px;
  font-size: var(--t-label);
  padding: 0 var(--s-4);
}

/* ---- Variants ----
   "under" = informational (brand soft) — user is still typing.
   "over"  = error (neg/red) — entered too much.
   "tax-suggestion" = warning (warn/amber) — actionable mismatch.
   "tax-applied"    = success (pos/green) — confirmation + revert. */
.balance-notice--under {
  --notice-fg: var(--fg);
  --notice-soft: color-mix(in srgb, var(--brand) 8%, var(--surface-sunk));
  --notice-strong: var(--brand);
}
.balance-notice--over {
  --notice-fg: var(--neg);
  --notice-soft: var(--neg-soft);
  --notice-strong: var(--neg);
}
.balance-notice--tax-suggestion {
  --notice-fg: var(--fg);
  --notice-soft: var(--warn-soft);
  --notice-strong: var(--warn);
}
.balance-notice--tax-applied {
  --notice-fg: var(--pos);
  --notice-soft: var(--pos-soft);
  --notice-strong: var(--pos);
}

@media (max-width: 480px) {
  /* On small screens, the actions wrap below the body so titles/hints have room
     to breathe instead of fighting the buttons for horizontal space. */
  .balance-notice {
    grid-template-columns: auto 1fr;
  }
  .balance-notice__actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

/* ---- Each pill ---- */
.each-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--brand-soft);
  border-radius: var(--r-md);
  font-size: var(--t-label);
}
.each-pill .num {
  color: var(--brand);
  font-weight: var(--fw-semibold);
}

/* ---- Form alert ---- */
.form-alert {
  background: var(--neg-soft);
  color: var(--neg);
  border-radius: var(--r-md);
  padding: var(--s-3) var(--s-4);
  font-size: var(--t-label);
}

/* ---- Grand total recap ---- */
.grand-total-card {
  background: var(--brand-soft);
  border-radius: var(--r-lg);
  padding: var(--s-5) var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.grand-total-card__row {
  display: flex;
  justify-content: space-between;
  font-size: var(--t-label);
  color: var(--fg-muted);
}
.grand-total-card__row--neg { color: var(--neg); }
.grand-total-card__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: var(--s-3);
  padding-top: var(--s-3);
  border-top: 1px solid color-mix(in oklab, var(--brand) 20%, transparent);
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  color: var(--brand);
}
.grand-total-card__total .num {
  font-size: 22px;
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
}

/* ============ Bottom Sheets ============ */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: var(--content-width);
  max-height: 86vh;
  background: var(--surface);
  border-top-left-radius: var(--r-2xl);
  border-top-right-radius: var(--r-2xl);
  box-shadow: var(--shadow-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sheet--tall { max-height: 92vh; }
.sheet__header {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--divider);
  flex-shrink: 0;
}
.sheet__close {
  width: 32px;
  height: 32px;
  background: var(--surface-sunk);
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sheet__title {
  font-size: var(--t-h2);
  font-weight: var(--fw-semibold);
  text-align: center;
}
.sheet__done { padding: 0 var(--s-4); }
.sheet__body {
  padding: var(--s-5);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.sheet__sub {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--t-label);
}

/* Sheet transitions */
.sheet-fade-enter-active, .sheet-fade-leave-active { transition: opacity var(--d-base) var(--ease-standard); }
.sheet-fade-enter-from, .sheet-fade-leave-to { opacity: 0; }
.sheet-rise-enter-active, .sheet-rise-leave-active { transition: transform var(--d-slow) var(--ease-emphasized), opacity var(--d-base) var(--ease-standard); }
.sheet-rise-enter-from, .sheet-rise-leave-to { transform: translateY(36px); opacity: 0; }

/* General rise-soft for inline transitions */
.rise-soft-enter-active, .rise-soft-leave-active {
  transition: opacity var(--d-base) var(--ease-standard), transform var(--d-base) var(--ease-standard), max-height var(--d-base) var(--ease-standard);
  overflow: hidden;
}
.rise-soft-enter-from, .rise-soft-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Tab content cross-fade */
.fade-tab-enter-active, .fade-tab-leave-active {
  transition: opacity var(--d-base) var(--ease-standard), transform var(--d-base) var(--ease-standard);
}
.fade-tab-enter-from { opacity: 0; transform: translateY(6px); }
.fade-tab-leave-to { opacity: 0; transform: translateY(-6px); }

/* ---- Payers sheet ---- */
.payers-status {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: var(--s-4) var(--s-5);
  transition: background var(--d-base) var(--ease-standard), color var(--d-base) var(--ease-standard);
}
.payers-status.is-balanced {
  background: var(--pos-soft);
  border-color: transparent;
  color: var(--pos);
}
.payers-status.is-over {
  background: var(--neg-soft);
  border-color: transparent;
  color: var(--neg);
}
.payers-status__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--s-3);
}
.payers-status__label {
  font-size: 11px;
  font-weight: var(--fw-medium);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.payers-status__amount {
  font-size: 22px;
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
}
.payers-status__hint {
  margin-top: var(--s-2);
  font-size: var(--t-caption);
  color: var(--fg-muted);
}
.payers-status.is-balanced .payers-status__hint,
.payers-status.is-over .payers-status__hint {
  color: inherit;
  opacity: 0.85;
}

.payer-rows {
  display: flex;
  flex-direction: column;
}
.payer-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: var(--s-3) var(--s-3);
  padding: var(--s-4) 0;
  border-bottom: 1px solid var(--divider);
  align-items: center;
}
.payer-row:last-child { border-bottom: 0; }
.payer-row__meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.payer-row__meta strong { font-size: var(--t-label); font-weight: var(--fw-medium); }
.payer-row__meta .muted { font-size: var(--t-caption); color: var(--fg-subtle); }
.payer-row__field {
  min-width: 130px;
}
.payer-row__chips {
  grid-column: 2 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

/* ---- Extras row ---- */
.extras-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
.extras-row__head {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}
.extras-row__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: var(--fw-bold);
  flex-shrink: 0;
}
.extras-row__icon--brand { background: var(--brand-soft); color: var(--brand); }
.extras-row__icon--neg { background: var(--neg-soft); color: var(--neg); font-size: 22px; line-height: 1; }
.extras-row__copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.extras-row__copy strong {
  font-size: var(--t-body);
  font-weight: var(--fw-medium);
}
.extras-row__copy .muted {
  font-size: var(--t-caption);
  color: var(--fg-muted);
}
.extras-row__body {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.dual-input {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
}
.dual-input__cell {
  display: flex;
  align-items: center;
  padding: var(--s-3) var(--s-4);
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  min-height: 56px;
  transition: border-color var(--d-fast) var(--ease-standard), box-shadow var(--d-fast) var(--ease-standard);
}
.dual-input__cell:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--ring);
}
.dual-input__display {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  min-height: 56px;
  font-size: var(--t-body);
}
.dual-input__display .num {
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  color: var(--fg);
}
.dual-input__display span:not(.dual-input__pos):not(.dual-input__neg):not(.num) {
  font-size: 11px;
  color: var(--fg-muted);
}
.dual-input__pos { color: var(--brand); font-weight: var(--fw-semibold); }
.dual-input__neg { color: var(--neg); font-weight: var(--fw-semibold); }

/* Service items */
.services-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.service-item {
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: var(--s-3) var(--s-4);
}
/* Two-line display layout: title+amount on the start side, icon actions
   pinned to the end side, members chip wrapping below across full width. */
.service-item__display {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: var(--s-3);
  row-gap: var(--s-2);
}
.service-item__main {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  flex-wrap: wrap;
  min-width: 0;
}
.service-item__title {
  font-size: var(--t-label);
  font-weight: var(--fw-semibold);
  color: var(--fg);
  min-width: 0;
  word-break: break-word;
}
.service-item__amount {
  font-size: var(--t-label);
  font-weight: var(--fw-semibold);
  color: var(--brand);
  font-variant-numeric: tabular-nums;
}
.service-item__icon-actions {
  display: flex;
  align-items: center;
  gap: var(--s-1);
  flex-shrink: 0;
}
.icon-action {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--fg-subtle);
  border: 0;
  cursor: pointer;
  transition: background var(--d-fast) var(--ease-standard), color var(--d-fast) var(--ease-standard);
}
.icon-action:hover {
  background: var(--hover);
  color: var(--brand);
}
.icon-action--danger:hover {
  background: var(--neg-soft);
  color: var(--neg);
}
.service-item__members {
  /* Span both columns of the grid so the chip can wrap on its own row. */
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* Stretch with content but never overflow the card. */
  max-width: 100%;
  flex-wrap: wrap;
}
.service-item__members-label {
  /* `bdi` already isolates the bidirectional embedding; this keeps the @
     anchored to the start of every username regardless of page direction. */
  direction: ltr;
  unicode-bidi: isolate;
  font-family: var(--font-en);
  font-size: 11px;
  white-space: normal;
  word-break: break-word;
  min-width: 0;
}
.service-item__members-count {
  flex-shrink: 0;
  font-size: 11px;
}
.service-item__edit {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.dashed-button {
  width: 100%;
  padding: var(--s-3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--fg);
  font-size: var(--t-label);
  font-weight: var(--fw-medium);
  cursor: pointer;
}
.dashed-button:hover { background: var(--hover); }

.link-button {
  background: transparent;
  border: 0;
  color: var(--brand);
  font-size: var(--t-caption);
  font-weight: var(--fw-medium);
  cursor: pointer;
  padding: 0;
}
.link-button--danger { color: var(--neg); }
.link-button--muted { color: var(--fg-muted); }

.form-field__label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--s-2);
}
.quick-pick {
  display: inline-flex;
  gap: var(--s-3);
}

/* Grand total card in extras sheet */
.extras-grand {
  background: var(--brand-soft);
  border-radius: var(--r-lg);
  padding: var(--s-5) var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.extras-grand__row {
  display: flex;
  justify-content: space-between;
  font-size: var(--t-label);
  color: var(--fg-muted);
}
.extras-grand__row--neg { color: var(--neg); }
.extras-grand__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: var(--s-3);
  padding-top: var(--s-3);
  border-top: 1px solid color-mix(in oklab, var(--brand) 20%, transparent);
  font-size: var(--t-body);
  font-weight: var(--fw-semibold);
  color: var(--brand);
}

/* ---- Responsive ---- */
@media (max-width: 560px) {
  .title-input { font-size: 22px; }
  /* The grid track defines the field/amount width on small screens too — keep things
     wide enough to be useful without hitting the avatar/username column. */
  .share-row { grid-template-columns: 24px minmax(0, 1fr) 32px clamp(150px, 46%, 220px); }
  .nav-row__hint { max-width: 50%; }
  .payer-row { grid-template-columns: 32px minmax(0, 1fr) auto; }
  .payer-row__chips { grid-column: 1 / -1; }
  .dual-input { grid-template-columns: 1fr; }
}

/* ---- SHARE mode UI ---- */
.share-subtitle {
  font-size: 12px;
  color: var(--fg-muted);
  margin: 0 0 12px;
}
.share-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.share-summary__tile {
  padding: 12px 14px;
  background: var(--surface-sunk);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.share-summary__tile--brand {
  background: var(--brand-soft);
}
.share-summary__label {
  font-size: 11px;
  font-weight: var(--fw-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
}
.share-summary__tile--brand .share-summary__label { color: var(--brand); }
.share-summary__value {
  font-size: 18px;
  font-weight: var(--fw-bold);
  color: var(--fg);
}
.share-summary__tile--brand .share-summary__value { color: var(--brand); }

.share-weight-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}
.share-weight-row + .share-weight-row { border-top: 1px solid var(--divider); }
.share-weight-row__body { flex: 1; min-width: 0; }
.share-weight-row__name { font-size: 14px; font-weight: var(--fw-semibold); }
.share-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-sunk);
  padding: 3px;
  border-radius: var(--r-sm);
}
.share-stepper__btn {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--fg-muted);
  font-size: 16px;
  font-weight: var(--fw-bold);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 0;
}
.share-stepper__btn--brand {
  background: var(--brand-soft);
  color: var(--brand);
}
.share-stepper__value {
  min-width: 36px;
  text-align: center;
  font-size: 15px;
  font-weight: var(--fw-bold);
  font-variant-numeric: tabular-nums;
}
.share-weight-row__amount {
  min-width: 76px;
  text-align: end;
  font-size: 14px;
  font-weight: var(--fw-semibold);
  color: var(--brand);
}
.share-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.share-preset {
  padding: 6px 10px;
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: var(--fw-medium);
  color: var(--fg);
  cursor: pointer;
}
.share-preset:hover { background: var(--hover); }
.share-tip {
  font-size: 12px;
  color: var(--fg-muted);
  line-height: 1.55;
  margin: 0;
}
</style>
