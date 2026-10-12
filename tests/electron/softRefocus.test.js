import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 문서·탭·사이드바 항목을 클릭할 때마다 창 뒤의 다른 앱(예: 클로드 앱)이 깜빡이던 문제의 회귀 방지.
// 원인: 클릭마다 refocusWindow() 가 호출되고, 메인 프로세스의 refocusMainWindow() 는 mainWindow.blur() 를 한다.
// Windows 에서 blur() 는 z-순서상 다음 창을 잠깐 활성화해서 뒤의 앱이 비쳐 보인다. 클릭으로 여는 경우는 가벼운
// softRefocusWindow()(blur 없음)를 쓰고, 모달이 닫힌 직후 새 문서를 자동 포커스하는 흐름만 기존 refocusWindow() 를 쓴다.
// (실제 깜빡임은 화면으로만 볼 수 있어서, 여기서는 "클릭 처리에서 blur 가 들어간 호출을 쓰지 않는지"를 지킨다.)
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

// blur 가 들어간 호출: getApi().refocusWindow (softRefocusWindow 는 다른 이름이라 걸리지 않는다)
const HARD_CALL = /getApi\(\)\s*\.refocusWindow/g

describe('클릭으로 여는 동작은 blur 없는 포커스를 쓴다', () => {
  for (const file of [
    'src/components/FileTree.jsx',
    'src/components/TabBar.jsx',
    'src/components/CategorySidebar.jsx',
    'src/components/ViewerPane.jsx',
  ]) {
    it(`${file} 에는 blur 가 들어간 refocusWindow 호출이 없다`, () => {
      expect(read(file).match(HARD_CALL) ?? []).toEqual([])
    })
  }

  it('자료·상용구·틀 사이드바는 항목을 여는 클릭에서 blur 호출을 쓰지 않는다 (새로 만들기 모달 직후만 허용)', () => {
    const openAfterHard = /getApi\(\)\s*\.refocusWindow\?\.\(\)\s*\n\s*onOpen(Entry|Snippet|Template)\(/
    for (const file of ['src/components/DataSidebar.jsx', 'src/components/SnippetSidebar.jsx', 'src/components/TemplateSidebar.jsx']) {
      expect(openAfterHard.test(read(file)), file).toBe(false)
    }
  })

  it('가벼운 포커스(softRefocusWindow)가 실제로 쓰이고 있다', () => {
    for (const file of ['src/components/FileTree.jsx', 'src/components/TabBar.jsx', 'src/components/ViewerPane.jsx']) {
      expect(read(file)).toContain('softRefocusWindow')
    }
  })
})

describe('메인 프로세스의 가벼운 포커스', () => {
  const main = read('electron/main.js')

  it('softRefocusMainWindow 는 창을 blur 하지 않는다', () => {
    const start = main.indexOf('function softRefocusMainWindow()')
    expect(start).toBeGreaterThan(-1)
    const body = main.slice(start, main.indexOf('\n}\n', start))
    expect(body).not.toContain('.blur(')
    expect(body).toContain('webContents.focus()')
  })

  it('기존 refocusMainWindow 는 그대로 blur 를 쓴다 (모달 직후 입력이 끊기던 문제용)', () => {
    const start = main.indexOf('function refocusMainWindow()')
    const body = main.slice(start, main.indexOf('\n}\n', start))
    expect(body).toContain('.blur(')
  })

  it('IPC 이름이 메인과 preload 에서 같다', () => {
    expect(main).toContain("ipcMain.handle('window:softRefocus'")
    expect(read('electron/preload.cjs')).toContain("ipcRenderer.invoke('window:softRefocus')")
  })
})
