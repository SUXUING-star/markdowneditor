import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2, Download, Upload, FolderOpen, File, AlertCircle, Plus, Image as ImageIcon,
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  Undo, Redo, List, ListOrdered, Link, Code, X, Scissors // 添加 Scissors 图标
} from 'lucide-react';
import JSZip from 'jszip';
import MarkdownPreview from './MarkdownPreview';
import anime from 'animejs';
import { HistoryManager, useHistoryManager, HistoryState } from './HistoryManager';
// 在 MarkdownEditor.tsx 顶部，修改导入语句
import { convertToWebP, isImageFile, isWebPFile, generateWebPFileName } from "../utils/imageconvert";
import ImageConversionDialog from './ImageConversionDialog';
import CustomContextMenu from './CustomContextMenu.tsx';
import FrontMatterEditor from './FrontMatterEditor';
import FilePreview from './FilePreview.tsx';
import QuickEditToolbar from './QuickEditToolbar';


// Interface definitions...
interface WorkspaceFile {
  name: string;
  type: 'markdown' | 'image' | 'other';
  content: string | ArrayBuffer;
  isNew?: boolean;
}


interface MissingResource {
  name: string;
  type: 'image' | 'other';
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  file?: WorkspaceFile;
}

// 首先修改 Tab 接口定义
interface Tab {
  id: string;
  fileName: string;
  content: string;
}
// 扩展 Tab 接口
interface TabWithHistory extends Tab {
  history: HistoryState[];
  currentHistoryIndex: number;
}
  
interface EditHistory {
    content: string;
    cursorPosition: number;
}

interface DragEvent<T = Element> extends React.DragEvent<T> {
  dataTransfer: DataTransfer;
}

interface FileInputEvent extends React.ChangeEvent<HTMLInputElement> {
  target: HTMLInputElement & {
    files: FileList;
  };
}

interface PasteEvent extends React.ClipboardEvent<HTMLTextAreaElement> {
  clipboardData: DataTransfer;
}

const MarkdownEditor: React.FC = () => {
  // 状态定义
  const [content, setContent] = useState<string>('');
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [missingResources, setMissingResources] = useState<MissingResource[]>([]); // 添加缺失资源状态
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    file?: WorkspaceFile;
  }>({ show: false, x: 0, y: 0 });
  const [imageConversionDialog, setImageConversionDialog] = useState<{
    isOpen: boolean;
    file: File | null;
    pendingFiles: File[];
  }>({
    isOpen: false,
    file: null,
    pendingFiles: [],
  });

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  // 历史记录管理
  const {
    content: historyContent,
    addHistory,
    undo: historyUndo,
    redo: historyRedo,
    canUndo,
    canRedo,
  } = useHistoryManager('');

    // Example of proper indentation
const generateDefaultTemplate = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
  return `---
categories:
- 
date: ${dateStr}
photos:
- 
tags:
- 
title: 
---
# 说明&介绍

<!--more-->

# 下载链接

`;
};

      // 图片和文件处理函数
  const processImageFile = async (file: File, shouldConvertToWebP: boolean = false): Promise<WorkspaceFile> => {
    if (shouldConvertToWebP && !isWebPFile(file)) {
      try {
        const { webpBlob } = await convertToWebP(file);
        const webpFileName = generateWebPFileName(file.name);
        const arrayBuffer = await webpBlob.arrayBuffer();
        
        return {
          name: webpFileName,
          type: 'image',
          content: arrayBuffer
        };
      } catch (error) {
        console.error('Failed to convert image:', error);
        const buffer = await file.arrayBuffer();
        return {
          name: file.name,
          type: 'image',
          content: buffer
        };
      }
    } else {
      const buffer = await file.arrayBuffer();
      return {
        name: file.name,
        type: 'image',
        content: buffer
      };
    }
  };
// 文件删除处理
const handleDeleteFile = (fileName: string) => {
  if (window.confirm('确定要删除此文件吗？')) {
    // 如果是当前打开的文件，先关闭标签页
    if (currentFile === fileName) {
      closeTab(fileName);
    }
    
    // 更新文件列表
    setFiles(prev => prev.filter(f => f.name !== fileName));
    
    // 如果是图片文件，更新引用
    const deletedFile = files.find(f => f.name === fileName);
    if (deletedFile?.type === 'image') {
      setFiles(prev => prev.map(file => {
        if (file.type === 'markdown') {
          const content = String(file.content);
          // 更新图片引用
          const updatedContent = content.replace(
            new RegExp(`!\\[.*?\\]\\(${fileName}\\)`, 'g'),
            '![图片已删除]()'
          );
          // 更新封面图引用
          const lines = updatedContent.split('\n');
          const photosIndex = lines.findIndex(line => line.trim() === 'photos:');
          if (photosIndex !== -1 && lines[photosIndex + 1].includes(fileName)) {
            lines[photosIndex + 1] = '- ';
          }
          return {
            ...file,
            content: lines.join('\n')
          };
        }
        return file;
      }));
    }
  }
};

