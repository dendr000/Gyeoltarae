// Copyright (c) dendr000. MIT License.
import path from 'node:path'

// 폴더 감시에서 뺄 경로를 정하는 규칙. 점으로 시작하는 파일·폴더와 node_modules 는 뺀다. 단 분류·자료·틀·이미지·상용구·사전처럼
// 진짜 내용을 담는 점 폴더(contentDirs)는 다른 문서 폴더처럼 감시한다. 감시 작업 프로세스(watchWorker.js)가 쓰고, 순수 함수라서 시험한다.
export function createWatchIgnore(workspacePath, contentDirs) {
  return (watchPath) => {
    const rel = path.relative(workspacePath, watchPath)
    if (contentDirs.some((d) => rel === d || rel.startsWith(d + path.sep))) return false
    return /(^|[/\\])\.|node_modules/.test(rel)
  }
}
