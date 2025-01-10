import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface ImageConversionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageInfo: {
    name: string;
    size: number;
  } | null;
}

const ImageConversionDialog: React.FC<ImageConversionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  imageInfo
}) => {
  if (!isOpen || !imageInfo) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ImageIcon className="w-5 h-5" />
            <span>转换图片格式</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="mb-2">
              检测到图片 <span className="font-medium">{imageInfo.name}</span>
              <br />
              当前大小: {formatSize(imageInfo.size)}
            </p>
            <p className="text-gray-600">
              是否要将图片转换为 WebP 格式以获得更好的压缩效果？
            </p>
            <p className="mt-2 text-sm text-gray-500">
              WebP 格式通常可以减小 25-35% 的文件大小，同时保持图像质量。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            保持原格式
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            转换为 WebP
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageConversionDialog;