import React, { useRef, useState } from 'react';
import {
  HazardPhotoAttachment,
  HazardPhotoCategory,
  extractDriveFileId,
  toRenderableImageUrl,
} from '../data/assessmentSchema';
import { SmartHazardImage } from './SmartHazardImage';
import {
  Camera,
  ImagePlus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Link2,
} from 'lucide-react';

interface HazardPhotoUploaderProps {
  photos: HazardPhotoAttachment[];
  onChange: (updated: HazardPhotoAttachment[]) => void;
  defaultCategory?: HazardPhotoCategory;
  title?: string;
  subtitle?: string;
}

const CATEGORY_OPTIONS: {
  value: HazardPhotoCategory;
  label: string;
  defaultCaption: string;
}[] = [
  {
    value: 'HOUSE_CROSSING',
    label: 'จุดข้ามถนน 4 เลนหน้าบ้านผู้สูงอายุ',
    defaultCaption: 'สภาพทางข้ามถนน 4 เลนบริเวณหน้าบ้านผู้สูงอายุ',
  },
  {
    value: 'CONCRETE_BRIDGE',
    label: 'สะพานคอนกรีต / ร่องกลางถนนลึก 1 เมตร (ข้อ 4.6, 4.12)',
    defaultCaption: 'สภาพสะพานคอนกรีตข้ามร่องกลางถนนลึก 1 เมตร',
  },
  {
    value: 'VEGETATION_BLINDSPOT',
    label: 'ต้นไม้ / หญ้าร่องกลางบดบังทัศนวิสัย (ข้อ 4.9)',
    defaultCaption: 'พุ่มไม้/หญ้าร่องกลางถนนที่บดบังสายตาขณะมองรถทางตรง',
  },
  {
    value: 'OTHER',
    label: 'สภาพแวดล้อมอื่นๆ / อุปกรณ์ช่วยเดิน',
    defaultCaption: 'สภาพแวดล้อมเพิ่มเติมหรืออุปกรณ์ช่วยเดินของผู้สูงอายุ',
  },
];

/**
 * Compresses an uploaded image file via HTML5 canvas to max 960px JPEG (0.82 quality)
 */
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('ไม่สามารถเปิดไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

export const HazardPhotoUploader: React.FC<HazardPhotoUploaderProps> = ({
  photos,
  onChange,
  defaultCategory = 'HOUSE_CROSSING',
  title = 'ระบบถ่ายภาพจุดเสี่ยงหรือสภาพแวดล้อมหน้าบ้าน (Hazard Photo Attachment)',
  subtitle = 'ถ่ายภาพจุดข้ามถนน สะพานคอนกรีต หรือพุ่มไม้ร่องกลางที่บดบังสายตา เพื่อแนบในฐานข้อมูลและอัปโหลดเข้า Google Drive',
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<HazardPhotoCategory>(defaultCategory);
  const [captionInput, setCaptionInput] = useState<string>('');
  const [linkInput, setLinkInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddPhotoFromUrl = () => {
    const raw = linkInput.trim();
    if (!raw) return;

    const catMeta =
      CATEGORY_OPTIONS.find((c) => c.value === selectedCategory) ||
      CATEGORY_OPTIONS[0];
    const fileId = extractDriveFileId(raw);
    const renderableUrl = toRenderableImageUrl(raw);

    const newPhoto: HazardPhotoAttachment = {
      id: `PHOTO-LINK-${Date.now()}`,
      category: selectedCategory,
      categoryLabel: catMeta.label,
      caption: captionInput.trim() || catMeta.defaultCaption,
      dataUrl: renderableUrl,
      driveFileId: fileId || undefined,
      driveViewLink: raw.startsWith('http')
        ? raw
        : fileId
        ? `https://drive.google.com/file/d/${fileId}/view`
        : undefined,
      capturedAt: new Date().toLocaleString('th-TH'),
    };

    onChange([...photos, newPhoto]);
    setLinkInput('');
    setCaptionInput('');
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    try {
      const catMeta =
        CATEGORY_OPTIONS.find((c) => c.value === selectedCategory) ||
        CATEGORY_OPTIONS[0];
      const newPhotos: HazardPhotoAttachment[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const dataUrl = await compressImageFile(file);
        newPhotos.push({
          id: `PHOTO-${Date.now()}-${i}`,
          category: selectedCategory,
          categoryLabel: catMeta.label,
          caption: captionInput.trim() || catMeta.defaultCaption,
          dataUrl,
          capturedAt: new Date().toLocaleString('th-TH'),
        });
      }

      onChange([...photos, ...newPhotos]);
      setCaptionInput('');
    } catch (err) {
      console.error('Photo processing failed:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  const handleUpdateCaption = (id: string, newCaption: string) => {
    onChange(
      photos.map((p) => (p.id === id ? { ...p, caption: newCaption } : p))
    );
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-blue-700" />
            <span>{title}</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
          แนบแล้ว {photos.length} ภาพ
        </span>
      </div>

      {/* Controls for Category, Caption, and Capture Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4 space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            ประเภทจุดเสี่ยงที่ถ่ายภาพ
          </label>
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as HazardPhotoCategory)
            }
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-5 space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            คำอธิบายจุดเสี่ยง (ระบุก่อนหรือหลังถ่ายภาพได้)
          </label>
          <input
            type="text"
            value={captionInput}
            onChange={(e) => setCaptionInput(e.target.value)}
            placeholder="เช่น พุ่มไม้ร่องกลางสูง 1.3 ม. บังสายตา / สะพานไม่มีราวจับ"
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'กำลังย่อภาพ...' : 'ถ่ายภาพ'}</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => galleryInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <ImagePlus className="w-3.5 h-3.5 text-blue-700" />
            <span>เลือกไฟล์ภาพ</span>
          </button>
        </div>
      </div>

      {/* Direct Google Drive / Image URL Input */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="relative flex-1 min-w-[240px]">
          <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="หรือวางลิงก์รูปภาพหน้าบ้านจาก Google Drive (เช่น https://drive.google.com/file/d/...) หรือ URL รูปภาพ"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>
        <button
          type="button"
          disabled={!linkInput.trim()}
          onClick={handleAddPhotoFromUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>แนบลิงก์รูปภาพ</span>
        </button>
      </div>

      {/* Attached Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {photos.map((photo, idx) => (
            <div
              key={`${photo.id}__${idx}`}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <div className="relative h-36 bg-slate-100 border-b border-slate-200 overflow-hidden">
                <SmartHazardImage
                  photo={photo}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  title="ลบภาพนี้"
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 space-y-1.5 text-xs">
                <div className="font-semibold text-blue-700 truncate">
                  {photo.categoryLabel}
                </div>
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) =>
                    handleUpdateCaption(photo.id, e.target.value)
                  }
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-600"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="font-mono tabular-nums">
                    {photo.capturedAt}
                  </span>
                  {photo.driveViewLink && (
                    <a
                      href={photo.driveViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Drive</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
