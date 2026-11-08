# ระบบคัดกรองและประเมินความเสี่ยงการข้ามถนนของผู้สูงอายุ (Senior Road Crossing Risk Assessment & GIS Platform)

แพลตฟอร์มดิจิทัลสำหรับทีมสหวิชาชีพในพื้นที่ (อสม., รพ.สต., ตำรวจ, ผู้นำชุมชน) เพื่อสร้างและจัดการแบบฟอร์มคัดกรองความเสี่ยงการข้ามถนนของผู้สูงอายุครบทั้ง 5 ส่วน (6 มิติ) เชื่อมต่อกับ Google Forms, Google Sheets, Google Drive และแสดงผลพิกัดบ้านกลุ่มเสี่ยงแบบสัญญาณไฟจราจรชีวิต (เขียว-เหลือง-แดง) บนแผนที่ Google Maps พร้อมส่งออกไฟล์สำหรับ Google My Maps และแม่แบบ `.xlsx` ได้ในคลิกเดียว

### User Review & Critical Decisions

> [!IMPORTANT]
> แผนการพัฒนานี้ได้รวบรวมความต้องการจากคำตอบของคุณเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียดโครงสร้างระบบด้านล่างและกดยืนยันเพื่อเริ่มสร้างระบบ

- **Confirmed Decision 1 (รูปแบบการใช้งานหลัก)**: พัฒนาทั้งระบบสร้าง **Google Form จริงผ่าน Google Forms API** (แบ่ง 5 Sections ครบทุกข้อตามโครงสร้างมาตรฐาน) และ **เว็บฟอร์มประเมินผลภาคสนามในแอป (In-App Mobile-Ready Assessment Form)** ที่ซิงก์ข้อมูลเข้า Google Sheets อัตโนมัติพร้อมกัน
- **Confirmed Decision 2 (การจัดการฐานข้อมูลและไฟล์แม่แบบ)**: รองรับการสร้าง **Google Sheets ใหม่พร้อมสูตรคำนวณคะแนนรวมและตัดเกรดความเสี่ยงอัตโนมัติ** การซิงก์ข้อมูลจาก Google Forms/เว็บแอป รวมถึงปุ่มดาวน์โหลดไฟล์แม่แบบ **`senior_risk_assessment_template.xlsx`** ที่มีชีตข้อมูล สูตรคำนวณครบชุด และคู่มือการเชื่อมต่อลงเครื่องได้ทันที
- **Confirmed Decision 3 (ระบบแผนที่และ GIS ชุมชน)**: แสดงผล **แผนที่ Google Maps แบบโต้ตอบได้ในแอป** ปักหมุดแยกสีตามระดับความเสี่ยง (เขียว-เหลือง-แดง) พร้อมตัวกรองรายหมู่บ้าน/ระดับความเสี่ยง และระบบส่งออกไฟล์ **KML / CSV** เพื่อนำไปใช้ใน **Google My Maps** ได้ทันที

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **One-Click Google Form & Sheets Provisioning**: สร้าง Google Form จริงบนบัญชี Google ของผู้ใช้งานโดยอัตโนมัติ แบ่งเป็น 5 หน้า (Sections) ครอบคลุมคำถามทั้ง 30 ข้อ (ข้อมูลผู้ประเมิน, ข้อมูลผู้สูงอายุและพิกัด GPS, ประวัติสุขภาพและพฤติกรรม, แบบประเมินความเสี่ยง 6 มิติ 14 ข้อพร้อมรหัสคะแนน `(0)`, `(1)`, `(2)`, `(3)` และการส่งต่อมาตรการช่วยเหลือ) พร้อมสร้างไฟล์ Google Sheets ที่ผูกสูตรสกัดคะแนนรวม (`Total Score`), ระดับความเสี่ยง (`Risk Level`: เขียว/เหลือง/แดง) และลิงก์แผนที่ (`Google Maps Link`)
  2. **Field Assessment Web Form**: แบบฟอร์มประเมินภาคสนามแบบ Step-by-Step 5 ขั้นตอนในตัวแอป รองรับการดึงพิกัด GPS ปัจจุบันจากอุปกรณ์มือถือหรือคลิกปักหมุดบนแผนที่ คำนวณคะแนนความเสี่ยง 6 มิติแบบเรียลไทม์ และบันทึกลง Google Sheets โดยตรง
  3. **Template `.xlsx` Generator & Guide**: ดาวน์โหลดไฟล์แม่แบบ `senior_risk_assessment_template.xlsx` ที่บรรจุโครงสร้างคอลัมน์มาตรฐาน สูตรคำนวณ Excel อัตโนมัติ และคู่มือขั้นตอนการเชื่อมต่อ Google Drive, Google Sheets และ Google My Maps แบบทีละขั้นตอน
  4. **Interactive Risk GIS Map & My Maps Exporter**: แผนที่พิกัดบ้านผู้สูงอายุบน Google Maps แสดงหมุดสีเขียว (ความเสี่ยงต่ำ), สีเหลือง (ความเสี่ยงปานกลาง), และสีแดง (ความเสี่ยงสูง/วิกฤต) พร้อมหน้าต่างรายละเอียดรายบุคคล ลิงก์นำทาง และปุ่มส่งออกไฟล์ `.kml` / `.csv` สำหรับนำเข้า Google My Maps
