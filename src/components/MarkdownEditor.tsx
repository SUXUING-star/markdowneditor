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

    // 处理内容变化
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      addHistory(newContent, e.target.selectionStart);
      
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

    // 设置封面图
    const setCoverImage = (imageName: string) => {
        const lines = content.split('\n');
        const photosIndex = lines.findIndex(line => line.trim() === 'photos:');
        
        if (photosIndex !== -1) {
            lines[photosIndex + 1] = `- ${imageName}`;
            const newContent = lines.join('\n');
            setContent(newContent);
        
            // 更新文件内容
            setFiles(prev => prev.map(file => 
                file.name === currentFile 
                    ? { ...file, content: newContent }
                    : file
            ));
        }
    };

   // 处理文件拖拽相关的事件
    const handleFileDrag = (e: React.DragEvent, file: WorkspaceFile) => {
        e.dataTransfer.setData('text/plain', file.name);
        e.dataTransfer.setData('application/json', JSON.stringify(file));
    };

    // 修改 handleEditorDrop 函数
const handleEditorDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);

  // 获取拖拽的文件信息
  const fileData = e.dataTransfer.getData('application/json');
  if (fileData) {
    try {
      const file = JSON.parse(fileData) as WorkspaceFile;
      if (file.type === 'image') {
        const textarea = editorRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          // 使用不带扩展名的文件名作为 alt
          const baseName = file.name.split('.')[0];
          const imageText = `![${baseName}](${file.name})`;
          
          const newContent = content.substring(0, start) + imageText + content.substring(end);
          setContent(newContent);
          
          // 更新历史和标签页
          addHistory(newContent, start + imageText.length);
          setTabs(prev => prev.map(tab => 
            tab.id === activeTab ? { ...tab, content: newContent } : tab
          ));
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + imageText.length;
            textarea.focus();
          }, 0);
        }
      }
    } catch (error) {
      console.error('Error parsing dragged file data:', error);
    }
    return;
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

    
    
     // 更新当前文件内容
     useEffect(() => {
        setFiles(prev => prev.map(file => 
        file.name === currentFile 
            ? { ...file, content } 
            : file
        ));
        checkMissingResources(content);
    }, [content, currentFile]);

