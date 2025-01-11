import React, { useEffect, useRef } from 'react';
import { Trash2, Eye, ImageIcon } from 'lucide-react';

interface CustomContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  onSetAsCover?: () => void;
  isImage?: boolean;
}

const CustomContextMenu: React.FC<CustomContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onPreview,
  onSetAsCover,
  isImage = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    isImage && {
      label: '预览',
      icon: <Eye size={16} />,
      onClick: onPreview,
      className: 'text-gray-700'
    },
    isImage && {
      label: '设为封面',
      icon: <ImageIcon size={16} />,
      onClick: onSetAsCover,
      className: 'text-gray-700'
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      onClick: onDelete,
      className: 'text-red-500 hover:bg-red-50'
    }
  ].filter(Boolean);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white shadow-lg rounded-lg overflow-hidden border z-50"
      style={{
        left: Math.min(x, window.innerWidth - 160),
        top: Math.min(y, window.innerHeight - 200)
      }}
    >
      {menuItems.map((item, index) => (
        item && (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick?.();
              onClose();
            }}
            className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${item.className}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
};

export default CustomContextMenu;