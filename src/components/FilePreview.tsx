import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface FilePreviewProps {
  file: {
    name: string;
    type: string;
    content: string | ArrayBuffer;
  };
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file.type === 'image' && file.content instanceof ArrayBuffer) {
      const blob = new Blob([file.content]);
      const url = URL.createObjectURL(blob);
      setDataUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (file.type !== 'image') return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={previewRef} 
        className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        <div className="mt-4">
          <img
            src={dataUrl}
            alt={file.name}
            className="w-full h-auto max-h-[70vh] object-contain rounded"
          />
          <p className="mt-4 text-center text-gray-600 text-sm">{file.name}</p>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;