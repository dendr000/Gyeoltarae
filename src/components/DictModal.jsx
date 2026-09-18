import { useState } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'

const MAX_RESULTS = 300

// Galpi 원본처럼 검색어 없이는 목록을 그리지 않음 — 사전은 10만 항목을 넘어갈 수 있어서
// (실제로 이 워크스페이스가 그렇다) 항상 전체를 렌더링해 두면 브라우저가 버티지 못함. 예전
// 버전은 사전 파일 전체를 일반 문서 편집기로 열어서 편집하게 했는데, 그게 정확히 이 문제(수만
// 줄짜리 텍스트를 매 입력마다 뷰어가 통째로 다시 파싱)로 입력할 때마다 앱이 멈추는 원인이었음
// — 그래서 사전은 이제 이 검색 기반 모달로만 관리하고, 메인 에디터로는 아예 열지 않음.
function searchDict(dictMap, query) {
  const q = query.trim().toLowerCase()
  const results = []
  for (const [word, translations] of dictMap.entries()) {
    const wordHit = !q || word.toLowerCase().includes(q)
    for (const translation of translations) {
      if (wordHit || translation.toLowerCase().includes(q)) {
        results.push({ word, translation })
        if (results.length >= MAX_RESULTS) return results
      }
    }
  }
  return results
}

export function DictModal({ onClose }) {
  const bulkAddDictEntries = useAppStore((s) => s.bulkAddDictEntries)
  const deleteDictEntry = useAppStore((s) => s.deleteDictEntry)

  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [editing, setEditing] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkResult, setBulkResult] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [results, setResults] = useState(null)

  // 등록/수정/삭제 직후에 재검색할 때는 훅으로 구독한 dictMap이 아니라 스토어의 최신 값을
  // 직접 읽는다 — 이 함수를 담은 handleSubmit 등은 await 이후에도 클로저가 그 시점(등록
  // 전) 렌더의 dictMap을 계속 들고 있어서, 훅 값을 그대로 쓰면 방금 저장한 변경이 검색
  // 결과에 반영되지 않고 한 박자 늦게(다음 리렌더에야) 나타나는 문제가 있었음.
  const runSearch = (query) => setResults(searchDict(useAppStore.getState().dictMap, query))

  const handleCancelEdit = () => {
    setEditing(null)
    setWord('')
    setTranslation('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!word.trim() || !translation.trim()) return
    getApi().refocusWindow?.()
    if (editing) await deleteDictEntry(editing.word, editing.translation)
    await bulkAddDictEntries(`${word.trim()}(${translation.trim()})`)
    handleCancelEdit()
    if (results !== null) runSearch(searchInput)
  }

  const handleEdit = (entry) => {
    setEditing(entry)
    setWord(entry.word)
    setTranslation(entry.translation)
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`"${entry.word}(${entry.translation})" 항목을 삭제할까요?`)) return
    await deleteDictEntry(entry.word, entry.translation)
    if (editing?.word === entry.word && editing?.translation === entry.translation) handleCancelEdit()
    if (results !== null) runSearch(searchInput)
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    if (!bulkText.trim()) return
    getApi().refocusWindow?.()
    const count = await bulkAddDictEntries(bulkText)
    setBulkResult(count > 0 ? `${count}개 추가됨` : '추가된 항목 없음')
    if (count > 0) setBulkText('')
    if (results !== null) runSearch(searchInput)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel dict-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>사전</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="snippet-modal-form-row" onSubmit={handleSubmit}>
          <input type="text" placeholder="원문" value={word} onChange={(e) => setWord(e.target.value)} />
          <input type="text" placeholder="한자/영문" value={translation} onChange={(e) => setTranslation(e.target.value)} />
          <button type="submit" className="snippet-inline-submit-btn">
            {editing ? '저장' : '추가'}
          </button>
          {editing && (
            <button type="button" className="modal-secondary-btn" onClick={handleCancelEdit}>
              취소
            </button>
          )}
          <button type="button" className="modal-secondary-btn" onClick={() => setBulkMode((v) => !v)}>
            일괄
          </button>
        </form>

        {bulkMode && (
          <form className="snippet-modal-bulk-row" onSubmit={handleBulkSubmit}>
            <textarea placeholder="동방(東方)" value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={3} />
            <div className="snippet-inline-form-actions">
              <button type="submit" className="snippet-inline-submit-btn">
                일괄 등록
              </button>
              {bulkResult && <span className="snippet-inline-result">{bulkResult}</span>}
            </div>
          </form>
        )}

        <form
          className="snippet-modal-search-row"
          onSubmit={(e) => {
            e.preventDefault()
            runSearch(searchInput)
          }}
        >
          <input
            type="text"
            className="snippet-modal-search-input"
            placeholder="검색 후 Enter"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="dict-modal-results">
          {results === null ? (
            <div className="dict-modal-empty">검색어를 입력하고 Enter를 누르면 결과가 나옵니다.</div>
          ) : results.length === 0 ? (
            <div className="dict-modal-empty">일치하는 항목이 없습니다.</div>
          ) : (
            <table className="dict-modal-table">
              <thead>
                <tr>
                  <th>원문</th>
                  <th>한자/영문</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.map((entry) => (
                  <tr key={`${entry.word}(${entry.translation})`}>
                    <td>{entry.word}</td>
                    <td>{entry.translation}</td>
                    <td className="dict-modal-row-actions">
                      <button type="button" className="snippet-modal-row-btn" title="수정" onClick={() => handleEdit(entry)}>
                        ✎
                      </button>
                      <button
                        type="button"
                        className="snippet-modal-row-btn snippet-modal-row-delete"
                        title="삭제"
                        onClick={() => handleDelete(entry)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results !== null && results.length >= MAX_RESULTS && (
            <div className="dict-modal-empty">결과가 {MAX_RESULTS}개를 넘어 앞부분만 표시됩니다 — 검색어를 더 구체적으로 입력해보세요.</div>
          )}
        </div>
      </div>
    </div>
  )
}
