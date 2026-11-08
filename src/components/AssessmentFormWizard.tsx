import React, { useState, useEffect, useRef } from 'react';
import {
  SECTIONS,
  QUESTIONS,
  calculateAssessmentMetrics,
  AssessmentRecord,
  HazardPhotoAttachment,
  buildRecordFromAnswers,
} from '../data/assessmentSchema';
import { SeniorRiskMap } from './SeniorRiskMap';
import { HazardPhotoUploader } from './HazardPhotoUploader';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  AlertTriangle,
  Save,
  RotateCcw,
  Timer,
  Play,
  Square,
  Printer,
  Lock,
  KeyRound,
} from 'lucide-react';

interface AssessmentFormWizardProps {
  existingRecords: AssessmentRecord[];
  editingRecord?: AssessmentRecord | null;
  onCancelEdit?: () => void;
  hasConnectedSheet: boolean;
  isAuthenticated: boolean;
  spreadsheetTitle?: string;
  onLogin?: () => Promise<void>;
  onSaveAssessment: (
    record: AssessmentRecord,
    syncToGoogleSheet: boolean,
    uploadPhotosToDrive: boolean
  ) => Promise<AssessmentRecord>;
  onOpenPrintCard: (record: AssessmentRecord) => void;
}

const getDefaultAnswers = (): Record<string, string | string[]> => ({
  q1_1: 'อสม. (อาสาสมัครสาธารณสุขประจำหมู่บ้าน)',
  q1_2: '',
  q1_3: new Date().toISOString().slice(0, 10),
  q2_1: '',
  q2_2: '',
  q2_3: '',
  q2_4: '',
  q2_5: '8.43210',
  q2_6: '99.96543',
  q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
  q2_8: 'ชาย',
  q2_9: '72',
  q2_10: 'อาศัยอยู่คนเดียวตามลำพัง (กลุ่มเสี่ยงสูง)',
  q3_1: [],
  q3_2: 'ไม่มียาที่ส่งผลกระทบ',
  q3_3: 'ไม่ใช้อุปกรณ์',
  q3_4: 'ไม่เคยมีประวัติ',
  q3_5: 'ไม่เคยล้ม',
  q3_6: 'ข้ามปานกลาง (1–2 ครั้ง/วัน)',
  q3_7: 'เช้ามืด/เย็นชั่วโมงเร่งด่วน',
  q3_8: [],
  q3_9: 'ปกติ/ใส่แว่นข้ามประจำ',
  q4_1: '(0) มองเห็นภาพรถและขอบทางชัดเจนดี',
  q4_2: '(0) มองเห็นรถในลานสายตาด้านข้างได้กว้างปกติ',
  q4_3: '(0) สู้แสงได้ปกติ มองเห็นรถกลางคืน/ฝนตกได้ชัดเจน',
  q4_4: '(0) เดินเร็วปกติ (> 1.0 m/s)',
  q4_5: '(0) ก้าวข้ามทันทีเมื่อรถว่าง (< 1.5 วินาที)',
  q4_6: '(0) เดินบนสะพานคอนกรีตข้ามร่องกลางได้มั่นคง ไม่กลัวล้ม',
  q4_7: '(0) ประเมินเวลาที่รถจะมาถึง (TTA) ได้แม่นยำ',
  q4_8: '(0) กวาดสายตามองสแกนครบทั้งเลนฝั่งใกล้และเลนฝั่งไกล',
  q4_9: '(0) เดินไปชะโงกมองบนสะพานจนเห็นรถชัดเจนก่อนก้าวข้าม',
  q4_10: '(0) ตัดสินใจได้รวดเร็ว มั่นใจ เมื่อจราจรซับซ้อน',
  q4_11: '(0) เดินด้วยความเร็วเท่าเดิมแม้มีสิ่งชวนคุย/คิด',
  q4_12: '(0) ข้ามแบบ 2 จังหวะ ยืนพักบนสะพานสแกนรถเลนฝั่งไกลก่อนข้ามต่อ',
  q4_13: '(0) ประเมินเวลาตรงกับความเร็วจริงของตนเอง',
  q4_14: '(0) ข้ามน้อย (< 3 ครั้ง/สัปดาห์)',
  q5_1: [],
  q5_2: [],
  q5_3: ['นำพิกัดเข้าระบบแผนที่ GIS ชุมชน'],
});

