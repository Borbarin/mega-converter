<script setup>
import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue'
import {
  convert,
  displayRaw,
  formatResult,
  loadCurrencies,
  parseAmount,
  withSign,
} from './converter.js'

const fallbackRub = {
  CharCode: 'RUB',
  ID: 'R01014F',
  Name: 'Российский рубль',
  Nominal: 1,
  NumCode: '643',
  Value: 1,
}

const fallbackUsd = {
  CharCode: 'USD',
  ID: 'R01235',
  Name: 'Доллар США',
  Nominal: 1,
  NumCode: '840',
  Value: 1,
}

const screen = ref('converter')
const editingSide = ref('top')
const activeSide = ref('top')
const activeRaw = ref('100')
const ready = ref(false)
const errorMessage = ref('')
const currencies = ref([])
const filteredCurrencies = ref([])
const topCurrency = ref(fallbackRub)
const bottomCurrency = ref(fallbackUsd)
const searchInput = ref(null)
const currencyList = ref(null)

const parsedAmount = computed(() => parseAmount(activeRaw.value))

const topAmount = computed(() => {
  if (activeSide.value === 'top') {
    return displayRaw(activeRaw.value)
  }

  return formatResult(convert(parsedAmount.value, bottomCurrency.value, topCurrency.value))
})

const bottomAmount = computed(() => {
  if (activeSide.value === 'bottom') {
    return displayRaw(activeRaw.value)
  }

  return formatResult(convert(parsedAmount.value, topCurrency.value, bottomCurrency.value))
})

const topText = computed(() => withSign(topAmount.value, topCurrency.value.CharCode))
const bottomText = computed(() => withSign(bottomAmount.value, bottomCurrency.value.CharCode))

function amountSize(text) {
  if (text.length >= 16) return 'is-xs'
  if (text.length >= 13) return 'is-sm'
  if (text.length >= 10) return 'is-md'
  return ''
}

function applyCurrencyFilter(query) {
  const normalized = query.trim().toLowerCase()

  filteredCurrencies.value = currencies.value.filter((currency) => {
    return (
      currency.CharCode.toLowerCase().includes(normalized) ||
      currency.Name.toLowerCase().includes(normalized)
    )
  })
}

function appendDigit(digit) {
  if (!ready.value) return

  const raw = activeRaw.value
  const commaIndex = raw.indexOf(',')

  if (commaIndex !== -1) {
    if (raw.length - commaIndex - 1 >= 4) return
    activeRaw.value = raw + digit
    return
  }

  if (raw === '0') {
    activeRaw.value = digit
    return
  }

  if (raw.length >= 12) return
  activeRaw.value = raw + digit
}

function appendComma() {
  if (!ready.value || activeRaw.value.includes(',')) return
  activeRaw.value = `${activeRaw.value || '0'},`
}

function backspace() {
  if (!ready.value) return
  activeRaw.value = activeRaw.value.slice(0, -1)
}

function clearActive() {
  if (!ready.value) return
  activeRaw.value = ''
}

function focusSide(side) {
  if (!ready.value || side === activeSide.value) return

  const shown = side === 'top' ? topAmount.value : bottomAmount.value
  activeRaw.value = shown === '0' ? '' : shown
  activeSide.value = side
}

function openPicker(side) {
  if (!ready.value) return

  editingSide.value = side

  if (searchInput.value) {
    searchInput.value.value = ''
  }

  applyCurrencyFilter('')
  screen.value = 'picker'

  nextTick(() => {
    currencyList.value?.scrollTo({ top: 0 })
  })
}

function closePicker() {
  screen.value = 'converter'
}

function isSelected(currency) {
  return (
    currency.CharCode === topCurrency.value.CharCode ||
    currency.CharCode === bottomCurrency.value.CharCode
  )
}

function chooseCurrency(currency) {
  const side = editingSide.value
  const otherSide = side === 'top' ? 'bottom' : 'top'
  const current = side === 'top' ? topCurrency.value : bottomCurrency.value
  const other = otherSide === 'top' ? topCurrency.value : bottomCurrency.value

  if (currency.CharCode !== current.CharCode) {
    if (currency.CharCode === other.CharCode) {
      topCurrency.value = side === 'top' ? other : current
      bottomCurrency.value = side === 'top' ? current : other
    } else if (side === 'top') {
      topCurrency.value = currency
    } else {
      bottomCurrency.value = currency
    }
  }

  screen.value = 'converter'
}

function clearSearch() {
  const input = searchInput.value
  if (!input) return

  input.value = ''
  input.dispatchEvent(new Event('input'))
  input.dispatchEvent(new Event('change'))
  input.focus()
}

