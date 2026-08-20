// A4 portrait at 150 DPI (8.27in x 11.69in) — sharp enough to print without
// bloating the PDF with a full-resolution photo.
const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;

/**
 * Resizes an uploaded image to exactly fill an A4 page (cover-fit: scaled up
 * and center-cropped as needed, never letterboxed or stretched), returning a
 * JPEG data URI ready to store on a Template's `page.backgroundImage` /
 * `cover.backgroundImage`.
 */
export function resizeImageToA4(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = A4_WIDTH_PX;
        canvas.height = A4_HEIGHT_PX;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas is not supported in this environment.'));
          return;
        }

        const scale = Math.max(A4_WIDTH_PX / img.width, A4_HEIGHT_PX / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (A4_WIDTH_PX - drawWidth) / 2;
        const offsetY = (A4_HEIGHT_PX - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
