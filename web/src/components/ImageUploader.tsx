'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { uploadToCloudinary } from '@/lib/uploadImage';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function ImageUploader({ value, onChange, onUploadingChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    onUploadingChange?.(true);
    try {
      onChange(await uploadToCloudinary(file));
    } catch (err) {
      setPreview(null);
      onChange(null);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function remove() {
    setPreview(null);
    onChange(null);
    setError(null);
  }

  const shown = preview ?? value;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {shown ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-300">
          <img src={shown} alt="Selected item" className="max-h-64 w-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
              Uploading…
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={remove}
              className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-600 hover:border-blue-400"
        >
          Add a photo (optional)
        </button>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}