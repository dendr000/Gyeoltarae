import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'

function getCategories(snippetIndex) {
  const set = new Set()
  for (const entry of Object.values(snippetIndex)) set.add(entry.category)
  return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
}

// Galpi의 "스마트 상용구 관리" 모달을 그대로 본떠 만듦 — 폴더 선택, 팝업/스페이스바 치환
// 두 스위치, 단축어+본문 등록 폼(한 화면에서 같이 입력), 일괄 등록, 검색, 목록까지 전부
// 이 모달 하나 안에서 끝남(예전엔 사이드바에 흩어진 인라인 폼이었는데, Galpi를 쓰던 사용자
// 입장에서 화면이 너무 달라 혼란스럽다는 피드백을 받아 원본 레이아웃에 맞춰 다시 만듦).
export function SnippetModal({ onClose, onOpenInEditor }) {
  const snippetIndex = useAppStore((s) => s.snippetIndex)
  const createSnippetWithContent = useAppStore((s) => s.createSnippetWithContent)
  const bulkCreateSnippets = useAppStore((s) => s.bulkCreateSnippets)
  const deleteSnippet = useAppStore((s) => s.deleteSnippet)
  const snippetSuggestEnabled = useAppStore((s) => s.snippetSuggestEnabled)
  const setSnippetSuggestEnabled = useAppStore((s) => s.setSnippetSuggestEnabled)
  const snippetSpaceExpandEnabled = useAppStore((s) => s.snippetSpaceExpandEnabled)
  const setSnippetSpaceExpandEnabled = useAppStore((s) => s.setSnippetSpaceExpandEnabled)
  const requestPrompt = useAppStore((s) => s.requestPrompt)

  // 아직 상용구가 하나도 없는 새 폴더는 snippetIndex에서 뽑을 수 없으므로(실제로 저장된
  // 파일이 있어야만 카테고리로 잡힘) "+"로 새 폴더 이름을 받으면 여기 따로 기억해 뒀다가
  // 드롭다운에 얹어줌 — 첫 상용구를 그 폴더에 저장하고 나면 snippetIndex 쪽에도 잡히므로
  // 그 뒤로는 이 목록이 없어도 계속 보임.
  const [extraCategories, setExtraCategories] = useState([])
  const categories = useMemo(
    () => [...new Set([...getCategories(snippetIndex), ...extraCategories])].sort((a, b) => a.localeCompare(b, 'ko')),
    [snippetIndex, extraCategories],
  )
  const [folder, setFolder] = useState('전체')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkResult, setBulkResult] = useState('')
  const [search, setSearch] = useState('')

  const targetCategory = folder === '전체' ? '공통' : folder

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.values(snippetIndex)
      .filter((e) => folder === '전체' || e.category === folder)
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q))
      .sort((a, b) => a.category.localeCompare(b.category, 'ko') || a.title.localeCompare(b.title, 'ko'))
  }, [snippetIndex, folder, search])

  const handleCancelEdit = () => {
    setEditingKey(null)
    setTitle('')
    setContent('')
  }

  const handleAddFolder = async () => {
    const result = await requestPrompt({
      title: '새 폴더',
      fields: [{ key: 'name', label: '폴더 이름', placeholder: '예: 무협' }],
    })
    const name = result?.name?.trim()
    if (!name) return
    getApi().refocusWindow?.()
    setExtraCategories((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setFolder(name)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    getApi().refocusWindow?.()
    if (editingKey && editingKey !== `${targetCategory}/${title.trim()}`) {
      const sepIdx = editingKey.indexOf('/')
      await deleteSnippet(editingKey.slice(0, sepIdx), editingKey.slice(sepIdx + 1))
    }
    await createSnippetWithContent(targetCategory, title.trim(), content)
    handleCancelEdit()
  }

  const handleEdit = (entry) => {
    setEditingKey(`${entry.category}/${entry.title}`)
    setFolder(entry.category)
    setTitle(entry.title)
    setContent(entry.content)
  }

  const handleDelete = async (entry) => {
    if (!window.confirm(`"${entry.title}" 상용구를 삭제할까요?`)) return
    await deleteSnippet(entry.category, entry.title)
    if (editingKey === `${entry.category}/${entry.title}`) handleCancelEdit()
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    if (!bulkText.trim()) return
    getApi().refocusWindow?.()
    const count = await bulkCreateSnippets(targetCategory, bulkText)
    setBulkResult(count > 0 ? `${count}개 등록됨` : '등록된 항목 없음')
    if (count > 0) setBulkText('')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel snippet-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>상용구</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="snippet-modal-folder-row">
          <select value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="전체">전체</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="button" className="modal-secondary-btn" title="새 폴더" onClick={handleAddFolder}>
            + 폴더
          </button>
        </div>

        <div className="snippet-modal-toggle-row">
          <label className="modal-checkbox-row">
            <input
              type="checkbox"
              checked={snippetSuggestEnabled}
              onChange={(e) => setSnippetSuggestEnabled(e.target.checked)}
            />
            타이핑 중 추천 팝업
          </label>
          <label className="modal-checkbox-row">
            <input
              type="checkbox"
              checked={snippetSpaceExpandEnabled}
              onChange={(e) => setSnippetSpaceExpandEnabled(e.target.checked)}
            />
            스페이스바 자동 치환
          </label>
        </div>

        <form className="snippet-modal-form-row" onSubmit={handleSubmit}>
          <input type="text" placeholder="단축어" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="본문 (커서: {#})" value={content} onChange={(e) => setContent(e.target.value)} rows={1} />
          <button type="submit" className="snippet-inline-submit-btn">
            {editingKey ? '저장' : '추가'}
          </button>
          {editingKey && (
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
            <textarea placeholder="단축어::::본문" value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={3} />
            <div className="snippet-inline-form-actions">
              <button type="submit" className="snippet-inline-submit-btn">
                일괄 등록
              </button>
              {bulkResult && <span className="snippet-inline-result">{bulkResult}</span>}
            </div>
          </form>
        )}

        <input
          type="text"
          className="snippet-modal-search-input"
          placeholder="검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="snippet-modal-list">
          {list.length === 0 ? (
            <div className="dict-modal-empty">등록된 상용구가 없습니다.</div>
          ) : (
            list.map((entry) => (
              <div key={`${entry.category}/${entry.title}`} className="snippet-modal-row">
                <span className="snippet-modal-row-category">{entry.category}</span>
                <span className="snippet-modal-row-title">{entry.title}</span>
                <span className="snippet-modal-row-content">{entry.content.replace(/\s+/g, ' ')}</span>
                <button
                  type="button"
                  className="snippet-modal-row-btn"
                  title="에디터에서 열기"
                  onClick={() => onOpenInEditor(entry.category, entry.title)}
                >
                  ⤢
                </button>
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
