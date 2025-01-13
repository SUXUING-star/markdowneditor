import React, { useEffect, useState, useRef } from 'react';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  Undo, Redo, List, ListOrdered, Link, Code, Scissors,
  Plus, Upload, Download
} from 'lucide-react';

type FormatCommand = 
  | 'bold' | 'italic' | 'strikethrough' 
  | 'h1' | 'h2' | 'h3' 
  | 'unorderedList' | 'orderedList' 
  | 'link' | 'code' | 'more';

interface QuickEditToolbarProps {
  onFormatCommand: (command: FormatCommand) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewFile: () => void;
  onImportFile: () => void;
  onDownloadWorkspace: () => void;
}

const QuickEditToolbar: React.FC<QuickEditToolbarProps> = ({
  onFormatCommand,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewFile,
  onImportFile,
  onDownloadWorkspace
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
        setIsSticky(true);
      } else if (currentScrollY <= 100) {
        setIsSticky(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();  // 添加这行，阻止事件冒泡
    callback();  // 直接调用回调，不需要在这里处理滚动
  };

  // 工具栏的样式
  const toolbarStyle = isSticky ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    transform: 'translateY(0)',
    transition: 'transform 0.3s ease'
  } : {};

  return (
    <>
      {isSticky && <div className="h-[120px]" />} {/* 占位符，高度根据工具栏实际高度调整 */}
      
      <div 
        className="bg-white border-b shadow-sm"
        style={toolbarStyle}
      >
        {/* 主要操作按钮 */}
        <div className="flex justify-center items-center w-full py-2">
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={handleButtonClick(onNewFile)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
            >
              <Plus size={16} />
              新建文档
            </button>
            <button 
              type="button"
              onClick={handleButtonClick(onImportFile)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <Upload size={16} />
              导入文件
            </button>
            <button 
              type="button"
              onClick={handleButtonClick(onDownloadWorkspace)}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2"
            >
              <Download size={16} />
              下载工作区
            </button>
          </div>
        </div>

        {/* 编辑工具栏 */}
        <div className="flex items-center gap-2 border-t pt-2 pb-2 justify-center">
          <div className="flex gap-1 border-r pr-2">
            <button 
              type="button"
              onClick={handleButtonClick(onUndo)}
              className={`p-1.5 rounded ${canUndo ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button 
              type="button"
              onClick={handleButtonClick(onRedo)}
              className={`p-1.5 rounded ${canRedo ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
              disabled={!canRedo}
              title="重做 (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
          </div>
          
          <div className="flex gap-1 border-r pr-2">
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('h1'))} className="p-1.5 rounded hover:bg-gray-100">
              <Heading1 size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('h2'))} className="p-1.5 rounded hover:bg-gray-100">
              <Heading2 size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('h3'))} className="p-1.5 rounded hover:bg-gray-100">
              <Heading3 size={16} />
            </button>
          </div>
          
          <div className="flex gap-1 border-r pr-2">
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('bold'))} className="p-1.5 rounded hover:bg-gray-100">
              <Bold size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('italic'))} className="p-1.5 rounded hover:bg-gray-100">
              <Italic size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('strikethrough'))} className="p-1.5 rounded hover:bg-gray-100">
              <Strikethrough size={16} />
            </button>
          </div>
          
          <div className="flex gap-1 border-r pr-2">
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('unorderedList'))} className="p-1.5 rounded hover:bg-gray-100">
              <List size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('orderedList'))} className="p-1.5 rounded hover:bg-gray-100">
              <ListOrdered size={16} />
            </button>
          </div>
          
          <div className="flex gap-1">
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('link'))} className="p-1.5 rounded hover:bg-gray-100">
              <Link size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('code'))} className="p-1.5 rounded hover:bg-gray-100">
              <Code size={16} />
            </button>
            <button type="button" onClick={handleButtonClick(() => onFormatCommand('more'))} className="p-1.5 rounded hover:bg-gray-100">
              <Scissors size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickEditToolbar;