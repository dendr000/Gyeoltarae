import { useState } from 'react'
import { Folder } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'

// 폴더 선택 트리 한 줄 — 재귀적으로 하위 폴더까지 그림(문서는 이동 "목적지"가 될 수 없으니
// 아예 표시 안 함). excludePath 자신과 그 아래 전부(자기 자신이나 하위 폴더로는 옮길 수
// 없음)는 클릭해도 반응 없는 비활성 상태로만 보여줌 — 그래야 지금 폴더가 트리 어디쯤
// 있는지 맥락이 유지됨(숨겨버리면 오히려 헷갈림).
function FolderRow({ node, depth, excludePath, selectedPath, onSelect }) {
  const isExcluded = node.path === excludePath || node.path.startsWith(`${excludePath}/`) || node.path.startsWith(`${excludePath}\\`)
  const subDirs = node.children?.filter((c) => c.type === 'dir') ?? []
  return (
    <>
      <div
        className={`move-modal-folder-row ${selectedPath === node.path ? 'active' : ''} ${isExcluded ? 'disabled' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => !isExcluded && onSelect(node.path)}
      >
        <Folder size={13} strokeWidth={2} />
        <span>{node.name}</span>
      </div>
      {subDirs.map((child) => (
        <FolderRow key={child.path} node={child} depth={depth + 1} excludePath={excludePath} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </>
  )
}

// itemPath/itemType: 이동시킬 대상. itemType이 'dir'이면 자기 자신·하위 폴더는 목적지로
// 고를 수 없음(FolderRow의 excludePath 처리) — 문서(itemType 'file')는 애초에 폴더를 품을
// 수 없으니 그런 제약이 필요 없어 excludePath로 그 파일 경로를 그대로 넘겨도 어차피 트리엔
// 폴더만 나오므로 자연히 아무것도 안 걸림.
export function MoveItemModal({ itemName, itemPath, onCancel, onConfirm }) {
  const tree = useAppStore((s) => s.tree)
  const workspacePath = useAppStore((s) => s.workspacePath)
  const [selectedPath, setSelectedPath] = useState(null)

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel move-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>&quot;{itemName}&quot; 이동</h2>
          <button className="modal-close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>
        <p className="move-modal-hint">옮길 위치를 선택하세요.</p>
        <div className="move-modal-tree">
          <div
            className={`move-modal-folder-row ${selectedPath === workspacePath ? 'active' : ''}`}
            onClick={() => setSelectedPath(workspacePath)}
          >
            <Folder size={13} strokeWidth={2} />
            <span>(워크스페이스 최상위)</span>
          </div>
          {tree.map((node) =>
            node.type === 'dir' ? (
              <FolderRow key={node.path} node={node} depth={1} excludePath={itemPath} selectedPath={selectedPath} onSelect={setSelectedPath} />
            ) : null,
          )}
        </div>
        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="modal-confirm-btn" disabled={!selectedPath} onClick={() => onConfirm(selectedPath)}>
            여기로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