- **Target Audience / Persona**: อสม. (อาสาสมัครสาธารณสุขประจำหมู่บ้าน), เจ้าหน้าที่ รพ.สต./สาธารณสุข, เจ้าหน้าที่ตำรวจจราจร และผู้นำชุมชน (ผู้ใหญ่บ้าน/ผู้ช่วยผู้ใหญ่บ้าน) ที่ลงพื้นที่คัดกรองและติดตามช่วยเหลือผู้สูงอายุริมถนน 4 เลน
- **Key Value**: ลดขั้นตอนการสร้างฟอร์มและผูกสูตรตารางคำนวณที่ซับซ้อนให้เหลือเพียงคลิกเดียว ป้องกันความผิดพลาดในการคิดคะแนน 6 มิติ และช่วยให้ทีมงานเห็นพิกัดบ้านผู้สูงอายุกลุ่มเสี่ยงสีแดงบนแผนที่ได้ทันที

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **เชื่อมต่อบัญชี Google & ตั้งค่าระบบอัตโนมัติ**: ผู้ใช้เข้าสู่ระบบด้วยปุ่ม Sign in with Google จากนั้นกดปุ่มสร้าง Google Form 5 ส่วนและสร้างไฟล์ Google Sheets แม่แบบใน Google Drive หรือดาวน์โหลดไฟล์ `senior_risk_assessment_template.xlsx` ลงเครื่อง
  2. **ประเมินความเสี่ยงภาคสนาม 5 ขั้นตอน**: ผู้ประเมินกรอกข้อมูลผ่านเว็บฟอร์ม 5 ส่วน (หรือเปิดลิงก์ Google Form ที่สร้างไว้) ระบบดึงพิกัด Latitude/Longitude อัตโนมัติ แสดงผลคะแนนรวมและสัญญาณไฟจราจรชีวิตทันทีเมื่อประเมินครบ 6 มิติ และกดยืนยันเพื่อบันทึกลง Google Sheets
  3. **วิเคราะห์ข้อมูลและปักหมุด GIS**: ดูตารางฐานข้อมูลผู้สูงอายุพร้อมคะแนนรายมิติ ดูแผนที่ Google Maps แยกสีตามระดับความเสี่ยง กดดึงข้อมูลคำตอบล่าสุดจาก Google Form เข้าสู่ Google Sheets และส่งออกไฟล์สำหรับ Google My Maps
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Civic Health & Traffic Safety SaaS Workspace — สะอาดตา น่าเชื่อถือ อ่านง่ายแม้ใช้งานกลางแจ้งบนหน้าจอมือถือหรือแท็บเล็ต
  - *Color Palette & Mood*:
    - พื้นหลังหลัก (60% Dominant Neutral): ขาวสะอาด `#FFFFFF` และเทาอ่อน `#F8FAFC` (`bg-slate-50`)
    - พื้นผิวโครงสร้าง (30% Structural Surfaces): การ์ดและตารางพื้นขาวขอบบาง `1px solid #E2E8F0` (`border-slate-200`) ตัวอักษรหลักสีกรมท่าเข้ม `#0F172A` (`text-slate-900`)
    - สีเน้นและสถานะสัญญาณไฟจราจรชีวิต (10% Semantic & Accent):
      - สีหลักของระบบ (Primary Action): น้ำเงินกรมท่า/คราม `#1D4ED8` (`bg-blue-700`)
      - กลุ่มเสี่ยงต่ำ (Green Light): เขียวมรกต `#16A34A` (0–7 คะแนน)
      - กลุ่มเสี่ยงปานกลาง (Yellow Light): เหลืองอำพัน `#D97706` (8–15 คะแนน)
      - กลุ่มเสี่ยงสูง/วิกฤต (Red Light): แดงทับทิม `#DC2626` (16–29 คะแนน หรือมีข้อวิกฤต)
  - *Typography & Hierarchy*:
    - ฟอนต์หัวข้อและโครงสร้าง: `Plus Jakarta Sans` ร่วมกับ `Noto Sans Thai` เพื่อความคมชัดของภาษาไทยและอังกฤษ
    - ฟอนต์ตัวเลขและพิกัด GPS: `JetBrains Mono` (`tabular-nums`) สำหรับแสดงค่าพิกัด Latitude/Longitude คะแนนรายมิติ และสถิติความเสี่ยงให้ตรงหลักเสมอ
  - *Component Styling & Layout*:
    - โครงสร้างหน้าจอแบบ Top Bar Contract (ชื่อระบบด้านซ้าย, เมนูนำทาง 4 แท็บตรงกลาง: แดชบอร์ดและแผนที่ GIS / แบบประเมิน 5 ส่วน / จัดการ Google Form & Sheets / คู่มือและแม่แบบ Excel, และปุ่มเชื่อมต่อบัญชี Google ด้านขวา)
    - พื้นผิวระดับเดียว (Single-Elevation Depth) ด้วยเส้นขอบบาง `1px` ไม่ซ้อนการ์ดหลายชั้น
