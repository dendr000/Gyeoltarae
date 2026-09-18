import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'

function flattenFiles(nodes, parentNames = [], acc = []) {
  for (const node of nodes ?? []) {
    if (node.type === 'file') {
      acc.push({ path: node.path, name: node.name, folderPath: parentNames.join(' / ') })
    } else if (node.children) {
      flattenFiles(node.children, [...parentNames, node.name], acc)
    }
  }
  return acc
}

// A short excerpt of `content` centered on the first match of `query`, so
// the result list shows *why* a content-only match (title doesn't contain
// the query) came up.
function buildSnippet(content, query) {
  const idx = content.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return ''
  const start = Math.max(0, idx - 20)
  const end = Math.min(content.length, idx + query.length + 40)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const tree = useAppStore((s) => s.tree)
  const searchIndex = useAppStore((s) => s.searchIndex)
  const openFile = useAppStore((s) => s.openFile)

  useEffect(() => {
    function handlePointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return flattenFiles(tree)
      .map((file) => {
        const entry = searchIndex[file.path]
        const content = entry?.content ?? ''
        const aliases = entry?.aliases ?? []
        const titleHit = file.name.toLowerCase().includes(q)
        const matchedAlias = aliases.find((a) => a.toLowerCase().includes(q))
        const snippet = buildSnippet(content, q)
        if (!titleHit && !matchedAlias && !snippet) return null
        return { ...file, snippet, matchedAlias }
      })
      .filter(Boolean)
      .slice(0, 30)
  }, [query, tree, searchIndex])

  function handleSelect(result) {
    openFile(result.path, result.name)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="search-bar" ref={wrapRef}>
      <div className="search-input-wrap">
        <Search size={13} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="제목·내용 검색"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
              setOpen(false)
              e.currentTarget.blur()
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            title="지우기"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      {open && query && (
        <div className="search-results">
          {results.length === 0 && <div className="search-empty">검색 결과가 없습니다</div>}
          {results.map((r) => (
            <button key={r.path} type="button" className="search-result-item" onClick={() => handleSelect(r)}>
              <div className="search-result-title">{r.name}</div>
              {r.folderPath && <div className="search-result-path">{r.folderPath}</div>}
              {r.matchedAlias && <div className="search-result-snippet">별칭: {r.matchedAlias}</div>}
              {!r.matchedAlias && r.snippet && <div className="search-result-snippet">{r.snippet}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