export const AssessmentFormWizard: React.FC<AssessmentFormWizardProps> = ({
  existingRecords,
  editingRecord = null,
  onCancelEdit,
  hasConnectedSheet,
  isAuthenticated,
  spreadsheetTitle,
  onLogin,
  onSaveAssessment,
  onOpenPrintCard,
}) => {
  const [currentSection, setCurrentSection] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    editingRecord ? { ...getDefaultAnswers(), ...editingRecord.answers } : getDefaultAnswers()
  );
  const [photos, setPhotos] = useState<HazardPhotoAttachment[]>(
    editingRecord?.photos || []
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [syncToSheet, setSyncToSheet] = useState(true);
  const [uploadPhotosToDrive, setUploadPhotosToDrive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] =
    useState<AssessmentRecord | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setAnswers({ ...getDefaultAnswers(), ...editingRecord.answers });
      setPhotos(editingRecord.photos || []);
      setCurrentSection(1);
      setValidationError(null);
      setSubmitSuccess(null);
    }
  }, [editingRecord]);

  // 10-Meter Walk Test Stopwatch State (Question 4.4)
  const [walkRunning, setWalkRunning] = useState(false);
  const [walkSeconds, setWalkSeconds] = useState<number>(0);
  const [manualWalkInput, setManualWalkInput] = useState<string>('');
  const [walkResultSummary, setWalkResultSummary] = useState<string | null>(
    null
  );
  const walkStartRef = useRef<number | null>(null);

  // Start-Up Delay Stopwatch State (Question 4.5)
  const [delayRunning, setDelayRunning] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState<number>(0);
  const [delayResultSummary, setDelayResultSummary] = useState<string | null>(
    null
  );
  const delayStartRef = useRef<number | null>(null);

  // Interval for 10-Meter Walk Stopwatch
  useEffect(() => {
    if (!walkRunning) return;
    walkStartRef.current = performance.now() - walkSeconds * 1000;
    const interval = window.setInterval(() => {
      if (walkStartRef.current !== null) {
        const elapsed = (performance.now() - walkStartRef.current) / 1000;
        setWalkSeconds(Number(elapsed.toFixed(2)));
      }
    }, 50);
    return () => window.clearInterval(interval);
  }, [walkRunning]);

  // Interval for Start-Up Delay Stopwatch
  useEffect(() => {
    if (!delayRunning) return;
    delayStartRef.current = performance.now() - delaySeconds * 1000;
    const interval = window.setInterval(() => {
      if (delayStartRef.current !== null) {
        const elapsed = (performance.now() - delayStartRef.current) / 1000;
        setDelaySeconds(Number(elapsed.toFixed(2)));
      }
    }, 50);
    return () => window.clearInterval(interval);
  }, [delayRunning]);

  const applyWalkTimeGrade = (sec: number) => {
    if (sec <= 0 || isNaN(sec)) return;
    const speed = 10 / sec;
    let selectedOption = '(0) เดินเร็วปกติ (> 1.0 m/s)';
    if (speed < 0.8) {
      selectedOption = '(2) เดินช้ามาก (< 0.8 m/s) เสี่ยงติดค้างกลางถนน';
    } else if (speed <= 1.0) {
      selectedOption = '(1) เดินช้ากว่ามาตรฐานทางข้าม (0.8 – 1.0 m/s)';
    }
    setAnswers((prev) => ({ ...prev, q4_4: selectedOption }));
    setWalkResultSummary(
      `ใช้เวลาเดิน 10 เมตร = ${sec.toFixed(2)} วินาที (ความเร็ว ${speed.toFixed(
        2
      )} m/s) ➔ ระบบเลือก "${selectedOption}" ให้อัตโนมัติ`
    );
  };

  const handleStopWalkTimer = () => {
    setWalkRunning(false);
    applyWalkTimeGrade(walkSeconds);
  };

  const handleResetWalkTimer = () => {
    setWalkRunning(false);
    setWalkSeconds(0);
    setManualWalkInput('');
    setWalkResultSummary(null);
  };

  const applyDelayTimeGrade = (sec: number) => {
    if (sec <= 0 || isNaN(sec)) return;
    let selectedOption = '(0) ก้าวข้ามทันทีเมื่อรถว่าง (< 1.5 วินาที)';
    if (sec > 2.5) {
      selectedOption = '(2) ตอบสนองช้ามาก/ลังเลสูง (> 2.5 วินาที)';
    } else if (sec >= 1.5) {
      selectedOption = '(1) ตอบสนองช้า/ลังเลเล็กน้อย (1.5 – 2.5 วินาที)';
    }
    setAnswers((prev) => ({ ...prev, q4_5: selectedOption }));
    setDelayResultSummary(
      `เวลาตั้งต้นก่อนก้าวข้าม = ${sec.toFixed(
        2
      )} วินาที ➔ ระบบเลือก "${selectedOption}" ให้อัตโนมัติ`
    );
  };

  const handleStopDelayTimer = () => {
    setDelayRunning(false);
    applyDelayTimeGrade(delaySeconds);
  };

  const handleResetDelayTimer = () => {
    setDelayRunning(false);
    setDelaySeconds(0);
    setDelayResultSummary(null);
  };

  const liveMetrics = calculateAssessmentMetrics(answers);

  const sectionInfo = SECTIONS.find((s) => s.id === currentSection)!;
  const sectionQuestions = QUESTIONS.filter((q) => q.section === currentSection);

  const handleTextOrRadioChange = (questionId: string, value: string) => {
    setValidationError(null);
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxToggle = (questionId: string, optionValue: string) => {
    setValidationError(null);
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? (prev[questionId] as string[])
        : [];
      const exists = current.includes(optionValue);
      const updated = exists
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatusMessage('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setGpsStatusMessage('กำลังดึงพิกัดดาวเทียม GPS ปัจจุบัน...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setAnswers((prev) => ({
          ...prev,
          q2_5: lat,
          q2_6: lng,
          q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
        }));
        setGpsStatusMessage(`ดึงพิกัดสำเร็จ: ${lat}, ${lng}`);
      },
      () => {
        setGpsStatusMessage(
          'ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณาคลิกเลือกจุดบ้านบนแผนที่ด้านล่างแทน'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const validateCurrentSection = (): boolean => {
    for (const q of sectionQuestions) {
      if (q.required) {
        const val = answers[q.id];
        if (
          val === undefined ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          setValidationError(`กรุณาระบุข้อมูลในข้อ "${q.title}" ให้ครบถ้วน`);
          return false;
        }
      }
    }
    setValidationError(null);
    return true;
  };

  const handleNextSection = () => {
    if (!validateCurrentSection()) return;
    if (currentSection < 5) {
      setCurrentSection((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevSection = () => {
    setValidationError(null);
    if (currentSection > 1) {
      setCurrentSection((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrepareSubmit = () => {
    if (!validateCurrentSection()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (editingRecord && !isAuthenticated) {
      setValidationError(
        'การบันทึกการแก้ไขฐานข้อมูล จำเป็นต้องเข้าสู่ระบบผ่าน Email (บัญชี Google) เพื่อยืนยันสิทธิ์'
      );
      setShowConfirmModal(false);
      if (onLogin) {
        onLogin();
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(null);
    try {
      const nextIndex = existingRecords.length + 1;
      const targetId = editingRecord
        ? editingRecord.id
        : `REC-${String(nextIndex).padStart(3, '0')}`;
      const newRecord = buildRecordFromAnswers(
        targetId,
        new Date().toLocaleString('th-TH'),
        {
          ...answers,
          q2_1:
            String(answers['q2_1'] || '').trim() ||
            `SNR-${String(nextIndex).padStart(3, '0')}`,
        },
        photos
      );

      const finalSavedRecord = await onSaveAssessment(
        newRecord,
        hasConnectedSheet && syncToSheet,
        photos.length > 0 && uploadPhotosToDrive
      );
      setLastSavedRecord(finalSavedRecord);
      setShowConfirmModal(false);
      setSubmitSuccess(
        `${editingRecord ? 'บันทึกการแก้ไขข้อมูล' : 'บันทึกผลการประเมิน'}ของ "${
          finalSavedRecord.answers['q2_2']
        }" เรียบร้อยแล้ว (${finalSavedRecord.riskLabel} · ${
          finalSavedRecord.totalScore
        } คะแนน · ภาพถ่าย ${finalSavedRecord.photos?.length || 0} ภาพ)`
      );
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
      );
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    onCancelEdit?.();
    setAnswers(getDefaultAnswers());
    setPhotos([]);
    setCurrentSection(1);
    setValidationError(null);
    setSubmitSuccess(null);
    setLastSavedRecord(null);
    handleResetWalkTimer();
    handleResetDelayTimer();
  };

  const latNum = Number(answers['q2_5']);
  const lngNum = Number(answers['q2_6']);
  const currentWalkSpeed =
    walkSeconds > 0 ? (10 / walkSeconds).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {editingRecord && (
        <div
          className={`border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs ${
            isAuthenticated
              ? 'bg-amber-50 border-amber-300'
              : 'bg-amber-100/90 border-amber-400'
          }`}
        >
          <div className="space-y-1">
            <div className="font-semibold text-amber-950 flex items-center gap-1.5">
              {!isAuthenticated && <Lock className="w-3.5 h-3.5 text-amber-700" />}
              <span>
                โหมดแก้ไขข้อมูลผู้สูงอายุ:{' '}
                <strong className="text-sm">
                  {String(editingRecord.answers['q2_2'] || editingRecord.id)}
                </strong>{' '}
                (รหัส {String(editingRecord.answers['q2_1'] || editingRecord.id)})
              </span>
            </div>
            <p className="text-[11px] text-amber-900">
              {isAuthenticated
                ? 'คุณเข้าสู่ระบบผ่าน Email แล้ว · สามารถปรับปรุงข้อมูลและกดบันทึกการแก้ไขในหน้า 5 ได้ทันที'
                : '🔒 ระบบอนุญาตให้ทุกคนเข้าชมข้อมูลได้อัตโนมัติ แต่หากจะ "บันทึกการแก้ไข" ฐานข้อมูล จำเป็นต้องเข้าสู่ระบบผ่าน Email (บัญชี Google) ก่อน'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isAuthenticated && onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบด้วย Google เพื่อบันทึก</span>
              </button>
            )}
            {onCancelEdit && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-1.5 font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>
        </div>
      )}

      {/* Section Stepper Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              แบบฟอร์มคัดกรองและประเมินความเสี่ยงการข้ามถนนของผู้สูงอายุ (5 ส่วน 100%)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              จำลองโครงสร้างเดียวกับ Google Forms 5 Sections พร้อมนาฬิกาจับเวลาเดิน 10 เมตรอัตโนมัติและส่งข้อมูลเข้า Google Sheets ทันที
            </p>
          </div>

          {/* Live Score Summary */}
          <div className="flex items-center gap-4 text-xs bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg">
            <div>
              <span className="text-slate-500">คะแนนรวม 6 มิติ: </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                {liveMetrics.totalScore} / 29
              </span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="font-semibold text-slate-800">
              {liveMetrics.riskLabel}
            </div>
          </div>
        </div>

        {/* 5 Section Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-4">
          {SECTIONS.map((sec) => {
            const isActive = sec.id === currentSection;
            const isCompleted = sec.id < currentSection;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setCurrentSection(sec.id);
                }}
                className={`text-left px-3 py-2.5 rounded-md border transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white border-blue-700'
                    : isCompleted
                    ? 'bg-slate-50 text-slate-900 border-slate-300 hover:bg-slate-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>หน้า {sec.id} / 5</span>
                  {isCompleted && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-white' : 'text-emerald-600'
                      }`}
                    />
                  )}
                </div>
                <div
                  className={`text-xs mt-0.5 truncate ${
                    isActive ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {sec.title.replace(/^Section \d+: /, '')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {submitSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-emerald-950 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastSavedRecord && (
              <button
                type="button"
                onClick={() => onOpenPrintCard(lastSavedRecord)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ดูและพิมพ์บัตรประจำตัวผู้สูงอายุ</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ประเมินผู้สูงอายุรายถัดไป</span>
            </button>
          </div>
        </div>
      )}

      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-center gap-2.5 text-xs font-medium text-red-900">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Active Section Form Surface */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs font-medium text-blue-700">
            ส่วนที่ {sectionInfo.id} จาก 5 ส่วน
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {sectionInfo.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1">{sectionInfo.description}</p>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {sectionQuestions.map((q) => {
            const val = answers[q.id];

            return (
              <div
                key={q.id}
                className="pb-6 border-b border-slate-100 last:border-b-0 last:pb-0 space-y-2.5"
              >
                {q.dimensionLabel && (
                  <div className="text-xs font-semibold text-blue-700">
                    {q.dimensionLabel}
                  </div>
                )}

                <label className="block text-sm font-semibold text-slate-900">
                  {q.title}
                  {q.required && <span className="text-red-600 ml-1">*</span>}
                </label>

                {q.helperText && (
                  <p className="text-xs text-slate-500">{q.helperText}</p>
                )}

                {/* Dedicated 10-Meter Walk Test Stopwatch Widget on Question 4.4 */}
                {q.id === 'q4_4' && (
                  <div className="p-4 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-3 my-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold tracking-wide">
                          เครื่องมือจับเวลาเดิน 10 เมตรอัตโนมัติ (10-Meter Walk Test Stopwatch)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        เกณฑ์: &lt;10 วินาที (&gt;1.0 m/s = 0 คะแนน) · 10–12.5 วินาที (0.8–1.0 m/s = 1 คะแนน) · &gt;12.5 วินาที (&lt;0.8 m/s = 2 คะแนน)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Digital Instrument Readout */}
                      <div className="bg-slate-950 border border-slate-800 rounded-md px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            เวลาเดิน 10 เมตร
                          </div>
                          <div className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                            {walkSeconds.toFixed(2)} <span className="text-xs font-normal text-slate-400">วินาที</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">
                            ความเร็วเฉลี่ย
                          </div>
                          <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                            {currentWalkSpeed} <span className="text-xs font-normal text-slate-400">m/s</span>
                          </div>
                        </div>
                      </div>

                      {/* Stopwatch Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        {!walkRunning ? (
                          <button
                            type="button"
                            onClick={() => setWalkRunning(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-500 whitespace-nowrap shrink-0"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>เริ่มจับเวลาเดิน</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStopWalkTimer}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-500 whitespace-nowrap shrink-0"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>หยุด & คำนวณเกรด</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetWalkTimer}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 rounded-md hover:bg-slate-700 whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>รีเซ็ต</span>
                        </button>
                      </div>

                      {/* Manual Seconds Entry */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          value={manualWalkInput}
                          onChange={(e) => setManualWalkInput(e.target.value)}
                          placeholder="หรือระบุวินาที เช่น 11.5"
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded text-white font-mono tabular-nums focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const num = parseFloat(manualWalkInput);
                            if (!isNaN(num) && num > 0) {
                              setWalkSeconds(num);
                              applyWalkTimeGrade(num);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-500 whitespace-nowrap shrink-0"
                        >
                          คำนวณ
                        </button>
                      </div>
                    </div>

                    {walkResultSummary && (
                      <div className="text-xs text-emerald-300 font-medium bg-emerald-950/60 border border-emerald-800/80 rounded px-3 py-1.5">
                        {walkResultSummary}
                      </div>
                    )}
                  </div>
                )}

                {/* Dedicated Start-up Delay Stopwatch Widget on Question 4.5 */}
                {q.id === 'q4_5' && (
                  <div className="p-3.5 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2.5 my-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold">
                          จับเวลาตั้งต้นก่อนก้าวข้าม (Start-up Delay Timer)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-amber-400 tabular-nums">
                          {delaySeconds.toFixed(2)} วินาที
                        </span>
                        {!delayRunning ? (
                          <button
                            type="button"
                            onClick={() => setDelayRunning(true)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-500 whitespace-nowrap shrink-0"
                          >
                            <Play className="w-3 h-3" />
                            <span>เริ่มจับเวลาเมื่อรถว่าง</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStopDelayTimer}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-500 whitespace-nowrap shrink-0"
                          >
                            <Square className="w-3 h-3" />
                            <span>หยุดเมื่อก้าวเท้า</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetDelayTimer}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                        >
                          รีเซ็ต
                        </button>
                      </div>
                    </div>
                    {delayResultSummary && (
                      <div className="text-xs text-blue-300 font-medium">
                        {delayResultSummary}
                      </div>
                    )}
                  </div>
                )}

                {q.type === 'TEXT' && q.id === 'q2_9' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Direct numeric age input */}
                      <div className="inline-flex items-center border border-slate-300 rounded-md bg-white overflow-hidden focus-within:border-blue-600">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(String(val || '70'), 10);
                            const next = isNaN(cur) ? 70 : Math.max(50, cur - 1);
                            handleTextOrRadioChange(q.id, String(next));
                          }}
                          className="px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-r border-slate-300"
                          title="ลดอายุ 1 ปี"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={50}
                          max={120}
                          step={1}
                          value={String(val || '').replace(/[^\d]/g, '')}
                          onChange={(e) =>
                            handleTextOrRadioChange(
                              q.id,
                              e.target.value.replace(/[^\d]/g, '')
                            )
                          }
                          placeholder="เช่น 74"
                          className="w-24 px-3 py-2 text-center text-base font-mono font-bold tabular-nums text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(String(val || '70'), 10);
                            const next = isNaN(cur) ? 70 : Math.min(120, cur + 1);
                            handleTextOrRadioChange(q.id, String(next));
                          }}
                          className="px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-l border-slate-300"
                          title="เพิ่มอายุ 1 ปี"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-slate-700">
                        ปีบริบูรณ์
                      </span>

                      {/* Quick Select Menu for Age */}
                      <select
                        value={String(val || '').replace(/[^\d]/g, '')}
                        onChange={(e) =>
                          handleTextOrRadioChange(q.id, e.target.value)
                        }
                        className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">-- เลือกตัวเลขอายุจากเมนู (55–105 ปี) --</option>
                        {Array.from({ length: 51 }, (_, idx) => 55 + idx).map(
                          (ageNum) => (
                            <option key={ageNum} value={String(ageNum)}>
                              อายุ {ageNum} ปี
                            </option>
                          )
                        )}
                      </select>

                      {/* Dynamic Age Group Classification */}
                      {(() => {
                        const parsedAge = parseInt(
                          String(val || '').replace(/[^\d]/g, ''),
                          10
                        );
                        if (isNaN(parsedAge)) return null;
                        if (parsedAge >= 80) {
                          return (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 text-red-800 border border-red-200">
                              กลุ่มผู้สูงอายุวัยปลาย (80 ปีขึ้นไป · เปราะบางสูง)
                            </span>
                          );
                        }
                        if (parsedAge >= 70) {
                          return (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">
                              กลุ่มผู้สูงอายุวัยกลาง (70–79 ปี)
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            กลุ่มผู้สูงอายุวัยต้น ({parsedAge} ปี)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {q.type === 'TEXT' && q.id !== 'q2_9' && (
                  <input
                    type="text"
                    value={String(val || '')}
                    onChange={(e) => handleTextOrRadioChange(q.id, e.target.value)}
                    placeholder={q.placeholder || 'ระบุคำตอบของคุณ'}
                    className="w-full max-w-xl px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 text-slate-900"
                  />
                )}

                {q.type === 'DATE' && (
                  <input
                    type="date"
                    value={String(val || '')}
                    onChange={(e) => handleTextOrRadioChange(q.id, e.target.value)}
                    className="w-full max-w-xs px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 text-slate-900 font-mono tabular-nums"
                  />
                )}

                {q.type === 'RADIO' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt) => {
                      const checked = val === opt;
                      return (
                        <label
                          key={opt}
                          className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-blue-50/60 border-blue-600 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={checked}
                            onChange={() => handleTextOrRadioChange(q.id, opt)}
                            className="mt-0.5 text-blue-700 focus:ring-blue-600"
                          />
                          <span className="text-sm leading-snug">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'CHECKBOX' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt) => {
                      const arr = Array.isArray(val) ? val : [];
                      const checked = arr.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-blue-50/60 border-blue-600 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleCheckboxToggle(q.id, opt)}
                            className="mt-0.5 text-blue-700 rounded focus:ring-blue-600"
                          />
                          <span className="text-sm leading-snug">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Interactive GPS Helper inside Section 2 right after Longitude (q2_6) */}
                {q.id === 'q2_6' && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          เครื่องมือปักหมุดพิกัดบ้านผู้สูงอายุ (Smart GPS Pinning)
                        </div>
                        <div className="text-xs text-slate-600">
                          คลิกบนแผนที่เพื่อปักหมุดตำแหน่งบ้าน หรือกดดึงพิกัดปัจจุบันจากมือถือ
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGetCurrentGPS}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>ดึงพิกัด GPS ปัจจุบัน</span>
                      </button>
                    </div>

                    {gpsStatusMessage && (
                      <div className="text-xs font-mono text-blue-700">
                        {gpsStatusMessage}
                      </div>
                    )}

                    <SeniorRiskMap
                      records={existingRecords}
                      selectedRecordId={null}
                      onSelectRecord={() => {}}
                      pickerPosition={
                        !isNaN(latNum) && !isNaN(lngNum)
                          ? { lat: latNum, lng: lngNum }
                          : null
                      }
                      onPickLocation={(lat, lng) => {
                        setAnswers((prev) => ({
                          ...prev,
                          q2_5: lat.toFixed(5),
                          q2_6: lng.toFixed(5),
                          q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
                        }));
                        setGpsStatusMessage(
                          `เลือกพิกัดจากแผนที่แล้ว: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                        );
                      }}
                      heightClass="h-[280px]"
                    />
                  </div>
                )}

                {/* Photo Attachment Widget in Section 2 (after q2_10) */}
                {q.id === 'q2_10' && (
                  <div className="mt-4">
                    <HazardPhotoUploader
                      photos={photos}
                      onChange={setPhotos}
                      defaultCategory="HOUSE_CROSSING"
                      title="แนบภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2)"
                      subtitle="ถ่ายภาพจุดข้ามถนน 4 เลนหน้าบ้านผู้สูงอายุ หรือสภาพทางเดินเข้าบ้านเพื่อเป็นหลักฐานเชิงพื้นที่"
                    />
                  </div>
                )}

                {/* Photo Attachment Widget in Section 4 (after q4_9 Vegetation/Bridge hazards) */}
                {q.id === 'q4_9' && (
                  <div className="mt-4">
                    <HazardPhotoUploader
                      photos={photos}
                      onChange={setPhotos}
                      defaultCategory="VEGETATION_BLINDSPOT"
                      title="ถ่ายภาพจุดเสี่ยงสะพานคอนกรีต / ต้นไม้ร่องกลางบดบังสายตา (Section 4)"
                      subtitle="บันทึกภาพสะพานข้ามร่องกลาง (ข้อ 4.6) หรือพุ่มไม้ที่บดบังทัศนวิสัย (ข้อ 4.9) เพื่อส่งต่อหน่วยงานปรับปรุงภูมิทัศน์"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section 4 & 5 Live Dimension Score Card */}
        {(currentSection === 4 || currentSection === 5) && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">
                สรุปคะแนนความเสี่ยง 6 มิติอัตโนมัติ (Traffic Light Grading)
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                รวม {liveMetrics.totalScore} / 29 คะแนน — {liveMetrics.riskLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="bg-white border border-slate-200 p-2.5 rounded">
                <div className="text-slate-500">มิติ 1 การมองเห็น</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {liveMetrics.dimensionScores[1]} / 6
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-2.5 rounded">
                <div className="text-slate-500">มิติ 2 การเดิน/ทรงตัว</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {liveMetrics.dimensionScores[2]} / 6
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-2.5 rounded">
                <div className="text-slate-500">มิติ 3 ประเมินความเร็ว</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {liveMetrics.dimensionScores[3]} / 6
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-2.5 rounded">
                <div className="text-slate-500">มิติ 4 สมาธิ/ตัดสินใจ</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {liveMetrics.dimensionScores[4]} / 4
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-2.5 rounded">
                <div className="text-slate-500">มิติ 5 กลยุทธ์ข้าม</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {liveMetrics.dimensionScores[5]} / 5
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-2.5 rounded">
                <div className="text-slate-500">มิติ 6 ความถี่สะสม</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {liveMetrics.dimensionScores[6]} / 2
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handlePrevSection}
            disabled={currentSection === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>

          {currentSection < 5 ? (
            <button
              type="button"
              onClick={handleNextSection}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>ถัดไป (Section {currentSection + 1})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrepareSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกผลการประเมินและคำนวณเกรด</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Confirmation Modal before writing to Google Sheets / Google Drive */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-lg">
            <h4 className="text-base font-bold text-slate-900">
              ยืนยันการบันทึกผลการประเมินความเสี่ยง
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณกำลังจะบันทึกข้อมูลของ{' '}
              <strong className="text-slate-900">
                {String(answers['q2_2'] || 'ผู้สูงอายุ')}
              </strong>{' '}
              คะแนนรวม{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {liveMetrics.totalScore}/29 คะแนน ({liveMetrics.riskLabel})
              </strong>
              {photos.length > 0 && ` พร้อมภาพถ่ายจุดเสี่ยง ${photos.length} ภาพ`}
            </p>

            {photos.length > 0 && (
              <label className="flex items-start gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadPhotosToDrive}
                  onChange={(e) => setUploadPhotosToDrive(e.target.checked)}
                  className="mt-0.5 text-blue-700 rounded"
                />
                <span>
                  อัปโหลดภาพถ่ายจุดเสี่ยงและหน้าบ้านจำนวน <strong>{photos.length} ภาพ</strong> ลงใน{' '}
                  <strong>Google Drive</strong> ของคุณและแนบลิงก์ภาพในตาราง Google Sheets โดยอัตโนมัติ
                </span>
              </label>
            )}

            {hasConnectedSheet && (
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToSheet}
                  onChange={(e) => setSyncToSheet(e.target.checked)}
                  className="mt-0.5 text-blue-700 rounded"
                />
                <span>
                  เพิ่มแถวข้อมูลและสูตรคำนวณลงในไฟล์ Google Sheets{' '}
                  <strong>"{spreadsheetTitle || 'senior_risk_assessment_template'}"</strong>{' '}
                  ของคุณโดยอัตโนมัติ
                </span>
              </label>
            )}

            {editingRecord && !isAuthenticated && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>ต้องเข้าสู่ระบบผ่าน Email ก่อนบันทึกการแก้ไข</span>
                </div>
                <div>
                  เนื่องจากคุณกำลังแก้ไขข้อมูลที่มีอยู่ในฐานข้อมูล ระบบจึงจำเป็นต้องให้ยืนยันตัวตนผ่าน Email (บัญชี Google) ก่อนบันทึกข้อมูล
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              {editingRecord && !isAuthenticated ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (onLogin) {
                      await onLogin();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบด้วย Google เพื่อบันทึก</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการบันทึก'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
