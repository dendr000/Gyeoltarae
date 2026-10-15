// Copyright (c) dendr000. MIT License.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyDistributionExtras, EXTRA_TOP_LEVEL_ENTRIES } from '../../scripts/distributionExtras.js'
import { collectRuntimeModules, createIgnore, findMainProcessDependencies } from '../../scripts/packageIgnore.js'
import { FORBIDDEN_IN_ASAR, REQUIRED_IN_ASAR, checkAsarFiles, listAsarFiles } from '../../scripts/verifyPackage.js'

// 배포 빌드(scripts/package-win.js)에 들어가는 파일을 거르는 규칙. 다른 사람에게 줄 폴더에 계획서(docs), 임시 메모, 이 PC 경로가 든 바로가기,
// 쓰지 않는 node_modules 6천여 개가 같이 들어가던 것을 막는다. 실제 패키징(느림)은 하지 않고, 걸러내는 규칙과 점검 목록만 시험한다.

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const RUNTIME = new Set(['chokidar', 'readdirp'])
const ignore = createIgnore(RUNTIME)

describe('createIgnore: 배포에 넣지 않는 파일', () => {
  const excluded = [
    '/src',
    '/src/App.jsx',
    '/scripts/package-win.js',
    '/tests/lib/lineSort.test.js',
    '/.claude/settings.json',
    '/.git/HEAD',
    '/release-packager/x',
    '/release/x',
    '/index.html',
    '/vite.config.js',
    '/CHANGELOG.md',
    '/README.md',
    // 이번에 추가한 것
    '/docs',
    '/docs/CHANGELOG.md',
    '/docs/plans/table-editor-calculations.md',
    '/docs/features/line-sort.md',
    '/public',
    '/public/favicon.svg',
    '/build/icon.svg',
    '/build/icon.png',
    '/electron-test-log.txt',
    '/scratch-portfolio.md',
    '/scratch-portfolio.b64',
    '/결타래.lnk',
    '/바로가기.lnk',
    '/.gitignore',
    '/.oxlintrc.json',
    '/package-lock.json',
    '/LICENSE',
    '/THIRD_PARTY_NOTICES.md',
  ]
  for (const file of excluded) {
    it(`${file} 은 뺀다`, () => {
      expect(ignore(file)).toBe(true)
    })
  }
})

describe('createIgnore: 반드시 들어가야 하는 파일', () => {
  const included = [
    '/package.json',
    '/electron',
    '/electron/main.js',
    '/electron/preload.cjs',
    '/electron/fileSystem.js',
    '/electron/settingsMenu.js',
    '/electron/watchScheduler.js',
    '/electron/create-workspace-shortcut.ps1', // 별도 프로세스가 읽는 스크립트(asar 밖으로 풀어 둔다)
    '/shared',
    '/shared/fileNameChars.js',
    '/shared/typewriterZone.js',
    '/dist',
    '/dist/index.html',
    '/dist/assets/index-abc.js',
    '/dist/assets/D2Coding-Ver1.3.2-20180524-abc.ttf',
    '/dist/favicon.svg',
    '/build',
    '/build/icon.ico', // 창 아이콘(BrowserWindow icon)이 실행 중에 읽는다
  ]
  for (const file of included) {
    it(`${file} 은 넣는다`, () => {
      expect(ignore(file)).toBe(false)
    })
  }
})

