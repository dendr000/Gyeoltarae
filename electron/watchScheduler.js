// Copyright (c) dendr000. MIT License.

// 폴더 감시기를 "언제 켜는가"만 정한다 (감시기 자체는 main.js 가 다룬다). 시간 함수를 바깥에서 받아서 가짜 시계로 시험할 수 있다.
//
// 왜 미루나: 감시기(chokidar)는 켜자마자 작업 폴더의 파일을 전부 훑는데(상용구 4천여 개면 약 9초), 같은 때에 화면이 첫 색인을
// 만들려고 파일을 하나씩 요청한다. 둘이 메인 프로세스의 같은 처리 줄을 써서 서로 늦추는 바람에 읽기만 0.4초 걸릴 일이 10초가 됐다.
// 그래서 화면의 첫 색인이 끝난 뒤(request)에, 사용자가 idleMs 동안 입력하지 않은 틈에 켠다. 계속 입력 중이어도 maxWaitMs 가
// 지나면 켠다(감시기가 영영 안 켜지는 것을 막음). 대기 중에 생긴 바깥 변경은 감시되지 않지만, 그 사이는 몇 초뿐이다.
export function createWatchScheduler({ start, idleMs, maxWaitMs, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pendingPath = null
  let requestedAt = 0
  let lastInputAt = 0
  let timer = null

  function clear() {
    if (timer !== null) {
      clearTimer(timer)
      timer = null
    }
  }

  function check() {
    timer = null
    if (pendingPath === null) return
    const current = now()
    // 마지막 입력에서 idleMs 뒤, 단 입력이 이어져도 요청에서 maxWaitMs 가 지나면 켠다. 첫 확인이 요청 idleMs 뒤라서,
    // 요청 전의 옛 입력은 자연히 영향이 없다.
    const due = Math.min(lastInputAt + idleMs, requestedAt + maxWaitMs)
    if (current >= due) {
      const target = pendingPath
      pendingPath = null
      start(target)
      return
    }
    timer = setTimer(check, due - current)
  }

  return {
    // 이 경로의 감시를 곧 켜 달라고 예약한다. 대기 중에 다시 부르면 마지막 경로와 마지막 시각 기준으로 바뀐다.
    request(workspacePath) {
      clear()
      pendingPath = workspacePath
      requestedAt = now()
      timer = setTimer(check, idleMs)
    },
    // 사용자가 창에 입력했다 (키보드·마우스).
    touch() {
      lastInputAt = now()
    },
    // 예약을 취소한다.
    cancel() {
      clear()
      pendingPath = null
    },
  }
}
