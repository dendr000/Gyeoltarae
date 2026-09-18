// 이미지 전용 공간 — 분류/자료/틀 사이드바와 같은 자리에 나란히 표시됨.
// 다른 세 공간과 달리 이름만 미리 적어두는 개념이 없음(실제 파일이 있어야
// 뭔가 존재하므로): "+"를 누르면 바로 네이티브 파일 선택 창이 뜨고, 고른
// 파일이 즉시 .wikidesk-images로 복사되어 등록됨(electron/main.js의
// images:import 참고). 항목을 클릭하면 문서에 붙여넣을 수 있게 [[파일:이름]]
// 문법을 클립보드로 복사해 줌 — 자료/틀처럼 "열어서 편집"할 텍스트 내용이
// 없기 때문. 더블클릭하면 FileTree.jsx와 같은 방식으로 이름을 바꿀 수 있음.
// 파일 탐색기에서 이미지를 이 영역에 직접 끌어다 놓아도 등록됨 — FileTree의
// 드롭 영역과는 별개로, 여기 자체가 "이미지"의 자연스러운 드롭 대상이기
// 때문에(사용자가 실제로 여기다 먼저 끌어다 놔봄) 이 컴포넌트도 직접
// onDrop을 받는다.
import { useState } from 'react'
import { getApi } from '../lib/api.js'
import { readFileAsBase64, IMPORTABLE_IMAGE_EXT } from '../lib/fileEncoding.js'

export function ImageSidebar({ imageIndex, onImport, onImportImages, onDeleteImage, onRenameImage }) {
  const names = Object.keys(imageIndex).sort((a, b) => a.localeCompare(b, 'ko'))
  const [copiedName, setCopiedName] = useState(null)
  const [renamingName, setRenamingName] = useState(null)
  const [draft, setDraft] = useState('')
  const [dragOver, setDragOver] = useState(false)

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const allFiles = [...e.dataTransfer.files]
    const imageFiles = allFiles.filter((f) => IMPORTABLE_IMAGE_EXT.test(f.name))
    if (imageFiles.length === 0) {
      window.alert('이미지 파일만 여기에 등록할 수 있습니다. (.png/.jpg/.gif/.webp/.svg/.bmp)')
      return
    }
    const encoded = await Promise.all(
      imageFiles.map(async (file) => ({ name: file.name, base64: await readFileAsBase64(file) })),
    )
    await onImportImages(encoded)
    const skipped = allFiles.length - imageFiles.length
    if (skipped > 0) {
      window.alert(`이미지가 아니라서 ${skipped}개는 건너뛰었습니다.`)
    }
  }

  const handleCopy = async (name) => {
    try {
      await navigator.clipboard.writeText(`[[파일:${name}]]`)
      setCopiedName(name)
      setTimeout(() => setCopiedName((cur) => (cur === name ? null : cur)), 1200)
    } catch {
      /* clipboard unavailable — nothing to fall back to, just skip the feedback */
    }
  }

  // Same Windows focus-desync workaround as FileTree.jsx's beginRename:
  // refocus the window BEFORE the autofocused rename <input> mounts.
  const beginRename = async (name) => {
    await getApi().refocusWindow?.()
    setDraft(name)
    setRenamingName(name)
  }

  const commitRename = async () => {
    const name = renamingName
    setRenamingName(null)
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) return
    try {
      await onRenameImage(name, trimmed)
    } catch (err) {
      window.alert(`이름을 바꾸지 못했습니다.\n\n${err.message}`)
    }
  }

  return (
    <div
      className={`image-sidebar ${dragOver ? 'image-sidebar-drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="image-sidebar-title">
        <span>이미지</span>
        <button type="button" className="image-sidebar-add-btn" title="이미지 가져오기" onClick={onImport}>
          +
        </button>
      </div>
      {dragOver && <div className="image-sidebar-drop-hint">여기에 놓으면 이미지로 등록됩니다</div>}
      {names.length === 0 ? (
        <p className="category-empty-hint image-sidebar-empty">등록된 이미지가 없습니다. (끌어다 놓아도 됩니다)</p>
      ) : (
        <div className="image-sidebar-grid">
          {names.map((name) => {
            const entry = imageIndex[name]
            const isRenaming = renamingName === name
            return (
              <div
                key={name}
                className="image-sidebar-item"
                title={isRenaming ? undefined : '클릭해서 [[파일:이름]] 문법 복사, 더블클릭해서 이름 바꾸기'}
                onClick={() => !isRenaming && handleCopy(name)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (!isRenaming) beginRename(name)
                }}
              >
                <img className="image-sidebar-thumb" src={entry.dataUrl} alt={name} />
                {isRenaming ? (
                  <input
                    className="image-sidebar-rename-input"
                    autoFocus
                    value={draft}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') {
                        setDraft(name)
                        setRenamingName(null)
                      }
                    }}
                  />
                ) : (
                  <span className="image-sidebar-label">{copiedName === name ? '복사됨' : name}</span>
                )}
                <button
                  type="button"
                  className="image-sidebar-delete-btn"
                  title="이미지 삭제 (휴지통으로 이동)"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteImage(name)
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
