import React, { useState, useCallback, useEffect } from 'react';
import { Undo, Redo } from 'lucide-react';

// 基础的历史记录状态接口
export interface HistoryState {
  content: string;
  cursorPosition: number;
  timestamp: number;
}

// 历史管理器的属性接口
export interface HistoryManagerProps {
  /** 当前内容 */
  content: string;
  /** 内容变化时的回调函数 */
  onContentChange: (newContent: string) => void;
  /** 最大历史记录数量 */
  maxHistorySize?: number;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

// 历史管理器返回值接口
export interface HistoryManagerReturn {
  /** 当前内容 */
  content: string;
  /** 添加新的历史记录 */
  addHistory: (newContent: string, cursorPos: number) => void;
  /** 撤销操作 */
  undo: () => HistoryState | null;
  /** 重做操作 */
  redo: () => HistoryState | null;
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 当前历史记录索引 */
  currentHistoryIndex: number;
  /** 历史记录长度 */
  historyLength: number;
}

// 历史管理器Hook
export function useHistoryManager(
  initialContent: string = '',
  maxHistorySize: number = 100
): HistoryManagerReturn {
  const [content, setContent] = useState<string>(initialContent);
  const [history, setHistory] = useState<HistoryState[]>([{
    content: initialContent,
    cursorPosition: 0,
    timestamp: Date.now()
  }]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const addHistory = useCallback((newContent: string, cursorPos: number) => {
    if (history[currentIndex]?.content === newContent) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({
        content: newContent,
        cursorPosition: cursorPos,
        timestamp: Date.now()
      });

      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      return newHistory;
    });

    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, maxHistorySize - 1);
      return newIndex;
    });
    
    setContent(newContent);
  }, [currentIndex, maxHistorySize, history]);

  const undo = useCallback((): HistoryState | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const previousState = history[newIndex];
      setCurrentIndex(newIndex);
      setContent(previousState.content);
      return previousState;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback((): HistoryState | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      const nextState = history[newIndex];
      setCurrentIndex(newIndex);
      setContent(nextState.content);
      return nextState;
    }
    return null;
  }, [currentIndex, history.length, history]);

  return {
    content,
    addHistory,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    currentHistoryIndex: currentIndex,
    historyLength: history.length
  };
}

// 历史管理器组件
export const HistoryManager: React.FC<HistoryManagerProps> = ({
  content,
  onContentChange,
  maxHistorySize = 100,
  className = '',
  disabled = false
}) => {
  const {
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistoryManager(content, maxHistorySize);

  // 处理快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              const newState = redo();
              if (newState) onContentChange(newState.content);
            } else {
              const newState = undo();
              if (newState) onContentChange(newState.content);
            }
            break;
          case 'y':
            e.preventDefault();
            const newState = redo();
            if (newState) onContentChange(newState.content);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, onContentChange, disabled]);

  return (
    <div className={`flex gap-1 ${className}`}>
      <button
        onClick={() => {
          const newState = undo();
          if (newState) onContentChange(newState.content);
        }}
        disabled={!canUndo || disabled}
        className={`p-1.5 rounded transition-colors ${
          canUndo && !disabled
            ? 'hover:bg-gray-100 text-gray-700' 
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title="撤销 (Ctrl+Z)"
        type="button"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={() => {
          const newState = redo();
          if (newState) onContentChange(newState.content);
        }}
        disabled={!canRedo || disabled}
        className={`p-1.5 rounded transition-colors ${
          canRedo && !disabled
            ? 'hover:bg-gray-100 text-gray-700' 
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title="重做 (Ctrl+Y)"
        type="button"
      >
        <Redo size={16} />
      </button>
    </div>
  );
};