// Copyright (c) dendr000. MIT License.
import fs from 'node:fs'
import path from 'node:path'
import { COMMANDS_PACK } from '../shared/commandsPack.js'
import { SNIPPET_ORDER_FILE_NAME, SNIPPETS_DIR_NAME, ensureSnippet, snippetsDirPath } from './fileSystem.js'

// 새 워크스페이스를 처음 열 때 슬래시 명령(`/접기`, `/목차`, `/표` ...)을 자동으로 넣어 준다. 슬래시 명령은 앱 안이 아니라 워크스페이스 폴더 안의
// 상용구 폴더(.wikidesk-snippets/명령)에 저장되는 상용구라서, 빈 폴더를 고른 사람은 직접 설치하지 않으면 하나도 쓸 수 없었다.
//
// 조건 (둘 다 만족할 때만 넣는다):
//   1. 이 폴더에 이미 상용구 폴더(.wikidesk-snippets)가 없다 — 상용구를 이미 쓰고 있는 워크스페이스(직접 설치했거나 지웠거나 고른 것)는 건드리지 않는다.
//   2. 이 PC 에서 이 폴더에 한 번도 넣은 적이 없다(offered 목록에 없다) — 넣은 뒤 사용자가 지웠다면 다음 실행에서 되살리지 않는다.
// 한 번 확인한 폴더는 조건에 맞든 안 맞든 offered 에 기록한다(그래서 나중에 상용구 폴더를 지워도 다시 넣지 않는다).

// 같은 폴더를 다른 모양의 경로로 열어도 같은 것으로 본다(윈도는 대소문자 구분이 없다).
export function workspaceKey(workspacePath) {
  const resolved = path.resolve(workspacePath)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

// 목록이 배열이 아니거나 이상한 값이 섞여 있어도 문자열만 남긴다(망가진 설정 파일 대비).
export function normalizeOffered(offered) {
  return Array.isArray(offered) ? offered.filter((item) => typeof item === 'string') : []
}

// 묶음을 폴더에 만들고 만든 상용구 개수를 돌려준다. 이미 있는 파일은 건드리지 않는다.
export function installStarterCommands(workspacePath) {
  const { folder, entries, order } = COMMANDS_PACK
  let created = 0
  for (const { title, content } of entries) {
    const filePath = ensureSnippet(workspacePath, folder, title)
    fs.writeFileSync(filePath, content, 'utf-8')
    created += 1
  }
  const dir = path.join(snippetsDirPath(workspacePath), folder)
  const orderPath = path.join(dir, SNIPPET_ORDER_FILE_NAME)
  if (order?.length && !fs.existsSync(orderPath)) {
    fs.writeFileSync(orderPath, `# 추천 팝업에서 위에 보일 순서 (자주 쓰는 것부터 한 줄에 하나). 메모장으로 고쳐도 됩니다.\n${order.join('\n')}\n`, 'utf-8')
  }
  return created
}

// 워크스페이스를 열 때 부른다. 넣었는지와, 갱신된 offered 목록을 돌려준다(저장은 부르는 쪽이 한다). 이미 확인한 폴더면 목록 그대로다.
export function ensureStarterCommands(workspacePath, offered) {
  const list = normalizeOffered(offered)
  const key = workspaceKey(workspacePath)
  if (list.includes(key)) return { installed: false, offered: list, changed: false }
  const hasSnippetsDir = fs.existsSync(path.join(workspacePath, SNIPPETS_DIR_NAME))
  const installed = !hasSnippetsDir && installStarterCommands(workspacePath) > 0
  return { installed, offered: [...list, key], changed: true }
}
