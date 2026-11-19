// Copyright (c) dendr000. MIT License.

// 폴더 감시기를 메인 프로세스가 아닌 별도 프로세스에서 돌리는 래퍼. 감시기(chokidar)가 문서 1만 개 폴더를 처음 훑는 동안 메인이
// 막혀 입력·자동 저장이 최대 18초 멈추던 문제를 없애려는 것이다. 별도 프로세스는 막혀도 메인과 화면에는 영향이 없다.
// fork: 자식 프로세스를 만드는 함수(실제로는 Electron utilityProcess.fork, 시험에서는 가짜). 자식은 on/once/postMessage/kill 을 가진다.
// onEvent(eventType, path): 파일 변경이 알려질 때. onExit(code): 자식이 stop 이 아니라 저절로 죽었을 때.
export function createWatchProcess({ fork, onEvent, onExit, exitTimeoutMs = 3000 }) {
  let child = null

  function start(workspacePath, contentDirs) {
    // 옛 프로세스는 기다리지 않고 끈다(새 것을 바로 띄워야 한다). 끝날 때까지 기다려야 하면 stop 을 쓴다.
    if (child) void stop()
    const proc = fork()
    child = proc
    proc.on('message', (message) => {
      // 이미 끈 옛 프로세스의 늦은 이벤트는 버린다.
      if (child !== proc) return
      if (message && message.type === 'event') onEvent(message.eventType, message.path)
    })
    proc.on('exit', (code) => {
      if (child !== proc) return
      child = null
      if (onExit) onExit(code)
    })
    proc.postMessage({ type: 'start', workspacePath, contentDirs })
  }

  // 프로세스가 완전히 끝난 뒤(윈도우가 폴더 핸들을 놓은 뒤)에 끝난다. 끝났다는 알림이 안 와도 exitTimeoutMs 뒤에는 끝난다.
  function stop() {
    const proc = child
    if (!proc) return Promise.resolve()
    child = null
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, exitTimeoutMs)
      proc.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
      proc.kill()
    })
  }

  return { start, stop, isRunning: () => child !== null }
}
