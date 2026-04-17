<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import HeroCard from '@/shared/components/HeroCard.vue'
import PageTopBar from '@/shared/components/PageTopBar.vue'
import InlineAlert from '@/shared/components/InlineAlert.vue'
import AmountText from '@/shared/components/AmountText.vue'
import TransferFlow from '@/shared/components/TransferFlow.vue'
import { useMembersStore } from '@/modules/members/store'
import { useSettlementsStore } from '@/modules/settlements/store'
import { useBalancesStore } from '@/modules/balances/store'
import { useSettingsStore } from '@/shared/stores/settings'
import { useSnackbarStore } from '@/shared/stores/snackbar'
import { digitsOnly, formatAmountInput, parseAmountInput, isAmountOverflow } from '@/shared/utils/format'
import { translateMessageKey } from '@/shared/i18n/strings'
import { resolveAppErrorMessage } from '@/shared/utils/apiErrors'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string
const settlementId = route.params.settlementId as string | undefined
const isEdit = computed(() => Boolean(settlementId))

const membersStore = useMembersStore()
const settlementsStore = useSettlementsStore()
const balancesStore = useBalancesStore()
const settingsStore = useSettingsStore()
const snackbarStore = useSnackbarStore()

const { strings, language } = storeToRefs(settingsStore)
const { byGroupId: membersByGroupId } = storeToRefs(membersStore)
const { byGroupId: settlementsByGroupId } = storeToRefs(settlementsStore)

const members = computed(() => membersByGroupId.value[groupId] ?? [])
const settlement = computed(() => (settlementsByGroupId.value[groupId] ?? []).find((item) => item.id === settlementId))
const balanceResponse = computed(() => balancesStore.byGroupId[groupId])
const errorMessage = ref('')
const isSaving = ref(false)
const prefilledSuggestedAmount = computed(() => parseAmountInput(String(route.query.amount ?? '')))

const form = reactive({
  from_member_id: '',
  to_member_id: '',
  amountInput: '',
  note: '',
})

