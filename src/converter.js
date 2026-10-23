const SYMBOLS = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  CHF: '₣',
  KZT: '₸',
  UAH: '₴',
  TRY: '₺',
  INR: '₹',
  KRW: '₩',
  PLN: 'zł',
  CZK: 'Kč',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  HUF: 'Ft',
  BYN: 'Br',
  AMD: '֏',
  GEL: '₾',
  AZN: '₼',
  BRL: 'R$',
  THB: '฿',
  VND: '₫',
  HKD: 'HK$',
  SGD: 'S$',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  BGN: 'лв',
  RON: 'lei',
  MDL: 'L',
  AED: 'د.إ',
  QAR: 'QR',
  EGP: 'E£',
  IDR: 'Rp',
  ZAR: 'R',
}

const POPULAR = ['RUB', 'USD', 'EUR']

export async function loadCurrencies() {
  const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js')

  if (!response.ok) {
    throw new Error('Не удалось получить курсы валют')
  }

  const data = await response.json()
  const currencies = Object.values(data.Valute).filter((currency) => currency.CharCode !== 'RUB')

  currencies.push({
    CharCode: 'RUB',
    ID: 'R01014F',
    Name: 'Российский рубль',
    Nominal: 1,
    NumCode: '643',
    Value: 1,
  })

  currencies.sort((left, right) => {
    const leftRank = POPULAR.indexOf(left.CharCode)
    const rightRank = POPULAR.indexOf(right.CharCode)
    const leftOrder = leftRank === -1 ? POPULAR.length : leftRank
    const rightOrder = rightRank === -1 ? POPULAR.length : rightRank

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.CharCode.localeCompare(right.CharCode)
  })

  return currencies
}

export function convert(amount, from, to) {
  if (!from || !to || !from.Value || !to.Value || !from.Nominal || !to.Nominal) {
    return 0
  }

  const rubles = amount * (from.Value / from.Nominal)
  return rubles * (to.Nominal / to.Value)
}

export function parseAmount(raw) {
  if (!raw) {
    return 0
  }

  const value = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : 0
}

export function displayRaw(raw) {
  return raw || '0'
}

export function formatResult(value) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  const absolute = Math.abs(value)
  let digits = 2

  if (absolute > 0 && absolute < 0.01) {
    digits = 6
  } else if (absolute > 0 && absolute < 1) {
    digits = 4
  }

  let text = value.toFixed(digits)

  if (digits === 2) {
    text = text.replace(/\.00$/, '')
  } else if (text.includes('.')) {
    text = text.replace(/0+$/, '').replace(/\.$/, '')
  }

  if (text === '-0') {
    return '0'
  }

  return text.replace('.', ',')
}

export function withSign(amount, charCode) {
  const sign = SYMBOLS[charCode]

  if (!sign) {
    return `${amount} ${charCode}`
  }

  if (sign.length === 1) {
    return `${amount}${sign}`
  }

  return `${amount} ${sign}`
}
