import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2, Download, Upload, FolderOpen, File, AlertCircle, Plus, Image as ImageIcon,
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  Undo, Redo, List, ListOrdered, Link, Code, X
} from 'lucide-react';
import JSZip from 'jszip';
import MarkdownPreview from './MarkdownPreview';
import anime from 'animejs';

// 扩展类型定义
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

interface Tab {
    id: string;
    fileName: string;
    content: string;
    history: EditHistory[];
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
    // 状态管理
    const [content, setContent] = useState<string>(''); // 当前编辑器内容
    const [files, setFiles] = useState<WorkspaceFile[]>([]); // 工作区文件列表
    const [currentFile, setCurrentFile] = useState<string>(''); // 当前选中的文件
    const [isDragging, setIsDragging] = useState<boolean>(false); // 是否正在拖拽
    const [isProcessing, setIsProcessing] = useState<boolean>(false); // 是否正在处理中
    const [missingResources, setMissingResources] = useState<MissingResource[]>([]); // 缺失的资源列表
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ show: false, x: 0, y: 0 }); // 右键菜单状态
    
    const [tabs, setTabs] = useState<Tab[]>([]); // 标签页列表
    const [activeTab, setActiveTab] = useState<string>(''); // 当前激活的标签页
    const [editHistory, setEditHistory] = useState<EditHistory[]>([]); // 编辑历史记录
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1); // 当前历史记录索引
    
    // Ref 引用
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resourceInputRef = useRef<HTMLInputElement>(null);


    // 生成默认模板
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