// 文件处理函数
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
    
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = before + selectedText + after;
        
        const newContent = content.substring(0, start) + newText + content.substring(end);
        setContent(newContent);
          // 添加到历史记录
        addToHistory(newContent);
          
        setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
              start + before.length,
            end + before.length
          );
        }, 0);
    };
      
    const formatCommands = {
      bold: () => insertText('**', '**'),
      italic: () => insertText('*', '*'),
      strikethrough: () => insertText('~~', '~~'),
      h1: () => insertText('# '),
      h2: () => insertText('## '),
      h3: () => insertText('### '),
      orderedList: () => insertText('1. '),
      unorderedList: () => insertText('- '),
      link: () => insertText('[', '](url)'),
      code: () => insertText('`', '`'),
      more: () => insertText('\n<!--more-->\n')  // 添加摘要分隔符命令
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
      <div className="p-4 border-b flex flex-col gap-2 bg-white shadow-sm toolbar-container" style={{display:'flex', alignItems:'center'}}>
          {/* 主要操作按钮 */}
          <div className="flex justify-center items-center w-full">
            <div className="flex gap-4">
                <button 
                    onClick={(e) => {handleClickAnimation(e); createNewFile()}}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                >
                    <Plus size={16} />
                    新建文档
                </button>
                <button 
                    onClick={(e) => {handleClickAnimation(e); fileInputRef.current?.click()}}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                >
                    <Upload size={16} />
                    导入文件
                </button>
                <button 
                    onClick={(e) => {handleClickAnimation(e); downloadWorkspace()}}
                    className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2"
                >
                    <Download size={16} />
                    下载工作区
                </button>
            </div>
        </div>
  
         {/* 编辑工具栏 */}
        <div className="flex items-center gap-2 border-t pt-2 justify-center">
          {/* ... 其他工具栏内容 ... */}
          <HistoryManager
            content={content}
            onContentChange={(newContent) => {
              setContent(newContent);
              setTabs(prev => prev.map(tab => 
                tab.id === activeTab
                  ? { ...tab, content: newContent }
                  : tab
              ));
            }}
            className="border-r pr-2"
            disabled={!currentFile}
          />
          <div className="flex gap-1 border-r pr-2">
            <button 
              onClick={(e)=>{handleClickAnimation(e); handleUndo()}}
              className={`p-1.5 rounded ${
                canUndo ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'
              }`}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button 
              onClick={(e)=>{handleClickAnimation(e); handleRedo()}}
              className={`p-1.5 rounded ${
                canRedo ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'
              }`}
              disabled={!canRedo}
              title="重做 (Ctrl+Y)"
            >
                  <Redo size={16} />
              </button>
          </div>
          
              
          <div className="flex gap-1 border-r pr-2">
                <button 
                    onClick={(e)=>{handleClickAnimation(e); formatCommands.h1()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="一级标题"
                >
                    <Heading1 size={16} />
                </button>
                <button 
                   onClick={(e)=>{handleClickAnimation(e); formatCommands.h2()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="二级标题"
                >
                    <Heading2 size={16} />
                </button>
                <button 
                   onClick={(e)=>{handleClickAnimation(e); formatCommands.h3()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="三级标题"
                >
                    <Heading3 size={16} />
                </button>
            </div>
              
          <div className="flex gap-1 border-r pr-2">
                <button 
                   onClick={(e)=>{handleClickAnimation(e); formatCommands.bold()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="加粗 (Ctrl+B)"
                >
                    <Bold size={16} />
                </button>
                <button 
                   onClick={(e)=>{handleClickAnimation(e); formatCommands.italic()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="斜体 (Ctrl+I)"
                >
                    <Italic size={16} />
                </button>
                <button 
                  onClick={(e)=>{handleClickAnimation(e); formatCommands.strikethrough()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="删除线"
                >
                    <Strikethrough size={16} />
                </button>
            </div>
              
            <div className="flex gap-1 border-r pr-2">
                <button 
                   onClick={(e)=>{handleClickAnimation(e); formatCommands.unorderedList()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="无序列表"
                >
                    <List size={16} />
                </button>
                <button 
                    onClick={(e)=>{handleClickAnimation(e); formatCommands.orderedList()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="有序列表"
                >
                    <ListOrdered size={16} />
                </button>
            </div>
              
            {/* 在工具栏的最后一组按钮中添加 */}
            <div className="flex gap-1">
                <button 
                    onClick={(e)=>{handleClickAnimation(e); formatCommands.link()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="插入链接"
                >
                    <Link size={16} />
                </button>
                <button 
                    onClick={(e)=>{handleClickAnimation(e); formatCommands.code()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="插入代码"
                >
                    <Code size={16} />
                </button>
                <button 
                    onClick={(e)=>{handleClickAnimation(e); formatCommands.more()}}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="插入摘要分隔符"
                >
                    <Scissors size={16} />
                </button>
            </div>
        </div>
    
         {/* 标签页 */}
      <div className="flex gap-2 overflow-x-auto pt-2 border-t justify-center">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1 rounded-t cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <File size={14} />
            <span>{tab.fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-2 hover:bg-gray-200 rounded-full p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      </div>

{/* 主编辑区域 */}
<div className="flex-1 flex">
        {/* 左侧面板：文件列表和FrontMatter编辑器 */}
        <div className="w-64 flex-shrink-0 overflow-y-auto bg-white border-r">
          {/* 文件列表 */}
          <div className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2 text-gray-700">
              <FolderOpen size={20} />
              工作文件夹
            </h2>
            <div className="space-y-1">
              {files.map(file => (
                <div 
                  key={file.name}
                  draggable={file.type === 'image'}
                  onDragStart={(e) => handleFileDrag(e, file)}
                  onClick={() => handleFileClick(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      file
                    });
                  }}
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

          {/* FrontMatter编辑器 */}
          {currentFile && (
            <FrontMatterEditor
              content={content}
              onChange={setContent}
              files={files}
            />
          )}
        </div>

        {/* 右侧编辑和预览区域 */}
        <div className="flex-1 flex">
          {/* 编辑器 */}
          <div className="flex-1 p-4 border-r">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              className="w-full h-full resize-none p-4 border rounded focus:border-blue-500 focus:outline-none font-mono text-sm"
              onDrop={handleEditorDrop}
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
            />
          </div>

          {/* 预览 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="prose max-w-none">
              <MarkdownPreview content={content} files={files} />
            </div>
          </div>
        </div>
      </div>

      {/* 其他组件（右键菜单、预览窗口等）保持不变 */}
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