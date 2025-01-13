import React, { useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';  // 修改这行
import remarkGfm from 'remark-gfm';  // 添加这个导入
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

   // 添加自定义组件配置
   const MarkdownComponent = useMemo(() => {
    return ({ children }: { children: string }) => (
      <ReactMarkdown
        className="prose prose-sm w-full max-w-none"
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            const isLocalImage = !src.startsWith('http');
            const imgSrc = isLocalImage ? getImageUrl(src) : src;
          
            return (
              // 改用 figure 标签替代 div
              <figure className="my-4">
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
                {alt && <figcaption className="text-center text-sm text-gray-500 mt-1">{alt}</figcaption>}
              </figure>
            );
          },
          em: ({ children }) => (
            // 使用更强的样式组合
            <em 
              className="not-prose !italic" 
              style={{ 
                fontStyle: 'italic !important',
                fontFamily: 'serif',
              }}
            >
              {children}
            </em>
          ),
          del: ({ children }) => (
            <del className="line-through">{children}</del>
          ),
          p: ({ children }) => (
            <p>{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          code: ({ inline, className, children }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                <code className={className}>{children}</code>
              </pre>
            ) : (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">{children}</code>
            );
          }
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
      <div className="prose prose-sm max-w-none [&_em]:italic">
        <MarkdownComponent>{mainContent}</MarkdownComponent>
      </div>
    </div>
  );
};

// 添加 memo 以优化性能
export default React.memo(MarkdownPreview);