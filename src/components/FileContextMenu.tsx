import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, ImageIcon, XCircle } from 'lucide-react';

interface FileContextMenuProps {
  x: number;
  y: number;
  file: {
    name: string;
    type: 'markdown' | 'image' | 'other';
  };
  onClose: () => void;
  onDelete: (fileName: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onSetCover?: (fileName: string) => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  file,
  onClose,
  onDelete,
  onRename,
  onSetCover
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      // 选中文件名但不包括扩展名
      const lastDotIndex = file.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        inputRef.current.setSelectionRange(0, lastDotIndex);
      } else {
        inputRef.current.select();
      }
    }
  }, [isRenaming]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRename = () => {
    if (newName && newName !== file.name) {
      // 保持原来的扩展名
      const oldExt = file.name.split('.').pop();
      const newExt = newName.split('.').pop();
      let finalName = newName;
      if (oldExt !== newExt) {
        finalName = `${newName}.${oldExt}`;
      }
      onRename(file.name, finalName);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(file.name);
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white shadow-lg rounded-lg py-1 text-sm min-w-[160px]"
      style={{ 
        left: Math.min(x, window.innerWidth - 170), 
        top: Math.min(y, window.innerHeight - 200) 
      }}
    >
      {isRenaming ? (
        <div className="px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsRenaming(true)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit2 size={14} />
            重命名
          </button>
          <button
            onClick={() => {
              if (window.confirm('确定要删除这个文件吗？')) {
                onDelete(file.name);
              }
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2"
          >
            <Trash2 size={14} />
            删除
          </button>
          {file.type === 'image' && onSetCover && (
            <button
              onClick={() => onSetCover(file.name)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <ImageIcon size={14} />
              设为封面
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default FileContextMenu;