// 文件点击处理
const handleFileClick = (file: WorkspaceFile) => {
  if (file.type === 'image') {
    setPreviewFile(file);
  } else if (file.type === 'markdown') {
    handleFileSelect(file.name);
  }
};

// 重命名文件
const handleRenameFile = (oldName: string, newName: string) => {
  // 如果新文件名已存在，显示错误
  if (files.some(f => f.name === newName)) {
    alert('文件名已存在！');
    return;
  }
  
  // 更新文件列表
  setFiles(prev => prev.map(file => {
    if (file.name === oldName) {
      return { ...file, name: newName };
    }
    
    // 如果是markdown文件，更新其中的引用
    if (file.type === 'markdown') {
      const content = String(file.content);
      // 更新图片引用
      const updatedContent = content.replace(
        new RegExp(`!\\[.*?\\]\\(${oldName}\\)`, 'g'),
        `![${newName.split('.')[0]}](${newName})`
      );
      // 更新封面图引用
      const lines = updatedContent.split('\n');
      const photosIndex = lines.findIndex(line => line.trim() === 'photos:');
      if (photosIndex !== -1 && lines[photosIndex + 1].includes(oldName)) {
        lines[photosIndex + 1] = `- ${newName}`;
      }
      return {
        ...file,
        content: lines.join('\n')
      };
    }
    
    return file;
  }));
  
  // 更新标签页
  if (files.find(f => f.name === oldName)?.type === 'markdown') {
    setTabs(prev => prev.map(tab => 
      tab.id === oldName
        ? { ...tab, id: newName, fileName: newName }
        : tab
    ));
    
    if (currentFile === oldName) {
      setCurrentFile(newName);
      setActiveTab(newName);
    }
  }
  
  // 如果当前打开的是markdown文件，更新其内容中的引用
  if (currentFile && files.find(f => f.name === currentFile)?.type === 'markdown') {
    const updatedContent = content.replace(
      new RegExp(`!\\[.*?\\]\\(${oldName}\\)`, 'g'),
      `![${newName.split('.')[0]}](${newName})`
    );
    setContent(updatedContent);
  }
};

  // 修改图片转换确认处理函数
  const handleImageConversionConfirm = async () => {
    const { pendingFiles } = imageConversionDialog;
    setIsProcessing(true);
    
    try {
      for (const file of pendingFiles) {
        const processedFile = await processImageFile(file, true);
        // 更新文件列表
        setFiles(prev => {
          // 检查是否已存在同名文件
          const existingIndex = prev.findIndex(f => f.name === processedFile.name);
          if (existingIndex >= 0) {
            // 如果存在，替换它
            return prev.map((f, index) => 
              index === existingIndex ? processedFile : f
            );
          }
          // 如果不存在，添加新文件
          return [...prev, processedFile];
        });
        
        // 更新缺失资源列表
        setMissingResources(prev => 
          prev.filter(resource => resource.name !== processedFile.name)
        );
      }
    } catch (error) {
      console.error('Error processing images:', error);
      alert('转换图片时发生错误，请重试');
    } finally {
      setIsProcessing(false);
      setImageConversionDialog({ isOpen: false, file: null, pendingFiles: [] });
    }
  };

  // 处理图片转换取消
  const handleImageConversionCancel = async () => {
    const { pendingFiles } = imageConversionDialog;
    
    for (const file of pendingFiles) {
      const processedFile = await processImageFile(file, false);
      setFiles(prev => [...prev, processedFile]);
      
      setMissingResources(prev => 
        prev.filter(resource => resource.name !== processedFile.name)
      );
    }
    
    setImageConversionDialog({ isOpen: false, file: null, pendingFiles: [] });
  };

     // 链接格式化工具函数
     const formatLinkContent = (content: string): { url: string; extractionCode: string; title: string } | null => {
      // 匹配URL，支持http、https和磁力链接
      const urlRegex = /((?:https?:\/\/|magnet:\?xt=)[^\s]+)/i;
      // 匹配提取码，支持多种常见格式
      const extractionCodeRegex = /(?:提取码|密码|访问码)[\s:：]*([a-zA-Z0-9]{4,6})/i;
      // 匹配标题（如果有）
      const titleRegex = /《([^》]+)》|"([^"]+)"|'([^']+)'/;

      const urlMatch = content.match(urlRegex);
      if (!urlMatch) return null;

      const url = urlMatch[1];
      const extractionCodeMatch = content.match(extractionCodeRegex);
      const extractionCode = extractionCodeMatch ? extractionCodeMatch[1] : '';
      
      const titleMatch = content.match(titleRegex);
      const title = titleMatch 
          ? (titleMatch[1] || titleMatch[2] || titleMatch[3])
          : '';

      return { url, extractionCode, title };
  };


    // 处理粘贴事件
    const handlePaste = (e: PasteEvent): void => {
      const pastedText = e.clipboardData.getData('text');
      if (!pastedText.trim()) return;
  
      const linkInfo = formatLinkContent(pastedText);
      if (linkInfo) {
          e.preventDefault();
          
          if (window.confirm('检测到链接，是否要转换为Markdown链接格式？')) {
              let linkText;
              const { url, extractionCode, title } = linkInfo;
              
              // 根据不同情况生成不同的链接格式
              if (title && extractionCode) {
                  linkText = `[${title} | 提取码：${extractionCode}](${url})`;
              } else if (title) {
                  linkText = `[${title}](${url})`;
              } else if (extractionCode) {
                  linkText = `[链接 | 提取码：${extractionCode}](${url})`;
              } else {
                  linkText = `[链接](${url})`;
              }
              
              const textarea = editorRef.current;
              if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const newContent = content.substring(0, start) + linkText + content.substring(end);
                  
                  // 更新内容
                  setContent(newContent);
                  
                  // 添加到历史记录，使用新的 addHistory 函数
                  addHistory(newContent, start + linkText.length);
                  
                  // 更新标签页内容
                  setTabs(prev => prev.map(tab => 
                      tab.id === activeTab
                          ? { ...tab, content: newContent }
                          : tab
                  ));
                  
                  // 设置光标位置到链接后
                  setTimeout(() => {
                      textarea.focus();
                      const newPosition = start + linkText.length;
                      textarea.setSelectionRange(newPosition, newPosition);
                  }, 0);
              }
          }
      }
  };

