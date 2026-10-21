// Copyright (c) dendr000. MIT License.

// 상용구 묶음(scripts/snippet-packs/*.js)을 워크스페이스의 상용구 폴더에 만들어 넣는다.
//   node scripts/install-snippet-pack.mjs sql                 (워크스페이스는 앱이 마지막에 연 곳)
//   node scripts/install-snippet-pack.mjs sql-practice        (SQL 학습용 이름: emp, dept, student …)
//   node scripts/install-snippet-pack.mjs commands            (슬래시 명령: /접기 /목차 /표 ...)
//   node scripts/install-snippet-pack.mjs langs               (C++·Java·HTML·Python 등 언어 폴더 전부)
//   node scripts/install-snippet-pack.mjs cpp                 (언어 하나만: cpp c java html css python javascript typescript csharp go kotlin rust swift php ruby bash)
//   node scripts/install-snippet-pack.mjs sql --dry-run       (아무것도 안 만들고 개수만 보여 줌)
//   node scripts/install-snippet-pack.mjs sql --workspace D:\WikiDesk
//   node scripts/install-snippet-pack.mjs langs --refresh     (처음 설치한 그대로인 단어의 본문만 새 묶음 내용으로 바꿈, 고친 것은 그대로)
//   node scripts/install-snippet-pack.mjs langs --merge-order (이미 있는 _순서.txt 에 없는 제목만 뒤에 덧붙임)
//
// 파일 이름 규칙(못 쓰는 글자·대소문자 충돌)은 앱과 같은 electron/fileSystem.js 의 ensureSnippet 을
// 그대로 쓴다. 이미 같은 폴더에 같은 제목의 상용구가 있으면 건드리지 않고 건너뛴다(덮어쓰지 않음) —
// 그래서 여러 번 실행해도 안전하다.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { SNIPPET_ORDER_FILE_NAME, ensureSnippet, scanSnippets, snippetsDirPath } from '../electron/fileSystem.js'
import { SQL_PACK } from './snippet-packs/sql.js'
import { SQL_PRACTICE_PACK } from './snippet-packs/sql-practice.js'
import { LANGUAGE_PACKS } from './snippet-packs/langs.js'
import { COMMANDS_PACK } from '../shared/commandsPack.js'
import { parseSnippetOrder } from '../src/lib/snippetOrder.js'

// 'langs' 는 프로그래밍 언어 묶음 전부(폴더마다 하나씩)를 한꺼번에 설치하는 이름이다.
const PACKS = { sql: SQL_PACK, 'sql-practice': SQL_PRACTICE_PACK, commands: COMMANDS_PACK, ...LANGUAGE_PACKS }
const ALL_LANGUAGES = 'langs'

// 묶음의 항목 하나는 제목 문자열(본문도 같음) 또는 { title, content }.
function normalizeEntry(entry) {
  return typeof entry === 'string' ? { title: entry, content: entry } : entry
}

// 묶음을 워크스페이스에 설치한다. dryRun 이면 디스크에 아무것도 쓰지 않고 결과만 계산한다.
// order(선택): 추천 팝업에서의 후보 순서(제목 목록, 자주 쓰는 순). 주어지면 폴더에 순서 목록 파일
// (_순서.txt, 규칙은 src/lib/snippetOrder.js)을 만든다 — 이미 있으면 사용자가 고쳤을 수 있으니 건드리지 않는다.
// mergeOrder: 이미 있는 순서 목록 파일에 묶음의 순서 중 아직 없는 제목만 맨 뒤에 덧붙인다(사용자가 고친 줄과 순서는 그대로).
// refresh: 이미 있는 상용구 중 본문이 제목과 같은 그대로인 것(처음 설치한 단어)만 묶음의 새 본문으로 바꾼다. 사용자가 본문을
//   고친 것은 건드리지 않는다. 단어가 함수 호출(printf -> printf();)로 바뀐 묶음을 이미 설치한 폴더에 반영할 때 쓴다.
// 돌려주는 값: { created, skipped, updated, orderFile, orderAdded }
//   created/skipped/updated = 만든/이미 있어서 건너뛴/본문을 새로 바꾼 제목 목록
//   orderFile = 'created'(새로 씀) | 'kept'(이미 있어서 그대로 둠) | 'merged'(없던 제목만 덧붙임) | 'none'(order 없음) | 'dry-run'(만들 예정)
//   orderAdded = 'merged' 일 때 덧붙인(덧붙일) 제목 수
export function installSnippetPack({ workspacePath, folder, entries, order, dryRun = false, mergeOrder = false, refresh = false }) {
  // 폴더 이름은 Windows 에서 대소문자 구분이 없으므로("SQL" 과 "sql" 은 같은 폴더) 비교도 구분 없이.
  const folderKey = folder.toLowerCase()
  const existingPaths = new Map(
    scanSnippets(workspacePath)
      .filter((snippet) => snippet.category.toLowerCase() === folderKey)
      .map((snippet) => [snippet.title, snippet.path]),
  )
  const existing = new Set(existingPaths.keys())

  const created = []
  const skipped = []
  const updated = []
  for (const raw of entries) {
    const { title, content } = normalizeEntry(raw)
    if (existing.has(title)) {
      const filePath = existingPaths.get(title)
      if (refresh && content !== title && filePath && fs.readFileSync(filePath, 'utf-8') === title) {
        if (!dryRun) fs.writeFileSync(filePath, content, 'utf-8')
        updated.push(title)
      } else {
        skipped.push(title)
      }
      continue
    }
    if (!dryRun) {
      const filePath = ensureSnippet(workspacePath, folder, title)
      fs.writeFileSync(filePath, content, 'utf-8')
    }
    existing.add(title)
    created.push(title)
  }
  return { created, skipped, updated, ...writeOrderFile({ workspacePath, folder, order, dryRun, mergeOrder }) }
}

