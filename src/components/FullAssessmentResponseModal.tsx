import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  AssessmentRecord,
  SECTIONS,
  QUESTIONS,
  formatSeniorAge,
} from '../data/assessmentSchema';

const extractScoreFromOption = (value?: string): number => {
  if (!value) return 0;
  const match = String(value).match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
};
import { SmartHazardImage } from './SmartHazardImage';
import {
  X,
  Printer,
  Download,
  FileText,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  MapPin,
  ExternalLink,
  UserCheck,
  Calendar,
  ShieldCheck,
  Lock,
  Camera,
  Pencil,
  Layers,
} from 'lucide-react';

interface FullAssessmentResponseModalProps {
  record: AssessmentRecord | null;
  isAuthenticated: boolean;
  userEmail?: string | null;
  onLogin: () => Promise<void>;
  onEditRecord?: (record: AssessmentRecord) => void;
  onClose: () => void;
}

export const FullAssessmentResponseModal: React.FC<
  FullAssessmentResponseModalProps
> = ({
  record,
  isAuthenticated,
  userEmail,
  onLogin,
  onEditRecord,
  onClose,
}) => {
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<
    'ALL' | 1 | 2 | 3 | 4 | 5
  >('ALL');
  const [showAllOptions, setShowAllOptions] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!record) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                ต้อง Sign in with Google ก่อนดูแบบประเมิน 30 ข้อ
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                การเข้าดูข้อมูลคำตอบแบบประเมินตามโครงสร้างคำถาม Google Forms ฉบับสมบูรณ์ (ครบทั้ง 5 Sections · 30 ข้อ) จำเป็นต้องลงชื่อเข้าใช้ผ่าน{' '}
                <strong className="text-slate-900">Sign in with Google</strong> ก่อนเท่านั้น
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-700 rounded-md hover:bg-blue-800"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const a = record.answers;
  const seniorName = String(a['q2_2'] || 'ไม่ระบุชื่อ');
  const seniorId = String(a['q2_1'] || record.id);
  const evaluatorName = String(a['q1_2'] || '-');
  const evaluatorRole = String(a['q1_1'] || '-');
  const assessmentDate = String(a['q1_3'] || record.timestamp);
  const photos = record.photos || [];

  const riskBadgeClass =
    record.riskLevel === 'RED'
      ? 'bg-red-700 text-white border-red-800'
      : record.riskLevel === 'YELLOW'
      ? 'bg-amber-600 text-white border-amber-700'
      : 'bg-emerald-700 text-white border-emerald-800';

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = async () => {
    if (!printContainerRef.current) {
      window.print();
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const targetEl = printContainerRef.current;
      let dataUrl: string;
      try {
        dataUrl = await toPng(targetEl, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: '',
          style: {
            margin: '0',
            boxShadow: 'none',
          },
        });
      } catch {
        dataUrl = await toPng(targetEl, {
          quality: 1.0,
          pixelRatio: 2,
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
              if (
                src.startsWith('http') &&
                !src.startsWith(window.location.origin)
              ) {
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

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const marginY = 10;
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2;

      const scaledHeight = (img.height * usableWidth) / img.width;
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
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, marginY - 1, 'F');
        pdf.rect(0, pageHeight - marginY + 1, pageWidth, marginY, 'F');

        heightLeft -= usableHeight;
        positionY -= usableHeight;
        pageIndex++;
      }

      const safeName = seniorName.replace(/[\\/:*?"<>|\s]+/g, '_');
      const safeId = seniorId.replace(/[\\/:*?"<>|\s]+/g, '_');
      pdf.save(`แบบประเมิน30ข้อ_${safeId}_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF export fallback to print:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const visibleSections = SECTIONS.filter(
    (sec) => selectedSectionFilter === 'ALL' || sec.id === selectedSectionFilter
  );

  // Count how many of the 30 questions have non-empty answers
  const answeredCount = QUESTIONS.filter((q) => {
    const val = a[q.id];
    if (Array.isArray(val)) return val.length > 0;
    return val !== undefined && String(val).trim() !== '';
  }).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto print:static print:bg-white print:p-0">
      <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full overflow-hidden shadow-2xl my-4 print:my-0 print:shadow-none print:border-slate-300 print:max-w-none">
        {/* Sticky Top Toolbar (Hidden when printing) */}
        <div className="sticky top-0 z-20 bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide uppercase text-blue-300">
                  Google Forms Full Response (5 Sections · 30 ข้อ)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{userEmail || 'Verified Google Account'}</span>
                </span>
              </div>
              <div className="text-sm font-bold text-white">
                ผู้รับการประเมิน: {seniorName} ({seniorId}) · ตอบครบ {answeredCount}/
                {QUESTIONS.length} ข้อ
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEditRecord && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditRecord(record);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-950/80 border border-amber-700/70 rounded-md hover:bg-amber-900 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>แก้ไขคำตอบ</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>สั่งพิมพ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>ปิด</span>
            </button>
          </div>
        </div>

        {/* Section Filter & Display Mode Controls (Hidden when printing) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600 mr-1 inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-700" />
              <span>เลือกดูส่วนคำถาม:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedSectionFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                selectedSectionFilter === 'ALL'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              ครบทั้ง 5 ส่วน (30 ข้อ)
            </button>
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSectionFilter(sec.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedSectionFilter === sec.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                Section {sec.id}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none bg-white border border-slate-300 px-3 py-1 rounded-md">
            <input
              type="checkbox"
              checked={showAllOptions}
              onChange={(e) => setShowAllOptions(e.target.checked)}
              className="rounded text-blue-700 focus:ring-blue-600"
            />
            <span>แสดงตัวเลือกทั้งหมดตามโครงสร้าง Google Forms</span>
          </label>
        </div>

        {/* Printable Document Body */}
        <div
          ref={printContainerRef}
          className="p-6 sm:p-8 space-y-6 bg-white text-slate-900"
        >
          {/* Document Header Banner */}
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div
              className={`p-5 ${riskBadgeClass} flex flex-wrap items-center justify-between gap-4`}
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold opacity-90">
                  แบบบันทึกข้อมูลการตอบกลับรายบุคคล (Google Forms 5 Sections · 30 Questions)
                </div>
                <h2 className="text-xl font-bold">{seniorName}</h2>
                <div className="text-xs opacity-95 font-mono tabular-nums">
                  รหัสประจำตัว (Senior ID): {seniorId} · เพศ{String(a['q2_8'] || '-')} · อายุ{' '}
                  {formatSeniorAge(a['q2_9'])}
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-xs border border-white/30 rounded-lg px-4 py-2.5 text-right">
                <div className="text-xs font-medium">ผลการประเมินไฟจราจรชีวิต</div>
                <div className="text-base font-bold">{record.riskLabel}</div>
                <div className="text-xs font-mono font-bold tabular-nums mt-0.5">
                  คะแนนรวม 6 มิติ: {record.totalScore} / 29 คะแนน
                </div>
              </div>
            </div>

            {/* Metadata Sub-bar */}
            <div className="bg-slate-50 px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-slate-200">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <span className="text-slate-500">ผู้ทำการประเมิน: </span>
                  <strong className="text-slate-900">{evaluatorName}</strong>
                  <span className="text-slate-600 block text-[11px]">
                    {evaluatorRole}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <span className="text-slate-500">วันที่ประเมิน: </span>
                  <strong className="text-slate-900 font-mono tabular-nums">
                    {assessmentDate}
                  </strong>
                  <span className="text-slate-600 block text-[11px]">
                    ประทับเวลา: {record.timestamp}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <span className="text-slate-500">พิกัดบ้าน GPS: </span>
                  <strong className="text-slate-900 font-mono tabular-nums">
                    {String(a['q2_5'] || '-')}, {String(a['q2_6'] || '-')}
                  </strong>
                  {record.googleMapsLink && (
                    <a
                      href={record.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-semibold underline flex items-center gap-1 text-[11px] print:no-underline"
                    >
                      <span>เปิดดูพิกัดบน Google Maps</span>
                      <ExternalLink className="w-3 h-3 print:hidden" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 6-Dimension Score Summary Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                สรุปคะแนนรายมิติทั้ง 6 มิติ (คำนวณจากคำตอบใน Section 4 ข้อ 4.1 – 4.14)
              </span>
              <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                Total_Score = {record.totalScore} / 29 คะแนน
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {[
                { id: 1, label: 'มิติ 1 การมองเห็น', max: 6 },
                { id: 2, label: 'มิติ 2 ความเร็วเดิน', max: 6 },
                { id: 3, label: 'มิติ 3 ประเมินรถ', max: 6 },
                { id: 4, label: 'มิติ 4 สมาธิ/ตัดสินใจ', max: 4 },
                { id: 5, label: 'มิติ 5 ข้าม 2 จังหวะ', max: 5 },
                { id: 6, label: 'มิติ 6 ความถี่สะสม', max: 2 },
              ].map((dim) => {
                const score = record.dimensionScores[dim.id] || 0;
                const ratio = Math.round((score / dim.max) * 100);
                return (
                  <div
                    key={dim.id}
                    className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1"
                  >
                    <div className="text-[11px] text-slate-600 font-medium truncate">
                      {dim.label}
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                        {score} / {dim.max}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {ratio}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          ratio >= 66
                            ? 'bg-red-600'
                            : ratio >= 34
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, ratio)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5 Sections & 30 Questions Full Breakdown */}
          <div className="space-y-6">
            {visibleSections.map((section) => {
              const sectionQuestions = QUESTIONS.filter(
                (q) => q.section === section.id
              );

              return (
                <div
                  key={section.id}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Section Title Header (Google Forms Section Banner Style) */}
                  <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-blue-300">
                        Google Forms Section {section.id} of 5 · จำนวน{' '}
                        {sectionQuestions.length} ข้อ
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                        {section.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {section.subtitle}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-mono font-semibold text-white shrink-0">
                      ส่วนที่ {section.id} / 5
                    </span>
                  </div>

                  {/* Questions List inside Section */}
                  <div className="divide-y divide-slate-200">
                    {sectionQuestions.map((q) => {
                      const rawAnswer = a[q.id];
                      const selectedList: string[] = Array.isArray(rawAnswer)
                        ? rawAnswer.map((v) => String(v).trim()).filter(Boolean)
                        : rawAnswer !== undefined &&
                          String(rawAnswer).trim() !== ''
                        ? [String(rawAnswer).trim()]
                        : [];

                      // If comma-separated string in a CHECKBOX question (from CSV import), split & match options
                      const normalizedSelected: string[] = (() => {
                        if (q.type === 'CHECKBOX' && selectedList.length === 1 && q.options) {
                          const single = selectedList[0];
                          const matchedOpts = q.options.filter((opt) =>
                            single.includes(opt)
                          );
                          if (matchedOpts.length > 0) return matchedOpts;
                        }
                        return selectedList;
                      })();

                      const hasAnswer = normalizedSelected.length > 0;
                      const questionScore =
                        section.id === 4 && hasAnswer
                          ? extractScoreFromOption(normalizedSelected[0])
                          : null;

                      return (
                        <div
                          key={q.id}
                          className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-2.5"
                        >
                          {/* Question Title & Metadata Badges */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              {q.dimensionLabel && (
                                <div className="inline-block text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded mb-1">
                                  {q.dimensionLabel}
                                </div>
                              )}
                              <div className="text-sm font-bold text-slate-900">
                                {q.title}
                                {q.required && (
                                  <span
                                    className="text-red-600 ml-1"
                                    title="คำถามจำเป็น (Required)"
                                  >
                                    *
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {questionScore !== null && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                                    questionScore >= 2
                                      ? 'bg-red-50 text-red-800 border-red-200'
                                      : questionScore === 1
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  คะแนนข้อนี้: +{questionScore} คะแนน
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {q.type === 'RADIO'
                                  ? 'Multiple choice'
                                  : q.type === 'CHECKBOX'
                                  ? 'Checkboxes'
                                  : q.type === 'DATE'
                                  ? 'Date'
                                  : 'Short answer'}
                              </span>
                            </div>
                          </div>

                          {/* Answer Rendering based on Question Type */}
                          {q.options && q.options.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              {showAllOptions ? (
                                <div className="grid grid-cols-1 gap-1.5">
                                  {q.options.map((opt) => {
                                    const isChecked =
                                      normalizedSelected.some(
                                        (sel) =>
                                          sel === opt ||
                                          sel.includes(opt) ||
                                          (section.id === 4 &&
                                            opt.slice(0, 3) === sel.slice(0, 3) &&
                                            sel.startsWith('('))
                                      );

                                    return (
                                      <div
                                        key={opt}
                                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                                          isChecked
                                            ? 'bg-blue-50/90 border-blue-600 text-slate-950 font-bold shadow-2xs'
                                            : 'bg-slate-50/50 border-slate-200 text-slate-500'
                                        }`}
                                      >
                                        {q.type === 'CHECKBOX' ? (
                                          isChecked ? (
                                            <CheckSquare className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                          ) : (
                                            <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                                          )
                                        ) : isChecked ? (
                                          <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                        ) : (
                                          <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                                        )}
                                        <span className="flex-1 leading-relaxed">
                                          {opt}
                                        </span>
                                        {isChecked && (
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-700 text-white shrink-0">
                                            คำตอบที่เลือก
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Also show any custom answer text that wasn't in the standard options list */}
                                  {normalizedSelected
                                    .filter(
                                      (sel) =>
                                        !q.options!.some(
                                          (opt) =>
                                            sel === opt ||
                                            sel.includes(opt) ||
                                            (section.id === 4 &&
                                              opt.slice(0, 3) ===
                                                sel.slice(0, 3) &&
                                              sel.startsWith('('))
                                        )
                                    )
                                    .map((customAns) => (
                                      <div
                                        key={customAns}
                                        className="flex items-start gap-2.5 px-3 py-2 rounded-lg border bg-blue-50/90 border-blue-600 text-slate-950 font-bold text-xs"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                        <span className="flex-1 leading-relaxed">
                                          {customAns}
                                        </span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-700 text-white shrink-0">
                                          คำตอบที่บันทึก
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              ) : hasAnswer ? (
                                <div className="space-y-1.5">
                                  {normalizedSelected.map((ans, idx) => (
                                    <div
                                      key={`${ans}-${idx}`}
                                      className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-blue-600 bg-blue-50/90 text-xs font-bold text-slate-950"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                      <span>{ans}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400 italic">
                                  ไม่ได้ระบุคำตอบ
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Short Answer / Text / Date Question */
                            <div className="pt-1">
                              <div className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 flex items-center justify-between gap-2">
                                <span>
                                  {q.id === 'q2_9' && hasAnswer
                                    ? formatSeniorAge(normalizedSelected[0])
                                    : hasAnswer
                                    ? normalizedSelected.join(', ')
                                    : '- (ไม่ได้ระบุข้อมูล)'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  รหัสข้อ: {q.code}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* If Section 2, also display attached field photos */}
                  {section.id === 2 && photos.length > 0 && (
                    <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Camera className="w-4 h-4 text-blue-700" />
                          <span>
                            ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้านที่แนบใน Section 2 (
                            {photos.length} ภาพ)
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {photos.map((photo, pIdx) => (
                          <div
                            key={`${photo.id}__${pIdx}`}
                            className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col"
                          >
                            <div className="h-44 bg-slate-100 border-b border-slate-200 overflow-hidden">
                              <SmartHazardImage
                                photo={photo}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">
                                  {photo.categoryLabel || 'ภาพถ่ายหน้าบ้าน'}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {photo.capturedAt}
                                </span>
                              </div>
                              <p className="text-slate-600">{photo.caption}</p>
                              {photo.driveViewLink && (
                                <a
                                  href={photo.driveViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold underline pt-0.5 print:no-underline"
                                >
                                  <span>เปิดดูไฟล์ต้นฉบับบน Google Drive</span>
                                  <ExternalLink className="w-3 h-3 print:hidden" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Official Verification Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div>
              <strong className="text-slate-900">ผู้บันทึกข้อมูลแบบประเมิน:</strong>{' '}
              {evaluatorName} ({evaluatorRole})
            </div>
            <div className="font-mono tabular-nums">
              <strong className="text-slate-900">วันที่บันทึก:</strong>{' '}
              {assessmentDate} · รหัสอ้างอิง: {record.id}
            </div>
          </div>
        </div>

        {/* Bottom Footer Action Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-600">
            ข้อมูลแบบประเมินครบทั้ง 5 ส่วน (30 ข้อ) ของ:{' '}
            <strong className="text-slate-900">{seniorName}</strong> ({seniorId})
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
                  : 'ดาวน์โหลด PDF (ครบ 30 ข้อ)'}
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์แบบประเมิน</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 shadow-xs transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>ปิดหน้าต่าง</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