// 修改现有的 handleContentChange
const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newContent = e.target.value;
  const cursorPos = e.target.selectionStart; // 保存光标位置
  
  setContent(newContent);
  addHistory(newContent, cursorPos);
  
  // 更新当前标签页
  setTabs(prev => prev.map(tab => 
    tab.id === activeTab
      ? { ...tab, content: newContent }
      : tab
  ));
};
    // 处理撤销
    const handleUndo = () => {
      const previousState = historyUndo();
      if (previousState) {
        setContent(previousState.content);
        // 更新当前标签页
        setTabs(prev => prev.map(tab => 
          tab.id === activeTab
            ? { ...tab, content: previousState.content }
            : tab
        ));
      }
    };
    // 处理重做
    const handleRedo = () => {
      const nextState = historyRedo();
      if (nextState) {
        setContent(nextState.content);
        // 更新当前标签页
        setTabs(prev => prev.map(tab => 
          tab.id === activeTab
            ? { ...tab, content: nextState.content }
            : tab
        ));
      }
    };

     // 新建文件
     // 处理新建文件
    const createNewFile = () => {
      const fileName = 'index.md';
      const defaultContent = generateDefaultTemplate();
      
      // 检查是否已存在 index.md
      if (files.some(f => f.name === fileName)) {
        let counter = 1;
        let newFileName = `index-${counter}.md`;
        while (files.some(f => f.name === newFileName)) {
          newFileName = `index-${++counter}.md`;
        }
        
        const newFile: WorkspaceFile = {
          name: newFileName,
          type: 'markdown',
          content: defaultContent,
          isNew: true
        };

        setFiles(prev => [...prev, newFile]);
        setCurrentFile(newFileName);
        setContent(defaultContent);
        
        const newTab: Tab = {
          id: newFileName,
          fileName: newFileName,
          content: defaultContent
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newTab.id);
        addHistory(defaultContent, 0);
      } else {
        const newFile: WorkspaceFile = {
          name: fileName,
          type: 'markdown',
          content: defaultContent,
          isNew: true
        };

        setFiles(prev => [...prev, newFile]);
        setCurrentFile(fileName);
        setContent(defaultContent);
            
        const newTab: Tab = {
          id: fileName,
          fileName: fileName,
          content: defaultContent
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newTab.id);
        addHistory(defaultContent, 0);
      }
      
      setMissingResources([]);
    };

  // 更新封面图设置处理
  const setCoverImage = (imageName: string) => {
    const lines = content.split('\n');
    const photosIndex = lines.findIndex(line => line.trim() === 'photos:');
    
    if (photosIndex !== -1) {
      lines[photosIndex + 1] = `- ${imageName}`;
      const newContent = lines.join('\n');
      setContent(newContent);
      
      // 同步更新文件内容和历史记录
      setFiles(prev => prev.map(file => 
        file.name === currentFile 
          ? { ...file, content: newContent }
          : file
      ));
      addHistory(newContent, editorRef.current?.selectionStart || 0);
    }
  };

   // 处理文件拖拽
