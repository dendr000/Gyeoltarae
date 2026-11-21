// Copyright (c) dendr000. MIT License.

// 인물 표의 걸러 보기·정렬 상태를 문서별로 기억한다(이 PC 의 브라우저 저장소). 문서 파일에는 아무것도 쓰지 않는다.
// 저장소를 못 쓰는 환경(개인정보 보호 창 등)에서는 조용히 기억하지 않는다.
const KEY = 'gyeoltarae.characterView'
const MAX_DOCS = 60

export const DEFAULT_VIEW_STATE = { query: '', attrs: {}, attrKey: '', episodeFrom: '', episodeTo: '', sortKey: 'order', sortDir: 'asc' }

// 저장된 값에서 쓸 수 있는 칸만 골라 기본값 위에 얹는다(옛 형식·망가진 값에도 안전하게).
export function normalizeViewState(raw) {
  const out = { ...DEFAULT_VIEW_STATE, attrs: {} }
  if (!raw || typeof raw !== 'object') return out
  if (typeof raw.query === 'string') out.query = raw.query
  if (typeof raw.attrKey === 'string') out.attrKey = raw.attrKey
  if (typeof raw.episodeFrom === 'string') out.episodeFrom = raw.episodeFrom
  if (typeof raw.episodeTo === 'string') out.episodeTo = raw.episodeTo
  if (typeof raw.sortKey === 'string') out.sortKey = raw.sortKey
  if (raw.sortDir === 'asc' || raw.sortDir === 'desc') out.sortDir = raw.sortDir
  if (raw.attrs && typeof raw.attrs === 'object') {
    for (const [key, values] of Object.entries(raw.attrs)) {
      if (Array.isArray(values)) out.attrs[key] = values.filter((v) => typeof v === 'string')
    }
  }
  return out
}

function readAll(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadViewState(path, storage = globalThis.localStorage) {
  try {
    return normalizeViewState(readAll(storage)[path ?? ''])
  } catch {
    return normalizeViewState(null)
  }
}

export function saveViewState(path, state, storage = globalThis.localStorage) {
  try {
    const all = readAll(storage)
    const key = path ?? ''
    delete all[key] // 다시 넣어 가장 최근 것으로 만든다
    all[key] = state
    const keys = Object.keys(all)
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_DOCS))) delete all[old]
    storage.setItem(KEY, JSON.stringify(all))
  } catch {
    // 저장소를 쓸 수 없으면 기억하지 않는다.
  }
}