- **Interactive Feedback & Motion**:
  - แถบความคืบหน้า (Step Progress) สำหรับฟอร์ม 5 ส่วน พร้อมการคำนวณคะแนนสด (Live Score Calculation)
  - หน้าต่างยืนยัน (Confirmation Modal) ก่อนทำการเขียนหรืออัปเดตข้อมูลลง Google Sheets / Google Forms ตามมาตรฐานความปลอดภัยข้อมูลผู้ใช้

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: การสกัดคะแนนอัตโนมัติจากตัวเลือกคำตอบ `(0)`, `(1)`, `(2)`, `(3)`**
  - *Chosen Approach*: กำหนดตัวเลือกคำตอบใน Section 4 ทั้ง 14 ข้อให้ขึ้นต้นด้วยตัวเลขคะแนนในวงเล็บ เช่น `(0) ...`, `(1) ...`, `(2) ...`, `(3) ...` และผูกสูตร Google Sheets / Excel ด้วย `VALUE(MID(cell, 2, 1))` หรือ `REGEXEXTRACT` เพื่อรวมคะแนนทั้ง 14 ข้อและจัดกลุ่มระดับความเสี่ยง (เขียว / เหลือง / แดง) โดยอัตโนมัติ
  - *Why*: ทำให้เมื่อข้อมูลจาก Google Forms ไหลเข้าสู่ Google Sheets ระบบสามารถคำนวณคะแนนได้ทันทีโดยไม่ต้องแปลงค่าด้วยมือ
  - *Alternatives Considered*: การใช้สคริปต์แยกต่างหากหลังส่งฟอร์ม ซึ่งตั้งค่าซับซ้อนกว่าสำหรับเจ้าหน้าที่ในพื้นที่