describe('createIgnore: node_modules 는 실제로 쓰는 모듈만', () => {
  it('node_modules 폴더 자체와 쓰는 모듈(chokidar, readdirp)의 파일은 넣는다', () => {
    expect(ignore('/node_modules')).toBe(false)
    expect(ignore('/node_modules/chokidar')).toBe(false)
    expect(ignore('/node_modules/chokidar/index.js')).toBe(false)
    expect(ignore('/node_modules/chokidar/package.json')).toBe(false)
    expect(ignore('/node_modules/readdirp/index.js')).toBe(false)
  })

  it('쓰지 않는 모듈은 뺀다 (화면 번들에 이미 들어 있는 react, lucide-react 등)', () => {
    for (const name of ['react', 'react-dom', 'lucide-react', 'zustand', 'highlight.js', 'scheduler', 'vite', 'electron']) {
      expect(ignore(`/node_modules/${name}`), name).toBe(true)
      expect(ignore(`/node_modules/${name}/index.js`), name).toBe(true)
    }
  })

  it('이름이 비슷한 다른 모듈은 넣지 않는다 (chokidar-cli 는 chokidar 가 아니다)', () => {
    expect(ignore('/node_modules/chokidar-cli/index.js')).toBe(true)
    expect(ignore('/node_modules/readdirp2')).toBe(true)
  })

  it('node_modules 바로 아래의 점 파일·폴더(.bin, .package-lock.json, .vite)는 뺀다', () => {
    for (const name of ['.bin', '.package-lock.json', '.vite', '.cache']) {
      expect(ignore(`/node_modules/${name}`), name).toBe(true)
      expect(ignore(`/node_modules/${name}/x`), name).toBe(true)
    }
  })

  it('@범위/이름 모듈은 쓰는 것만 넣는다', () => {
    const scoped = createIgnore(new Set(['@scope/used']))
    expect(scoped('/node_modules/@scope')).toBe(false) // 쓰는 모듈의 상위 폴더
    expect(scoped('/node_modules/@scope/used')).toBe(false)
    expect(scoped('/node_modules/@scope/used/index.js')).toBe(false)
    expect(scoped('/node_modules/@scope/other')).toBe(true)
    expect(scoped('/node_modules/@scope/other/index.js')).toBe(true)
    expect(scoped('/node_modules/@other')).toBe(true)
    expect(scoped('/node_modules/@other/used')).toBe(true)
  })

  it('쓰는 모듈 안의 중첩 node_modules 도 같이 들어간다', () => {
    expect(ignore('/node_modules/chokidar/node_modules/x/index.js')).toBe(false)
  })

  it('쓰는 모듈 목록이 비어 있으면 node_modules 안은 모두 뺀다', () => {
    const none = createIgnore(new Set())
    expect(none('/node_modules/chokidar')).toBe(true)
    expect(none('/node_modules')).toBe(false)
  })
})

