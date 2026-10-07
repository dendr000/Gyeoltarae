// Copyright (c) dendr000. MIT License.

// 상용구 묶음(scripts/snippet-packs/*.js)을 워크스페이스의 상용구 폴더에 만들어 넣는다.
//   node scripts/install-snippet-pack.mjs sql                 (워크스페이스는 앱이 마지막에 연 곳)
//   node scripts/install-snippet-pack.mjs sql --dry-run       (아무것도 안 만들고 개수만 보여 줌)
//   node scripts/install-snippet-pack.mjs sql --workspace D:\WikiDesk
//
// 파일 이름 규칙(못 쓰는 글자·대소문자 충돌)은 앱과 같은 electron/fileSystem.js 의 ensureSnippet 을
// 그대로 쓴다. 이미 같은 폴더에 같은 제목의 상용구가 있으면 건드리지 않고 건너뛴다(덮어쓰지 않음) —
// 그래서 여러 번 실행해도 안전하다.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ensureSnippet, scanSnippets } from '../electron/fileSystem.js'
import { SQL_PACK } from './snippet-packs/sql.js'

const PACKS = { sql: SQL_PACK }

// 묶음의 항목 하나는 제목 문자열(본문도 같음) 또는 { title, content }.
function normalizeEntry(entry) {
  return typeof entry === 'string' ? { title: entry, content: entry } : entry
}

// 묶음을 워크스페이스에 설치한다. dryRun 이면 디스크에 아무것도 쓰지 않고 결과만 계산한다.
// 돌려주는 값: { created: [제목...], skipped: [제목...] } (skipped = 이미 있어서 건너뜀)
export function installSnippetPack({ workspacePath, folder, entries, dryRun = false }) {
  // 폴더 이름은 Windows 에서 대소문자 구분이 없으므로("SQL" 과 "sql" 은 같은 폴더) 비교도 구분 없이.
  const folderKey = folder.toLowerCase()
  const existing = new Set(
    scanSnippets(workspacePath)
      .filter((snippet) => snippet.category.toLowerCase() === folderKey)
      .map((snippet) => snippet.title),
  )

  const created = []
  const skipped = []
  for (const raw of entries) {
    const { title, content } = normalizeEntry(raw)
    if (existing.has(title)) {
      skipped.push(title)
      continue
    }
    if (!dryRun) {
      const filePath = ensureSnippet(workspacePath, folder, title)
      fs.writeFileSync(filePath, content, 'utf-8')
    }
    existing.add(title)
    created.push(title)
  }
  return { created, skipped }
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
  const wsIndex = args.indexOf('--workspace')
  const workspacePath = wsIndex !== -1 ? args[wsIndex + 1] : lastWorkspaceFromAppConfig()

  const pack = PACKS[packName]
  if (!pack) {
    console.error(`묶음 이름이 필요합니다. 사용 가능: ${Object.keys(PACKS).join(', ')}`)
    process.exitCode = 1
    return
  }
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    console.error('워크스페이스를 찾지 못했습니다. --workspace <경로> 로 지정하세요.')
    process.exitCode = 1
    return
  }

  const { created, skipped } = installSnippetPack({ workspacePath, folder: pack.folder, entries: pack.entries, dryRun })
  console.log(`${dryRun ? '[미리보기: 아무것도 만들지 않음] ' : ''}${pack.description}`)
  console.log(`워크스페이스: ${workspacePath}`)
  console.log(`폴더 "${pack.folder}": 새로 만듦 ${created.length}개, 이미 있어서 건너뜀 ${skipped.length}개`)
  if (skipped.length > 0) console.log(`건너뛴 것: ${skipped.join(', ')}`)
}

// 직접 실행했을 때만 동작(시험에서 import 할 때는 실행되지 않게).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv)
