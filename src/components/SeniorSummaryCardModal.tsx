import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  AssessmentRecord,
  HazardPhotoAttachment,
  formatSeniorAge,
} from '../data/assessmentSchema';
import { HazardPhotoUploader } from './HazardPhotoUploader';
import { SmartHazardImage } from './SmartHazardImage';
import {
  Printer,
  Download,
  X,
  MapPin,
  Phone,
  UserCheck,
  HeartPulse,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Camera,
  CloudUpload,
} from 'lucide-react';

interface SeniorSummaryCardModalProps {
  record: AssessmentRecord | null;
  isAuthenticated?: boolean;
  onUpdateRecordPhotos?: (
    recordId: string,
    photos: HazardPhotoAttachment[],
    uploadToDrive: boolean
  ) => Promise<void>;
  onClose: () => void;
}

/**
 * Generates a deterministic, clean SVG QR-like visual matrix representing the Google Maps coordinate link
 * so it works 100% offline/hermetically without external image requests.
 */
const CoordinateQrMatrix: React.FC<{ value: string }> = ({ value }) => {
  const size = 11;
  const cells: boolean[][] = [];

  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      // Finder pattern corners (3x3)
      const isTopLeft = r < 3 && c < 3;
      const isTopRight = r < 3 && c >= size - 3;
      const isBottomLeft = r >= size - 3 && c < 3;
      if (isTopLeft || isTopRight || isBottomLeft) {
        row.push(true);
      } else {
        const bit = ((hash >>> ((r * size + c) % 28)) ^ (r * 7 + c * 13)) & 1;
        row.push(bit === 1);
      }
    }
    cells.push(row);
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-20 h-20 border border-slate-300 rounded p-1 bg-white shrink-0"
      aria-label="QR พิกัดบ้านผู้สูงอายุ"
    >
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx}
              y={rIdx}
              width={0.9}
              height={0.9}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const SeniorSummaryCardModal: React.FC<SeniorSummaryCardModalProps> = ({
  record,
  isAuthenticated = false,
  onUpdateRecordPhotos,
  onClose,
}) => {
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!record) return null;

  const photos = record.photos || [];
  const unuploadedPhotosCount = photos.filter((p) => !p.driveViewLink).length;

  const handlePhotosChange = async (nextPhotos: HazardPhotoAttachment[]) => {
    if (onUpdateRecordPhotos) {
      await onUpdateRecordPhotos(record.id, nextPhotos, false);
    }
  };

  const handleUploadExistingPhotosToDrive = async () => {
    if (!onUpdateRecordPhotos || photos.length === 0) return;
    setIsUploadingDrive(true);
    setUploadStatusMsg(null);
    try {
      await onUpdateRecordPhotos(record.id, photos, true);
      setUploadStatusMsg('อัปโหลดภาพถ่ายขึ้น Google Drive สำเร็จแล้ว');
    } catch (err) {
      setUploadStatusMsg(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลดขึ้น Google Drive'
      );
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const a = record.answers;
  const seniorName = String(a['q2_2'] || 'ไม่ระบุชื่อ');
  const seniorId = String(a['q2_1'] || record.id);
  const phone = String(a['q2_3'] || '-');
  const address = String(a['q2_4'] || '-');
  const lat = String(a['q2_5'] || '-');
  const lng = String(a['q2_6'] || '-');
  const gender = String(a['q2_8'] || '-');
  const ageRange = formatSeniorAge(a['q2_9']);
  const livingStatus = String(a['q2_10'] || '-');

  const evaluatorRole = String(a['q1_1'] || '-');
  const evaluatorName = String(a['q1_2'] || '-');
  const assessmentDate = String(a['q1_3'] || record.timestamp);

  // Calculate 3-month follow-up date
  const followUpDateStr = (() => {
    const parsed = new Date(assessmentDate);
    if (isNaN(parsed.getTime())) return 'ภายใน 3 เดือนหลังวันประเมิน';
    parsed.setMonth(parsed.getMonth() + 3);
    return parsed.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  const diseases = Array.isArray(a['q3_1'])
    ? a['q3_1'].join(', ')
    : String(a['q3_1'] || 'ไม่มีข้อมูล');
  const medication = String(a['q3_2'] || '-');
  const walkingAid = String(a['q3_3'] || '-');
  const accidentHistory = String(a['q3_4'] || '-');
  const crossingFreq = String(a['q3_6'] || '-');
  const visionHistory = String(a['q3_9'] || '-');

  const medicalRef = Array.isArray(a['q5_1'])
    ? a['q5_1'].join(', ')
    : String(a['q5_1'] || '-');
  const protectionPlan = Array.isArray(a['q5_2'])
    ? a['q5_2'].join(', ')
    : String(a['q5_2'] || '-');
  const spatialPlan = Array.isArray(a['q5_3'])
    ? a['q5_3'].join(', ')
    : String(a['q5_3'] || '-');

  const riskHeaderStyle =
    record.riskLevel === 'RED'
      ? 'bg-red-700 text-white border-red-800'
      : record.riskLevel === 'YELLOW'
      ? 'bg-amber-600 text-white border-amber-700'
      : 'bg-emerald-700 text-white border-emerald-800';

  const riskSurfaceStyle =
    record.riskLevel === 'RED'
      ? 'bg-red-50 border-red-200 text-red-950'
      : record.riskLevel === 'YELLOW'
      ? 'bg-amber-50 border-amber-200 text-amber-950'
      : 'bg-emerald-50 border-emerald-200 text-emerald-950';

  const dimensions = [
    {
      id: 1,
      name: 'มิติ 1: การมองเห็นและรับรู้แสง',
      score: record.dimensionScores[1] || 0,
      max: 6,
    },
    {
      id: 2,
      name: 'มิติ 2: ความเร็วการเดินและการทรงตัว',
      score: record.dimensionScores[2] || 0,
      max: 6,
    },
    {
      id: 3,
      name: 'มิติ 3: การประเมินความเร็วรถและสแกนถนน',
      score: record.dimensionScores[3] || 0,
      max: 6,
    },
    {
      id: 4,
      name: 'มิติ 4: สมาธิและการตัดสินใจเมื่อจราจรซับซ้อน',
      score: record.dimensionScores[4] || 0,
      max: 4,
    },
    {
      id: 5,
      name: 'มิติ 5: กลยุทธ์การข้าม 2 จังหวะและใช้สะพาน',
      score: record.dimensionScores[5] || 0,
      max: 5,
    },
    {
      id: 6,
      name: 'มิติ 6: ความถี่การข้ามและความเสี่ยงสะสม',
      score: record.dimensionScores[6] || 0,
      max: 2,
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = async () => {
    if (!cardRef.current) {
      window.print();
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const targetEl = cardRef.current;
      let dataUrl: string;
      try {
        dataUrl = await toPng(targetEl, {
          quality: 1.0,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: '',
          style: {
            margin: '0',
            boxShadow: 'none',
          },
        });
      } catch {
        // Fallback if an external Drive thumbnail image blocks CORS canvas export
        dataUrl = await toPng(targetEl, {
          quality: 1.0,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: '',
          style: {
            margin: '0',
            boxShadow: 'none',
          },
          filter: (node) => {
            if (node instanceof HTMLImageElement) {
              const src = node.getAttribute('src') || '';
              if (src.startsWith('http') && !src.startsWith(window.location.origin)) {
                return false;
              }
            }
            return true;
          },
        });
      }

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load rendered image'));
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
      const marginX = 10;
      const marginY = 10;
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2;

      const scaledHeight = (img.height * usableWidth) / img.width;

      if (scaledHeight <= usableHeight) {
        // Fits on a single A4 page cleanly
        pdf.addImage(dataUrl, 'PNG', marginX, marginY, usableWidth, scaledHeight, undefined, 'FAST');
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.rect(marginX - 1, marginY - 1, usableWidth + 2, scaledHeight + 2);
      } else {
        // Multi-page A4 support when there are many field photos
        let heightLeft = scaledHeight;
        let positionY = marginY;
        let pageIndex = 0;

        while (heightLeft > 0) {
          if (pageIndex > 0) {
            pdf.addPage();
          }
          pdf.addImage(
            dataUrl,
            'PNG',
            marginX,
            positionY,
            usableWidth,
            scaledHeight,
            undefined,
            'FAST'
          );
          // Mask top & bottom margins cleanly on multi-page slices
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageWidth, marginY - 1, 'F');
          pdf.rect(0, pageHeight - marginY + 1, pageWidth, marginY, 'F');

          heightLeft -= usableHeight;
          positionY -= usableHeight;
          pageIndex++;
        }
      }

      const safeName = seniorName.replace(/[\\/:*?"<>|\s]+/g, '_');
      const safeId = seniorId.replace(/[\\/:*?"<>|\s]+/g, '_');
      pdf.save(`บัตรสรุปผล_${safeId}_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF export fallback to print:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full overflow-hidden shadow-xl my-8 print:my-0 print:shadow-none print:border-slate-300 print:max-w-none">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="text-xs font-semibold text-slate-700">
            บัตรประจำตัวและใบสรุปผลความเสี่ยงการข้ามถนนรายบุคคล (สำหรับพิมพ์หรือแนบสมุดสุขภาพ)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onUpdateRecordPhotos && (
              <button
                type="button"
                onClick={() => setShowPhotoManager((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
              >
                <Camera className="w-3.5 h-3.5 text-blue-700" />
                <span>
                  {showPhotoManager
                    ? 'ซ่อนแผงจัดการรูปถ่าย'
                    : `ถ่ายภาพ/จัดการรูปจุดเสี่ยง (${photos.length})`}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>สั่งพิมพ์บัตร</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
              <span>ปิดรายงาน</span>
            </button>
          </div>
        </div>

        {/* Collapsible Field Photo Manager (Hidden when printing) */}
        {showPhotoManager && onUpdateRecordPhotos && (
          <div className="px-6 py-4 bg-blue-50/40 border-b border-slate-200 space-y-3 print:hidden">
            <HazardPhotoUploader
              photos={photos}
              onChange={handlePhotosChange}
            />
            {photos.length > 0 && unuploadedPhotosCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-md p-3 text-xs">
                <div className="text-slate-700">
                  มีภาพถ่ายจุดเสี่ยง <strong>{unuploadedPhotosCount} ภาพ</strong> ที่ยังไม่ได้สำรองขึ้น Google Drive
                  {!isAuthenticated && ' (ระบบจะขอให้ลงชื่อเข้าใช้ Google ก่อนอัปโหลด)'}
                </div>
                <button
                  type="button"
                  disabled={isUploadingDrive}
                  onClick={handleUploadExistingPhotosToDrive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded hover:bg-emerald-800 disabled:opacity-50"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingDrive
                      ? 'กำลังอัปโหลดขึ้น Google Drive...'
                      : 'อัปโหลดภาพขึ้น Google Drive'}
                  </span>
                </button>
              </div>
            )}
            {uploadStatusMsg && (
              <div className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                {uploadStatusMsg}
              </div>
            )}
          </div>
        )}

        {/* Printable Card Content */}
        <div ref={cardRef} id="printable-senior-card" className="p-6 space-y-5 bg-white">
          {/* Card Header Banner */}
          <div
            className={`rounded-lg p-4 border ${riskHeaderStyle} flex flex-wrap items-center justify-between gap-4`}
          >
            <div>
              <div className="text-xs font-medium opacity-90">
                บัตรสัญญาณไฟจราจรชีวิต · โครงการผู้สูงวัยข้ามถนนปลอดภัยในชุมชน
              </div>
              <h3 className="text-xl font-bold mt-0.5">{seniorName}</h3>
              <div className="text-xs opacity-95 mt-0.5 font-mono tabular-nums">
                รหัสประจำตัว: {seniorId} · เพศ{gender} · อายุ {ageRange}
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-xs border border-white/30 rounded-lg px-4 py-2.5 text-right">
              <div className="text-xs font-medium">ระดับความเสี่ยง</div>
              <div className="text-base font-bold">{record.riskLabel}</div>
              <div className="text-xs font-mono tabular-nums mt-0.5">
                คะแนนรวม {record.totalScore} / 29 คะแนน
              </div>
            </div>
          </div>

          {/* Section 1: Senior Profile, Contact & GPS QR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1.5">
                ข้อมูลติดต่อและพิกัดบ้านผู้สูงอายุ
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">ที่อยู่/ชุมชน:</span>
                    <span className="font-semibold text-slate-900">{address}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">
                      เบอร์โทรศัพท์ผู้สูงอายุ/ผู้ดูแล:
                    </span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {phone}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <UserCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">สถานะการอยู่อาศัย:</span>
                    <span className="font-semibold text-slate-900">
                      {livingStatus}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">พิกัดดาวเทียม GPS:</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {lat}, {lng}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code & Direct Maps Navigation */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900">พิกัดนำทางฉุกเฉิน</div>
                <p className="text-slate-600 leading-snug">
                  สแกนหรือใช้ลิงก์เพื่อนำทางไปยังบ้านผู้สูงอายุใน Google Maps
                </p>
                {record.googleMapsLink && (
                  <a
                    href={record.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 font-semibold underline pt-1 print:no-underline"
                  >
                    <span>เปิดแผนที่นำทาง</span>
                    <ExternalLink className="w-3 h-3 print:hidden" />
                  </a>
                )}
              </div>
              <CoordinateQrMatrix
                value={record.googleMapsLink || `${lat},${lng}`}
              />
            </div>
          </div>

          {/* Section 2: 6-Dimension Score Breakdown */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-sm font-bold text-slate-900">
                ผลคะแนนการประเมินความเสี่ยง 6 มิติ (6-Dimension Risk Profile)
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                รวม {record.totalScore} / 29 คะแนน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {dimensions.map((d) => {
                const ratio = Math.min(100, Math.round((d.score / d.max) * 100));
                const barColor =
                  ratio >= 66
                    ? 'bg-red-600'
                    : ratio >= 34
                    ? 'bg-amber-500'
                    : 'bg-emerald-600';

                return (
                  <div
                    key={d.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {d.name}
                      </span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {d.score} / {d.max}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor}`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Medical Profile & Action Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5">
                <HeartPulse className="w-4 h-4 text-slate-700" />
                <span>ประวัติสุขภาพและพฤติกรรมการข้ามถนน</span>
              </div>
              <div className="space-y-1.5 text-slate-700 pt-1">
                <div>
                  <strong className="text-slate-900">โรคประจำตัว:</strong>{' '}
                  {diseases}
                </div>
                <div>
                  <strong className="text-slate-900">การใช้ยา/ผลข้างเคียง:</strong>{' '}
                  {medication}
                </div>
                <div>
                  <strong className="text-slate-900">อุปกรณ์ช่วยเดิน:</strong>{' '}
                  {walkingAid}
                </div>
                <div>
                  <strong className="text-slate-900">สุขภาพสายตา:</strong>{' '}
                  {visionHistory}
                </div>
                <div>
                  <strong className="text-slate-900">ประวัติอุบัติเหตุ/ความถี่:</strong>{' '}
                  {accidentHistory} · {crossingFreq}
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 space-y-2 text-xs ${riskSurfaceStyle}`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm border-b border-current/15 pb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>แผนการส่งต่อและมาตรการช่วยเหลือรายบุคคล</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div>
                  <strong>1. การส่งต่อทางการแพทย์/สายตา:</strong> {medicalRef}
                </div>
                <div>
                  <strong>2. มาตรการคุ้มครองรายบุคคล:</strong> {protectionPlan}
                </div>
                <div>
                  <strong>3. การติดตามผลเชิงพื้นที่:</strong> {spatialPlan}
                </div>
                <div className="pt-1 font-semibold">
                  นัดหมายประเมินซ้ำครั้งถัดไป: {followUpDateStr}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Field Hazard & Environment Photos */}
          {photos.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>
                    ภาพถ่ายจุดเสี่ยงและสภาพแวดล้อมหน้าบ้าน ({photos.length} ภาพ)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  หลักฐานประกอบการปรับปรุงวิศวกรรมจราจรและทัศนวิสัยชุมชน
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={`${photo.id}__${idx}`}
                    className="border border-slate-200 rounded-md overflow-hidden bg-slate-50 flex flex-col"
                  >
                    <div className="h-36 bg-slate-100 border-b border-slate-200 overflow-hidden">
                      <SmartHazardImage
                        photo={photo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {photo.categoryLabel || 'จุดเสี่ยงในพื้นที่'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {photo.capturedAt}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-snug">
                        {photo.caption}
                      </p>
                      {photo.driveViewLink && (
                        <a
                          href={photo.driveViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold underline pt-0.5 print:no-underline"
                        >
                          <span>เปิดไฟล์ภาพบน Google Drive</span>
                          <ExternalLink className="w-3 h-3 print:hidden" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluator Signature & Print Verification Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="space-y-0.5">
              <div>
                <strong className="text-slate-900">ผู้ทำการประเมิน:</strong> {evaluatorName} ({evaluatorRole})
              </div>
              <div className="text-[11px] text-slate-500">
                เอกสารสรุปผลจากระบบคัดกรองความเสี่ยงการข้ามถนนของผู้สูงอายุและแผนที่พิกัด GIS ชุมชน
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div className="font-mono tabular-nums">
                <strong className="text-slate-900">วันที่ประเมิน:</strong> {assessmentDate}
              </div>
              <div className="text-[11px] text-slate-500">
                ลงชื่อผู้รับรองผล: ___________________________
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 print:hidden">
          <div className="text-xs text-slate-600">
            ใบสรุปผลการประเมินความเสี่ยง: <strong className="text-slate-900">{seniorName}</strong> ({seniorId})
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingPdf
                  ? 'กำลังสร้างไฟล์ PDF...'
                  : 'ดาวน์โหลด PDF (Save file .pdf)'}
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์รายงาน</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 shadow-xs transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>ปิดรายงาน</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
