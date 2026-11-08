import React, { useState } from 'react';
import {
  AssessmentRecord,
  SECTIONS,
  QUESTIONS,
} from '../data/assessmentSchema';
import {
  ProvisionedFormInfo,
  ProvisionedSheetInfo,
} from '../services/workspaceService';
import {
  downloadExcelTemplate,
  downloadMyMapsCSV,
  downloadMyMapsKML,
} from '../services/exportService';
import {
  FileSpreadsheet,
  FileText,
  ExternalLink,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  Link2,
  MapPin,
  Upload,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface WorkspaceManagerProps {
  isAuthenticated: boolean;
  userEmail?: string | null;
  records: AssessmentRecord[];
  provisionedForm: ProvisionedFormInfo | null;
  provisionedSheet: ProvisionedSheetInfo | null;
  onLogin: () => Promise<void>;
  onCreateGoogleForm: () => Promise<void>;
  onCreateGoogleSheet: () => Promise<void>;
  onConnectExistingSheet: (spreadsheetId: string) => void;
  onSyncFormResponses: () => Promise<void>;
  onSyncSheetRecords?: () => Promise<number>;
  onImportSpreadsheetFile?: (file: File) => Promise<number>;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  isAuthenticated,
  userEmail,
  records,
  provisionedForm,
  provisionedSheet,
  onLogin,
  onCreateGoogleForm,
  onCreateGoogleSheet,
  onConnectExistingSheet,
  onSyncFormResponses,
  onSyncSheetRecords,
  onImportSpreadsheetFile,
}) => {
  const [confirmAction, setConfirmAction] = useState<
    'CREATE_FORM' | 'CREATE_SHEET' | null
  >(null);
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingSheetInput, setExistingSheetInput] = useState('');
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  const handleConfirmedExecution = async () => {
    if (!confirmAction) return;
    setIsWorking(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (confirmAction === 'CREATE_FORM') {
        await onCreateGoogleForm();
        setStatusMessage(
          'สร้าง Google Form ครบทั้ง 5 ส่วน (30 ข้อ) บนบัญชี Google ของคุณเรียบร้อยแล้ว'
        );
      } else if (confirmAction === 'CREATE_SHEET') {
        await onCreateGoogleSheet();
        setStatusMessage(
          'สร้างไฟล์ Google Sheets (senior_risk_assessment_template) พร้อมสูตรคำนวณคะแนนและตัดเกรดไฟจราจรชีวิตเรียบร้อยแล้ว'
        );
      }
      setConfirmAction(null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google API'
      );
      setConfirmAction(null);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSyncResponses = async () => {
    setIsWorking(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await onSyncFormResponses();
      setStatusMessage('ซิงก์ข้อมูลการตอบกลับจาก Google Form เข้าสู่ระบบและตารางเรียบร้อยแล้ว');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลจาก Google Form ได้'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleSyncFromSheet = async () => {
    if (!onSyncSheetRecords) return;
    setIsWorking(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const count = await onSyncSheetRecords();
      setStatusMessage(
        `ดึงข้อมูลผู้สูงอายุจำนวน ${count} รายการจาก Google Sheets มาแสดงบนแดชบอร์ดและแผนที่ GIS เรียบร้อยแล้ว`
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportSpreadsheetFile) return;
    setIsWorking(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const count = await onImportSpreadsheetFile(file);
      setStatusMessage(
        `นำเข้าไฟล์ "${file.name}" สำเร็จ (${count} รายการ) · แสดงผลบนแดชบอร์ดและแผนที่ GIS เรียบร้อยแล้ว`
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ที่อัปโหลดได้'
      );
    } finally {
      setIsWorking(false);
      e.target.value = '';
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(label);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const handleConnectManualSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = existingSheetInput.trim();
    if (!raw) return;
    // Extract spreadsheetId if full URL is pasted
    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = match ? match[1] : raw;
    onConnectExistingSheet(cleanId);
    setExistingSheetInput('');
    setStatusMessage(`เชื่อมต่อกับ Google Sheets รหัส ${cleanId} เรียบร้อยแล้ว`);
  };

  const formulaTotalScore =
    '=IFERROR(VALUE(MID(X2,2,1)),0)+IFERROR(VALUE(MID(Y2,2,1)),0)+...+IFERROR(VALUE(MID(AK2,2,1)),0)';
  const formulaRiskLevel =
    '=IF(OR(AO2>=16, IFERROR(VALUE(MID(AI2,2,1)),0)>=3), "🔴 แดง (ความเสี่ยงสูง/วิกฤต)", IF(AO2>=8, "🟡 เหลือง (ความเสี่ยงปานกลาง)", "🟢 เขียว (ความเสี่ยงต่ำ)"))';
  const formulaMapsLink =
    '=IF(AND(ISNUMBER(VALUE(I2)), ISNUMBER(VALUE(J2))), "https://www.google.com/maps/search/?api=1&query="&I2&","&J2, "รอระบุพิกัด GPS")';

  if (!isAuthenticated) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl mx-auto my-6 shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
              <span>จำกัดสิทธิ์เฉพาะผู้ลงชื่อเข้าใช้ (Restricted Access)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              ต้องเข้าระบบด้วย Sign in with Google ก่อนเข้าถึงหน้า Google Form & Sheets
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบกำหนดสิทธิ์ให้ผู้ใช้งานต้องลงชื่อเข้าใช้ผ่านบัญชี Google (Sign in with Google) ก่อนเท่านั้น จึงจะสามารถเข้าดูรายละเอียดและใช้งานเครื่องมือสร้าง/เชื่อมต่อ Google Form & Google Sheets ได้
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs text-slate-700">
          <div className="font-bold text-slate-900">
            รายละเอียดและฟีเจอร์ที่จะเปิดให้เข้าถึงหลัง Sign in with Google:
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>
              <strong>01. ระบบสร้าง Google Forms อัตโนมัติ (Forms API v1):</strong> สร้างแบบฟอร์มครบ 5 ส่วน 30 ข้อคำถามลงใน Google Drive และซิงก์คำตอบเข้าตาราง
            </li>
            <li>
              <strong>02. ระบบฐานข้อมูล Google Sheets & สูตรคำนวณ (Sheets API v4):</strong> สร้างหรือเชื่อมต่อสเปรดชีต <code className="font-mono">senior_risk_assessment_template</code> พร้อมผูกสูตรคำนวณอัตโนมัติ
            </li>
            <li>
              <strong>03. ชุดสูตรคำนวณ & ส่งออกพิกัด Google My Maps:</strong> ตรวจสอบรายละเอียดสูตร <code className="font-mono">Total_Score</code>, <code className="font-mono">Risk_Level</code>, <code className="font-mono">Google_Maps_Link</code> และโครงสร้างคำถามทั้ง 30 ข้อ
            </li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            คลิกปุ่มด้านขวาเพื่อเข้าสู่ระบบด้วยบัญชี Google ของคุณและเปิดใช้งานหน้านี้ทันที
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="gsi-material-button shrink-0"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                Sign in with Google เพื่อเข้าใช้งาน
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Status Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ยืนยันตัวตนผ่าน Google แล้ว ({userEmail || 'บัญชี Google'})</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            ศูนย์สร้างและเชื่อมต่อ Google Forms · Google Sheets · ไฟล์แม่แบบ .xlsx
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            สร้างแบบฟอร์ม Google Forms 5 Sections และตาราง Google Sheets พร้อมสูตรคำนวณอัตโนมัติลงในบัญชี Google Drive ของคุณโดยตรง หรือดาวน์โหลดไฟล์แม่แบบไปใช้งานทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onImportSpreadsheetFile && (
            <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0">
              <Upload className="w-4 h-4" />
              <span>นำเข้าไฟล์ Excel / CSV (.xlsx, .csv)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => downloadExcelTemplate(records)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด senior_risk_assessment_template.xlsx</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-2.5 text-xs font-medium text-emerald-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2.5 text-xs font-medium text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Two-Column Action Grid: Google Forms & Google Sheets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Google Forms API Auto-Builder */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">
                01. ระบบสร้าง Google Forms อัตโนมัติ (Forms API v1)
              </span>
              <FileText className="w-5 h-5 text-blue-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              สร้างแบบฟอร์ม Google Forms ครบ 5 หน้า (5 Sections · 30 ข้อ)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะสร้างแบบฟอร์มใน Google Forms ของคุณโดยแบ่งเป็น 5 หน้า (Sections) เพื่อให้แสดงผลบนหน้าจอมือถือของ อสม. และเจ้าหน้าที่ได้อย่างสวยงาม พร้อมใส่คะแนนในวงเล็บ <code className="font-mono">(0)</code>, <code className="font-mono">(1)</code>, <code className="font-mono">(2)</code>, <code className="font-mono">(3)</code> ใน Section 4 ครบทุกข้อ
            </p>

            {provisionedForm ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                <div className="font-bold text-slate-900">
                  แบบฟอร์มที่สร้างแล้ว: {provisionedForm.title}
                </div>
                <div className="text-slate-500 font-mono">
                  Form ID: {provisionedForm.formId} · สร้างเมื่อ {provisionedForm.createdAt}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={provisionedForm.responderUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800"
                  >
                    <span>เปิดหน้าแบบฟอร์มสำหรับลงพื้นที่</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={provisionedForm.editUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-800 border border-slate-300 font-semibold rounded hover:bg-slate-50"
                  >
                    <span>แก้ไขใน Google Forms</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleSyncResponses}
                    disabled={isWorking}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 border border-blue-300 font-semibold rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ซิงก์คำตอบล่าสุดเข้าตาราง</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">
                  โครงสร้าง 5 Sections ที่จะถูกสร้างอัตโนมัติ:
                </div>
                <div>· Section 1: ข้อมูลผู้ประเมินและการลงชื่อ (ข้อ 1.1 – 1.3)</div>
                <div>· Section 2: ข้อมูลส่วนบุคคล ประวัติกลุ่มเสี่ยง และพิกัด GPS (ข้อ 2.1 – 2.10)</div>
                <div>· Section 3: ประวัติสุขภาพ อุบัติเหตุ และพฤติกรรมการข้าม (ข้อ 3.1 – 3.9)</div>
                <div>· Section 4: แบบประเมินความเสี่ยง 6 มิติ พร้อมรหัสคะแนน (ข้อ 4.1 – 4.14)</div>
                <div>· Section 5: การส่งต่อและมาตรการช่วยเหลือ (ข้อ 5.1 – 5.3)</div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setConfirmAction('CREATE_FORM')}
                disabled={isWorking}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {provisionedForm
                    ? 'สร้าง Google Form 5 ส่วนชุดใหม่อีกครั้ง'
                    : 'สร้าง Google Form 5 ส่วนอัตโนมัติในบัญชีของฉัน'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200"
              >
                <span>เข้าสู่ระบบด้วย Google เพื่อสร้าง Google Form อัตโนมัติ</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Google Sheets API Auto-Builder & Connector */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">
                02. ระบบฐานข้อมูล Google Sheets & สูตรคำนวณอัตโนมัติ (Sheets API v4)
              </span>
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              สร้างหรือเชื่อมต่อไฟล์ <code className="font-mono">senior_risk_assessment_template</code>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              สร้างสเปรดชีตใน Google Drive พร้อมแผ่นงาน <code className="font-mono">ข้อมูลการประเมิน (Responses)</code> ที่ผูกสูตรสกัดคะแนนรวม (<code className="font-mono">Total_Score</code>), ระดับสัญญาณไฟจราจรชีวิต (<code className="font-mono">Risk_Level</code>: 🟢 เขียว / 🟡 เหลือง / 🔴 แดง) และลิงก์แผนที่ (<code className="font-mono">Google_Maps_Link</code>) อัตโนมัติ
            </p>

            {provisionedSheet ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                <div className="font-bold text-slate-900">
                  สเปรดชีตที่เชื่อมต่อแล้ว: {provisionedSheet.title}
                </div>
                <div className="text-slate-500 font-mono">
                  Spreadsheet ID: {provisionedSheet.spreadsheetId}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={provisionedSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800"
                  >
                    <span>เปิดตารางใน Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {onSyncSheetRecords && (
                    <button
                      type="button"
                      onClick={handleSyncFromSheet}
                      disabled={isWorking}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ดึงข้อมูลจาก Google Sheets มาแสดงบนแดชบอร์ด & แผนที่</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleConnectManualSheet}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2"
              >
                <label className="block text-xs font-semibold text-slate-800">
                  หรือเชื่อมต่อกับ Google Sheets ที่มีอยู่แล้วใน Google Drive (วางลิงก์หรือ Spreadsheet ID):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={existingSheetInput}
                    onChange={(e) => setExistingSheetInput(e.target.value)}
                    placeholder="วาง URL ของ Google Sheets หรือ Spreadsheet ID..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>เชื่อมต่อชีต</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setConfirmAction('CREATE_SHEET')}
                disabled={isWorking}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {provisionedSheet
                    ? 'สร้างไฟล์ Google Sheets ชุดใหม่พร้อมข้อมูลปัจจุบัน'
                    : 'สร้างไฟล์ Google Sheets พร้อมสูตรคำนวณอัตโนมัติ'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200"
              >
                <span>เข้าสู่ระบบด้วย Google เพื่อสร้าง Google Sheets อัตโนมัติ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formula Reference & Google My Maps Export Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Formula Reference Box */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ชุดสูตรคำนวณอัตโนมัติใน Google Sheets / Excel
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              สูตรเหล่านี้ถูกฝังไว้ในไฟล์ <code className="font-mono">senior_risk_assessment_template.xlsx</code> และชีตที่สร้างจากระบบโดยอัตโนมัติ
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  1. สูตรคำนวณคะแนนรวม 6 มิติ (Total_Score - คอลัมน์ AO)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(formulaTotalScore, 'TOTAL')}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedFormula === 'TOTAL' ? 'คัดลอกแล้ว' : 'คัดลอกสูตร'}</span>
                </button>
              </div>
              <code className="block font-mono text-[11px] text-slate-700 break-all">
                {formulaTotalScore}
              </code>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  2. สูตรตัดเกรดสัญญาณไฟจราจรชีวิต (Risk_Level - คอลัมน์ AP)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(formulaRiskLevel, 'RISK')}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedFormula === 'RISK' ? 'คัดลอกแล้ว' : 'คัดลอกสูตร'}</span>
                </button>
              </div>
              <code className="block font-mono text-[11px] text-slate-700 break-all">
                {formulaRiskLevel}
              </code>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  3. สูตรสร้างลิงก์กดปักหมุดแผนที่ (Google_Maps_Link - คอลัมน์ AT)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(formulaMapsLink, 'MAPS')}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedFormula === 'MAPS' ? 'คัดลอกแล้ว' : 'คัดลอกสูตร'}</span>
                </button>
              </div>
              <code className="block font-mono text-[11px] text-slate-700 break-all">
                {formulaMapsLink}
              </code>
            </div>
          </div>
        </div>

        {/* Google My Maps Export Box */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                ส่งออกพิกัดสำหรับ Google My Maps (ปักหมุดแยกสี 🟢-🟡-🔴)
              </h3>
              <MapPin className="w-5 h-5 text-blue-700" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              นอกจากการดึงไฟล์ <code className="font-mono">senior_risk_assessment_template.xlsx</code> จาก Google Drive เข้าสู่ Google My Maps โดยตรงแล้ว คุณยังสามารถดาวน์โหลดไฟล์ <strong>KML (พร้อมหมุดสีเขียว-เหลือง-แดงสำเร็จรูป)</strong> หรือ <strong>CSV</strong> เพื่อนำเข้าที่{' '}
              <a
                href="https://mymaps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline font-semibold"
              >
                mymaps.google.com
              </a>{' '}
              ได้ทันที
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-1.5">
              <div className="font-semibold text-slate-900">
                คอลัมน์มาตรฐานที่เตรียมไว้สำหรับ Google My Maps:
              </div>
              <div>
                · ตำแหน่งหมุดพิกัด: คอลัมน์ <code className="font-mono">Latitude</code> และ <code className="font-mono">Longitude</code>
              </div>
              <div>
                · ชื่อหัวข้อหมุด: คอลัมน์ <code className="font-mono">ชื่อ-นามสกุล</code>
              </div>
              <div>
                · การจัดกลุ่มสีหมุด (Style by data column): คอลัมน์ <code className="font-mono">Risk_Level</code>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => downloadMyMapsKML(records)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกไฟล์ .KML (แยกสีหมุดอัตโนมัติ)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadMyMapsCSV(records)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกไฟล์ .CSV สำหรับ My Maps</span>
            </button>
          </div>
        </div>
      </div>

      {/* Complete 5-Section Structure Blueprint Reference */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              โครงสร้างคำถาม Google Forms ฉบับสมบูรณ์ (ครบทั้ง 5 Sections · 30 ข้อ)
            </h3>
            <p className="text-xs text-slate-600">
              ตรวจสอบรายละเอียดประเภทคำถาม ตัวเลือก และคะแนนในวงเล็บที่ใช้สร้างฟอร์มและตารางคำนวณ
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            รวมทั้งหมด {QUESTIONS.length} ข้อคำถาม
          </span>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((sec) => {
            const qs = QUESTIONS.filter((q) => q.section === sec.id);
            return (
              <div
                key={sec.id}
                className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="font-bold text-sm text-slate-900">
                    {sec.title}
                  </div>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {qs.length} ข้อ
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {qs.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white border border-slate-200 rounded p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {q.title}
                        </span>
                        <span className="text-slate-500 font-mono shrink-0">
                          {q.type === 'RADIO'
                            ? 'Multiple choice'
                            : q.type === 'CHECKBOX'
                            ? 'Checkboxes'
                            : q.type === 'DATE'
                            ? 'Date'
                            : 'Short answer'}
                          {q.required ? ' · Required' : ''}
                        </span>
                      </div>
                      {q.options && (
                        <div className="text-slate-600 space-y-0.5 pl-2 border-l border-slate-200">
                          {q.options.map((opt) => (
                            <div key={opt}>[ ] {opt}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Confirmation Dialog for Workspace API Mutations */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-lg">
            <h4 className="text-base font-bold text-slate-900">
              {confirmAction === 'CREATE_FORM'
                ? 'ยืนยันการสร้าง Google Form 5 ส่วนในบัญชีของคุณ'
                : 'ยืนยันการสร้างไฟล์ Google Sheets ใน Google Drive ของคุณ'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction === 'CREATE_FORM'
                ? `ระบบจะสร้างไฟล์ Google Form ชื่อ "แบบประเมินคัดกรองความเสี่ยงการข้ามถนนของผู้สูงอายุ (ฉบับมาตรฐาน 5 ส่วน 6 มิติ)" พร้อมคำถามทั้ง 30 ข้อในบัญชี Google (${
                    userEmail || 'ของคุณ'
                  })`
                : `ระบบจะสร้างไฟล์ Google Sheets ชื่อ "senior_risk_assessment_template" พร้อมบันทึกข้อมูลเริ่มต้นจำนวน ${
                    records.length
                  } รายการ และผูกสูตรคำนวณคะแนน 6 มิติอัตโนมัติในบัญชี Google (${
                    userEmail || 'ของคุณ'
                  })`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isWorking}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmedExecution}
                disabled={isWorking}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
              >
                {isWorking ? 'กำลังดำเนินการ...' : 'ยืนยันการสร้างไฟล์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
