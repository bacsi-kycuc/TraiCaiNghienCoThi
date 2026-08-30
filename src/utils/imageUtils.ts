/**
 * Utility for compressing and resizing images on the client side
 * before saving to Base64 or sending to Cloud Firestore.
 * Prevents exceeding Firestore's 1MB per document hard limit.
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Resizes and compresses an image File to a lightweight Base64 Data URI string.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1280,
    maxHeight = 800,
    quality = 0.75,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Tệp tải lên không phải là định dạng hình ảnh hợp lệ.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể giải mã hình ảnh.'));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Scale down proportionally if larger than maximum boundaries
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if canvas context fails
            resolve(e.target?.result as string);
            return;
          }

          // Fill white background for transparent PNGs converting to JPEG
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed data URI
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Lỗi khi nén ảnh qua Canvas, sử dụng ảnh gốc:', err);
          resolve(e.target?.result as string);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Specially optimized for QR code images: preserves sharp edges and high contrast
 * while limiting dimensions to 600x600 so file size is typically under 40-70KB.
 */
export async function compressQrImageFile(file: File): Promise<string> {
  return compressImageFile(file, {
    maxWidth: 600,
    maxHeight: 600,
    quality: 0.85,
    mimeType: 'image/jpeg',
  });
}

/**
 * Sanitizes any object before sending to Firestore so no individual field or string exceeds 500KB
 */
export function sanitizeDataForFirestore<T extends Record<string, any>>(data: T, maxFieldLength = 500000): T {
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.length > maxFieldLength) {
      console.warn(`Trường "${key}" có kích thước quá lớn (${value.length} ký tự), đã lược bỏ khỏi đám mây để tránh vượt quá giới hạn 1MB Firestore.`);
      // Omit huge base64 strings from Cloud Firestore payload
      result[key] = '';
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}
