import React from 'react';
import { AssessmentRecord } from '../data/assessmentSchema';
import {
  downloadExcelTemplate,
  downloadMyMapsCSV,
  downloadMyMapsKML,
} from '../services/exportService';
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Smartphone,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface ManualGuideViewProps {
  isAuthenticated: boolean;
  userEmail?: string | null;
  onLogin: () => Promise<void>;
  records: AssessmentRecord[];
  onSwitchTab: (tab: 'DASHBOARD' | 'FORM' | 'WORKSPACE' | 'GUIDE') => void;
}

export const ManualGuideView: React.FC<ManualGuideViewProps> = ({
  isAuthenticated,
  userEmail,
  onLogin,
  records,
  onSwitchTab,
}) => {
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
              ต้องเข้าระบบด้วย Sign in with Google ก่อนเข้าถึงหน้า คู่มือ & ไฟล์แม่แบบ .xlsx
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบกำหนดสิทธิ์ให้ผู้ใช้งานต้องลงชื่อเข้าใช้ผ่านบัญชี Google (Sign in with Google) ก่อนเท่านั้น จึงจะสามารถเข้าดูรายละเอียดคู่มือปฏิบัติการและดาวน์โหลดไฟล์แม่แบบ{' '}
              <code className="font-mono font-semibold text-slate-800">
                senior_risk_assessment_template.xlsx
              </code>{' '}
              ได้
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs text-slate-700">
          <div className="font-bold text-slate-900">
            รายละเอียดและไฟล์ที่จะเปิดให้เข้าถึงหลัง Sign in with Google:
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>
              <strong>ดาวน์โหลดไฟล์แม่แบบ <code className="font-mono">senior_risk_assessment_template.xlsx</code>:</strong> พร้อมสูตรคำนวณคะแนน 6 มิติ และตัดเกรดสัญญาณไฟจราจรชีวิตอัตโนมัติ
            </li>
            <li>
              <strong>ส่วนที่ 1–2: คู่มือการสร้าง Google Forms 5 ส่วน & การเชื่อมต่อ Google Sheets:</strong> ขั้นตอนการผูกฟอร์มเข้ากับสเปรดชีตใน Google Drive
            </li>
            <li>
              <strong>ส่วนที่ 3: คู่มือการปักหมุด Google My Maps แยกสี 🟢-🟡-🔴:</strong> ขั้นตอนการนำพิกัดไปแชร์ในกลุ่ม Line ชุมชนและดาวน์โหลดไฟล์ KML/CSV
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
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ยืนยันตัวตนผ่าน Google แล้ว ({userEmail || 'บัญชี Google'})</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            คู่มือปฏิบัติการ: การสร้าง Google Forms · การเชื่อมต่อ Google Sheets · การปักหมุด Google My Maps
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            คู่มือฉบับสมบูรณ์สำหรับทีมสหวิชาชีพ (อสม., เจ้าหน้าที่ รพ.สต., ตำรวจ, ผู้ใหญ่บ้าน) ในการนำไฟล์แม่แบบ{' '}
            <code className="font-mono font-semibold text-slate-800">
              senior_risk_assessment_template.xlsx
            </code>{' '}
            ไปเชื่อมต่อกับ Google Forms และปักหมุดพิกัดบ้านผู้สูงอายุกลุ่มเสี่ยงสีแดงรายบ้าน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadExcelTemplate(records)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด senior_risk_assessment_template.xlsx</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchTab('WORKSPACE')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>ไปที่หน้าสร้างฟอร์มอัตโนมัติ (1-Click API)</span>
          </button>
        </div>
      </div>

      {/* Part 1: 5-Section Google Forms Architecture */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-xs font-semibold text-blue-700">
              ส่วนที่ 1: โครงสร้างการสร้าง Google Forms (ครบถ้วน 100%)
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              การจัดแบ่งแบบฟอร์มเป็น 5 หน้า (5 Sections) สำหรับหน้าจอมือถือ
            </h3>
          </div>
          <Smartphone className="w-5 h-5 text-blue-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">Section 1: ข้อมูลผู้ประเมิน</div>
            <p className="text-slate-600 leading-relaxed">
              บทบาทผู้ประเมิน (อสม., รพ.สต., ตำรวจ, ผู้ใหญ่บ้าน), ชื่อ-นามสกุลผู้ประเมิน และวันที่ทำการประเมิน (ข้อ 1.1 – 1.3)
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">Section 2: ข้อมูลผู้สูงอายุ & GPS</div>
            <p className="text-slate-600 leading-relaxed">
              รหัส Senior ID, ชื่อ-นามสกุล, เบอร์โทร, บ้านเลขที่/ชุมชน, พิกัด Latitude/Longitude, สถานะ GPS, เพศ, อายุจริง (ปีบริบูรณ์), การอยู่อาศัย (ข้อ 2.1 – 2.10)
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">Section 3: สุขภาพและพฤติกรรม</div>
            <p className="text-slate-600 leading-relaxed">
              โรคประจำตัว, ยาที่ทานแล้วง่วงซึม, อุปกรณ์ช่วยเดิน, ประวัติอุบัติเหตุ, ประวัติสะดุดล้ม, ความถี่/ช่วงเวลา/วัตถุประสงค์การข้าม, สายตา (ข้อ 3.1 – 3.9)
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">Section 4: ประเมินความเสี่ยง 6 มิติ</div>
            <p className="text-slate-600 leading-relaxed">
              คำถาม 14 ข้อ (ข้อ 4.1 – 4.14) พร้อมรหัสคะแนน <code className="font-mono">(0)</code>, <code className="font-mono">(1)</code>, <code className="font-mono">(2)</code>, <code className="font-mono">(3)</code> ในวงเล็บเพื่อสกัดคะแนนอัตโนมัติ
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">Section 5: การส่งต่อและช่วยเหลือ</div>
            <p className="text-slate-600 leading-relaxed">
              การส่งต่อพบจักษุแพทย์/ตัดแว่น, มาตรการเพื่อนช่วยพาข้าม (Pedestrian Companion) และการนำพิกัดเข้า GIS ติดตามซ้ำใน 3 เดือน (ข้อ 5.1 – 5.3)
            </p>
          </div>
        </div>
      </div>

      {/* Part 2: Connecting Google Forms to Google Drive & Google Sheets */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-xs font-semibold text-emerald-700">
              ส่วนที่ 2: ขั้นตอนการนำไฟล์ไปเชื่อมต่อใน Google Drive และ Google Sheets
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              3 ขั้นตอนเชื่อมต่อ Google Forms เข้ากับไฟล์แม่แบบ <code className="font-mono">senior_risk_assessment_template.xlsx</code>
            </h3>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="font-bold text-sm text-slate-900">
              1. อัปโหลดไฟล์ลง Google Drive
            </div>
            <ul className="space-y-1.5 text-slate-700 leading-relaxed">
              <li>
                · กดปุ่มดาวน์โหลดไฟล์{' '}
                <code className="font-mono font-semibold">
                  senior_risk_assessment_template.xlsx
                </code>{' '}
                จากระบบนี้ลงเครื่องคอมพิวเตอร์
              </li>
              <li>
                · เปิด{' '}
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline font-semibold"
                >
                  Google Drive
                </a>{' '}
                ➔ กดปุ่ม <strong>+ ใหม่ (+ New)</strong> ➔ เลือก{' '}
                <strong>อัปโหลดไฟล์ (File upload)</strong>
              </li>
              <li>
                · คลิกขวาที่ไฟล์ใน Drive เลือก{' '}
                <strong>เปิดด้วย (Open with) ➔ Google สเปรดชีต (Google Sheets)</strong>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="font-bold text-sm text-slate-900">
              2. เชื่อมต่อ Google Form เข้ากับ Google Sheets
            </div>
            <ul className="space-y-1.5 text-slate-700 leading-relaxed">
              <li>
                · เปิดแบบฟอร์ม Google Form ที่สร้างไว้ ➔ ไปที่แถบ{' '}
                <strong>การตอบกลับ (Responses)</strong>
              </li>
              <li>
                · คลิกไอคอนจุดสามจุด <code className="font-mono font-bold">⋮</code> มุมขวาบน ➔ เลือก{' '}
                <strong>เลือกปลายทางของการตอบกลับ (Select response destination)</strong>
              </li>
              <li>
                · เลือก{' '}
                <strong>เลือกสเปรดชีตที่มีอยู่แล้ว (Select existing spreadsheet)</strong>{' '}
                ➔ เลือกไฟล์ <code className="font-mono">senior_risk_assessment_template</code> ที่อัปโหลดไว้
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="font-bold text-sm text-slate-900">
              3. ผลลัพธ์การทำงานอัตโนมัติใน Google Sheets
            </div>
            <ul className="space-y-1.5 text-slate-700 leading-relaxed">
              <li>
                · ข้อมูลจากการตอบแบบฟอร์มจะถูกบันทึกลงในแผ่นงาน{' '}
                <code className="font-mono">ข้อมูลการประเมิน (Responses)</code>
              </li>
              <li>
                · สูตรในคอลัมน์ด้านขวาจะคำนวณคะแนนรวม (<code className="font-mono">Total_Score</code>) และตัดเกรดสัญญาณไฟจราจรชีวิต (<code className="font-mono">Risk_Level</code>) เป็น <strong>🟢 เขียว</strong>, <strong>🟡 เหลือง</strong>, หรือ <strong>🔴 แดง</strong>
              </li>
              <li>
                · พร้อมสร้างลิงก์กดปักหมุดแผนที่ (<code className="font-mono">Google_Maps_Link</code>) ให้โดยอัตโนมัติทันที
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Part 3: Google My Maps Field Deployment */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-xs font-semibold text-blue-700">
              ส่วนที่ 3: การนำไปใช้ปักหมุดติดตามผลในพื้นที่จริง (Google My Maps)
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              5 ขั้นตอนสร้างแผนที่ดิจิทัลแยกสี 🟢-🟡-🔴 สำหรับแชร์เข้ากลุ่ม Line ชุมชน
            </h3>
          </div>
          <MapPin className="w-5 h-5 text-blue-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">ขั้นตอนที่ 1</div>
            <p className="text-slate-700 leading-relaxed">
              เข้าไปที่{' '}
              <a
                href="https://mymaps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline font-semibold inline-flex items-center gap-0.5"
              >
                <span>Google My Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              ➔ กด <strong>+ สร้างแผนที่ใหม่ (Create a new map)</strong>
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">ขั้นตอนที่ 2</div>
            <p className="text-slate-700 leading-relaxed">
              กด <strong>นำเข้า (Import)</strong> ➔ เลือกดึงไฟล์จาก Google Drive (<code className="font-mono">senior_risk_assessment_template.xlsx</code>) หรืออัปโหลดไฟล์ CSV/KML
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">ขั้นตอนที่ 3</div>
            <p className="text-slate-700 leading-relaxed">
              เลือกคอลัมน์ <code className="font-mono font-semibold">Latitude</code> และ{' '}
              <code className="font-mono font-semibold">Longitude</code> สำหรับตำแหน่งหมุด และเลือกคอลัมน์ <code className="font-mono font-semibold">ชื่อ-นามสกุล</code> สำหรับชื่อหัวข้อ
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">ขั้นตอนที่ 4</div>
            <p className="text-slate-700 leading-relaxed">
              ตั้งค่าสีหมุดแยกตามคอลัมน์ <code className="font-mono font-semibold">Risk_Level</code> ➔ หมุดจะแยกสี <strong>🟢-🟡-🔴</strong> ตามระดับความเสี่ยงให้อัตโนมัติ
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="font-bold text-slate-900">ขั้นตอนที่ 5</div>
            <p className="text-slate-700 leading-relaxed">
              กด <strong>แชร์ (Share)</strong> ลิงก์เข้ากลุ่ม Line ชุมชน เพื่อให้ทีมงานเปิดดูบนแอป <strong>Google Maps</strong> ในมือถือขณะลงพื้นที่ดูแลผู้สูงอายุกลุ่มสีแดงรายบ้าน
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              ดาวน์โหลดไฟล์พร้อมนำเข้า Google My Maps ได้ทันทีจากปุ่มด้านขวามือ:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadMyMapsKML(records)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดไฟล์ KML (แยกสีหมุดพร้อมใช้)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadMyMapsCSV(records)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดไฟล์ CSV สำหรับ My Maps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
