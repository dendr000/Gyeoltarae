// Copyright (c) dendr000. MIT License.

// 언어 폴더 규칙 — 폴더 이름이 코드블록의 언어 이름이면(`C++`, `Java`, `Python`, `SQL` ...) 그 폴더의 상용구는 그
// 언어의 코드블록 안에서만 쓰인다. `for`, `class`, `print` 같은 영어 단어가 글(문단)에서 추천 팝업과 스페이스바
// 자동 치환에 걸리지 않게 하고, Java 블록에서 C# 의 `public` 이 같이 뜨는 일을 막는다.
//
//   글(코드블록 밖)              : 언어 폴더가 아닌 폴더(공통, 영어 ...)의 상용구만
//   ```Java 블록                 : 언어 폴더가 아닌 폴더 + Java 폴더(문법이 같은 폴더 포함)
//   ```Foobar 처럼 모르는 언어,
//   언어를 안 적은 ``` 블록      : 언어 폴더가 아닌 폴더만
//
// "같은 언어"는 이름이 아니라 칠하는 문법표(highlight.js 문법)로 본다. 그래서 ```MySQL, ```Oracle 블록에서도
// `SQL` 폴더가 쓰이고, ```JS 블록에서 `JavaScript` 폴더가 쓰인다. 툴바 "상용구 삽입" 목록은 이 규칙과 무관하다.
import { openCodeFenceAt } from './codeFence.js'
import { resolveCodeLanguage } from './codeHighlight.js'

// 슬래시 명령 상용구인가 — 제목이 `/` 로 시작한다(예: `/접기`, `/표`). 글(문단)에서 문법을 빠르게 넣는 명령이라 코드블록 안에서는
// 빠진다(코드에서 `//` 주석을 칠 때마다 명령 목록이 뜨면 안 되므로).
export function isSlashCommand(entry) {
  return typeof entry.title === 'string' && entry.title[0] === '/'
}

const grammarByFolder = new Map()

// 폴더 이름이 언어 이름이면 그 언어의 문법표 이름(예: 'cpp'), 아니면 null.
export function folderGrammar(category) {
  if (!grammarByFolder.has(category)) {
    grammarByFolder.set(category, resolveCodeLanguage(category)?.grammar ?? null)
  }
  return grammarByFolder.get(category)
}

// 커서(pos) 자리의 상용구 사용 범위. 글이면 null, 코드블록 안이면 { grammar }(언어를 안 적었거나 모르는 이름이면
// grammar 가 null).
export function snippetContextAt(value, pos) {
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const before = value.slice(0, lineStart).split('\n')
  before.pop() // 마지막 조각은 커서 줄 앞의 빈 칸이라 실제 줄이 아니다
  const open = openCodeFenceAt(before, before.length)
  if (!open) return null
  return { grammar: resolveCodeLanguage(open.lang)?.grammar ?? null }
}

// 같은 목록으로 계속 부르므로(키 하나 칠 때마다) 결과를 기억해 둔다: entries 배열마다 범위별로 한 번만 계산.
const scopeCache = new WeakMap()

export function scopeSnippetsToContext(entries, context) {
  const key = context === null ? '\0prose' : `\0code:${context.grammar ?? ''}`
  let byKey = scopeCache.get(entries)
  if (!byKey) scopeCache.set(entries, (byKey = new Map()))
  const hit = byKey.get(key)
  if (hit) return hit

  const kept = entries.filter((entry) => {
    if (context !== null && isSlashCommand(entry)) return false
    const grammar = folderGrammar(entry.category)
    if (grammar === null) return true
    return context !== null && grammar === context.grammar
  })
  // 문서에서 모은 영어 단어(word: true)는 같은 제목의 상용구가 있으면 뺀다(CREATE 단어와 SQL 폴더의 CREATE 가 둘 다 뜨지 않게).
  const titles = new Set(kept.filter((entry) => !entry.word).map((entry) => entry.title.toLowerCase()))
  const result = kept.filter((entry) => !entry.word || !titles.has(entry.title.toLowerCase()))
  byKey.set(key, result)
  return result
}
