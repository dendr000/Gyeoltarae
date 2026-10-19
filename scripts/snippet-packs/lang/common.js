// Copyright (c) dendr000. MIT License.

// 프로그래밍 언어 상용구 묶음을 만드는 공통 도구. 언어 한 개 = 폴더 한 개이고, 폴더 이름은 코드블록의 언어
// 이름(```C++ 등)과 같다 — 앱은 폴더 이름이 언어 이름이면 그 폴더의 상용구를 그 언어의 코드블록에서만 쓴다
// (src/lib/snippetLanguage.js). 그래서 `for`, `class`, `print` 같은 흔한 영어 단어도 글(문단)에는 뜨지 않는다.
//
// 항목은 두 종류다.
//   - 단어: 제목과 본문이 같다(`public` -> `public`). 추천 팝업으로 키워드·자료형·표준 라이브러리 이름을 불러 쓴다.
//     본문이 제목과 같아서 스페이스바 자동 치환이 켜져 있어도 바뀌는 게 없다.
//   - 틀(template): 짧은 줄임말이 여러 줄 코드로 펼쳐진다(`fori` -> for 반복문). 본문의 {#} 는 펼친 뒤 커서 자리.
//     줄임말은 코드에서 따로 칠 일이 없는 글자로 정했다 — 스페이스바 자동 치환이 `for ` 처럼 키워드 뒤 공백에서
//     틀을 펼쳐 버리면 안 되기 때문이다.

export const words = (text) => text.trim().split(/\s+/)

// 틀 하나. t('fori', '반복문 첫 줄', ...) -> { title, content }. 줄은 \n 으로 이어 붙인다(들여쓰기는 줄에 직접).
export const t = (title, ...lines) => ({ title, content: lines.join('\n') })

// 언어 묶음. keywords 는 제목 목록(본문 = 제목), templates 는 t() 들, first 는 추천 팝업 맨 위에 둘 제목
// (자주 쓰는 순). 같은 제목은 하나만 남기고 처음 것을 쓴다(틀이 단어를 덮어쓰지 않는다).
export function languagePack({ folder, description, keywords = [], templates = [], first = [] }) {
  // 틀끼리 제목이 겹치면 뒤의 것이 조용히 사라지므로 만들 때 바로 알린다.
  const templateTitles = templates.map((item) => item.title)
  const repeated = templateTitles.filter((title, i) => templateTitles.indexOf(title) !== i)
  if (repeated.length > 0) throw new Error(`${folder}: 틀 제목이 겹칩니다 — ${repeated.join(', ')}`)
  // 틀 제목이 단어와 같으면 단어(제목 = 본문)가 우선이라 틀이 안 만들어진다. 스페이스바 치환이 키워드 뒤 공백에서 틀을
  // 펼치는 사고를 막으려면 틀 제목은 단어와 달라야 하므로 여기서도 막는다.
  const wordTitles = new Set(keywords.filter((item) => typeof item === 'string'))
  const clash = templateTitles.filter((title) => wordTitles.has(title))
  if (clash.length > 0) throw new Error(`${folder}: 틀 제목이 단어와 같습니다 — ${clash.join(', ')}`)
  const seen = new Set()
  const entries = []
  for (const item of [...keywords, ...templates]) {
    const title = typeof item === 'string' ? item : item.title
    if (seen.has(title)) continue
    seen.add(title)
    entries.push(item)
  }
  const titles = new Set(entries.map((e) => (typeof e === 'string' ? e : e.title)))
  return { folder, description, entries, order: [...new Set(first)].filter((title) => titles.has(title)) }
}