describe('findMainProcessDependencies / collectRuntimeModules', () => {
  let tmp
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-pkg-'))
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  const write = (rel, content) => {
    const full = path.join(tmp, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
  }
  const pkg = (name, dependencies = {}, extra = {}) =>
    write(`node_modules/${name}/package.json`, JSON.stringify({ name, version: '1.0.0', dependencies, ...extra }))

  it('메인 프로세스 코드가 가져오는 외부 모듈만 찾는다 (내장 모듈·electron·상대 경로·node: 는 제외)', () => {
    write(
      'electron/a.js',
      [
        "import { app } from 'electron'",
        "import fs from 'node:fs'",
        "import path from 'path'",
        "import chokidar from 'chokidar'",
        "import { x } from './local.js'",
        "import { y } from '../shared/y.js'",
        "import scoped from '@scope/pkg'",
        "import sub from 'lodash/fp'",
      ].join('\n'),
    )
    write('electron/b.cjs', "const z = require('zed')\nconst fs = require('fs')\nconst e = require('electron')")
    expect(findMainProcessDependencies(tmp).sort()).toEqual(['@scope/pkg', 'chokidar', 'lodash', 'zed'])
  })

  it('주석 속의 예시 코드(// import ... from, /* require(...) */)는 의존으로 읽지 않는다', () => {
    write(
      'electron/c.js',
      [
        "// import ghost from 'ghost'",
        "/* const g = require('ghost2') */",
        '/*',
        " * import ghost3 from 'ghost3'",
        ' */',
        "import real from 'real-dep' // 줄 끝 주석: from 'ghost4'",
        "const url = 'http://example.com/x' // 문자열 속의 // 는 주석이 아니다",
        "const both = ['http://example.com', require('url-then-dep')]", // 문자열의 // 뒤에 오는 진짜 의존을 놓치지 않는다
        "import other from 'other-dep'",
      ].join('\n'),
    )
    expect(findMainProcessDependencies(tmp)).toEqual(['other-dep', 'real-dep', 'url-then-dep'])
  })

  it('electron 폴더가 없으면 빈 목록이다', () => {
    expect(findMainProcessDependencies(tmp)).toEqual([])
  })

  it('모듈이 쓰는 모듈(의존 관계)을 끝까지 따라간다', () => {
    pkg('chokidar', { readdirp: '^5.0.0' })
    pkg('readdirp', { leaf: '1' })
    pkg('leaf')
    pkg('unrelated', { other: '1' })
    pkg('other')
    expect([...collectRuntimeModules(tmp, ['chokidar'])].sort()).toEqual(['chokidar', 'leaf', 'readdirp'])
  })

  it('서로를 가리키는 순환 의존도 무한 반복하지 않는다', () => {
    pkg('a', { b: '1' })
    pkg('b', { a: '1' })
    expect([...collectRuntimeModules(tmp, ['a'])].sort()).toEqual(['a', 'b'])
  })

  it('@범위/이름 모듈과 선택 의존(optionalDependencies, 없으면 건너뜀)을 처리한다', () => {
    write('node_modules/@scope/pkg/package.json', JSON.stringify({ name: '@scope/pkg', dependencies: { dep: '1' }, optionalDependencies: { missing: '1' } }))
    pkg('dep')
    expect([...collectRuntimeModules(tmp, ['@scope/pkg'])].sort()).toEqual(['@scope/pkg', 'dep'])
  })

  it('필수 의존이 설치돼 있지 않으면 빌드를 멈추도록 오류를 낸다', () => {
    pkg('chokidar', { readdirp: '1' })
    expect(() => collectRuntimeModules(tmp, ['chokidar'])).toThrow(/readdirp/)
  })

  it('시작 모듈 자체가 없으면 오류를 낸다', () => {
    expect(() => collectRuntimeModules(tmp, ['nope'])).toThrow(/nope/)
  })

  it('실제 프로젝트: 메인 프로세스가 쓰는 모듈은 chokidar 이고, 그 의존(readdirp)까지 포함하며 react 등은 뺀다', () => {
    const entries = findMainProcessDependencies(ROOT)
    expect(entries).toContain('chokidar')
    expect(entries).not.toContain('electron')
    const runtime = collectRuntimeModules(ROOT, entries)
    expect(runtime.has('chokidar')).toBe(true)
    expect(runtime.has('readdirp')).toBe(true)
    for (const name of ['react', 'react-dom', 'lucide-react', 'zustand', 'highlight.js']) expect(runtime.has(name)).toBe(false)
  })

  it('실제 프로젝트: 메인 프로세스(electron/*.js)가 가져오는 모든 외부 모듈이 배포에 들어간다 (새 의존을 빼먹지 않게)', () => {
    const runtime = collectRuntimeModules(ROOT, findMainProcessDependencies(ROOT))
    const shouldKeep = createIgnore(runtime)
    for (const name of findMainProcessDependencies(ROOT)) expect(shouldKeep(`/node_modules/${name}/package.json`), name).toBe(false)
  })
})

describe('checkAsarFiles: 만든 뒤 app.asar 점검', () => {
  const good = [
    '/package.json',
    '/electron/main.js',
    '/electron/preload.cjs',
    '/electron/fileSystem.js',
    '/shared/fileNameChars.js',
    '/shared/typewriterZone.js',
    '/dist/index.html',
    '/build/icon.ico',
    '/node_modules/chokidar/package.json',
    '/node_modules/readdirp/package.json',
  ]

  it('필요한 파일이 다 있고 불필요한 파일이 없으면 문제가 없다', () => {
    expect(checkAsarFiles(good, new Set(['chokidar', 'readdirp']))).toEqual({ missing: [], forbidden: [] })
  })

  it('필요한 파일이 빠지면 missing 에 나온다 (모듈 포함)', () => {
    const result = checkAsarFiles(good.filter((p) => p !== '/shared/typewriterZone.js' && !p.includes('readdirp')), new Set(['chokidar', 'readdirp']))
    expect(result.missing).toContain('/shared/typewriterZone.js')
    expect(result.missing).toContain('/node_modules/readdirp/package.json')
    expect(result.forbidden).toEqual([])
  })

  it('불필요한 파일이 남아 있으면 forbidden 에 나온다 (docs, 바로가기, 임시 파일, 쓰지 않는 모듈)', () => {
    const leaked = [...good, '/docs/CHANGELOG.md', '/결타래.lnk', '/scratch-portfolio.md', '/electron-test-log.txt', '/node_modules/react/index.js', '/LICENSE']
    const result = checkAsarFiles(leaked, new Set(['chokidar', 'readdirp']))
    expect(result.forbidden.sort()).toEqual(
      ['/LICENSE', '/docs/CHANGELOG.md', '/electron-test-log.txt', '/node_modules/react/index.js', '/scratch-portfolio.md', '/결타래.lnk'].sort(),
    )
    expect(result.missing).toEqual([])
  })

  it('윈도우 경로 구분자(\\)로 와도 같게 점검한다', () => {
    const windows = good.map((p) => p.split('/').join(String.fromCharCode(92)))
    expect(checkAsarFiles(windows, new Set(['chokidar', 'readdirp']))).toEqual({ missing: [], forbidden: [] })
  })

  it('listAsarFiles: 폴더 항목(빈 폴더 포함)은 빼고 파일만 돌려준다', () => {
    const BS = String.fromCharCode(92)
    const entries = [`${BS}node_modules`, `${BS}node_modules${BS}react`, `${BS}node_modules${BS}chokidar`, `${BS}node_modules${BS}chokidar${BS}index.js`, `${BS}package.json`]
    const fakeAsar = {
      listPackage: () => entries,
      // 폴더는 files 가 있는 객체, 파일은 size 가 있는 객체 (실제 @electron/asar 의 statFile 모양)
      // 실제 @electron/asar 처럼 Windows 에서는 "/" 로 쓴 하위 경로를 못 찾는다(운영체제 구분자 path.sep 로 물어야 한다)
      statFile: (_archive, name) => {
        if (path.sep !== '/' && name.includes('/')) throw new Error(`"${name}" was not found in this archive`)
        return ['node_modules', 'node_modules/react', 'node_modules/chokidar'].includes(name.split(path.sep).join('/')) ? { files: {} } : { size: 1 }
      },
    }
    expect(listAsarFiles(fakeAsar, 'x.asar')).toEqual([`${BS}node_modules${BS}chokidar${BS}index.js`, `${BS}package.json`])
  })

  it('빈 폴더로만 남은 쓰지 않는 모듈(react 껍데기)은 문제로 보지 않지만, 그 안에 파일이 있으면 문제다', () => {
    const files = ['/package.json', '/electron/main.js', '/electron/preload.cjs', '/electron/fileSystem.js', '/shared/fileNameChars.js', '/shared/typewriterZone.js', '/dist/index.html', '/build/icon.ico', '/node_modules/chokidar/package.json']
    const runtime = new Set(['chokidar'])
    expect(checkAsarFiles(files, runtime).forbidden).toEqual([]) // 폴더 항목은 파일 목록에 없다
    expect(checkAsarFiles([...files, '/node_modules/react/index.js'], runtime).forbidden).toEqual(['/node_modules/react/index.js'])
  })

  it('점검 목록은 설정·전체 경로로 되어 있다', () => {
    expect(REQUIRED_IN_ASAR).toContain('/electron/main.js')
    expect(FORBIDDEN_IN_ASAR.some((re) => re.test('/docs/x.md'))).toBe(true)
  })
})

describe('copyDistributionExtras: exe 옆에 두는 라이선스·글꼴', () => {
  let out
  beforeEach(() => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-extras-'))
  })
  afterEach(() => {
    fs.rmSync(out, { recursive: true, force: true })
  })

  const same = (a, b) => Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0

  it('만들어지는 최상위 항목은 EXTRA_TOP_LEVEL_ENTRIES 와 같다 (빌드 폴더 점검 목록에 빠지지 않게)', () => {
    copyDistributionExtras(ROOT, out)
    expect(fs.readdirSync(out).sort()).toEqual([...EXTRA_TOP_LEVEL_ENTRIES].sort())
  })

  it('Electron 의 LICENSE 를 덮어쓰지 않도록 우리 라이선스는 다른 이름(LICENSE-Gyeoltarae.txt)이다', () => {
    copyDistributionExtras(ROOT, out)
    expect(EXTRA_TOP_LEVEL_ENTRIES).not.toContain('LICENSE')
    expect(same(path.join(out, 'LICENSE-Gyeoltarae.txt'), path.join(ROOT, 'LICENSE'))).toBe(true)
  })

  it('고지 문서(THIRD_PARTY_NOTICES.md)를 그대로 복사한다', () => {
    copyDistributionExtras(ROOT, out)
    expect(same(path.join(out, 'THIRD_PARTY_NOTICES.md'), path.join(ROOT, 'THIRD_PARTY_NOTICES.md'))).toBe(true)
  })

  it('D2Coding 글꼴 파일과 OFL 라이선스 전문을 fonts 폴더에 수정 없이 복사한다', () => {
    copyDistributionExtras(ROOT, out)
    const fontDir = path.join(ROOT, 'src', 'assets', 'fonts')
    expect(same(path.join(out, 'fonts', 'D2Coding-Ver1.3.2-20180524.ttf'), path.join(fontDir, 'D2Coding-Ver1.3.2-20180524.ttf'))).toBe(true)
    expect(same(path.join(out, 'fonts', 'D2Coding-OFL.txt'), path.join(fontDir, 'D2Coding-OFL.txt'))).toBe(true)
  })

  it('fonts 폴더에 설치 안내(README.txt)가 있고 라이선스와 저작권자를 알려 준다', () => {
    copyDistributionExtras(ROOT, out)
    const readme = fs.readFileSync(path.join(out, 'fonts', 'README.txt'), 'utf8')
    expect(readme).toContain('D2Coding')
    expect(readme).toContain('NHN')
    expect(readme).toContain('OFL')
  })

  it('이미 있는 폴더에 다시 복사해도(덮어쓰기) 오류 없이 같은 결과다', () => {
    copyDistributionExtras(ROOT, out)
    copyDistributionExtras(ROOT, out)
    expect(fs.readdirSync(out).sort()).toEqual([...EXTRA_TOP_LEVEL_ENTRIES].sort())
  })

  it('원본 파일이 없으면 빌드를 멈추도록 오류를 낸다', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeoltarae-empty-'))
    try {
      expect(() => copyDistributionExtras(empty, out)).toThrow()
    } finally {
      fs.rmSync(empty, { recursive: true, force: true })
    }
  })
})

describe('소스 점검: package-win.js 연결', () => {
  const script = fs.readFileSync(path.join(ROOT, 'scripts', 'package-win.js'), 'utf8')

  it('걸러내는 규칙(createIgnore)을 쓰고 빌드 뒤 점검(listAsarFiles + checkAsarFiles)과 추가 파일 복사를 한다', () => {
    expect(script).toContain('createIgnore(')
    expect(script).toContain('listAsarFiles(')
    expect(script).toContain('checkAsarFiles(')
    expect(script).toContain('copyDistributionExtras(')
  })

  it('빌드 폴더 안전 점검 목록(KNOWN_TOP_LEVEL_ENTRIES)에 추가 항목을 넣는다 (다음 빌드가 중단되지 않게)', () => {
    expect(script).toMatch(/\.\.\.EXTRA_TOP_LEVEL_ENTRIES/)
  })

  it('asar 밖으로 풀어 두는 *.ps1 설정은 그대로다', () => {
    expect(script).toContain("unpack: '*.ps1'")
  })
})
