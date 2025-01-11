import React, { useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, files }) => {
  // 使用 Map 存储和管理图片 URL 缓存
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  
  // 清理函数：组件卸载时清理所有 Blob URLs
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  // 获取或创建图片的 URL
  const getImageUrl = useMemo(() => (fileName: string): string => {
    // 检查缓存
    if (blobUrlsRef.current.has(fileName)) {
      return blobUrlsRef.current.get(fileName)!;
    }

    const file = files.find(f => f.name === fileName);
    if (!file || typeof file.content === 'string') return '';

    // 为图片创建新的 Blob URL
    const blob = new Blob([file.content], { 
      type: fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg' 
    });
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.set(fileName, url);
    return url;
  }, [files]);

  // 渲染 Markdown 内容
  const MarkdownComponent = useMemo(() => {
    return ({ children }: { children: string }) => (
      <ReactMarkdown
        className="prose prose-sm w-full max-w-none"
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            const isLocalImage = !src.startsWith('http');
            const imgSrc = isLocalImage ? getImageUrl(src) : src;

            return (
              <div className="my-4">
                <img
                  src={imgSrc}
                  alt={alt || ''}
                  className="max-w-full h-auto rounded"
                  loading="lazy"
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
        {children}
      </ReactMarkdown>
    );
  }, [getImageUrl]);

  // Parse frontmatter and content
  const { hasFrontMatter, frontMatter, mainContent, coverImage } = useMemo(() => {
    const parts = content.split(/---\n/);
    const hasFrontMatter = parts.length >= 3;
    const frontMatter = hasFrontMatter ? parts[1] : '';
    const mainContent = hasFrontMatter ? parts.slice(2).join('---\n') : content;

    const getCoverImage = (): string | null => {
      const match = frontMatter.match(/photos:\s*\n\s*-\s*([^\s].+)/);
      return match ? match[1].trim() : null;
    };

    return {
      hasFrontMatter,
      frontMatter,
      mainContent,
      coverImage: getCoverImage()
    };
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="text-gray-400 italic">
        预览内容将显示在这里...
      </div>
    );
  }
  return (
    <div className="markdown-preview">
      {/* 渲染封面图 */}
      {coverImage && (
        <div className="mb-6">
          <div className="aspect-video w-full relative bg-gray-100 rounded overflow-hidden">
            <img
              src={getImageUrl(coverImage)}
              alt="封面图片"
              className="absolute inset-0 w-full h-full object-contain"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiNFNUU3RUIiLz48L3N2Zz4=';
                target.alt = '封面图片加载失败';
              }}
            />
          </div>
        </div>
      )}

      {/* 渲染 front matter */}
      {hasFrontMatter && (
        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
          <div className="font-mono text-sm space-y-1">
            {/* 分类 */}
            <div className="flex gap-2">
              <span className="text-gray-500">分类:</span>
              {frontMatter.match(/categories:\s*\n-\s*(.+)/)?.[1] || '未设置'}
            </div>
            
            {/* 标签 */}
            <div className="flex gap-2">
              <span className="text-gray-500">标签:</span>
              <div className="flex flex-wrap gap-1">
                {(frontMatter.match(/tags:\s*\n(?:-\s*(.+)\s*\n?)*/g) || [])
                  .map(tag => tag.replace(/tags:\s*\n-\s*/, '').trim())
                  .filter(Boolean)
                  .map((tag, index) => (
                    <span key={index} className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
            
            {/* 标题 */}
            <div className="flex gap-2">
              <span className="text-gray-500">标题:</span>
              {frontMatter.match(/title:\s*(.+)/)?.[1] || '未设置'}
            </div>
            
            {/* 日期 */}
            <div className="flex gap-2">
              <span className="text-gray-500">日期:</span>
              {frontMatter.match(/date:\s*(.+)/)?.[1] || '未设置'}
            </div>
          </div>
        </div>
      )}

      {/* 渲染主要内容 */}
      <div className="prose max-w-none">
        <MarkdownComponent>{mainContent}</MarkdownComponent>
      </div>
    </div>
  );
};

// 添加 memo 以优化性能
export default React.memo(MarkdownPreview);