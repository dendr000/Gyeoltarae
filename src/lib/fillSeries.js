// Copyright (c) dendr000. MIT License.

// 표 편집기 자동 채우기(엑셀의 채우기 핸들)의 규칙. 씨앗(seed)이 되는 칸들의 글자를 받아 이어질 글자를 count 개 돌려준다. 화면과 분리한
// 순수 함수라서 시험할 수 있다. 규칙은 엑셀을 따른다.
//
//   숫자         씨앗이 둘 이상이면 등차(차이가 일정)로 이어 간다. 하나뿐이면 그대로 복사하고, Ctrl(invert)을 누르면 1씩 늘어난다.
//   글자 속 숫자 "항목1", "3호선", "₩500" — 가장 뒤의 정수를 늘린다. 하나만 있어도 이어 가고, Ctrl 을 누르면 복사한다.
//   날짜         2024-01-05 / 2024.01.05 / 2024/01/05 / 2024년 1월 5일 — 하루씩(씨앗이 둘 이상이면 차이만큼, 같은 일자에 달만 바뀌면 달 단위).
//   요일·월 이름 월~일, 월요일~일요일, 1월~12월, Mon~Sun, January~December 등 — 한 바퀴 돈다(씨앗이 둘 이상이면 간격만큼).
//   그 밖        씨앗을 순서대로 반복한다.
// 씨앗이 둘 이상인데 규칙이 맞지 않으면(등차가 아님, 서식이 다름 등) 반복하고, Ctrl(invert)을 누르면 이어 가던 것은 반복(복사)으로, 복사하던
// 것은 이어 가기로 바뀐다.

const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일']
const WEEKDAYS_KO_LONG = WEEKDAYS_KO.map((day) => `${day}요일`)
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_EN_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_KO = Array.from({ length: 12 }, (_, i) => `${i + 1}월`)
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// 한 바퀴 도는 이름 묶음. 씨앗이 모두 들어 있는 첫 묶음을 쓴다(May 는 짧은/긴 이름 둘 다에 있어 둘째 씨앗으로 가려진다).
const CYCLES = [WEEKDAYS_KO, WEEKDAYS_KO_LONG, MONTHS_KO, WEEKDAYS_EN, WEEKDAYS_EN_LONG, MONTHS_EN, MONTHS_EN_LONG]

const EPSILON = 1e-9

function repeatSeeds(seeds, count) {
  return Array.from({ length: count }, (_, k) => seeds[k % seeds.length])
}

// 일정한 차이(등차)인가. 맞으면 그 차이, 아니면 null. 씨앗이 둘 미만이면 null.
function constantStep(values) {
  if (values.length < 2) return null
  const step = values[1] - values[0]
  for (let i = 2; i < values.length; i += 1) {
    if (Math.abs(values[i] - values[i - 1] - step) > EPSILON * Math.max(1, Math.abs(step))) return null
  }
  return step
}

// ---- 요일·월 이름 ------------------------------------------------------------------------------------------------------

function cycleStyle(sample) {
  const letters = sample.replace(/[^A-Za-z]/g, '')
  if (letters.length > 1 && letters === letters.toUpperCase()) return (name) => name.toUpperCase()
  if (letters.length > 1 && letters === letters.toLowerCase()) return (name) => name.toLowerCase()
  return (name) => name
}

// 씨앗이 모두 같은 묶음의 이름이면 { values(k 번째 이름 만들기) } 를 돌려준다. 단 steps: 몇 칸씩 건너뛰는지.
function cycleStrategy(trimmed, dir) {
  const list = CYCLES.find((names) => {
    const lower = names.map((name) => name.toLowerCase())
    return trimmed.every((seed) => lower.includes(seed.toLowerCase()))
  })
  if (!list) return null
  const lower = list.map((name) => name.toLowerCase())
  const indexes = trimmed.map((seed) => lower.indexOf(seed.toLowerCase()))
  const size = list.length
  let step = dir // 씨앗 하나면 채우는 방향으로 한 칸씩
  if (indexes.length > 1) {
    step = (((indexes[1] - indexes[0]) % size) + size) % size
    for (let i = 2; i < indexes.length; i += 1) {
      if ((((indexes[i] - indexes[i - 1]) % size) + size) % size !== step) return { consistent: false }
    }
    if (step === 0) return { consistent: false }
  }
  const style = cycleStyle(trimmed[0])
  const last = indexes[indexes.length - 1]
  return { consistent: true, at: (k) => style(list[(((last + step * k) % size) + size) % size]) }
}

