// Copyright (c) dendr000. MIT License.
import { isCodeFenceClose, matchCodeFenceOpen } from './codeFence.js'
import { footnoteRegExp } from './footnoteSyntax.js'

// 인물 표 보기: 등장인물 문서의 인물 블록을 읽어 표로 만들 재료를 뽑는다. 문서 원문은 바꾸지 않는다(읽기 전용).
//
// 인물 블록 = 아래에 더 작은 제목이 없는 제목 하나 + 그 아래 줄들.
//   = 귀능 =                      <- 제목(이름)
//   특기:복사                      <- 속성 줄(키:값)
//   서장의 비서인 판다 혼혈.        <- 설명(첫 줄만 비고로 쓴다)
//   078 긁적긁적                   <- 회차 줄(숫자 3~5자리 + 공백 + 제목·대사)
// 인물 제목 위에 있는 더 큰 제목은 소속(그룹)이 된다. 코드블록(```) 안은 읽지 않는다.
// 돌려주는 값은 화면과 무관한 순수한 데이터라서 시험할 수 있다(tests/lib/characterTable.test.js).

const HEADING_RE = /^(={1,6})(#?)[ \t]*(.+?)[ \t]*\2\1$/
const EPISODE_RE = /^(\d{3,5})[ \t]+(\S.*)$/
// 속성 줄: 짧은 키 + 콜론(반각·전각) + 값. 키는 숫자로 시작하지 않고 12자 이하이며 `//`(주소) 앞이 아니다.
const ATTR_RE = /^([^\s:：\d[\]|*>#{][^:：\n]{0,11}?)[ \t]*[:：][ \t]*(\S.*)$/
// 인물이 아닌 줄: 분류 표시, 목차, 태그 줄, 표 줄, 목록·인용.
const SKIP_LINE_RE = /^(\[\[분류:|\[목차\]|\[tableofcontents\]|\|\||#\S|\*+\s|>)/i

const GROUP_SEPARATOR = ' > '

function cleanName(raw) {
  return raw.replace(footnoteRegExp(true), '').replace(/\[br\]/g, ' ').replace(/\s+/g, ' ').trim()
}

// 같은 키가 두 번 나오면 값을 쉼표로 잇는다.
function addAttr(attrs, key, value) {
  attrs[key] = key in attrs ? `${attrs[key]}, ${value}` : value
}

// 글을 줄 단위로 훑어 제목과 그 아래 줄을 모은다. 코드블록 안은 건너뛴다.
function collectBlocks(text) {
  const rawLines = String(text ?? '').split('\n')
  const blocks = []
  let fence = null
  let offset = 0
  rawLines.forEach((raw, index) => {
    const lineStart = offset
    offset += raw.length + 1
    const line = raw.replace(/\r$/, '')
    if (fence !== null) {
      if (isCodeFenceClose(line, fence.ticks)) fence = null
      return
    }
    const opened = matchCodeFenceOpen(line)
    if (opened !== null) {
      fence = opened
      return
    }
    const trimmed = line.trim()
    const heading = HEADING_RE.exec(trimmed)
    if (heading) {
      blocks.push({ level: heading[1].length, title: heading[3], offset: lineStart, line: index + 1, lines: [] })
      return
    }
    if (blocks.length > 0 && trimmed !== '') blocks[blocks.length - 1].lines.push(trimmed)
  })
  return blocks
}

// 인물 하나의 줄들(제목 아래)을 속성·회차·비고로 나눈다.
function readBody(lines) {
  const attrs = {}
  const episodes = []
  let note = ''
  for (const line of lines) {
    if (SKIP_LINE_RE.test(line)) continue
    const episode = EPISODE_RE.exec(line)
    if (episode) {
      episodes.push({ no: Number(episode[1]), text: episode[2].trim() })
      continue
    }
    const attr = ATTR_RE.exec(line)
    if (attr && !attr[2].startsWith('//')) {
      addAttr(attrs, attr[1].trim(), attr[2].trim())
      continue
    }
    if (note === '') note = line
  }
  return { attrs, episodes, note }
}

// text 의 인물들을 읽는다. 돌려주는 값:
//   characters: [{ id, name, level, group, line, offset, attrs, note, episodes, firstEpisode, lastEpisode, episodeCount,
//                  duplicate(같은 이름이 또 있음), unknownName(이름이 ??? 뿐), empty(속성·회차가 하나도 없음) }]
//   columns: 속성 키들(많이 쓰인 순, 같으면 처음 나온 순)
export function parseCharacters(text) {
  const blocks = collectBlocks(text)
  const characters = []
  const stack = [] // 지금까지 열려 있는 상위 제목들 [{ level, name }]
  blocks.forEach((block, i) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= block.level) stack.pop()
    const name = cleanName(block.title)
    const next = blocks[i + 1]
    const isLeaf = !next || next.level <= block.level
    if (!isLeaf) {
      stack.push({ level: block.level, name })
      return
    }
    const { attrs, episodes, note } = readBody(block.lines)
    const numbers = episodes.map((e) => e.no)
    characters.push({
      id: characters.length,
      name,
      level: block.level,
      group: stack.map((s) => s.name).join(GROUP_SEPARATOR),
      line: block.line,
      offset: block.offset,
      attrs,
      note,
      episodes,
      firstEpisode: numbers.length > 0 ? Math.min(...numbers) : null,
      lastEpisode: numbers.length > 0 ? Math.max(...numbers) : null,
      episodeCount: episodes.length,
      duplicate: false,
      unknownName: /^[?？\s]*$/.test(name),
      empty: Object.keys(attrs).length === 0 && episodes.length === 0,
    })
  })
  const seen = new Map()
  for (const c of characters) seen.set(c.name, (seen.get(c.name) ?? 0) + 1)
  for (const c of characters) c.duplicate = !c.unknownName && seen.get(c.name) > 1
  return { characters, columns: columnsOf(characters) }
}

function columnsOf(characters) {
  const counts = new Map()
  for (const c of characters) for (const key of Object.keys(c.attrs)) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)
}

// 이 글이 "인물 문서"처럼 보이는가: 인물이 3명 이상이고 절반 이상이 속성이나 회차를 가진다. 일반 문서(제목만 있는 글)와 구분해 점검이
// 엉뚱한 글에 인물 경고를 내지 않게 한다.
export function looksLikeCharacterDoc(parsed) {
  const list = parsed.characters
  if (list.length < 3) return false
  return list.filter((c) => !c.empty).length * 2 >= list.length
}
