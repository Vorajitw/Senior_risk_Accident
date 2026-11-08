import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  HazardPhotoAttachment,
  getImageFallbackCandidates,
  createFieldHazardSvgDataUrl,
  extractDriveFileId,
} from '../data/assessmentSchema';

export interface SmartHazardImageProps {
  photo: HazardPhotoAttachment;
  className?: string;
  alt?: string;
  compact?: boolean;
}

/**
 * Resilient image renderer for Senior Road Crossing Hazard & Section 2 House-Front photos.
 * - Automatically tries multiple Google Drive endpoints (lh3.googleusercontent, thumbnail, uc?export=view)
 * - Never uses crossOrigin="anonymous" on <img> so Google Drive 302 redirects load cleanly in the browser
 * - Shows a bright, clean loading skeleton (never black) while images are downloading
 * - Falls back to a high-contrast light community hazard diagram SVG + direct Google Drive button if restricted
 */
export const SmartHazardImage: React.FC<SmartHazardImageProps> = ({
  photo,
  className = 'w-full h-full object-cover',
  alt,
  compact = false,
}) => {
  const candidates = getImageFallbackCandidates(photo);
  const driveFileId =
    photo.driveFileId ||
    extractDriveFileId(photo.driveViewLink || '') ||
    extractDriveFileId(photo.dataUrl || '');

  const fallbackSvgUrl = createFieldHazardSvgDataUrl(
    photo.categoryLabel || 'ภาพถ่ายสภาพแวดล้อมหน้าบ้าน (Section 2)',
    photo.caption || 'ผังวิเคราะห์จุดเสี่ยงสภาพแวดล้อมและจุดข้ามถนน',
    photo.category === 'CONCRETE_BRIDGE' ? '#d97706' : '#2563eb'
  );

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(candidates.length === 0);
  const [isLoading, setIsLoading] = useState(candidates.length > 0);

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(candidates.length === 0);
    setIsLoading(candidates.length > 0);
  }, [photo.id, photo.dataUrl, photo.driveViewLink, photo.driveFileId, candidates.length]);

  const currentSrc =
    !hasError && candidateIdx < candidates.length
      ? candidates[candidateIdx]
      : fallbackSvgUrl;

  const handleImageError = () => {
    if (candidateIdx + 1 < candidates.length) {
      setCandidateIdx((prev) => prev + 1);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const driveOpenUrl =
    photo.driveViewLink ||
    (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : undefined);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
      {/* Light-theme loading skeleton (never black) */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-2 text-slate-500 z-10 animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mb-1" />
          <span className="text-[10px] font-medium text-slate-600">กำลังโหลดภาพถ่าย...</span>
        </div>
      )}

      {/* Primary Image / Fallback SVG (no crossOrigin attribute so Drive CDN images load without CORS errors) */}
      <img
        src={currentSrc}
        alt={alt || photo.caption || photo.categoryLabel || 'ภาพถ่ายสภาพแวดล้อม'}
        referrerPolicy="no-referrer"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`${className} transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ maxHeight: '100%', objectPosition: 'center' }}
      />

      {/* Compact action badge when showing SVG diagram for a restricted Drive file */}
      {hasError && driveOpenUrl && !compact && (
        <div className="absolute bottom-1.5 right-1.5 z-20">
          <a
            href={driveOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-700/95 hover:bg-blue-800 text-white rounded text-[10px] font-semibold shadow-sm transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>เปิดดูภาพจริงบน Drive</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
};
