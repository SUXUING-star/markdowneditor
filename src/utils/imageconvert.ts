export const convertToWebP = async (file: File): Promise<{ webpBlob: Blob; quality: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // 根据原始文件大小动态调整质量
      let quality = 0.85;
      if (file.size > 1024 * 1024) { // 大于1MB
        quality = 0.75;
      } else if (file.size > 500 * 1024) { // 大于500KB
        quality = 0.8;
      }
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ webpBlob: blob, quality });
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    const fileUrl = URL.createObjectURL(file);
    img.src = fileUrl;
    // 清理 URL
    img.onload = () => {
      URL.revokeObjectURL(fileUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ webpBlob: blob, quality: 0.85 });
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        'image/webp',
        0.85
      );
    };
  });
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isWebPFile = (file: File): boolean => {
  return file.type === 'image/webp';
};

export const generateWebPFileName = (originalName: string): string => {
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
  return `${nameWithoutExt}.webp`;
};