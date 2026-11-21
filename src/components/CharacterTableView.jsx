// Copyright (c) dendr000. MIT License.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Pencil, RotateCcw, Search } from 'lucide-react'
import { parseCharacters } from '../lib/characterTable.js'
import { attrValueCounts, filterCharacters, sortCharacters, toWikiTable } from '../lib/characterFilter.js'
import { DEFAULT_VIEW_STATE, loadViewState, saveViewState } from '../lib/characterViewState.js'

// 인물 표 보기: 지금 문서의 인물 블록을 표로 모아 보여 주고 이름·속성·회차로 걸러 본다(규칙: lib/characterTable.js, lib/characterFilter.js).
// 문서 원문은 읽기만 한다. 파싱은 이 화면이 열려 있을 때만, 글이 바뀌면 뒤로 미뤄서(useDeferredValue) 입력을 막지 않는다.
// 행 수가 많아도 화면에 보이는 행만 그린다(고정 행 높이 + 위아래 빈 칸).
// onGo(인물): 문서로 돌아가 그 인물 제목으로 이동, onEdit(인물): 편집기에서 그 제목 줄로 이동, onClose(): 문서 보기로 돌아가기.

const ROW_HEIGHT = 36
const OVERSCAN = 8
const MAX_CHIPS = 40