// 순서 목록 파일을 쓴다(이미 있으면 그대로 둔다). 결과 표시는 installSnippetPack 설명 참고.
function writeOrderFile({ workspacePath, folder, order, dryRun, mergeOrder }) {
  if (!order || order.length === 0) return { orderFile: 'none', orderAdded: 0 }
  // 폴더가 아직 없을 수 있다(상용구를 전부 건너뛴 경우는 이미 있음). 있는 폴더는 대소문자가 달라도 그걸 쓴다.
  const dir = path.join(snippetsDirPath(workspacePath), folder)
  const orderPath = path.join(dir, SNIPPET_ORDER_FILE_NAME)
  if (fs.existsSync(orderPath)) {
    if (!mergeOrder) return { orderFile: 'kept', orderAdded: 0 }
    const current = fs.readFileSync(orderPath, 'utf-8')
    const have = new Set(parseSnippetOrder(current).keys())
    const missing = order.filter((title) => !have.has(title))
    if (missing.length === 0) return { orderFile: 'kept', orderAdded: 0 }
    if (!dryRun) {
      const separator = current.endsWith('\n') ? '' : '\n'
      fs.writeFileSync(orderPath, `${current}${separator}${missing.join('\n')}\n`, 'utf-8')
    }
    return { orderFile: 'merged', orderAdded: missing.length }
  }
  if (dryRun) return { orderFile: 'dry-run', orderAdded: 0 }
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(orderPath, `# 추천 팝업에서 위에 보일 순서 (자주 쓰는 것부터 한 줄에 하나). 메모장으로 고쳐도 됩니다.\n${order.join('\n')}\n`, 'utf-8')
  return { orderFile: 'created', orderAdded: 0 }
}

// 앱이 마지막으로 연 워크스페이스(앱 설정 파일에 저장돼 있음). 없으면 null.
function lastWorkspaceFromAppConfig() {
  const appData = process.env.APPDATA
  if (!appData) return null
  try {
    const config = JSON.parse(fs.readFileSync(path.join(appData, 'wikidesk', 'config.json'), 'utf-8'))
    return typeof config.lastWorkspace === 'string' ? config.lastWorkspace : null
  } catch {
    return null
  }
}

function main(argv) {
  const args = argv.slice(2)
  const packName = args.find((a) => !a.startsWith('--'))
  const dryRun = args.includes('--dry-run')
  const mergeOrder = args.includes('--merge-order')
  const refresh = args.includes('--refresh')
  const wsIndex = args.indexOf('--workspace')
  const workspacePath = wsIndex !== -1 ? args[wsIndex + 1] : lastWorkspaceFromAppConfig()

  const names = packName === ALL_LANGUAGES ? Object.keys(LANGUAGE_PACKS) : [packName]
  if (!names.every((name) => PACKS[name])) {
    console.error(`묶음 이름이 필요합니다. 사용 가능: ${[...Object.keys(PACKS), ALL_LANGUAGES].join(', ')}`)
    process.exitCode = 1
    return
  }
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    console.error('워크스페이스를 찾지 못했습니다. --workspace <경로> 로 지정하세요.')
    process.exitCode = 1
    return
  }

  console.log(`${dryRun ? '[미리보기: 아무것도 만들지 않음] ' : ''}워크스페이스: ${workspacePath}`)
  for (const name of names) {
    const pack = PACKS[name]
    const { created, skipped, updated, orderFile, orderAdded } = installSnippetPack({
      workspacePath,
      folder: pack.folder,
      entries: pack.entries,
      order: pack.order,
      dryRun,
      mergeOrder,
      refresh,
    })
    const orderNote = {
      created: '새로 씀',
      kept: '이미 있어서 그대로 둠',
      merged: `없던 ${orderAdded}개를 뒤에 덧붙임`,
      'dry-run': '만들 예정',
      none: '없음',
    }[orderFile]
    console.log(`${pack.description}`)
    console.log(`  폴더 "${pack.folder}": 새로 만듦 ${created.length}개, 본문 바꿈 ${updated.length}개, 이미 있어서 건너뜀 ${skipped.length}개 / 순서 목록(${SNIPPET_ORDER_FILE_NAME}): ${orderNote}`)
    // 건너뛴 게 많으면(보통 두 번째 실행) 개수만 보여 준다. 몇 개 안 될 때만 이름을 나열.
    if (skipped.length > 0 && skipped.length <= 10) console.log(`  건너뛴 것: ${skipped.join(', ')}`)
  }
}

// 직접 실행했을 때만 동작(시험에서 import 할 때는 실행되지 않게).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv)
