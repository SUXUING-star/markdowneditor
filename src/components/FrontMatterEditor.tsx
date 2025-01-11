import React, { useState, useEffect } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';

interface FrontMatterData {
  categories: string[];
  date: string;
  photos: string[];
  tags: string[];
  title: string;
}

interface FrontMatterEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  files: Array<{ name: string; type: string; content: string | ArrayBuffer }>;
}

const FrontMatterEditor: React.FC<FrontMatterEditorProps> = ({ content, onChange, files }) => {
  const [frontMatter, setFrontMatter] = useState<FrontMatterData>({
    categories: [],
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    photos: [],
    tags: [],
    title: ''
  });
  const [newTag, setNewTag] = useState('');

  // Parse frontmatter from content
  useEffect(() => {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const yaml = match[1];
      const parsed: Partial<FrontMatterData> = {};
      
      yaml.split('\n').forEach(line => {
        const [key, ...values] = line.split(':').map(s => s.trim());
        if (key === 'categories' || key === 'photos' || key === 'tags') {
          parsed[key] = values.join(':').split('-').filter(v => v.trim()).map(v => v.trim());
        } else if (key === 'title' || key === 'date') {
          parsed[key] = values.join(':').trim();
        }
      });
      
      setFrontMatter(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  const updateContent = (newFrontMatter: FrontMatterData) => {
    const mainContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    const yaml = `---
categories:
${newFrontMatter.categories.map(c => `- ${c}`).join('\n')}
date: ${newFrontMatter.date}
photos:
${newFrontMatter.photos.map(p => `- ${p}`).join('\n')}
tags:
${newFrontMatter.tags.map(t => `- ${t}`).join('\n')}
title: ${newFrontMatter.title}
---
`;
    onChange(yaml + mainContent);
  };

  const handleCategoryChange = (category: string) => {
    const newFrontMatter = {
      ...frontMatter,
      categories: [category]
    };
    setFrontMatter(newFrontMatter);
    updateContent(newFrontMatter);
  };

  const handleTagAdd = () => {
    if (newTag && !frontMatter.tags.includes(newTag)) {
      const newFrontMatter = {
        ...frontMatter,
        tags: [...frontMatter.tags, newTag]
      };
      setFrontMatter(newFrontMatter);
      updateContent(newFrontMatter);
      setNewTag('');
    }
  };

  const handleTagRemove = (tag: string) => {
    const newFrontMatter = {
      ...frontMatter,
      tags: frontMatter.tags.filter(t => t !== tag)
    };
    setFrontMatter(newFrontMatter);
    updateContent(newFrontMatter);
  };

  const handleTitleChange = (title: string) => {
    const newFrontMatter = {
      ...frontMatter,
      title
    };
    setFrontMatter(newFrontMatter);
    updateContent(newFrontMatter);
  };

  const handlePhotoAdd = (photo: string) => {
    if (!frontMatter.photos.includes(photo)) {
      const newFrontMatter = {
        ...frontMatter,
        photos: [photo] // 只保留最新选择的图片作为封面
      };
      setFrontMatter(newFrontMatter);
      updateContent(newFrontMatter);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4 px-4">
      {/* 标题输入 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          标题
        </label>
        <input
          type="text"
          value={frontMatter.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
          placeholder="输入标题"
        />
      </div>

      {/* 分类选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          分类
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleCategoryChange('可汉')}
            className={`px-2 py-1 text-sm rounded ${
              frontMatter.categories.includes('可汉')
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            可汉
          </button>
          <button
            onClick={() => handleCategoryChange('无汉')}
            className={`px-2 py-1 text-sm rounded ${
              frontMatter.categories.includes('无汉')
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            无汉
          </button>
        </div>
      </div>

      {/* 标签 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          标签
        </label>
        <div className="flex gap-1 mb-2 flex-wrap">
          {frontMatter.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100"
            >
              {tag}
              <button
                onClick={() => handleTagRemove(tag)}
                className="ml-1 hover:text-gray-700"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTagAdd()}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            placeholder="输入标签"
          />
          <button
            onClick={handleTagAdd}
            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            添加
          </button>
        </div>
      </div>

      {/* 封面图选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          封面图
        </label>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {files
            .filter(file => file.type === 'image')
            .map(file => (
              <div
                key={file.name}
                onClick={() => handlePhotoAdd(file.name)}
                className={`cursor-pointer px-2 py-1 rounded flex items-center gap-1 text-sm ${
                  frontMatter.photos.includes(file.name)
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <ImageIcon size={14} className="flex-shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FrontMatterEditor;