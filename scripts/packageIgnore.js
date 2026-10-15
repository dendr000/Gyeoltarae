// Copyright (c) dendr000. MIT License.

// 배포 빌드(scripts/package-win.js)에 넣지 않을 파일을 정하는 규칙. 다른 사람에게 줄 앱 안에 계획서(docs), 임시 메모, 이 PC 경로가 든
// 바로가기(.lnk), 쓰지 않는 node_modules 6천여 개가 같이 들어가던 것을 막는다. 실제 패키징 없이 시험할 수 있게 순수 함수로 둔다.
import fs from 'node:fs'
import path from 'node:path'
import { builtinModules } from 'node:module'

// 경로는 앱 폴더를 뿌리로 한 "/" 로 시작하는 모양이다(패키저가 이 모양으로 넘긴다). 폴더 항목도 함께 들어온다.
const ALWAYS_IGNORED = [
  /^\/src(\/|$)/,
  /^\/scripts(\/|$)/,
  /^\/tests(\/|$)/,
  /^\/\.claude(\/|$)/,
  /^\/\.git(\/|$)/,
  /^\/release(-packager)?(\/|$)/,
  /^\/index\.html$/,
  /^\/vite\.config\.js$/,
  /^\/CHANGELOG\.md$/,
  /^\/README\.md$/,
  // 개발·문서·임시 파일
  /^\/docs(\/|$)/, // 계획서·기능 설명·CHANGELOG (받는 사람에게 필요 없고 이 PC 경로가 들어 있다)
  /^\/public(\/|$)/, // vite 가 이미 dist 로 복사한 정적 파일의 원본
  /^\/build\/icon\.(svg|png)$/, // 아이콘 원본 — 창 아이콘으로 실행 중에 읽는 build/icon.ico 만 남긴다
  /^\/electron-test-log\.txt$/,
  /^\/scratch-/, // scratch-portfolio.md / .b64 같은 메모
  /^\/[^/]+\.lnk$/, // 바로가기(이 PC 경로가 들어 있다)
  /^\/\.gitignore$/,
  /^\/\.oxlintrc\.json$/,
  /^\/package-lock\.json$/,
  // exe 옆으로 따로 복사한다(scripts/distributionExtras.js) — Electron 의 LICENSE 와 겹치지 않게 이름도 다르다
  /^\/LICENSE$/,
  /^\/THIRD_PARTY_NOTICES\.md$/,
]

// 메인 프로세스가 실행 중에 가져오는 외부 모듈의 이름들(electron 과 Node 내장 모듈은 뺀다). 화면(React 등)은 vite 가 dist 에 묶어 넣으므로
// 여기에 없다. 메인 프로세스 코드를 읽어서 정하므로, 새 의존을 추가해도 빌드에서 빠질 일이 없다.
export function findMainProcessDependencies(root) {
  const dir = path.join(root, 'electron')
  if (!fs.existsSync(dir)) return []
  const found = new Set()
  const patterns = [/\bfrom\s+['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g]
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(c|m)?js$/.test(name)) continue
    // 주석 속의 예시 코드(예: "// import x from 'y'")를 의존으로 잘못 읽지 않게 주석을 지운다.
    const text = fs
      .readFileSync(path.join(dir, name), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    for (const re of patterns) {
      for (const match of text.matchAll(re)) {
        const specifier = match[1]
        if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) continue
        // 패키지 이름: "@범위/이름" 은 두 조각, 나머지는 첫 조각 ("lodash/fp" -> "lodash")
        const parts = specifier.split('/')
        const packageName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
        if (packageName === 'electron' || builtinModules.includes(packageName)) continue
        found.add(packageName)
      }
    }
  }
  return [...found].sort()
}

// entries(시작 모듈)와 그 모듈이 쓰는 모듈(dependencies)을 끝까지 따라가서 배포에 필요한 모듈 이름 집합을 만든다.
// 필수 의존이 설치돼 있지 않으면 오류(빌드 중단), 선택 의존(optionalDependencies)이 없으면 건너뛴다.
export function collectRuntimeModules(root, entries) {
  const result = new Set()
  const queue = entries.map((name) => ({ name, required: true, from: '메인 프로세스' }))
  while (queue.length > 0) {
    const { name, required, from } = queue.shift()
    if (result.has(name)) continue
    const manifest = path.join(root, 'node_modules', ...name.split('/'), 'package.json')
    if (!fs.existsSync(manifest)) {
      if (required) throw new Error(`배포에 필요한 모듈 "${name}"(${from} 가 사용)이 node_modules 에 없습니다. npm install 을 먼저 하세요.`)
      continue
    }
    result.add(name)
    const info = JSON.parse(fs.readFileSync(manifest, 'utf8'))
    for (const dep of Object.keys(info.dependencies ?? {})) queue.push({ name: dep, required: true, from: name })
    for (const dep of Object.keys(info.optionalDependencies ?? {})) queue.push({ name: dep, required: false, from: name })
  }
  return result
}

// packager 의 ignore 에 넘길 함수를 만든다. true 면 그 파일을 배포에서 뺀다.
export function createIgnore(runtimeModules) {
  const scopes = new Set([...runtimeModules].filter((name) => name.startsWith('@')).map((name) => name.split('/')[0]))
  return (file) => {
    if (ALWAYS_IGNORED.some((re) => re.test(file))) return true
    // node_modules: 폴더 자체와 실제로 쓰는 모듈(안의 중첩 node_modules 포함)만 남긴다. 점으로 시작하는 것(.bin, .package-lock.json 등)은 뺀다.
    const match = /^\/node_modules\/([^/]+)(?:\/([^/]+))?/.exec(file)
    if (!match) return false
    const [, first, second] = match
    if (first.startsWith('.')) return true
    if (first.startsWith('@')) {
      if (second === undefined) return !scopes.has(first) // "@범위" 폴더 자체: 쓰는 모듈이 그 안에 있을 때만
      return !runtimeModules.has(`${first}/${second}`)
    }
    return !runtimeModules.has(first)
  }
}
