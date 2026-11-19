// Copyright (c) dendr000. MIT License.
import chokidar from 'chokidar'
import { createWatchIgnore } from './watchIgnore.js'

// 폴더 감시 작업 프로세스(Electron utilityProcess). 메인 프로세스(main.js)가 띄우고, 바뀐 파일을 부모 포트로 알린다.
// 메인에서 직접 감시하면 처음 훑는 동안 메인이 막혀 입력이 멈췄기 때문에 따로 둔다(규칙: electron/watchProcess.js).
const port = process.parentPort
let watcher = null

async function closeWatcher() {
  const old = watcher
  watcher = null
  if (old) await old.close()
}

async function startWatching({ workspacePath, contentDirs }) {
  await closeWatcher()
  const next = chokidar.watch(workspacePath, {
    ignored: createWatchIgnore(workspacePath, contentDirs),
    ignoreInitial: true,
  })
  watcher = next
  const notify = (eventType) => (changedPath) => port.postMessage({ type: 'event', eventType, path: changedPath })
  next
    .on('add', notify('add'))
    .on('change', notify('change'))
    .on('unlink', notify('unlink'))
    .on('addDir', notify('addDir'))
    .on('unlinkDir', notify('unlinkDir'))
    // 읽기 오류(권한 없는 폴더 등)가 프로세스를 죽이지 않게 한다. 그 경로만 감시에서 빠진다.
    .on('error', () => {})
}

port.on('message', (event) => {
  const message = event.data
  if (message && message.type === 'start') void startWatching(message)
})