- **Decision 2: การทำงานร่วมกันระหว่าง Google Forms API, Google Sheets API และการส่งออก `.xlsx`**
  - *Chosen Approach*: ใช้ Google Forms API (`forms.body`, `forms.responses.readonly`) เพื่อสร้างแบบฟอร์ม 5 Sections อัตโนมัติและดึงคำตอบล่าสุด, ใช้ Google Sheets API (`spreadsheets`) เพื่อสร้างตารางฐานข้อมูลพร้อมสูตรคำนวณอัตโนมัติ และสร้างไฟล์ `senior_risk_assessment_template.xlsx` ในฝั่งไคลเอนต์เพื่อให้ดาวน์โหลดไปใช้งานหรืออัปโหลดขึ้น Google Drive ได้ทันที
  - *Why*: ตอบโจทย์ทั้งผู้ใช้ที่ต้องการกดปุ่มสร้างทุกอย่างอัตโนมัติผ่าน API และผู้ใช้ที่ต้องการไฟล์ `.xlsx` สำเร็จรูปไปอัปโหลดตามขั้นตอนในคู่มือ

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                   Top Navigation Bar (3-Zone Contract)                       │
│  [Senior Risk GIS]   [แดชบอร์ด & แผนที่ | ประเมิน 5 ส่วน | สร้าง Form & Sheets | คู่มือ] │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│  1. GIS & Analytics View│ │ 2. 5-Section Assessment │ │ 3. Workspace & Template │
│  - KPI Summary Strip    │ │    Wizard               │ │    Manager              │
│  - Interactive Google   │ │  - Sec 1: ผู้ประเมิน       │ │  - Auto-Create Google   │
│    Map (AdvancedMarkers)│ │  - Sec 2: ข้อมูล & GPS    │ │    Form (5 Sections)    │
│  - Risk Table & Filter  │ │  - Sec 3: สุขภาพ/พฤติกรรม │ │  - Auto-Create Google   │
│  - KML / CSV Exporter   │ │  - Sec 4: ความเสี่ยง 6 มิติ│ │    Sheet + Formulas     │
│    for Google My Maps   │ │  - Sec 5: การส่งต่อ/ดูแล   │ │  - Sync Form Responses  │
│                         │ │  - Live Score & Traffic │ │  - Download .xlsx       │
│                         │ │    Light Grading        │ │    Template & Guide     │
└───────────┬─────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
            │                            │                           │
            └────────────────────────────┼───────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  Client State & Integration Services Layer                   │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌─────────────────┐ │
│  │ Firebase Google OAuth  │  │ Google Workspace APIs  │  │ Excel / KML     │ │
│  │ (In-Memory Token Cache)│  │ - Forms v1 API         │  │ Generator       │ │
│  │                        │  │ - Sheets v4 API        │  │ - .xlsx Builder │ │
│  │                        │  │ - Drive v3 API         │  │ - .kml / .csv   │ │
│  └────────────────────────┘  └────────────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `AssessmentRecord`: เก็บข้อมูลครบทั้ง 5 ส่วน ได้แก่
    - **Section 1**: บทบาทผู้ประเมิน (`evaluatorRole`), ชื่อผู้ประเมิน (`evaluatorName`), วันที่ประเมิน (`assessmentDate`)
    - **Section 2**: รหัสผู้สูงอายุ (`seniorId`), ชื่อ-นามสกุล (`seniorName`), เบอร์โทรศัพท์ (`phone`), บ้านเลขที่/หมู่ที่/ชุมชน (`address`), พิกัดละติจูด (`latitude`), พิกัดลองจิจูด (`longitude`), สถานะ GPS (`gpsStatus`), เพศ (`gender`), ช่วงอายุ (`ageRange`), สถานะการอยู่อาศัย (`livingStatus`)
    - **Section 3**: โรคประจำตัว (`chronicDiseases[]`), การใช้ยา (`medicationEffect`), อุปกรณ์ช่วยเดิน (`walkingAid`), ประวัติอุบัติเหตุ (`accidentHistory`), ประวัติการสะดุดล้ม (`fallHistory`), ความถี่การข้ามถนน (`crossingFrequency`), ช่วงเวลาที่ข้าม (`crossingTime`), วัตถุประสงค์ (`crossingPurpose[]`), สุขภาพสายตา (`visionHistory`)
    - **Section 4 (14 ข้อ จาก 6 มิติ)**: เก็บคำตอบและคะแนนรายข้อ (`q4_1` ถึง `q4_14`), คะแนนรวม (`totalScore`: 0–29 คะแนน), และระดับความเสี่ยง (`riskLevel`: `GREEN` 0–7 คะแนน, `YELLOW` 8–15 คะแนน, `RED` 16–29 คะแนน หรือมีข้อวิกฤต 3 คะแนนในข้อ 4.12)
    - **Section 5**: การส่งต่อทางการแพทย์ (`medicalReferral[]`), มาตรการคุ้มครองรายบุคคล (`protectionPlan[]`), การติดตามผลเชิงพื้นที่ (`spatialFollowUp[]`)
  - `WorkspaceConfig`: เก็บ `formId`, `formResponderUri`, `formEditUri`, `spreadsheetId`, `spreadsheetUrl` และสถานะการซิงก์ข้อมูล

