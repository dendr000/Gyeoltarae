import { describe, expect, it } from 'vitest'
import { DEFAULT_MONO_STACK, MONO_FONT_CHOICES, buildMonoStack, isFontInstalled, sanitizeFontFamily } from '../../src/lib/monoFont.js'

// 편집기·코드블록 글꼴을 사용자가 고르는 설정의 규칙. 글꼴 이름은 CSS 값에 들어가므로 따옴표·세미콜론 같은 글자를 걸러 내고,
// 고른 글꼴 뒤에는 항상 D2Coding 과 기본 고정폭 글꼴을 이어 붙여(글꼴이 없는 PC·글자에서도 깨지지 않게) 한 줄 목록으로 만든다.

describe('sanitizeFontFamily - 글꼴 이름 검증', () => {
  it('영문·숫자·한글·공백·하이픈·점·밑줄은 그대로 (앞뒤 공백은 지움)', () => {
    expect(sanitizeFontFamily('  JetBrains Mono ')).toBe('JetBrains Mono')
    expect(sanitizeFontFamily('나눔고딕코딩')).toBe('나눔고딕코딩')
    expect(sanitizeFontFamily('Source Code Pro')).toBe('Source Code Pro')
    expect(sanitizeFontFamily('IBM Plex Mono-Light_2.0')).toBe('IBM Plex Mono-Light_2.0')
  })

  it('따옴표·세미콜론·중괄호·괄호·쉼표·역슬래시·슬래시가 든 이름은 null (CSS 에 끼워 넣을 수 없다)', () => {
    for (const bad of ["Evil'; color: red", 'a"b', 'a;b', 'a{b}', 'url(x)', 'a,b', 'a\\b', 'a/b', '</style>', 'a:b']) {
      expect(sanitizeFontFamily(bad), bad).toBeNull()
    }
  })

  it('작은따옴표 하나만으로도 거른다', () => {
    expect(sanitizeFontFamily("a'b")).toBeNull()
    expect(sanitizeFontFamily("'")).toBeNull()
  })

  it('한글 완성형의 처음(가)과 끝(힣)과 자모(ㄱ)까지 받는다', () => {
    expect(sanitizeFontFamily('가')).toBe('가')
    expect(sanitizeFontFamily('힣')).toBe('힣')
    expect(sanitizeFontFamily('ㄱㅏ')).toBe('ㄱㅏ')
  })

  it('빈 글자·공백뿐·너무 긴 이름은 null', () => {
    expect(sanitizeFontFamily('')).toBeNull()
    expect(sanitizeFontFamily('   ')).toBeNull()
    expect(sanitizeFontFamily('가'.repeat(61))).toBeNull()
    expect(sanitizeFontFamily('가'.repeat(60))).toBe('가'.repeat(60))
  })

  it('글자가 아닌 값은 null', () => {
    expect(sanitizeFontFamily(undefined)).toBeNull()
    expect(sanitizeFontFamily(null)).toBeNull()
    expect(sanitizeFontFamily(12)).toBeNull()
  })

  it('이름 안의 연속 공백은 한 칸으로 줄인다', () => {
    expect(sanitizeFontFamily('Cascadia   Mono')).toBe('Cascadia Mono')
  })
})

describe('buildMonoStack - 글꼴 목록 만들기', () => {
  it('기본값(빈 글자·null)은 D2Coding 기본 목록', () => {
    expect(buildMonoStack('')).toBe(DEFAULT_MONO_STACK)
    expect(buildMonoStack(null)).toBe(DEFAULT_MONO_STACK)
    expect(buildMonoStack(undefined)).toBe(DEFAULT_MONO_STACK)
  })

  it('D2Coding 을 고르면 기본 목록 그대로', () => {
    expect(buildMonoStack('D2Coding')).toBe(DEFAULT_MONO_STACK)
  })

  it('고른 글꼴을 맨 앞에 두고 D2Coding 과 기본 고정폭 글꼴을 뒤에 잇는다', () => {
    expect(buildMonoStack('Cascadia Mono')).toBe("'Cascadia Mono', 'D2Coding', ui-monospace, Consolas, monospace")
    expect(buildMonoStack('나눔고딕코딩')).toBe("'나눔고딕코딩', 'D2Coding', ui-monospace, Consolas, monospace")
  })

  it('검증을 통과하지 못한 이름은 기본 목록으로 돌아간다 (CSS 가 깨지지 않게)', () => {
    expect(buildMonoStack("Evil'; color: red")).toBe(DEFAULT_MONO_STACK)
    expect(buildMonoStack('a;b')).toBe(DEFAULT_MONO_STACK)
  })

  it('D2Coding 이름은 대소문자 무시로 기본 목록', () => {
    expect(buildMonoStack('d2coding')).toBe(DEFAULT_MONO_STACK)
  })
})

describe('MONO_FONT_CHOICES', () => {
  it('첫 항목은 기본(D2Coding)이고 id·이름이 겹치지 않는다', () => {
    expect(MONO_FONT_CHOICES[0].family).toBe('D2Coding')
    expect(new Set(MONO_FONT_CHOICES.map((c) => c.family)).size).toBe(MONO_FONT_CHOICES.length)
  })

  it('모든 후보 이름이 검증을 통과한다', () => {
    for (const choice of MONO_FONT_CHOICES) expect(sanitizeFontFamily(choice.family), choice.family).toBe(choice.family)
  })

  it('한글 2칸 폭인지 표시한다 (D2Coding·굴림체·나눔고딕코딩)', () => {
    const wide = MONO_FONT_CHOICES.filter((c) => c.hangulDouble).map((c) => c.family)
    expect(wide).toContain('D2Coding')
    expect(wide).toContain('GulimChe')
    expect(wide).not.toContain('Consolas')
  })
})

describe('isFontInstalled - 설치 여부 판별 (글자 폭 측정)', () => {
  // measure(cssFamilyList) → 글자 폭. 설치된 글꼴은 목록 맨 앞의 글꼴 폭을 따르고, 없으면 뒤의 일반 글꼴(monospace·serif) 폭을 따른다.
  const GENERIC = { monospace: 100, serif: 80 }
  const make = (installed) => (list) => {
    const parts = list.split(',').map((p) => p.trim().replace(/^'|'$/g, ''))
    const hit = parts.find((p) => installed[p] !== undefined)
    return hit ? installed[hit] : GENERIC[parts[parts.length - 1]]
  }

  it('측정 폭이 일반 글꼴과 다르면 설치된 것이다', () => {
    expect(isFontInstalled('Fira Code', make({ 'Fira Code': 120 }))).toBe(true)
  })

  it('일반 monospace 와 폭이 같은 글꼴(Consolas 가 기본 고정폭인 PC)도 serif 비교로 설치됨을 알아본다', () => {
    const measure = (list) => (list.startsWith("'Consolas'") ? 100 : GENERIC[list.split(',').pop().trim()])
    expect(isFontInstalled('Consolas', measure)).toBe(true)
  })

  it('없는 글꼴은 일반 글꼴 폭과 같아서 설치 안 됨', () => {
    expect(isFontInstalled('Nope Font', make({}))).toBe(false)
  })
})