const handleFileDrag = (e: React.DragEvent, file: WorkspaceFile) => {
  e.dataTransfer.setData('text/plain', file.name);
  e.dataTransfer.effectAllowed = 'copy';
};
  // 修改文件列表区域的拖放处理
  const handleFileListDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleFileListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50');
  };

  const handleFileListDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50');
  };

// 处理编辑器的拖放
const handleEditorDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);

  const fileData = e.dataTransfer.getData('text/plain');
  if (fileData) {
    const draggedFile = files.find(f => f.name === fileData);
    if (draggedFile && draggedFile.type === 'image') {
      const textarea = editorRef.current;
      if (textarea) {
        // 使用当前文本框的选择位置
        const insertAt = textarea.selectionStart;
        const baseName = draggedFile.name.split('.')[0];
        const imageText = `![${baseName}](${draggedFile.name})`;
        
        const newContent = content.substring(0, insertAt) + 
                         imageText + 
                         content.substring(insertAt);
        
        setContent(newContent);
        addHistory(newContent, insertAt + imageText.length);
        
        // 更新标签页
        setTabs(prev => prev.map(tab => 
          tab.id === activeTab ? { ...tab, content: newContent } : tab
        ));
        
        // 更新光标位置
        setTimeout(() => {
          textarea.focus();
          const newPosition = insertAt + imageText.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      }
      return;
    }
  }

  // 处理外部文件拖拽
  const droppedFiles = e.dataTransfer.files;
  if (droppedFiles.length > 0) {
    handleFiles(droppedFiles);
  }
};

     // 处理右键菜单
    const handleContextMenu = (e: React.MouseEvent, file: WorkspaceFile) => {
        e.preventDefault();
        if (file.type === 'image') {
            setContextMenu({
                show: true,
                x: e.clientX,
                y: e.clientY,
                file
            });
        }
    };

    // 关闭右键菜单
    useEffect(() => {
        const closeContextMenu = () => setContextMenu(prev => ({ ...prev, show: false }));
        document.addEventListener('click', closeContextMenu);
        return () => document.removeEventListener('click', closeContextMenu);
    }, []);

    // 解析 Markdown 中的资源引用
     const parseResourceReferences = (markdown: string): string[] => {
        if (!markdown) return [];
        const resources: string[] = [];
        
        // 只匹配本地文件引用，忽略网络链接
        const imagePattern = /!\[.*?\]\(((?!http|https|ftp)[^)]+)\)/g;
        let match;
        while ((match = imagePattern.exec(markdown)) !== null) {
            resources.push(match[1]);
        }
    
        // 匹配 YAML front matter 中的 photos，但只匹配非空值
        const photosPattern = /photos:\s*\n\s*-\s*([^\s].+)/g;
        while ((match = photosPattern.exec(markdown)) !== null) {
            if (match[1] && !match[1].startsWith('http')) {
            resources.push(match[1].trim());
            }
        }
    
        return [...new Set(resources)].filter(res => res && res !== '-');
    };
  
    // 检查缺失的资源
    const checkMissingResources = (mdContent: string): void => {
        const references = parseResourceReferences(mdContent);
        const existingFiles = new Set(files.map(f => f.name));
        
        const missing = references
        .filter(ref => !existingFiles.has(ref))
        .map(name => ({
            name,
            type: name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? 'image' : 'other'
        }));
    
        setMissingResources(missing);
    };

     // 处理 Markdown 文件导入
    const handleMarkdownImport = async (file: File): Promise<void> => {
        const content = await file.text();
        
        // 添加到文件列表
        setFiles(prev => [...prev, {
            name: file.name,
            type: 'markdown',
            content
        }]);
        
        // 创建新的标签页
        const newTab: Tab = {
            id: file.name,
            fileName: file.name,
            content: content,
            history: [{ content: content, cursorPosition: 0 }],
            currentHistoryIndex: 0
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newTab.id);
    
        // 设置为当前文件
        setCurrentFile(file.name);
        setContent(content);
    
        // 检查资源引用
        checkMissingResources(content); 
    };

    // 处理文件选择
     const handleFileSelect = (fileName: string): void => {
        const file = files.find(f => f.name === fileName);
        if (file && file.type === 'markdown') {
           // 切换标签页
           switchTab(fileName);
        }
    };

    
    useEffect(() => {
      if (!currentFile) return;
      
      const existingFiles = new Set(files.map(f => f.name));
      const references = parseResourceReferences(content);
      
      // 只有当内容真正改变时才更新文件
      const currentFileContent = files.find(f => f.name === currentFile)?.content;
      if (currentFileContent !== content) {
        setFiles(prev => prev.map(file => 
          file.name === currentFile 
            ? { ...file, content } 
            : file
        ));
      }
      
      const missing = references
        .filter(ref => !existingFiles.has(ref))
        .map(name => ({
          name,
          type: name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? 'image' : 'other'
        }));
      
      setMissingResources(missing);
    }, [content, currentFile]); // 移除 files 依赖