- **Interactive Component & State Mapping**:
  - **5-Section Wizard**: ตรวจสอบความครบถ้วนของข้อมูลจำเป็น (Required fields) ในแต่ละหน้า มีปุ่มดึงพิกัด GPS ปัจจุบันจากเบราว์เซอร์ (`navigator.geolocation`) หรือคลิกเลือกตำแหน่งบ้านบนแผนที่ย่อ คำนวณคะแนนรวมทั้ง 6 มิติทันทีที่เลือกคำตอบ และแสดงกล่องยืนยันก่อนบันทึกข้อมูลลง Google Sheets
  - **Google Forms & Sheets Provisioner**: เมื่อผู้ใช้กดสร้างแบบฟอร์ม ระบบจะแสดงหน้าต่างยืนยัน จากนั้นเรียก `POST https://forms.googleapis.com/v1/forms` เพื่อสร้างฟอร์มและเรียก `:batchUpdate` เพื่อเพิ่ม `pageBreakItem` และคำถามครบทั้ง 5 Sections ตามลำดับข้อ 1.1–5.3 พร้อมเรียก `POST https://sheets.googleapis.com/v4/spreadsheets` เพื่อสร้างชีต `ข้อมูลการประเมิน (Responses)` ที่ใส่หัวตารางและสูตรคำนวณ `Total Score`, `Risk Level` (🟢 เขียว / 🟡 เหลือง / 🔴 แดง), และ `Google Maps Link` อัตโนมัติ
  - **Interactive GIS Map (`@vis.gl/react-google-maps`)**: แสดงหมุด `AdvancedMarkerElement` แยกสีตาม `riskLevel` คลิกที่หมุดเพื่อเปิด InfoWindow ดูโปรไฟล์ผู้สูงอายุ คะแนน 6 มิติ แผนการช่วยเหลือ และปุ่มเปิดนำทางใน Google Maps

- **Key Sequences & Integrations**:
  - **Google Workspace OAuth Scopes**:
    - `https://www.googleapis.com/auth/forms.body` (สร้างและตั้งค่าโครงสร้าง Google Form 5 ส่วน)
    - `https://www.googleapis.com/auth/forms.responses.readonly` (ดึงข้อมูลคำตอบจาก Google Form มาซิงก์ลงตารางและแผนที่)
    - `https://www.googleapis.com/auth/spreadsheets` (สร้างและบันทึกข้อมูลประเมินพร้อมสูตรคำนวณใน Google Sheets)
    - `https://www.googleapis.com/auth/drive.file` (จัดการไฟล์แม่แบบและสเปรดชีตที่สร้างโดยแอป)
  - **Google Maps Platform**: ใช้ `@vis.gl/react-google-maps` พร้อม `AdvancedMarkerElement` และ `internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}` สำหรับแสดงพิกัดบ้านผู้สูงอายุและระบบเลือกพิกัดบ้านบนแผนที่
