import React, { useRef, useState } from 'react';
import { Camera, GripVertical, Star, Trash2, Upload } from 'lucide-react';
import { uploadToImageKit } from '../lib/imagekit';

interface ImageKitUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
}

export const ImageKitUploader: React.FC<ImageKitUploaderProps> = ({
  photos,
  onChange,
  minPhotos = 3,
  maxPhotos = 10
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const remaining = maxPhotos - photos.length;
    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < selected.length; i += 1) {
        setProgress(Math.round(((i + 0.4) / selected.length) * 100));
        const result = await uploadToImageKit(selected[i]);
        uploaded.push(result.url);
        setProgress(Math.round(((i + 1) / selected.length) * 100));
      }
      onChange([...photos, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || photos.length >= maxPhotos}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        style={{
          width: '100%',
          border: '1.5px dashed #CBD5E1',
          borderRadius: '12px',
          padding: '28px 16px',
          background: '#F8FAFC',
          cursor: 'pointer',
          color: '#000052',
          fontWeight: 700
        }}
      >
        <Upload size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        {uploading ? `Uploading ${progress}%` : `Drop photos or browse (min ${minPhotos}, max ${maxPhotos})`}
      </button>
      {error && <p style={{ color: '#B91C1C', fontSize: 13, marginTop: 8 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
        {photos.map((url, index) => (
          <div key={`${url}-${index}`} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <img src={url} alt={`Listing photo ${index + 1}`} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => move(index, index - 1)} style={chipBtn}><GripVertical size={12} /></button>
              {index !== 0 && (
                <button type="button" onClick={() => move(index, 0)} style={chipBtn} title="Set primary">
                  <Star size={12} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
              style={{ position: 'absolute', top: 6, right: 6, ...chipBtn, background: '#DC2626', color: '#fff' }}
            >
              <Trash2 size={12} />
            </button>
            {index === 0 && (
              <span style={{ position: 'absolute', bottom: 6, left: 6, background: '#000052', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                Cover
              </span>
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: photos.length >= minPhotos ? '#16794A' : '#B45309', marginTop: 10 }}>
        <Camera size={12} style={{ verticalAlign: 'middle' }} /> {photos.length} photos
      </p>
    </div>
  );
};

const chipBtn: React.CSSProperties = {
  border: 'none',
  borderRadius: 4,
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,82,0.8)',
  color: '#fff',
  cursor: 'pointer'
};