// 在 handleFiles 函数中修改非图片文件的处理部分
const handleFiles = async (uploadedFiles: FileList): Promise<void> => {
  const imageFiles = Array.from(uploadedFiles).filter(isImageFile);
  const nonImageFiles = Array.from(uploadedFiles).filter(file => !isImageFile(file));
  
  // 处理非 WebP 图片转换
  const nonWebPImages = imageFiles.filter(file => !isWebPFile(file));
  if (nonWebPImages.length > 0) {
    setImageConversionDialog({
      isOpen: true,
      file: nonWebPImages[0],
      pendingFiles: nonWebPImages,
    });
  }
  
  // 处理已经是 WebP 的图片
  const webPImages = imageFiles.filter(isWebPFile);
  for (const file of webPImages) {
    const processedFile = await processImageFile(file, false);
    setFiles(prev => [...prev, processedFile]);
  }
  
  // 处理非图片文件
  for (const file of nonImageFiles) {
    if (file.name.endsWith('.md')) {
      const content = await file.text();
      
      // 先检查资源缺失
      const references = parseResourceReferences(content);
      const existingFiles = new Set(files.map(f => f.name));
      
      const missing = references
        .filter(ref => !existingFiles.has(ref))
        .map(name => ({
          name,
          type: name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? 'image' : 'other'
        }));
      
      setFiles(prev => [...prev, {
        name: file.name,
        type: 'markdown',
        content
      }]);
      
      // 创建新标签页
      const newTab: Tab = {
        id: file.name,
        fileName: file.name,
        content
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTab(newTab.id);
      setContent(content);
      
      // 设置缺失资源
      setMissingResources(missing);
    }
  }
};

  // Add this to the history management section
  const addToHistory = (newContent: string) => {
    if (editorRef.current) {
      addHistory(newContent, editorRef.current.selectionStart);
    }
  };
  // 在光标位置插入文本
  const insertText = (before: string, after: string = '') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    // 保存编辑器的滚动位置，而不是窗口的滚动位置
    const editorScrollTop = textarea.scrollTop;
    const editorScrollLeft = textarea.scrollLeft;
    const documentScrollTop = window.scrollY;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = before + selectedText + after;
    
    const newContent = content.substring(0, start) + newText + content.substring(end);
    
    // 先更新内容
    setContent(newContent);
    addToHistory(newContent);

    // 使用 RAF 确保在下一帧更新位置
    requestAnimationFrame(() => {
        // 恢复编辑器滚动位置
        textarea.scrollTop = editorScrollTop;
        textarea.scrollLeft = editorScrollLeft;
        // 恢复文档滚动位置
        window.scrollTo(0, documentScrollTop);
        
        // 设置光标位置
        textarea.focus();
        textarea.setSelectionRange(
            start + before.length,
            end + before.length
        );
    });
};
      
