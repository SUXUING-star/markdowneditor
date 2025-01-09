// src/components/MarkdownPreview.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface WorkspaceFile {
  name: string;
  type: 'markdown' | 'image' | 'other';
  content: string | ArrayBuffer;
}

interface MarkdownPreviewProps {
  content: string;
  files: WorkspaceFile[];
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, files }) => {
  if (!content.trim()) {
    return (
      <div className="text-gray-400 italic">
        预览内容将显示在这里...
      </div>
    );
  }

  // 获取文件的 Data URL
  const getFileDataUrl = (fileName: string): string => {
    const file = files.find(f => f.name === fileName);
    if (!file || typeof file.content === 'string') return '';

    const blob = new Blob([file.content]);
    return URL.createObjectURL(blob);
  };

  // 分离 front matter 和正文内容
  const splitContent = content.split(/---\n/);
  const hasFrontMatter = splitContent.length >= 3;
  const frontMatter = hasFrontMatter ? splitContent[1] : '';
  const mainContent = hasFrontMatter ? splitContent.slice(2).join('---\n') : content;

  // 从 front matter 中提取封面图
  const getCoverImage = (): string | null => {
    const match = frontMatter.match(/photos:\s*\n\s*-\s*([^\s].+)/);
    return match ? match[1].trim() : null;
  };

  const coverImage = getCoverImage();

  try {
    return (
      <div>
        {/* 渲染封面图 */}
        {coverImage && (
          <div className="mb-6">
            <div className="aspect-video w-full relative bg-gray-100 rounded overflow-hidden">
              <img
                src={getFileDataUrl(coverImage)}
                alt="封面图片"
                className="absolute inset-0 w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiNFNUU3RUIiLz48L3N2Zz4=';
                  target.alt = '图片加载失败';
                }}
              />
            </div>
          </div>
        )}

        {/* 渲染 front matter */}
        {hasFrontMatter && (
          <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200 font-mono text-sm">
            <pre className="whitespace-pre-wrap text-gray-600">{frontMatter}</pre>
          </div>
        )}
        
        {/* 渲染主要内容 */}
        <ReactMarkdown
          className="prose max-w-none"
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            img: ({ src, alt }) => {
              if (!src) return null;
              // 检查是否是本地图片（不是 http/https 链接）
              const isLocalImage = !src.startsWith('http');
              const imgSrc = isLocalImage ? getFileDataUrl(src) : src;

              return (
                <div className="my-4">
                  <img
                    src={imgSrc}
                    alt={alt || ''}
                    className="max-w-full h-auto rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiNFNUU3RUIiLz48L3N2Zz4=';
                      target.alt = '图片加载失败';
                    }}
                  />
                  {alt && <p className="text-center text-sm text-gray-500 mt-1">{alt}</p>}
                </div>
              );
            },
          }}
        >
          {mainContent}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return (
      <div className="text-red-500">
        预览出错: {(error as Error).message}
      </div>
    );
  }
};

export default MarkdownPreview;