// ---- 날짜 -------------------------------------------------------------------------------------------------------------

// 구분 기호로 이어 쓴 날짜(2024-01-05 등)와 한글 날짜(2024년 1월 5일). 모양만 맞는 글자는 날짜로 읽을 수 있는지 따로 확인한다.
const DATE_SEPARATED = /^(\d{4})([-./])(\d{1,2})\2(\d{1,2})$/
const DATE_KOREAN = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일$/

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// 날짜 모양이면 { shape: true, valid, ... }, 아니면 null.
function parseDate(text) {
  let year
  let month
  let day
  let format
  let m = DATE_SEPARATED.exec(text)
  if (m) {
    year = Number(m[1])
    month = Number(m[3])
    day = Number(m[4])
    // 월·일이 둘 다 두 자리이거나 앞에 0 이 있으면 두 자리로 맞춰 쓰는 서식이다(2024-01-05, 2024-10-15). 한 자리가 보이면 그냥 쓴다.
    const padded = (m[3].length === 2 && m[4].length === 2) || m[3].startsWith('0') || m[4].startsWith('0')
    format = { kind: 'separated', separator: m[2], padded }
  } else {
    m = DATE_KOREAN.exec(text)
    if (!m) return null
    year = Number(m[1])
    month = Number(m[2])
    day = Number(m[3])
    format = { kind: 'korean', separator: '', padded: false }
  }
  const valid = month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  return { valid, year, month, day, format }
}

function formatDate(year, month, day, format) {
  const two = (n) => (format.padded ? String(n).padStart(2, '0') : String(n))
  if (format.kind === 'korean') return `${year}년 ${month}월 ${day}일`
  return `${year}${format.separator}${two(month)}${format.separator}${two(day)}`
}

function sameFormat(a, b) {
  return a.kind === b.kind && a.separator === b.separator && a.padded === b.padded
}

function epochDay(date) {
  return Math.round(Date.UTC(date.year, date.month - 1, date.day) / 86400000)
}

function dateFromEpochDay(days, format) {
  const d = new Date(days * 86400000)
  return formatDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), format)
}

// 모두 날짜 모양이면 { shape: true, ... }. 존재하지 않는 날짜이거나 서식이 서로 다르면 { shape: true, consistent: false }(반복).
function dateStrategy(trimmed, dir) {
  const dates = trimmed.map(parseDate)
  if (dates.some((d) => d === null)) return null
  if (dates.some((d) => !d.valid) || dates.some((d) => !sameFormat(d.format, dates[0].format))) return { consistent: false }
  const format = dates[0].format
  const last = dates[dates.length - 1]
  if (dates.length === 1) {
    const base = epochDay(last)
    return { consistent: true, at: (k) => dateFromEpochDay(base + dir * k, format) }
  }
  // 같은 일자에 달만 바뀌면 달 단위로(1/1, 2/1 → 3/1, 4/1). 씨앗이 둘이면 일 단위 차이는 늘 일정해 보이므로 이쪽을 먼저 본다.
  const monthIndexes = dates.map((d) => d.year * 12 + d.month - 1)
  const monthStep = constantStep(monthIndexes)
  if (dates.every((d) => d.day === dates[0].day) && monthStep !== null && monthStep !== 0) {
    return {
      consistent: true,
      at: (k) => {
        const index = monthIndexes[monthIndexes.length - 1] + monthStep * k
        const year = Math.floor(index / 12)
        const month = (index % 12) + 1
        return formatDate(year, month, Math.min(last.day, daysInMonth(year, month)), format)
      },
    }
  }
  const dayStep = constantStep(dates.map(epochDay))
  if (dayStep !== null && dayStep !== 0) {
    const base = epochDay(last)
    return { consistent: true, at: (k) => dateFromEpochDay(base + dayStep * k, format) }
  }
  return { consistent: false }
}

// ---- 숫자 -------------------------------------------------------------------------------------------------------------