onMounted(async () => {
  try {
    await Promise.all([membersStore.load(groupId), settlementsStore.load(groupId), balancesStore.load(groupId)])
    if (settlement.value) {
      form.from_member_id = settlement.value.from_member_id
      form.to_member_id = settlement.value.to_member_id
      form.amountInput = String(settlement.value.amount)
      form.note = settlement.value.note ?? ''
    } else {
      form.from_member_id = String(route.query.from ?? members.value[0]?.id ?? '')
      form.to_member_id = String(route.query.to ?? members.value[1]?.id ?? members.value[0]?.id ?? '')
      form.amountInput = prefilledSuggestedAmount.value > 0 ? String(prefilledSuggestedAmount.value) : ''
    }
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
})

const suggestedAmount = computed(() => {
  if (prefilledSuggestedAmount.value > 0 && form.from_member_id === String(route.query.from ?? '') && form.to_member_id === String(route.query.to ?? '')) {
    return prefilledSuggestedAmount.value
  }
  return balanceResponse.value?.simplified_debts.find((item) => item.from_member_id === form.from_member_id && item.to_member_id === form.to_member_id)?.amount ?? 0
})

function selectPayer(memberId: string) {
  form.from_member_id = memberId
  if (form.to_member_id === memberId) {
    const alternative = members.value.find((member) => member.id !== memberId)?.id ?? ''
    form.to_member_id = alternative
  }
}

function selectReceiver(memberId: string) {
  form.to_member_id = memberId
  if (form.from_member_id === memberId) {
    const alternative = members.value.find((member) => member.id !== memberId)?.id ?? ''
    form.from_member_id = alternative
  }
}

function fillSuggestedAmount() {
  if (suggestedAmount.value > 0) form.amountInput = String(suggestedAmount.value)
}

async function submit() {
  errorMessage.value = ''
  if (isAmountOverflow(form.amountInput)) {
    errorMessage.value = strings.value.amountTooLarge
    return
  }
  const amount = parseAmountInput(form.amountInput)
  const messageKey =
    !form.from_member_id || !form.to_member_id
      ? 'SETTLEMENT_SELECT_TWO_MEMBERS'
      : form.from_member_id === form.to_member_id
        ? 'SETTLEMENT_MEMBERS_MUST_DIFFER'
        : amount <= 0
          ? 'SETTLEMENT_AMOUNT_POSITIVE'
          : null

  if (messageKey) {
    errorMessage.value = translateMessageKey(language.value, messageKey) ?? strings.value.genericError
    return
  }

  try {
    isSaving.value = true
    await settlementsStore.save({
      existingId: settlementId,
      group_id: groupId,
      from_member_id: form.from_member_id,
      to_member_id: form.to_member_id,
      amount,
      note: form.note.trim() || null,
    })
    snackbarStore.push(translateMessageKey(language.value, 'SETTLEMENT_SAVED') ?? strings.value.saveSettlement)
    router.back()
  } catch (error) {
    errorMessage.value = resolveAppErrorMessage(error, strings.value, language.value)
  } finally {
    isSaving.value = false
  }
}

async function removeSettlement() {
  if (!settlement.value || !window.confirm(strings.value.confirmDelete)) return
  try {
    await settlementsStore.remove(settlement.value)
    router.back()
  } catch (error) {
    snackbarStore.push(error instanceof Error ? error.message : strings.value.genericError, 'error')
  }
}
</script>

<template>
  <div class="page-shell page-stack">
    <PageTopBar :title="isEdit ? strings.editSettlementTitle : strings.addSettlementTitle" can-go-back @back="router.back()">
      <template #actions>
        <button v-if="isEdit" class="icon-button" type="button" @click="removeSettlement">🗑</button>
      </template>
    </PageTopBar>
    <HeroCard :title="strings.settlementHeroTitle" :subtitle="strings.settlementHeroSubtitle" icon="◍" />

    <div class="surface-card editor-card page-stack">
      <Transition name="feature-transition">
        <InlineAlert v-if="errorMessage" :title="strings.formErrorTitle" :message="errorMessage" />
      </Transition>

      <div class="page-stack">
        <div class="surface-card surface-card--flat" style="padding: 18px;">
          <div class="page-stack" style="gap: 16px;">
            <div v-if="form.from_member_id && form.to_member_id" class="settlement-summary-card">
              <TransferFlow
                :from="members.find((item) => item.id === form.from_member_id)?.username ?? ''"
                :to="members.find((item) => item.id === form.to_member_id)?.username ?? ''"
                :from-caption="strings.payerLabel"
                :to-caption="strings.receiverLabel"
                prefix-at
                stacked
              />
            </div>
            <div class="settlement-picker">
              <strong class="settlement-picker__title">{{ strings.payerLabel }}</strong>
              <div class="settlement-picker-grid">
                <button
                  v-for="member in members"
                  :key="`payer-${member.id}`"
                  class="selection-card settlement-option-card"
                  :class="{ 'is-selected': form.from_member_id === member.id, 'is-muted': form.to_member_id === member.id }"
                  type="button"
                  @click="selectPayer(member.id)"
                >
                  <strong>@{{ member.username }}</strong>
                  <span class="muted">{{ form.from_member_id === member.id ? strings.payerLabel : strings.select }}</span>
                </button>
              </div>
            </div>
            <div class="settlement-picker">
              <strong class="settlement-picker__title">{{ strings.receiverLabel }}</strong>
              <div class="settlement-picker-grid">
                <button
                  v-for="member in members"
                  :key="`receiver-${member.id}`"
                  class="selection-card settlement-option-card"
                  :class="{ 'is-selected': form.to_member_id === member.id, 'is-muted': form.from_member_id === member.id }"
                  type="button"
                  @click="selectReceiver(member.id)"
                >
                  <strong>@{{ member.username }}</strong>
                  <span class="muted">{{ form.to_member_id === member.id ? strings.receiverLabel : strings.select }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <Transition name="feature-transition">
          <div v-if="suggestedAmount > 0" class="suggestion-panel page-stack" style="gap: 10px;">
            <strong>{{ strings.suggestedAmountCardTitle }}</strong>
            <TransferFlow
              class="settlement-flow-line muted"
              :from="members.find((item) => item.id === form.from_member_id)?.username ?? ''"
              :to="members.find((item) => item.id === form.to_member_id)?.username ?? ''"
              prefix-at
            />
            <div class="settlement-suggestion-footer">
              <AmountText :amount="suggestedAmount" :language="language" tone="primary" size="lg" />
              <button class="outline-button" type="button" @click="fillSuggestedAmount">
                {{ strings.fillSuggestedAmountAction }}
              </button>
            </div>
          </div>
        </Transition>
        <div class="form-field">
          <label class="form-field__label">{{ `${strings.settlementAmountLabel} ${language === 'fa' ? '(تومان)' : '(Toman)'}` }}</label>
          <input
            :value="formatAmountInput(form.amountInput, language)"
            class="text-input"
            inputmode="numeric"
            @input="form.amountInput = digitsOnly(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="form-field">
          <label class="form-field__label">{{ strings.noteLabel }}</label>
          <textarea v-model="form.note" class="text-area" />
        </div>
        <button class="filled-button" type="button" :disabled="isSaving" @click="submit">
          <span v-if="isSaving" class="button-loader" aria-hidden="true"></span>
          {{ isEdit ? strings.saveSettlementChanges : strings.saveSettlement }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settlement-summary-card {
  width: 100%;
}

.settlement-flow-line {
  width: 100%;
}

.settlement-suggestion-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
