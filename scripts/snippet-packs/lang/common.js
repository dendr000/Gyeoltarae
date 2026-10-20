// Copyright (c) dendr000. MIT License.

// 프로그래밍 언어 상용구 묶음을 만드는 공통 도구. 언어 한 개 = 폴더 한 개이고, 폴더 이름은 코드블록의 언어
// 이름(```C++ 등)과 같다 — 앱은 폴더 이름이 언어 이름이면 그 폴더의 상용구를 그 언어의 코드블록에서만 쓴다
// (src/lib/snippetLanguage.js). 그래서 `for`, `class`, `print` 같은 흔한 영어 단어도 글(문단)에는 뜨지 않는다.
//
// 항목은 세 종류다.
//   - 단어: 제목과 본문이 같다(`public` -> `public`). 추천 팝업으로 키워드·자료형·표준 라이브러리 이름을 불러 쓴다.
//     본문이 제목과 같아서 스페이스바 자동 치환이 켜져 있어도 바뀌는 게 없다.
//   - 호출: 함수 이름 뒤에 괄호가 붙는다(`printf` -> `printf();`, 커서는 괄호 안). 아래 calls() 로 만든다.
//   - 틀(template): 짧은 줄임말이 여러 줄 코드로 펼쳐진다(`fori` -> for 반복문). 본문의 {#} 는 펼친 뒤 커서 자리.
//     줄임말은 코드에서 따로 칠 일이 없는 글자로 정했다 — 스페이스바 자동 치환이 `for ` 처럼 키워드 뒤 공백에서
//     틀을 펼쳐 버리면 안 되기 때문이다.

export const words = (text) => text.trim().split(/\s+/)

// 틀 하나. t('fori', '반복문 첫 줄', ...) -> { title, content }. 줄은 \n 으로 이어 붙인다(들여쓰기는 줄에 직접).
export const t = (title, ...lines) => ({ title, content: lines.join('\n') })

// 호출 항목들. 제목은 함수 이름 그대로이고 본문은 괄호가 붙은 모양이다. 커서({#})는 괄호 안에 선다.
//   statements: 문장으로 쓰는 함수 — `printf` -> `printf({#}){end}` (end 는 문장 끝 기호, 예: ';')
//   expressions: 식 안에서 쓰는 함수 — `strlen` -> `strlen({#})` (뒤에 ; 를 붙이면 `int n = strlen();;` 가 되므로 붙이지 않는다)
//   noArgs: 인자가 없는 함수 — `isEmpty` -> `isEmpty(){#}` (커서는 괄호 뒤)
//   braces: 괄호 대신 다른 묶음표 — { 'vec!': '[]' } -> `vec![{#}]`
// 스페이스바 자동 치환은 줄 끝이 제목과 같고 스페이스를 누르면 펼치므로, `size`·`count`·`min`·`sum` 처럼 변수 이름으로도 자주
// 쓰는 이름은 호출 항목으로 만들지 않는다(변수 `size ` 를 쓰다가 `size()` 가 되면 안 된다 — 단어로만 둔다).
export function calls({ statements = [], expressions = [], noArgs = [], end = '', braces = {} }) {
  return [
    ...statements.map((name) => ({ title: name, content: `${name}({#})${end}` })),
    ...expressions.map((name) => ({ title: name, content: `${name}({#})` })),
    ...noArgs.map((name) => ({ title: name, content: `${name}(){#}` })),
    ...Object.entries(braces).map(([name, pair]) => ({ title: name, content: `${name}${pair[0]}{#}${pair[1]}${end}` })),
  ]
}

// 언어 묶음. keywords 는 제목 목록(본문 = 제목), calls 는 calls() 의 결과, templates 는 t() 들, first 는 추천 팝업 맨 위에 둘
// 제목(자주 쓰는 순). 같은 제목은 하나만 남기고 처음 것을 쓴다. 호출은 같은 이름의 단어를 대신한다(printf 는 단어가 아니라
// `printf();` 로 만든다).
export function languagePack({ folder, description, keywords = [], calls: callEntries = [], templates = [], first = [] }) {
  // 틀끼리, 호출끼리 제목이 겹치면 뒤의 것이 조용히 사라지므로 만들 때 바로 알린다.
  for (const [label, list] of [['틀', templates], ['호출', callEntries]]) {
    const titles = list.map((item) => item.title)
    const repeated = titles.filter((title, i) => titles.indexOf(title) !== i)
    if (repeated.length > 0) throw new Error(`${folder}: ${label} 제목이 겹칩니다 — ${repeated.join(', ')}`)
  }
  // 틀 제목이 단어·호출과 같으면 먼저 오는 쪽이 우선이라 틀이 안 만들어진다. 스페이스바 치환이 키워드 뒤 공백에서 틀을
  // 펼치는 사고를 막으려면 틀 제목은 단어와 달라야 하므로 여기서도 막는다.
  const callTitles = new Set(callEntries.map((item) => item.title))
  const wordTitles = new Set([...keywords.filter((item) => typeof item === 'string'), ...callTitles])
  const clash = templates.map((item) => item.title).filter((title) => wordTitles.has(title))
  if (clash.length > 0) throw new Error(`${folder}: 틀 제목이 단어와 같습니다 — ${clash.join(', ')}`)
  const seen = new Set()
  const entries = []
  // 호출을 먼저 넣어서 같은 이름의 단어가 호출을 덮어쓰지 못하게 한다.
  for (const item of [...callEntries, ...keywords, ...templates]) {
    const title = typeof item === 'string' ? item : item.title
    if (seen.has(title)) continue
    seen.add(title)
    entries.push(item)
  }
  const titles = new Set(entries.map((e) => (typeof e === 'string' ? e : e.title)))
  return { folder, description, entries, order: [...new Set(first)].filter((title) => titles.has(title)) }
}