const PURE_NUMBER = /^([+-]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/
// 글자 속 숫자: 앞글자 + 가장 뒤의 정수(쉼표 허용) + 뒷글자(숫자 없음). 하이픈은 부호가 아니라 앞글자의 일부(A-1 → A-2).
const EMBEDDED_NUMBER = /^(.*?)(\d{1,3}(?:,\d{3})+|\d+)(\D*)$/

function parseNumberToken(token, decimals = '') {
  const digits = token.replace(/,/g, '')
  return {
    value: Number(decimals ? `${digits}.${decimals}` : digits),
    comma: token.includes(','),
    decimals: decimals.length,
    // 앞에 0 이 붙은 정수(001)는 자릿수를 맞춰 쓴다.
    pad: !decimals && digits.length > 1 && digits.startsWith('0') ? digits.length : 0,
  }
}

function parseSeedNumber(text) {
  let m = PURE_NUMBER.exec(text)
  if (m) {
    const token = parseNumberToken(m[2], m[3] ?? '')
    return { ...token, value: m[1] === '-' ? -token.value : token.value, prefix: '', suffix: '', embedded: false }
  }
  m = EMBEDDED_NUMBER.exec(text)
  if (!m) return null
  return { ...parseNumberToken(m[2]), prefix: m[1], suffix: m[3], embedded: true }
}

function formatNumber(value, style) {
  const negative = value < 0 && Math.abs(value) > EPSILON
  const fixed = Math.abs(value).toFixed(style.decimals)
  let [integer, fraction] = fixed.split('.')
  if (style.pad) integer = integer.padStart(style.pad, '0')
  if (style.comma) integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${style.prefix}${negative ? '-' : ''}${integer}${fraction !== undefined ? `.${fraction}` : ''}${style.suffix}`
}

function numberStrategy(trimmed, dir) {
  const parsed = trimmed.map(parseSeedNumber)
  if (parsed.some((p) => p === null)) return null
  const first = parsed[0]
  // 앞뒤 글자가 같아야 한 줄로 이어 갈 수 있다(순수 숫자는 앞뒤 글자가 비어 있으므로 글자 속 숫자와 섞이는 경우도 여기서 걸러진다).
  if (parsed.some((p) => p.prefix !== first.prefix || p.suffix !== first.suffix)) return { consistent: false, embedded: first.embedded }
  const style = {
    prefix: first.prefix,
    suffix: first.suffix,
    comma: parsed.some((p) => p.comma),
    decimals: Math.max(...parsed.map((p) => p.decimals)),
    pad: Math.max(...parsed.map((p) => p.pad)),
  }
  const values = parsed.map((p) => p.value)
  const last = values[values.length - 1]
  let step = dir
  if (values.length > 1) {
    step = constantStep(values)
    if (step === null || Math.abs(step) < EPSILON) return { consistent: false, embedded: first.embedded }
  }
  return { consistent: true, embedded: first.embedded, at: (k) => formatNumber(last + step * k, style) }
}

// ---- 공개 함수 --------------------------------------------------------------------------------------------------------

// seeds: 씨앗 칸의 글자들(위에서 아래, 또는 왼쪽에서 오른쪽 순서). 이어질 글자 count 개를 돌려준다.
// options.invert: Ctrl 을 누른 채 끈 경우 — 이어 가던 것은 복사로, 복사하던 것은 이어 가기로 바꾼다. options.backward: 위·왼쪽으로 끈 경우.
export function continueSeries(seeds, count, { invert = false, backward = false } = {}) {
  if (count <= 0) return []
  if (seeds.length === 0) return Array.from({ length: count }, () => '')
  // 위·왼쪽으로 끄는 경우(backward): 씨앗을 이어 붙는 쪽(끝)부터 거꾸로 읽고, 씨앗이 하나일 때의 기본 걸음도 거꾸로(-1)다. 결과는 가까운 칸부터.
  const dir = backward ? -1 : 1
  if (backward) seeds = [...seeds].reverse()

  const trimmed = seeds.map((seed) => seed.trim())
  if (trimmed.some((seed) => seed === '')) return repeatSeeds(seeds, count)

  const strategy = cycleStrategy(trimmed, dir) ?? dateStrategy(trimmed, dir) ?? numberStrategy(trimmed, dir)
  if (!strategy || !strategy.consistent) return repeatSeeds(seeds, count)

  // 하나뿐인 순수 숫자만 기본이 "복사"이고, 나머지는 기본이 "이어 가기"다. Ctrl 은 그 반대로 바꾼다.
  const defaultIncrements = seeds.length > 1 || strategy.embedded !== false
  const increments = invert ? !defaultIncrements : defaultIncrements
  if (!increments) return repeatSeeds(seeds, count)
  return Array.from({ length: count }, (_, k) => strategy.at(k + 1))
}