function onKeydown(event) {
  if (screen.value !== 'converter') return
  if (event.metaKey || event.ctrlKey || event.altKey) return

  const tag = event.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault()
    appendDigit(event.key)
  } else if (event.key === ',' || event.key === '.') {
    event.preventDefault()
    appendComma()
  } else if (event.key === 'Backspace') {
    event.preventDefault()
    backspace()
  } else if (event.key === 'Escape' || event.key === 'Delete') {
    clearActive()
  }
}

async function loadRates() {
  errorMessage.value = ''

  try {
    const list = await loadCurrencies()
    currencies.value = list
    topCurrency.value = list.find((currency) => currency.CharCode === 'RUB') ?? fallbackRub
    bottomCurrency.value =
      list.find((currency) => currency.CharCode === 'USD') ??
      list.find((currency) => currency.CharCode !== 'RUB') ??
      fallbackUsd
    ready.value = true
    applyCurrencyFilter(searchInput.value?.value ?? '')
  } catch {
    errorMessage.value = 'Не удалось загрузить курсы валют'
  }
}

onMounted(() => {
  const input = searchInput.value

  input.addEventListener('change', (e) => {
    const query = e.target.value.trim().toLowerCase()

    filteredCurrencies.value = currencies.value.filter((currency) => {
      return (
        currency.CharCode.toLowerCase().includes(query) ||
        currency.Name.toLowerCase().includes(query)
      )
    })
  })

  input.addEventListener('input', (e) => {
    e.target.dispatchEvent(new Event('change'))
  })

  window.addEventListener('keydown', onKeydown)
  loadRates()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="stage">
    <div class="phone">
      <section v-show="screen === 'converter'" class="screen">
        <h1 class="app-title">Конвертер валют</h1>

        <div class="cards">
          <article class="card">
            <button class="currency-head" type="button" @click="openPicker('top')">
              <span>
                <strong>{{ topCurrency.CharCode }}</strong>
                <small>{{ topCurrency.Name }}</small>
              </span>
              <svg class="chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 6l6 6-6 6"
                />
              </svg>
            </button>
            <button
              class="amount"
              type="button"
              :aria-pressed="activeSide === 'top'"
              @click="focusSide('top')"
            >
              <span :class="[amountSize(ready ? topText : '…'), { 'is-active': activeSide === 'top' }]">
                {{ ready ? topText : '…' }}
              </span>
            </button>
          </article>

          <article class="card">
            <button class="currency-head" type="button" @click="openPicker('bottom')">
              <span>
                <strong>{{ bottomCurrency.CharCode }}</strong>
                <small>{{ bottomCurrency.Name }}</small>
              </span>
              <svg class="chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 6l6 6-6 6"
                />
              </svg>
            </button>
            <button
              class="amount"
              type="button"
              :aria-pressed="activeSide === 'bottom'"
              @click="focusSide('bottom')"
            >
              <span
                :class="[amountSize(ready ? bottomText : '…'), { 'is-active': activeSide === 'bottom' }]"
              >
                {{ ready ? bottomText : '…' }}
              </span>
            </button>
          </article>
        </div>

        <p v-if="errorMessage" class="banner">
          {{ errorMessage }}
          <button type="button" @click="loadRates">Повторить</button>
        </p>

        <div class="keypad">
          <button class="key key--ac" type="button" :disabled="!ready" @click="clearActive">AC</button>
          <button
            class="key key--icon"
            type="button"
            aria-label="Удалить символ"
            :disabled="!ready"
            @click="backspace"
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
                d="M8.4 5.2h11a1.7 1.7 0 0 1 1.7 1.7v10.2a1.7 1.7 0 0 1-1.7 1.7h-11L3.2 12l5.2-6.8z"
              />
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                d="M10.8 9.4l5 5M15.8 9.4l-5 5"
              />
            </svg>
          </button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('7')">7</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('8')">8</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('9')">9</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('4')">4</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('5')">5</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('6')">6</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('1')">1</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('2')">2</button>
          <button class="key" type="button" :disabled="!ready" @click="appendDigit('3')">3</button>
          <button class="key key--zero" type="button" :disabled="!ready" @click="appendDigit('0')">0</button>
          <button class="key" type="button" :disabled="!ready" @click="appendComma">,</button>
        </div>
      </section>

      <section v-show="screen === 'picker'" class="screen screen--picker">
        <div class="picker-bar">
          <button class="back" type="button" aria-label="Назад" @click="closePicker">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 5l-7 7 7 7"
              />
            </svg>
          </button>
          <h1>Изменить валюту</h1>
          <span></span>
        </div>

        <label class="search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path
              d="M16 16.5L20 20.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <input
            ref="searchInput"
            type="text"
            placeholder="Search currency..."
            aria-label="Поиск валюты"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="search-clear" type="button" aria-label="Очистить поиск" @click="clearSearch">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path
                d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </label>

        <div ref="currencyList" class="currency-list">
          <p v-if="filteredCurrencies.length === 0" class="empty">Валюта не найдена</p>
          <button
            v-for="currency in filteredCurrencies"
            :key="currency.CharCode"
            class="currency-item"
            type="button"
            @click="chooseCurrency(currency)"
          >
            <span>
              <strong>{{ currency.CharCode }}</strong>
              <small>{{ currency.Name }}</small>
            </span>
            <svg
              v-if="isSelected(currency)"
              class="check"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-label="Выбрано"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 12.5l4.2 4.2L19 7.5"
              />
            </svg>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
button {
  appearance: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
}

.stage {
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  overflow: hidden;
  background: #e6e8ee;
}

.phone {
  --green: #2bd06f;
  --ink: #1c1c1e;
  --muted: #8e949e;
  --bg: #f3f4f6;
  width: min(400px, 100%);
  height: 100%;
  max-height: 844px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 36px;
  background: var(--bg);
  box-shadow:
    0 1px 2px rgba(16, 24, 40, 0.04),
    0 24px 50px rgba(16, 24, 40, 0.12);
  user-select: none;
  touch-action: manipulation;
}

.screen {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 16px 14px;
}

.screen--picker {
  padding: 10px 0 12px;
}

.app-title,
.picker-bar h1 {
  margin: 8px 0 18px;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #2c2c2e;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card,
.currency-item {
  background: #fff;
  box-shadow: 0 10px 28px rgba(31, 41, 55, 0.06);
}

.card {
  padding: 16px 16px 14px;
  border-radius: 24px;
}

.currency-head,
.currency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.currency-head strong,
.currency-item strong {
  display: block;
  color: var(--ink);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.15;
}

.currency-head small,
.currency-item small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.25;
}

.chevron {
  flex: 0 0 auto;
  color: #c5c9d0;
}

.amount {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 64px;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 18px;
  background: #eef0f3;
  cursor: pointer;
}

.amount span {
  max-width: 100%;
  overflow: hidden;
  color: var(--ink);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  transition: color 0.15s ease;
}

.amount span.is-active {
  color: var(--green);
}

.amount span.is-md {
  font-size: 28px;
}

.amount span.is-sm {
  font-size: 22px;
}

.amount span.is-xs {
  font-size: 18px;
}

.banner {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
}

.banner button {
  margin-left: 8px;
  color: var(--green);
  font-weight: 600;
  cursor: pointer;
}

.keypad {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.key {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(31, 41, 55, 0.06);
  color: var(--ink);
  font-size: 30px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.08s ease,
    background-color 0.08s ease;
}

.key--ac,
.key--icon {
  color: var(--green);
}

.key--ac {
  grid-column: span 2;
  font-size: 28px;
  font-weight: 500;
}

.key--zero {
  grid-column: span 2;
}

.key:active:not(:disabled) {
  transform: scale(0.985);
  background: #f7f8fa;
}

.key:disabled {
  opacity: 0.45;
  cursor: default;
}

.key:focus,
.currency-head:focus,
.amount:focus,
.currency-item:focus,
.back:focus,
.search-clear:focus,
.banner button:focus {
  outline: none;
}

.key:focus-visible,
.currency-head:focus-visible,
.amount:focus-visible,
.currency-item:focus-visible,
.back:focus-visible,
.search-clear:focus-visible,
.search input:focus-visible,
.banner button:focus-visible {
  outline: 2px solid rgba(43, 208, 111, 0.55);
  outline-offset: 2px;
}

.picker-bar {
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  min-height: 48px;
  padding: 0 8px;
}

.picker-bar h1 {
  margin: 0;
}

.back,
.search-clear {
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--ink);
}

.back {
  width: 44px;
  height: 44px;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  margin: 10px 16px 12px;
  padding: 0 10px 0 14px;
  border-bottom: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(31, 41, 55, 0.05);
  color: #b0b5bd;
}

.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 16px;
  user-select: text;
}

.search input::placeholder {
  color: #b7bcc4;
}

.search-clear {
  width: 32px;
  height: 32px;
  color: #b0b5bd;
}

.currency-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  padding: 4px 16px 20px;
  overscroll-behavior: contain;
}

.currency-list::-webkit-scrollbar {
  width: 0;
}

.currency-item {
  flex: 0 0 auto;
  padding: 16px 18px;
  border-radius: 22px;
}

.currency-item:active {
  background: #fbfbfc;
}

.check {
  flex: 0 0 auto;
  color: var(--green);
}

.empty {
  margin: 32px 8px;
  color: var(--muted);
  font-size: 15px;
  text-align: center;
}

@media (max-width: 520px) {
  .stage {
    padding: 0;
    background: var(--bg);
  }

  .phone {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
