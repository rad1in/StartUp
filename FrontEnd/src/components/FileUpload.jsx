import { useRef, useState } from 'react';
import { UploadCloud, ImageIcon, X } from 'lucide-react';

// Drag & drop upload zone — dashed caramel border, live preview of the picked
// image, click or drop to select.
export default function FileUpload({ label = 'تصویر را اینجا رها کنید', accept = 'image/*', file, onSelect }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  function handleFiles(files) {
    const picked = files?.[0];
    if (picked) onSelect(picked);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-all duration-200 ${
        dragOver
          ? 'border-accent-500 bg-accent-50'
          : 'border-accent-200 bg-surface-2/50 hover:border-accent-400 hover:bg-accent-50/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {file ? (
        <>
          {previewUrl && (
            <img src={previewUrl} alt="پیش‌نمایش" className="w-20 h-20 rounded-xl object-cover shadow-soft" />
          )}
          <p className="text-xs font-bold text-ink truncate max-w-full flex items-center gap-1.5">
            <ImageIcon size={13} className="text-accent-600 shrink-0" />
            {file.name}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white shadow-soft text-ink/50 flex items-center justify-center transition-colors hover:text-red-500"
            aria-label="حذف فایل"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <>
          <span className="w-11 h-11 rounded-full bg-accent-50 border border-accent-200 text-accent-600 flex items-center justify-center">
            <UploadCloud size={20} />
          </span>
          <p className="text-sm font-bold text-ink">{label}</p>
          <p className="text-xs text-ink/40">یا برای انتخاب کلیک کنید</p>
        </>
      )}
    </div>
  );
}
