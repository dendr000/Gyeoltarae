// Copyright (c) dendr000. MIT License.

import path from 'node:path'

// 패키징이 끝난 뒤 app.asar 안의 파일 목록을 점검한다. 필요한 파일이 빠졌거나(앱이 켜지지 않는다), 배포에 넣지 않기로 한 파일이 남았으면
// (개인 메모·이 PC 경로가 든 파일이 새어 나간다) scripts/package-win.js 가 빌드를 실패로 처리한다. 순수 함수라서 시험할 수 있다.

// 이 파일이 없으면 앱이 켜지지 않는다. 메인 프로세스(electron/)와 그것이 가져오는 shared/, 화면(dist/), 창 아이콘(build/icon.ico).
export const REQUIRED_IN_ASAR = [
  '/package.json',
  '/electron/main.js',
  '/electron/preload.cjs',
  '/electron/fileSystem.js',
  '/electron/starterSnippets.js',
  '/shared/commandsPack.js',
  '/shared/fileNameChars.js',
  '/shared/typewriterZone.js',
  '/dist/index.html',
  '/build/icon.ico',
]

// 배포에 들어가면 안 되는 것. (scripts/packageIgnore.js 의 제외 규칙과 짝이다)
export const FORBIDDEN_IN_ASAR = [
  /^\/docs(\/|$)/,
  /^\/(src|tests|scripts|public)(\/|$)/,
  /\.lnk$/,
  /^\/scratch-/,
  /^\/electron-test-log/,
  /^\/LICENSE$/,
  /^\/THIRD_PARTY_NOTICES\.md$/,
  /^\/package-lock\.json$/,
  /^\/\.(gitignore|oxlintrc)/,
  /^\/index\.html$/,
]

// asar 안의 "파일"만 돌려준다(폴더 항목은 뺀다). 패키저는 쓰지 않는 모듈의 폴더 껍데기를 빈 폴더로 남기는데(안에 파일은 없다), 그것까지
// 불필요한 파일로 세지 않으려는 것이다. asarModule 은 @electron/asar (시험에서는 가짜로 바꿔 끼운다).
export function listAsarFiles(asarModule, asarPath) {
  const BS = String.fromCharCode(92)
  return asarModule.listPackage(asarPath).filter((entry) => {
    // @electron/asar 는 Windows 에서 "/" 로 쓴 하위 경로를 못 찾으므로 운영체제의 구분자(path.sep)로 바꿔서 묻는다.
    const relative = entry.split(BS).join('/').replace(/^\//, '').split('/').join(path.sep)
    return !('files' in asarModule.statFile(asarPath, relative))
  })
}

// files: asar 안의 모든 파일 경로(윈도우 "\" 로 와도 된다), runtimeModules: 배포에 넣기로 한 node_modules 모듈 이름 집합.
// 돌려주는 값: { missing: 빠진 필수 파일들, forbidden: 남아 있는 불필요한 파일들 }
export function checkAsarFiles(files, runtimeModules = new Set()) {
  const normalized = files.map((file) => file.split(String.fromCharCode(92)).join('/'))
  const present = new Set(normalized)
  const required = [...REQUIRED_IN_ASAR, ...[...runtimeModules].map((name) => `/node_modules/${name}/package.json`)]
  const missing = required.filter((file) => !present.has(file))
  const forbidden = normalized.filter((file) => {
    if (FORBIDDEN_IN_ASAR.some((re) => re.test(file))) return true
    // 쓰지 않는 node_modules 모듈. "/node_modules" 폴더 자체와 점 파일은 따로 본다.
    const match = /^\/node_modules\/([^/]+)(?:\/([^/]+))?/.exec(file)
    if (!match) return false
    const [, first, second] = match
    if (first.startsWith('.')) return true
    if (first.startsWith('@')) return second === undefined ? false : !runtimeModules.has(`${first}/${second}`)
    return !runtimeModules.has(first)
  })
  return { missing, forbidden }
}
