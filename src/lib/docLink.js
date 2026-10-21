// Copyright (c) dendr000. MIT License.
import { stripLeadingNumber } from './displayName.js'

// 문서 링크의 이름 해석과 만들기. 이름이 같은 문서가 여럿이면 [[문서명(폴더명)]] 로 어느 폴더의 문서인지 구분한다(나무위키의 동음이의 문서 표기처럼).
// 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/docLink.test.js).
// docIndex 는 { 이름: [{ path, name }] } 다 — 이름은 파일 이름과, 앞에 순서 번호가 있으면 번호를 뗀 이름 둘 다 키가 된다(store 의 rebuildIndexes).

// 문서(경로)가 들어 있는 폴더의 이름. 윈도(\)·슬래시(/) 경로 모두 된다. 폴더가 없으면 빈 글.
export function parentFolderName(filePath) {
  const parts = String(filePath ?? '').split(/[\\/]/)
  return parts.length >= 2 ? parts[parts.length - 2] : ''
}

function folderMatches(filePath, qualifier) {
  const folder = parentFolderName(filePath)
  return folder === qualifier || stripLeadingNumber(folder) === qualifier
}

function exactCandidates(name, docIndex) {
  // Object 기본 속성 이름(constructor, toString 등)을 문서 목록으로 읽지 않도록 자기 속성만 본다.
  return Object.hasOwn(docIndex, name) && Array.isArray(docIndex[name]) ? docIndex[name] : []
}

// 링크 대상 이름에 해당하는 문서 목록. 이름이 그대로 있으면 그 목록이다(같은 이름이 여럿이면 여럿 — 모호함은 부르는 쪽이 처리).
// 없으면 "문서명(폴더명)" 으로 보고, 그 이름의 문서 중 폴더가 맞는 것만 돌려준다. 폴더 이름은 앞 순서 번호가 있어도 없어도 되고, 폴더 이름 자체에
// 괄호가 있어도(문서명(폴더명(개정판)))된다. 문서 이름 자체에 괄호가 있는 문서(함수(개념))는 이름 그대로 찾는 것이 먼저다.
export function lookupDocCandidates(name, docIndex) {
  const target = String(name ?? '').trim()
  const exact = exactCandidates(target, docIndex)
  if (exact.length > 0) return exact
  if (!target.endsWith(')')) return []
  for (let open = target.indexOf('('); open !== -1; open = target.indexOf('(', open + 1)) {
    const base = target.slice(0, open).trim()
    const qualifier = target.slice(open + 1, -1).trim()
    if (!base || !qualifier) continue
    const matched = exactCandidates(base, docIndex).filter((d) => folderMatches(d.path, qualifier))
    if (matched.length > 0) return matched
  }
  return []
}

// 문서 하나를 가리키는 링크 글([[...]]). 이름만으로 그 문서 하나로 풀리면 [[문서명]] (앞 순서 번호는 뗀 이름을 먼저 쓴다),
// 같은 이름이 여럿이면 [[문서명(폴더명)]] 이다. 만든 글은 lookupDocCandidates 로 되돌려 찾으면 그 문서 하나로 풀리는 것만 쓴다.
// 목록에 아직 없는 문서는 풀리는지 확인할 수 없으므로 이름만으로 만든다.
export function docLinkFor(doc, docIndex) {
  const stripped = stripLeadingNumber(doc.name)
  const names = stripped === doc.name ? [doc.name] : [stripped, doc.name]
  const folder = parentFolderName(doc.path)
  const folders = folder ? [...new Set([stripLeadingNumber(folder), folder])] : []
  const resolvesToDoc = (target) => {
    const found = lookupDocCandidates(target, docIndex)
    return found.length === 1 && found[0].path === doc.path
  }
  // 화면에 보이는 이름(앞 번호를 뗀 이름)을 먼저 쓴다: 이름만 -> 폴더를 붙여서, 그래도 안 되면 번호가 있는 파일 이름으로 같은 순서로.
  for (const name of names) {
    if (resolvesToDoc(name)) return `[[${name}]]`
    for (const f of folders) {
      const target = `${name}(${f})`
      if (resolvesToDoc(target)) return `[[${target}]]`
    }
  }
  return `[[${stripped}]]`
}