`;
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
                    setContent(newContent);
                    
                    // 添加到历史记录
                    addToHistory(newContent);
                    
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


     // 新建文件
     const createNewFile = () => {
      const fileName = 'index.md';
      
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
              content: generateDefaultTemplate(),
              isNew: true
          };
          setFiles(prev => [...prev, newFile]);
          setCurrentFile(newFileName);
          setContent(newFile.content as string);
          
          const newTab: Tab = {
              id: newFileName,
              fileName: newFileName,
              content: newFile.content as string,
              history: [{ content: newFile.content as string, cursorPosition: 0 }],
              currentHistoryIndex: 0
          };
          setTabs(prev => [...prev, newTab]);
          setActiveTab(newTab.id);
      } else {
          const newFile: WorkspaceFile = {
              name: fileName,
              type: 'markdown',
              content: generateDefaultTemplate(),
              isNew: true
          };
  
          setFiles(prev => [...prev, newFile]);
          setCurrentFile(fileName);
          setContent(newFile.content as string);
              
          const newTab: Tab = {
              id: fileName,
              fileName: fileName,
              content: newFile.content as string,
              history: [{ content: newFile.content as string, cursorPosition: 0 }],
              currentHistoryIndex: 0
          };
          setTabs(prev => [...prev, newTab]);
          setActiveTab(newTab.id);
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

    // 处理文件拖放
    const handleEditorDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        // 获取拖拽的文件信息
        const fileData = e.dataTransfer.getData('application/json');
        if (fileData) {
            try {
                const file = JSON.parse(fileData) as WorkspaceFile;
                if (file.type === 'image') {
                    // 获取光标位置
                    const textarea = editorRef.current;
                    if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const imageText = `![${file.name.split('.')[0]}](${file.name})`;
                        
                        const before = content.substring(0, start);
                        const after = content.substring(end);
                        const newContent = before + imageText + after;
                        
                        setContent(newContent);
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

   // 处理文件上传
    const handleFiles = async (uploadedFiles: FileList): Promise<void> => {
      for (const file of Array.from(uploadedFiles)) {
          if (file.name.endsWith('.md')) {
              await handleMarkdownImport(file);
              continue;
          }
    
          const reader = new FileReader();
          
          reader.onload = async (e: ProgressEvent<FileReader>) => {
              const fileContent = e.target?.result;
              if (!fileContent) return;
              
              const fileType = file.type.startsWith('image/') ? 'image' : 'other';
              
              // 添加文件到工作区
              setFiles(prev => [...prev, {
                  name: file.name,
                  type: fileType,
                  content: fileContent
              }]);
      
              // 更新缺失资源列表
              setMissingResources(prev => 
                  prev.filter(resource => resource.name !== file.name)
              );
      
              // 如果是图片且当前没有photos记录，则添加
              if (fileType === 'image' && !content.includes('photos:\n-')) {
                  const lines = content.split('\n');
                  const photosIndex = lines.findIndex(line => line.trim() === 'photos:');
                  if (photosIndex !== -1) {
                  lines[photosIndex + 1] = `- ${file.name}`;
                  setContent(lines.join('\n'));
                  }
              }
          };
          
          if (file.type.startsWith('image/')) {
              reader.readAsArrayBuffer(file);
          } else {
              reader.readAsText(file);
          }
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
      
      // 格式化命令
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
    };
    
    // 历史记录相关函数
      const addToHistory = (newContent: string) => {
        const newHistory = [...editHistory.slice(0, currentHistoryIndex + 1), {
            content: newContent,
            cursorPosition: editorRef.current?.selectionStart || 0
          }];
          setEditHistory(newHistory);
          setCurrentHistoryIndex(newHistory.length - 1);
      };
    
    const undo = () => {
          if (currentHistoryIndex <= 0) return;
          const newIndex = currentHistoryIndex - 1;
          const historyItem = editHistory[newIndex];
          setContent(historyItem.content);
          setCurrentHistoryIndex(newIndex);
    };
    
    const redo = () => {
          if (currentHistoryIndex >= editHistory.length - 1) return;
          const newIndex = currentHistoryIndex + 1;
          const historyItem = editHistory[newIndex];
          setContent(historyItem.content);
          setCurrentHistoryIndex(newIndex);
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
        
      // 切换标签页
      const switchTab = (tabId: string) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
          setActiveTab(tabId);
          setContent(tab.content);
          setEditHistory(tab.history);
          setCurrentHistoryIndex(tab.currentHistoryIndex);
          setCurrentFile(tab.fileName)
        }
      };
    
    // 关闭标签页
     const closeTab = (tabId: string) => {
        setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
        if (activeTab === tabId) {
            setActiveTab(prevTabs => prevTabs.filter(tab => tab.id !== tabId)[0]?.id || '');
            setContent(prevTabs => prevTabs.filter(tab => tab.id !== tabId)[0]?.content || '');
            
            const firstFile = files.find(file=>file.name===prevTabs.filter(tab => tab.id !== tabId)[0]?.fileName);
            setCurrentFile(firstFile?.name || '')
        }
      };
    
    // 处理文件输入改变
    const handleFileInputChange = (e: FileInputEvent): void => {
        if (e.target.files) {
          handleFiles(e.target.files);
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
              case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                  redo();
                } else {
                  undo();
                }
                break;
              case 'y':
                e.preventDefault();
                redo();
                break;
              case 'b':
                e.preventDefault();
                formatCommands.bold();
                break;
              case 'i':
                e.preventDefault();
                formatCommands.italic();
                break;
            }
          }
        };
    
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [content]);
    
    useEffect(()=>{
        if(activeTab){
          const activeTabObj = tabs.find(tab=>tab.id === activeTab)
          if(activeTabObj){
              setContent(activeTabObj.content)
              setEditHistory(activeTabObj.history)
              setCurrentHistoryIndex(activeTabObj.currentHistoryIndex)
              setCurrentFile(activeTabObj.fileName)
          }
        }
      },[activeTab, tabs])

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
    <div className="w-full h-screen flex flex-col overflow-hidden bg-gray-50">
        {/* 顶部工具栏 */}
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
          <div className="flex gap-1 border-r pr-2">
              <button 
                onClick={(e)=>{handleClickAnimation(e); undo()}}
                className="p-1.5 rounded hover:bg-gray-100"
                title="撤销 (Ctrl+Z)"
              >
                  <Undo size={16} />
              </button>
              <button 
                onClick={(e)=>{handleClickAnimation(e); redo()}}
                  className="p-1.5 rounded hover:bg-gray-100"
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

      <div className="flex-1 flex min-h-0">
        {/* 文件列表 */}
        <div className="w-64 overflow-y-auto bg-white border-r">
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
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  onClick={() => file.type === 'markdown' && handleFileSelect(file.name)}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                    currentFile === file.name 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {file.type === 'markdown' ? (
                    <File size={16} />
                  ) : file.type === 'image' ? (
                    <ImageIcon size={16} />
                  ) : (
                    <File size={16} />
                  )}
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>

            {/* 缺失资源提示 */}
            {missingResources.length > 0 && !files.find(f => f.name === currentFile)?.isNew && (
              <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertCircle size={16} />
                  缺失的资源文件
                </h3>
                <ul className="space-y-1">
                  {missingResources.map(resource => (
                    <li key={resource.name} className="text-sm text-yellow-700 flex items-center gap-2">
                      {resource.type === 'image' ? <ImageIcon size={14} /> : <File size={14} />}
                      {resource.name}
                    </li>
                  ))}
                </ul>
                <button
                 onClick={(e) => {handleClickAnimation(e); resourceInputRef.current?.click()}}
                  className="mt-2 w-full px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
                >
                  导入缺失文件
                </button>
              </div>
            )}
          </div>
        </div>

       {/* 编辑器和预览 */}
        <div className="flex-1 flex min-h-0">
           {/* 编辑器 */}
          <div className="flex-1 p-4 min-h-0">
            <div 
              className={`h-full relative border-2 rounded-lg bg-white ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleEditorDrop}
                onPaste={handlePaste}
                className="w-full h-full p-4 font-mono resize-none focus:outline-none"
                placeholder="开始编辑..."
              />
               {isProcessing && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                        <Loader2 className="animate-spin" />
                    </div>
                )}
            </div>
          </div>

           {/* 预览 */}
          <div className="flex-1 p-4 min-h-0">
            <div className="h-full overflow-auto border rounded-lg p-4 bg-white">
              <MarkdownPreview content={content} files={files} />
            </div>
          </div>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && contextMenu.file && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
           onClick={(e) => {handleClickAnimation(e);
              setCoverImage(contextMenu.file!.name);
              setContextMenu(prev => ({ ...prev, show: false }));
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
          >
            设为封面图
          </button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.md"
        onChange={handleFileInputChange}        
        className="hidden"
        multiple
      />

      {/* 专门用于导入缺失资源的文件输入 */}
      <input
        ref={resourceInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />
    </div>
  );
};

export default MarkdownEditor;