export function CharacterTableView({ text, openPath, onGo, onEdit, onClose }) {
  const deferredText = useDeferredValue(text)
  const parsed = useMemo(() => parseCharacters(deferredText), [deferredText])
  const { characters, columns } = parsed

  const [view, setView] = useState(() => loadViewState(openPath))
  const [notice, setNotice] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)
  const scrollRef = useRef(null)

  // 걸러 보기·정렬 상태는 바뀔 때마다 문서별로 기억한다.
  useEffect(() => {
    saveViewState(openPath, view)
  }, [openPath, view])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const measure = () => setViewportHeight(el.clientHeight || 600)
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [])

  const patch = (changes) => setView((prev) => ({ ...prev, ...changes }))
  const hasGroup = characters.some((c) => c.group !== '')
  // 칩을 보여 줄 속성: 고른 것이 없어졌으면 첫 열.
  const chipKey = columns.includes(view.attrKey) ? view.attrKey : (columns[0] ?? '')
  const chips = useMemo(() => (chipKey ? attrValueCounts(characters, chipKey) : []), [characters, chipKey])
  const picked = view.attrs[chipKey] ?? []

  const rows = useMemo(() => {
    const filtered = filterCharacters(characters, view)
    return sortCharacters(filtered, view.sortKey, view.sortDir)
  }, [characters, view])

  const toggleChip = (value) => {
    const next = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value]
    patch({ attrs: { ...view.attrs, [chipKey]: next } })
  }
  const toggleSort = (key) => {
    if (view.sortKey !== key) patch({ sortKey: key, sortDir: 'asc' })
    else if (view.sortDir === 'asc') patch({ sortDir: 'desc' })
    else patch({ sortKey: 'order', sortDir: 'asc' })
  }
  // 초기화는 걸러 보기만 지우고 정렬과 칩 기준 속성은 그대로 둔다.
  const reset = () => setView({ ...DEFAULT_VIEW_STATE, attrs: {}, attrKey: view.attrKey, sortKey: view.sortKey, sortDir: view.sortDir })
  const filtering =
    view.query.trim() !== '' || view.episodeFrom !== '' || view.episodeTo !== '' || Object.values(view.attrs).some((v) => v.length > 0)

  const copyTable = async () => {
    try {
      await navigator.clipboard.writeText(toWikiTable(rows, columns))
      setNotice(`위키 표로 복사했습니다 (${rows.length}명)`)
    } catch {
      setNotice('복사하지 못했습니다')
    }
  }

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const last = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)
  const visible = rows.slice(first, last)

  const header = (key, label, className = '') => (
    <th className={`ctable-th ${className}`} aria-sort={view.sortKey === key ? (view.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="ctable-sort" onClick={() => toggleSort(key)} title={`${label} 순으로 정렬`}>
        <span className="ctable-th-label">{label}</span>
        {view.sortKey === key && (view.sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
      </button>
    </th>
  )

  return (
    <div className="ctable">
      <div className="ctable-bar">
        <button type="button" className="ctable-btn" onClick={onClose} title="인물 표를 닫고 문서로 돌아갑니다">
          <ArrowLeft size={14} />
          <span>문서로</span>
        </button>
        <label className="ctable-search">
          <Search size={14} />
          <input
            type="search"
            value={view.query}
            placeholder="이름·속성·비고 검색"
            onChange={(e) => patch({ query: e.target.value })}
            aria-label="인물 검색"
          />
        </label>
        <label className="ctable-range">
          <span>회차</span>
          <input type="number" min="0" value={view.episodeFrom} onChange={(e) => patch({ episodeFrom: e.target.value })} aria-label="회차 시작" placeholder="시작" />
          <span>~</span>
          <input type="number" min="0" value={view.episodeTo} onChange={(e) => patch({ episodeTo: e.target.value })} aria-label="회차 끝" placeholder="끝" />
        </label>
        <button type="button" className="ctable-btn" onClick={reset} disabled={!filtering} title="검색·칩·회차 범위를 모두 지웁니다">
          <RotateCcw size={14} />
          <span>초기화</span>
        </button>
        <button type="button" className="ctable-btn" onClick={copyTable} disabled={rows.length === 0} title="지금 보이는 인물을 위키 표(||) 글자로 복사합니다. 문서는 바뀌지 않습니다">
          <Copy size={14} />
          <span>표로 복사</span>
        </button>
        <span className="ctable-count" role="status">
          {rows.length} / {characters.length}명{notice ? ` · ${notice}` : ''}
        </span>
      </div>

      {columns.length > 0 && (
        <div className="ctable-chips">
          <select className="ctable-chip-key" value={chipKey} onChange={(e) => patch({ attrKey: e.target.value })} aria-label="칩 기준 속성">
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="ctable-chip-list">
            {chips.slice(0, MAX_CHIPS).map(({ value, count }) => (
              <button key={value} type="button" className={`ctable-chip${picked.includes(value) ? ' on' : ''}`} onClick={() => toggleChip(value)}>
                {value} <span className="ctable-chip-count">{count}</span>
              </button>
            ))}
            {chips.length > MAX_CHIPS && <span className="ctable-chip-more">외 {chips.length - MAX_CHIPS}개</span>}
          </div>
        </div>
      )}

      {characters.length === 0 ? (
        <div className="ctable-empty">
          이 문서에서 인물을 찾지 못했습니다. <code>= 이름 =</code> 제목 아래에 <code>특기:값</code> 줄이나 <code>078 제목</code> 회차 줄을 적은 인물 문서에서 쓰는 보기입니다.
        </div>
      ) : (
        <div
          className="ctable-scroll"
          ref={scrollRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <table className="ctable-table">
            <thead>
              <tr>
                {header('name', '이름', 'ctable-name')}
                {hasGroup && header('group', '소속')}
                {columns.map((c) => header(c, c))}
                {header('first', '첫 회차', 'ctable-num')}
                {header('last', '끝 회차', 'ctable-num')}
                {header('count', '횟수', 'ctable-num')}
                <th className="ctable-th">비고</th>
                <th className="ctable-th ctable-act" aria-label="편집기에서 열기" />
              </tr>
            </thead>
            <tbody>
              {first > 0 && (
                <tr aria-hidden="true">
                  <td style={{ height: first * ROW_HEIGHT, padding: 0, border: 0 }} colSpan={columns.length + (hasGroup ? 7 : 6)} />
                </tr>
              )}
              {visible.map((c) => (
                <tr key={c.id} className="ctable-row" style={{ height: ROW_HEIGHT }} onClick={() => onGo(c)} title="누르면 문서의 그 인물로 이동합니다">
                  <td className="ctable-name">
                    {c.name || '(이름 없음)'}
                    {c.duplicate && <span className="ctable-flag" title="같은 이름이 문서에 또 있습니다">중복</span>}
                  </td>
                  {hasGroup && <td className="ctable-cell">{c.group}</td>}
                  {columns.map((k) => (
                    <td key={k} className="ctable-cell">
                      {c.attrs[k] ?? ''}
                    </td>
                  ))}
                  <td className="ctable-num">{c.firstEpisode ?? ''}</td>
                  <td className="ctable-num">{c.lastEpisode ?? ''}</td>
                  <td className="ctable-num">{c.episodeCount || ''}</td>
                  <td className="ctable-note" title={c.note}>
                    {c.note}
                  </td>
                  <td className="ctable-act">
                    <button
                      type="button"
                      className="ctable-edit"
                      title="편집기에서 이 인물의 제목 줄로 이동합니다"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(c)
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {last < rows.length && (
                <tr aria-hidden="true">
                  <td style={{ height: (rows.length - last) * ROW_HEIGHT, padding: 0, border: 0 }} colSpan={columns.length + (hasGroup ? 7 : 6)} />
                </tr>
              )}
            </tbody>
          </table>
          {rows.length === 0 && <div className="ctable-empty">조건에 맞는 인물이 없습니다.</div>}
        </div>
      )}
    </div>
  )
}
