const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;

// Re-encoding through a canvas shrinks phone photos for faster uploads
// and drops EXIF metadata, including GPS coordinates.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the image'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error('Image upload is not configured');

  const blob = await compressImage(file).catch(() => {
    if (file.size <= MAX_ORIGINAL_BYTES) return file;
    throw new Error('This image is too large. Please choose a smaller one.');
  });

  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Image upload failed. Please try again.');

  const data = await res.json();
  return data.secure_url as string;
}