const formatCommands = {
  bold: () => {
      const scrollPosition = window.scrollY;
      insertText('**', '**');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  italic: () => {
      const scrollPosition = window.scrollY;
      insertText('*', '*');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  strikethrough: () => {
      const scrollPosition = window.scrollY;
      insertText('~~', '~~');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  h1: () => {
      const scrollPosition = window.scrollY;
      insertText('# ');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  h2: () => {
      const scrollPosition = window.scrollY;
      insertText('## ');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  h3: () => {
      const scrollPosition = window.scrollY;
      insertText('### ');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  orderedList: () => {
      const scrollPosition = window.scrollY;
      insertText('1. ');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  unorderedList: () => {
      const scrollPosition = window.scrollY;
      insertText('- ');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  link: () => {
      const scrollPosition = window.scrollY;
      insertText('[', '](url)');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  code: () => {
      const scrollPosition = window.scrollY;
      insertText('`', '`');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  },
  more: () => {
      const scrollPosition = window.scrollY;
      insertText('\n<!--more-->\n');
      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  }
};
    
    
    // 下载工作文件夹
    const downloadWorkspace = async (): Promise<void> => {
        const zip = new JSZip();
        
        files.forEach(file => {
          zip.file(file.name, file.content);
        });
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'markdown-workspace.zip';
        a.click();
        URL.revokeObjectURL(url);
    };
        
      // 修改后的切换标签页函数
      const switchTab = (tabId: string) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
          setActiveTab(tabId);
          setContent(tab.content);
          // 为新标签页初始化历史记录
          addHistory(tab.content, 0);
          setCurrentFile(tab.fileName);
        }
      };
    
    // 修改 closeTab 函数
const closeTab = (tabId: string) => {
  const remainingTabs = tabs.filter(tab => tab.id !== tabId);
  setTabs(remainingTabs);
  
  if (activeTab === tabId) {
    if (remainingTabs.length > 0) {
      // 如果还有其他标签页，切换到第一个
      const firstTab = remainingTabs[0];
      setActiveTab(firstTab.id);
      setContent(firstTab.content);
      setCurrentFile(firstTab.fileName);
    } else {
      // 如果没有剩余标签页，清空所有状态
      setActiveTab('');
      setContent('');
      setCurrentFile('');
    }
  }
};

    
    // 处理文件输入改变
    const handleFileInputChange = (e: FileInputEvent): void => {
        if (e.target.files) {
          handleFiles(e.target.files);
        }
    };
    
      // 修改键盘快捷键处理
      useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
              case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                  handleRedo();
                } else {
                  handleUndo();
                }
                break;
              case 'y':
                e.preventDefault();
                handleRedo();
                break;
              case 'b':
                e.preventDefault();
                formatCommands.bold();
                break;
              case 'i':
                e.preventDefault();
                formatCommands.italic();
                break;
              case 'm': // 新增快捷键 Ctrl+M
                e.preventDefault();
                formatCommands.more();
                break;

            }
          }
        };
    
        document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);
    
    // 修改后的 useEffect
    useEffect(() => {
      if (activeTab) {
        const activeTabObj = tabs.find(tab => tab.id === activeTab);
        if (activeTabObj) {
          setContent(activeTabObj.content);
          // 为活动标签页初始化历史记录
          addHistory(activeTabObj.content, 0);
          setCurrentFile(activeTabObj.fileName);
        }
      }
    }, [activeTab, tabs]);

      // 添加点击动画函数
      const handleClickAnimation = (e: React.MouseEvent<HTMLButtonElement>) => {
        const target = e.currentTarget;
        
        anime({
          targets: target,
          scale: [1, 0.9],
          duration: 100,
          easing: 'easeInOutQuad',
          complete: () => {
            anime({
              targets: target,
              scale: 1,
              duration: 100,
              easing: 'easeInOutQuad'
            })
          }
        });
    
      };
        
        // 添加渲染动画
        useEffect(() => {
          anime({
            targets: '.toolbar-container',
            translateY: [-20, 0],
            opacity: [0, 1],
            duration: 400,
            easing: 'easeOutQuad'
          });
        }, []);


  return (
    <div className="h-screen flex flex-col">        {/* 顶部工具栏 */}
      {/* 替换原有工具栏 */}
      <QuickEditToolbar
        onFormatCommand={(command) => {
            const commandFn = formatCommands[command as keyof typeof formatCommands];
            if (commandFn) {
                const scrollPosition = window.scrollY;
                commandFn();
                requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
            }
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewFile={createNewFile}
        onImportFile={() => fileInputRef.current?.click()}
        onDownloadWorkspace={downloadWorkspace}
      />


      {/* 主编辑区域 */}
      <div className="flex-1 flex">
        {/* 左侧面板：可拖放的文件列表和FrontMatter编辑器 */}
        <div className="sticky top-[120px] w-64 flex-shrink-0 flex flex-col max-h-[calc(100vh-120px)] bg-white border-r">
        {/* 文件列表区域 */}
          <div 
            className="flex-1 overflow-y-auto"
            onDrop={handleFileListDrop}
            onDragOver={handleFileListDragOver}
            onDragLeave={handleFileListDragLeave}
          >
            <div className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-gray-700">
                <FolderOpen size={20} />
                工作文件夹
                <span className="text-xs text-gray-500">(可拖放文件至此处)</span>
              </h2>
              <div className="space-y-1">
                {files.map(file => (
                  <div 
                    key={file.name}
                    draggable={file.type === 'image'}
                    onDragStart={(e) => handleFileDrag(e, file)}
                    onClick={() => handleFileClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer ${
                      currentFile === file.name 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {file.type === 'markdown' ? (
                      <File size={14} />
                    ) : file.type === 'image' ? (
                      <ImageIcon size={14} />
                    ) : (
                      <File size={14} />
                    )}
                    <span className="truncate text-sm">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FrontMatter编辑器区域 */}
          {currentFile && (
            <div className="border-t">
              <FrontMatterEditor
                content={content}
                onChange={(newContent) => {
                  setContent(newContent);
                  addHistory(newContent, editorRef.current?.selectionStart || 0);
                  
                  setFiles(prev => prev.map(file => 
                    file.name === currentFile 
                      ? { ...file, content: newContent }
                      : file
                  ));
                }}
                files={files}
              />
            </div>
          )}
        </div>

        {/* 编辑器和预览区域的容器 */}
        <div className="flex-1 flex h-[calc(100vh-120px)]">  {/* 添加固定高度 */}
          {/* 编辑器区域 */}
          <div className="flex-1 flex flex-col p-4 border-r overflow-hidden"> {/* 修改这里 */}
            {missingResources.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertCircle size={16} />
                  <span className="font-medium">缺失的资源文件：</span>
                </div>
                <ul className="space-y-1">
                  {missingResources.map((resource) => (
                    <li key={resource.name} className="text-sm text-yellow-700 flex items-center gap-2">
                      {resource.type === 'image' ? (
                        <ImageIcon size={14} />
                      ) : (
                        <File size={14} />
                      )}
                      {resource.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              onDrop={handleEditorDrop}
              onPaste={handlePaste}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`flex-1 resize-none p-4 border rounded focus:border-blue-500 focus:outline-none font-mono text-sm overflow-y-auto ${
                isDragging ? 'bg-blue-50' : ''
              }`}
              placeholder="开始编写..."
            />
          </div>

          {/* 预览区域 */}
          <div className="flex-1 p-4 overflow-y-auto bg-white">
            <MarkdownPreview content={content} files={files} />
          </div>
        </div>
      </div>

      {/* 上下文菜单和对话框 */}
      {contextMenu.show && contextMenu.file && (
        <CustomContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(prev => ({ ...prev, show: false }))}
          onDelete={() => handleDeleteFile(contextMenu.file!.name)}
          onPreview={() => setPreviewFile(contextMenu.file!)}
          onSetAsCover={
            contextMenu.file.type === 'image'
              ? () => setCoverImage(contextMenu.file!.name)
              : undefined
          }
          isImage={contextMenu.file.type === 'image'}
        />
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* 图片转换对话框 */}
      <ImageConversionDialog
        isOpen={imageConversionDialog.isOpen}
        onClose={() => handleImageConversionCancel()}
        onConfirm={() => handleImageConversionConfirm()}
        imageInfo={
          imageConversionDialog.file
            ? {
                name: imageConversionDialog.file.name,
                size: imageConversionDialog.file.size,
              }
            : null
        }
      />

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.md"
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />
    </div>
  );
};

export default MarkdownEditor;