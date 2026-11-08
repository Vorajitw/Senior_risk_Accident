export type QuestionType = 'RADIO' | 'CHECKBOX' | 'TEXT' | 'DATE';

export interface QuestionDefinition {
  id: string;
  code: string;
  section: 1 | 2 | 3 | 4 | 5;
  dimension?: 1 | 2 | 3 | 4 | 5 | 6;
  dimensionLabel?: string;
  title: string;
  required: boolean;
  type: QuestionType;
  placeholder?: string;
  options?: string[];
  helperText?: string;
}

export interface SectionDefinition {
  id: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  description: string;
}

export const SECTIONS: SectionDefinition[] = [
  {
    id: 1,
    title: 'Section 1: ข้อมูลผู้ประเมินและการลงชื่อ (Evaluator Profile)',
    subtitle: 'ระบุบทบาท ชื่อผู้ประเมิน และวันที่ลงพื้นที่คัดกรอง',
    description: 'ส่วนที่ 1 สำหรับเจ้าหน้าที่ผู้ลงพื้นที่บันทึกข้อมูลการคัดกรองความเสี่ยงการข้ามถนนของผู้สูงอายุ',
  },
  {
    id: 2,
    title: 'Section 2: ข้อมูลส่วนบุคคล ประวัติกลุ่มเสี่ยง และพิกัดบ้าน (Senior Profile & GPS)',
    subtitle: 'ข้อมูลทั่วไปของผู้สูงอายุ สถานะการอยู่อาศัย และพิกัดบ้านสำหรับระบบ GIS',
    description: 'ส่วนที่ 2 บันทึกข้อมูลประชากรและพิกัดละติจูด/ลองจิจูดเพื่อนำไปปักหมุดบนแผนที่ชุมชน',
  },
  {
    id: 3,
    title: 'Section 3: ประวัติสุขภาพ อุบัติเหตุ และพฤติกรรมการข้าม (Medical & Exposure Profile)',
    subtitle: 'โรคประจำตัว การใช้ยา อุปกรณ์ช่วยเดิน และความถี่ในการข้ามถนน 4 เลน',
    description: 'ส่วนที่ 3 ประเมินปัจจัยเสี่ยงด้านสุขภาพและพฤติกรรมการเดินข้ามถนนในชีวิตประจำวัน',
  },
  {
    id: 4,
    title: 'Section 4: แบบประเมินความเสี่ยง 6 มิติ (6-Dimension Checklist with Scores)',
    subtitle: 'ประเมินเชิงลึก 14 ข้อ ครอบคลุม 6 มิติ พร้อมคำนวณคะแนนอัตโนมัติ',
    description: 'ส่วนที่ 4 ตัวเลขในวงเล็บ (0), (1), (2), (3) ใช้สำหรับสกัดคะแนนรวมและตัดเกรดสัญญาณไฟจราจรชีวิตอัตโนมัติใน Google Sheets',
  },
  {
    id: 5,
    title: 'Section 5: การส่งต่อและมาตรการช่วยเหลือ (Action & Evaluator Plan)',
    subtitle: 'วางแผนส่งต่อทางการแพทย์ มาตรการคุ้มครองรายบุคคล และการติดตามผลเชิงพื้นที่',
    description: 'ส่วนที่ 5 สรุปแนวทางช่วยเหลือและส่งต่อข้อมูลให้ทีมสหวิชาชีพในพื้นที่',
  },
];

export const QUESTIONS: QuestionDefinition[] = [
  // ================= SECTION 1 =================
  {
    id: 'q1_1',
    code: '1.1',
    section: 1,
    title: '1.1 บทบาท/ตำแหน่งของผู้ประเมิน',
    required: true,
    type: 'RADIO',
    options: [
      'อสม. (อาสาสมัครสาธารณสุขประจำหมู่บ้าน)',
      'เจ้าหน้าที่ รพ.สต. / สาธารณสุข',
      'เจ้าหน้าที่ตำรวจ',
      'ผู้ใหญ่บ้าน / ผู้ช่วยผู้ใหญ่บ้าน',
    ],
  },
  {
    id: 'q1_2',
    code: '1.2',
    section: 1,
    title: '1.2 ชื่อ-นามสกุล ผู้ประเมิน',
    required: true,
    type: 'TEXT',
    placeholder: 'เช่น นางสมศรี ใจดี',
  },
  {
    id: 'q1_3',
    code: '1.3',
    section: 1,
    title: '1.3 วันที่ทำการประเมิน',
    required: true,
    type: 'DATE',
  },

  // ================= SECTION 2 =================
  {
    id: 'q2_1',
    code: '2.1',
    section: 2,
    title: '2.1 รหัสประจำตัวผู้สูงอายุ (Senior ID) (ถ้ามี)',
    required: false,
    type: 'TEXT',
    placeholder: 'เช่น SNR-001',
  },
  {
    id: 'q2_2',
    code: '2.2',
    section: 2,
    title: '2.2 ชื่อ-นามสกุล ผู้สูงอายุ',
    required: true,
    type: 'TEXT',
    placeholder: 'เช่น นายบุญมี ศรีสุข',
  },
  {
    id: 'q2_3',
    code: '2.3',
    section: 2,
    title: '2.3 เบอร์โทรศัพท์ติดต่อ / เบอร์โทรผู้ดูแล',
    required: true,
    type: 'TEXT',
    placeholder: 'เช่น 081-234-5678',
  },
  {
    id: 'q2_4',
    code: '2.4',
    section: 2,
    title: '2.4 บ้านเลขที่ / หมู่ที่ / ชุมชน',
    required: true,
    type: 'TEXT',
    placeholder: 'เช่น 124/2 หมู่ที่ 4 ชุมชนบ้านทุ่งโพธิ์',
  },
  {
    id: 'q2_5',
    code: '2.5',
    section: 2,
    title: '2.5 พิกัดละติจูด (Latitude)',
    required: false,
    type: 'TEXT',
    placeholder: 'เช่น 8.43210',
    helperText: 'ระบุทศนิยม 5-6 ตำแหน่ง หรือกดดึงพิกัด GPS ปัจจุบัน',
  },
  {
    id: 'q2_6',
    code: '2.6',
    section: 2,
    title: '2.6 พิกัดลองจิจูด (Longitude)',
    required: false,
    type: 'TEXT',
    placeholder: 'เช่น 99.96543',
    helperText: 'ระบุทศนิยม 5-6 ตำแหน่ง หรือคลิกเลือกบนแผนที่',
  },
  {
    id: 'q2_7',
    code: '2.7',
    section: 2,
    title: '2.7 สถานะการบันทึกพิกัด GPS',
    required: false,
    type: 'RADIO',
    options: [
      'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
      'ยังไม่ได้บันทึกพิกัด (รอปักหมุด)',
    ],
  },
  {
    id: 'q2_8',
    code: '2.8',
    section: 2,
    title: '2.8 เพศ',
    required: false,
    type: 'RADIO',
    options: ['ชาย', 'หญิง'],
  },
  {
    id: 'q2_9',
    code: '2.9',
    section: 2,
    title: '2.9 อายุจริง (ปีบริบูรณ์)',
    required: true,
    type: 'TEXT',
    placeholder: 'ระบุตัวเลขอายุจริง เช่น 74',
    helperText: 'ระบุตัวเลขอายุจริงเป็นปีบริบูรณ์ (เช่น 65, 74, 82) หรือเลือกจากเมนูตัวเลขอายุ',
  },
  {
    id: 'q2_10',
    code: '2.10',
    section: 2,
    title: '2.10 สถานะการอยู่อาศัยและการดูแล',
    required: false,
    type: 'RADIO',
    options: [
      'อาศัยอยู่คนเดียวตามลำพัง (กลุ่มเสี่ยงสูง)',
      'อยู่กับคู่สมรสผู้สูงอายุ',
      'อยู่กับครอบครัว/ลูกหลาน',
      'มีผู้ดูแลหลัก (Caregiver)',
    ],
  },

  // ================= SECTION 3 =================
  {
    id: 'q3_1',
    code: '3.1',
    section: 3,
    title: '3.1 โรคประจำตัวที่กระทบการมองเห็นและการเดิน',
    required: false,
    type: 'CHECKBOX',
    options: [
      'ไม่มีโรคประจำตัวร้ายแรง',
      'โรคหลอดเลือดสมอง (Stroke/อัมพฤกษ์)',
      'พาร์กินสัน/มีอาการสั่น',
      'ข้อเข่าเสื่อม/ปวดข้อ/เคลื่อนไหวลำบาก',
      'ความดันโลหิตสูง/โรคหัวใจ',
      'เบาหวาน (ชาปลายเท้า/น้ำตาลตก)',
      'สมองเสื่อมระยะแรก/หลงลืม (MCI)',
    ],
  },
  {
    id: 'q3_2',
    code: '3.2',
    section: 3,
    title: '3.2 การใช้ยาที่ส่งผลต่อการตอบสนอง',
    required: false,
    type: 'RADIO',
    options: [
      'มียาที่ทานแล้วง่วงซึม/เวียนศีรษะ',
      'ไม่มียาที่ส่งผลกระทบ',
    ],
  },
  {
    id: 'q3_3',
    code: '3.3',
    section: 3,
    title: '3.3 การใช้อุปกรณ์ช่วยเดิน',
    required: false,
    type: 'RADIO',
    options: [
      'ไม่ใช้อุปกรณ์',
      'ใช้ไม้เท้า (Cane/Walker)',
      'ใช้รถเข็น (Wheelchair/Rollator)',
    ],
  },
  {
    id: 'q3_4',
    code: '3.4',
    section: 3,
    title: '3.4 ประวัติอุบัติเหตุบนถนน (ในรอบ 1–3 ปี)',
    required: false,
    type: 'RADIO',
    options: [
      'ไม่เคยมีประวัติ',
      'เคยเกือบถูกชน (Near-Miss)',
      'เคยถูกเฉี่ยว/ชนบาดเจ็บเล็กน้อย-ปานกลาง',
      'เคยถูกชนบาดเจ็บสาหัส/เข้าโรงพยาบาล',
    ],
  },
  {
    id: 'q3_5',
    code: '3.5',
    section: 3,
    title: '3.5 ประวัติการสะดุดล้ม (ในรอบ 1 ปี)',
    required: false,
    type: 'RADIO',
    options: [
      'ไม่เคยล้ม',
      'เคยล้มในบ้าน/รอบบ้าน',
      'เคยสะดุดล้มบนทางเท้า/ขอบทาง/ร่องกลางถนน',
    ],
  },
  {
    id: 'q3_6',
    code: '3.6',
    section: 3,
    title: '3.6 สถิติความถี่ในการเดินข้ามถนน 4 เลนจุดนี้',
    required: false,
    type: 'RADIO',
    options: [
      'ข้ามน้อย (< 3 ครั้ง/สัปดาห์)',
      'ข้ามปานกลาง (1–2 ครั้ง/วัน)',
      'ข้ามบ่อยมาก (≥ 3 ครั้ง/วัน) (เสี่ยงสะสมสูง)',
    ],
  },
  {
    id: 'q3_7',
    code: '3.7',
    section: 3,
    title: '3.7 ช่วงเวลาที่เดินข้ามถนนเป็นประจำ',
    required: false,
    type: 'RADIO',
    options: [
      'กลางวันแดดจัด',
      'เช้ามืด/เย็นชั่วโมงเร่งด่วน',
      'กลางคืน/แสงสลัว (เสี่ยงจากไฟหน้ารถ)',
    ],
  },
  {
    id: 'q3_8',
    code: '3.8',
    section: 3,
    title: '3.8 วัตถุประสงค์หลักในการเดินข้ามถนน',
    required: false,
    type: 'CHECKBOX',
    options: [
      'ไปตลาด/ซื้อของ',
      'ไปวัด/ทำบุญ',
      'ไปพบแพทย์/รพ.สต.',
      'ไปเยี่ยมญาติ/เพื่อนบ้าน',
      'ประกอบอาชีพ/ทำงาน',
    ],
  },
  {
    id: 'q3_9',
    code: '3.9',
    section: 3,
    title: '3.9 ประวัติสุขภาพสายตาและการใส่แว่นตา',
    required: false,
    type: 'RADIO',
    options: [
      'ปกติ/ใส่แว่นข้ามประจำ',
      'มีสายตาผิดปกติแต่ไม่ใส่แว่นข้าม',
      'มีโรคทางตา (ต้อกระจก/ต้อหิน/จอประสาทตาเสื่อม)',
    ],
  },

  // ================= SECTION 4 (6 DIMENSIONS) =================
  {
    id: 'q4_1',
    code: '4.1',
    section: 4,
    dimension: 1,
    dimensionLabel: 'มิติ 1: การมองเห็นและรับรู้แสง (Visual Function)',
    title: '4.1 [มิติ 1] ความคมชัดในการมองเห็น (Visual Acuity)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) มองเห็นภาพรถและขอบทางชัดเจนดี',
      '(1) ภาพเบลอเล็กน้อย / มีสายตาผิดปกติแต่ไม่ใส่แว่นข้าม',
      '(2) ภาพเบลอมัวรุนแรง / เป็นต้อกระจกหรือจอประสาทตาเสื่อม',
    ],
  },
  {
    id: 'q4_2',
    code: '4.2',
    section: 4,
    dimension: 1,
    dimensionLabel: 'มิติ 1: การมองเห็นและรับรู้แสง (Visual Function)',
    title: '4.2 [มิติ 1] ลานสายตามองมุมข้าง (Visual Field)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) มองเห็นรถในลานสายตาด้านข้างได้กว้างปกติ',
      '(1) ลานสายตาแคบลง ต้องหันคอช่วยมากกว่าปกติ',
      '(2) ลานสายตาแคบมาก / เป็นต้อหิน (มองไม่เห็นรถเลนฝั่งไกล/รถพุ่งแซง)',
    ],
  },
  {
    id: 'q4_3',
    code: '4.3',
    section: 4,
    dimension: 1,
    dimensionLabel: 'มิติ 1: การมองเห็นและรับรู้แสง (Visual Function)',
    title: '4.3 [มิติ 1] ความไวต่อแสงจ้าและสภาวะแสงสลัว (Glare & Contrast Sensitivity)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) สู้แสงได้ปกติ มองเห็นรถกลางคืน/ฝนตกได้ชัดเจน',
      '(1) ตาพร่ามัวเมื่อเจอแสงแดดจัดหรือแสงสะท้อน',
      '(2) แพ้แสงจ้าไฟหน้ารถรุนแรง / มองไม่เห็นรถในสภาวะแสงสลัว',
    ],
  },
  {
    id: 'q4_4',
    code: '4.4',
    section: 4,
    dimension: 2,
    dimensionLabel: 'มิติ 2: สมรรถนะทางกายและการเคลื่อนไหว (Physical Mobility)',
    title: '4.4 [มิติ 2] ความเร็วการเดิน 10 เมตร (10-Meter Walk Test)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) เดินเร็วปกติ (> 1.0 m/s)',
      '(1) เดินช้ากว่ามาตรฐานทางข้าม (0.8 – 1.0 m/s)',
      '(2) เดินช้ามาก (< 0.8 m/s) เสี่ยงติดค้างกลางถนน',
    ],
  },
  {
    id: 'q4_5',
    code: '4.5',
    section: 4,
    dimension: 2,
    dimensionLabel: 'มิติ 2: สมรรถนะทางกายและการเคลื่อนไหว (Physical Mobility)',
    title: '4.5 [มิติ 2] เวลาตั้งต้นก่อนก้าวข้าม (Start-up Delay)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) ก้าวข้ามทันทีเมื่อรถว่าง (< 1.5 วินาที)',
      '(1) ตอบสนองช้า/ลังเลเล็กน้อย (1.5 – 2.5 วินาที)',
      '(2) ตอบสนองช้ามาก/ลังเลสูง (> 2.5 วินาที)',
    ],
  },
  {
    id: 'q4_6',
    code: '4.6',
    section: 4,
    dimension: 2,
    dimensionLabel: 'มิติ 2: สมรรถนะทางกายและการเคลื่อนไหว (Physical Mobility)',
    title: '4.6 [มิติ 2] การทรงตัวและการเดินข้ามสะพานคอนกรีต',
    required: true,
    type: 'RADIO',
    options: [
      '(0) เดินบนสะพานคอนกรีตข้ามร่องกลางได้มั่นคง ไม่กลัวล้ม',
      '(1) เดินบนสะพานได้ แต่ก้าวช้า/เกร็งเนื่องจากกลัวล้ม',
      '(2) ก้มมองแต่พื้นเท้าตนเอง / พยายามก้าวลงร่องกลางถนนแทนการใช้สะพาน',
    ],
  },
  {
    id: 'q4_7',
    code: '4.7',
    section: 4,
    dimension: 3,
    dimensionLabel: 'มิติ 3: การรับรู้ความเร็วและการสแกนทัศนวิสัย (Hazard Perception)',
    title: '4.7 [มิติ 3] อคติการประเมินความเร็วรถ (Speed Perception Paradox)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) ประเมินเวลาที่รถจะมาถึง (TTA) ได้แม่นยำ',
      '(1) ไม่กล้าข้ามแม้รถวิ่งช้า (ประเมินความเร็วสูงเกินจริง)',
      '(2) กะข้ามทันเมื่อรถวิ่งเร็ว (> 50 กม./ชม.) (มองแต่ระยะทางไกล)',
    ],
  },
  {
    id: 'q4_8',
    code: '4.8',
    section: 4,
    dimension: 3,
    dimensionLabel: 'มิติ 3: การรับรู้ความเร็วและการสแกนทัศนวิสัย (Hazard Perception)',
    title: '4.8 [มิติ 3] พฤติกรรมการสแกนรถเลนฝั่งไกล (Far-side Scanning)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) กวาดสายตามองสแกนครบทั้งเลนฝั่งใกล้และเลนฝั่งไกล',
      '(1) มองสแกนรถเลนฝั่งไกลเฉพาะเมื่อยืนอยู่บนสะพานกลางถนน',
      '(2) โฟกัสเฉพาะรถเลนฝั่งใกล้ ละเลยการมองรถเลนฝั่งไกล',
    ],
  },
  {
    id: 'q4_9',
    code: '4.9',
    section: 4,
    dimension: 3,
    dimensionLabel: 'มิติ 3: การรับรู้ความเร็วและการสแกนทัศนวิสัย (Hazard Perception)',
    title: '4.9 [มิติ 3] ผลกระทบสิ่งบดบังทัศนวิสัยจากต้นไม้/หญ้าร่องกลาง',
    required: true,
    type: 'RADIO',
    options: [
      '(0) เดินไปชะโงกมองบนสะพานจนเห็นรถชัดเจนก่อนก้าวข้าม',
      '(1) ก้าวลงถนนก่อนแล้วค่อยมองหาจราจรกลางทาง',
      '(2) ก้าวข้ามสุ่มเสี่ยงทันทีโดยไม่สนใจพุ่มไม้/หญ้าที่บดบังสายตา',
    ],
  },
  {
    id: 'q4_10',
    code: '4.10',
    section: 4,
    dimension: 4,
    dimensionLabel: 'มิติ 4: การประมวลผลทางปัญญาและสมาธิ (Cognitive & Attention)',
    title: '4.10 [มิติ 4] ภาระการประมวลผลเมื่อการจราจรซับซ้อน',
    required: true,
    type: 'RADIO',
    options: [
      '(0) ตัดสินใจได้รวดเร็ว มั่นใจ เมื่อจราจรซับซ้อน',
      '(1) เกิดอาการลังเล หยุดๆ ก้าวๆ กลางถนน',
      '(2) ตื่นตระหนก สับสน หรือยืนค้างกลางจราจรสองทิศทาง',
    ],
  },
  {
    id: 'q4_11',
    code: '4.11',
    section: 4,
    dimension: 4,
    dimensionLabel: 'มิติ 4: การประมวลผลทางปัญญาและสมาธิ (Cognitive & Attention)',
    title: '4.11 [มิติ 4] การแบ่งสมาธิขณะเดิน (Dual-Task Cost: Walk & Talk)',
    required: true,
    type: 'RADIO',
    options: [
      '(0) เดินด้วยความเร็วเท่าเดิมแม้มีสิ่งชวนคุย/คิด',
      '(1) ความเร็วการเดินลดลงอย่างเห็นได้ชัดเมื่อต้องพูดคุย',
      '(2) หยุดเดินทันทีเมื่อต้องคิดหรือพูด (Stops Walking)',
    ],
  },
  {
    id: 'q4_12',
    code: '4.12',
    section: 4,
    dimension: 5,
    dimensionLabel: 'มิติ 5: พฤติกรรมกลยุทธ์การข้ามและการตระหนักรู้ตน (Crossing Strategy)',
    title: '4.12 [มิติ 5] การข้าม 2 จังหวะและการใช้สะพานคอนกรีต',
    required: true,
    type: 'RADIO',
    options: [
      '(0) ข้ามแบบ 2 จังหวะ ยืนพักบนสะพานสแกนรถเลนฝั่งไกลก่อนข้ามต่อ',
      '(1) ใช้สะพานคอนกรีต แต่พยายามข้ามรวดเดียว 4 เลนโดยไม่หยุดพัก',
      '(3) ไม่ใช้สะพาน พยายามก้าว/ปีนข้ามร่องกลางถนนลึก 1 เมตรโดยตรง',
    ],
  },
  {
    id: 'q4_13',
    code: '4.13',
    section: 4,
    dimension: 5,
    dimensionLabel: 'มิติ 5: พฤติกรรมกลยุทธ์การข้ามและการตระหนักรู้ตน (Crossing Strategy)',
    title: '4.13 [มิติ 5] การประเมินเวลาเดินข้ามของตนเอง',
    required: true,
    type: 'RADIO',
    options: [
      '(0) ประเมินเวลาตรงกับความเร็วจริงของตนเอง',
      '(1) คิดว่าตนเองเดินไวกว่าความเป็นจริงเล็กน้อย',
      '(2) คิดว่าตนเองเดินไวมาก (ไม่ตระหนักถึงความเสื่อมถอยทางกาย)',
    ],
  },
  {
    id: 'q4_14',
    code: '4.14',
    section: 4,
    dimension: 6,
    dimensionLabel: 'มิติ 6: ความถี่และสภาวะความเสี่ยงสะสม (Cumulative Exposure)',
    title: '4.14 [มิติ 6] อัตราความถี่ในการข้ามและความเสี่ยงสะสม',
    required: true,
    type: 'RADIO',
    options: [
      '(0) ข้ามน้อย (< 3 ครั้ง/สัปดาห์)',
      '(1) ข้ามปานกลาง (1–2 ครั้ง/วัน หรือ 12–50 ครั้ง/เดือน)',
      '(2) ข้ามบ่อยมาก (≥ 3 ครั้ง/วัน) หรือข้ามช่วงกลางคืน/ฝนตกประจำ',
    ],
  },

  // ================= SECTION 5 =================
  {
    id: 'q5_1',
    code: '5.1',
    section: 5,
    title: '5.1 การส่งต่อทางการแพทย์และสายตา',
    required: false,
    type: 'CHECKBOX',
    options: [
      'ส่งพบจักษุแพทย์ (ต้อกระจก/ต้อหิน)',
      'ส่งตัดแว่นสายตาใหม่',
      'ไม่ต้องส่งต่อ',
    ],
  },
  {
    id: 'q5_2',
    code: '5.2',
    section: 5,
    title: '5.2 มาตรการคุ้มครองรายบุคคล',
    required: false,
    type: 'CHECKBOX',
    options: [
      'แต่งตั้งเป็น อสม. แกนนำผู้สูงวัยปลอดภัย',
      'เข้าอบรมทักษะ Hazard Perception / VR',
      'จัดระบบ "เพื่อนช่วยพาข้าม (Pedestrian Companion)"',
    ],
  },
  {
    id: 'q5_3',
    code: '5.3',
    section: 5,
    title: '5.3 การติดตามผลเชิงพื้นที่',
    required: false,
    type: 'CHECKBOX',
    options: [
      'นำพิกัดเข้าระบบแผนที่ GIS ชุมชน',
      'นัดหมายติดตามประเมินผลซ้ำใน 3 เดือน',
    ],
  },
];

export type RiskLevelCode = 'GREEN' | 'YELLOW' | 'RED';

export type HazardPhotoCategory =
  | 'HOUSE_CROSSING'
  | 'CONCRETE_BRIDGE'
  | 'VEGETATION_BLINDSPOT'
  | 'OTHER';

export interface HazardPhotoAttachment {
  id: string;
  category: HazardPhotoCategory;
  categoryLabel: string;
  caption: string;
  dataUrl: string;
  driveFileId?: string;
  driveViewLink?: string;
  capturedAt: string;
}

export interface AssessmentRecord {
  id: string;
  timestamp: string;
  answers: Record<string, string | string[]>;
  totalScore: number;
  dimensionScores: Record<number, number>;
  riskLevel: RiskLevelCode;
  riskLabel: string;
  googleMapsLink: string;
  photos?: HazardPhotoAttachment[];
}

export function extractOptionScore(val: string | string[] | undefined): number {
  if (!val || Array.isArray(val)) return 0;
  const match = val.match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function formatSeniorAge(val: string | string[] | undefined): string {
  if (!val || Array.isArray(val)) return '-';
  const trimmed = String(val).trim();
  if (!trimmed) return '-';
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed} ปี`;
  }
  return trimmed;
}

export function calculateAssessmentMetrics(answers: Record<string, string | string[]>): {
  totalScore: number;
  dimensionScores: Record<number, number>;
  riskLevel: RiskLevelCode;
  riskLabel: string;
  googleMapsLink: string;
} {
  const dimensionScores: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let totalScore = 0;

  for (const q of QUESTIONS) {
    if (q.section === 4 && q.dimension) {
      const score = extractOptionScore(answers[q.id]);
      dimensionScores[q.dimension] = (dimensionScores[q.dimension] || 0) + score;
      totalScore += score;
    }
  }

  const q4_12Score = extractOptionScore(answers['q4_12']);
  let riskLevel: RiskLevelCode = 'GREEN';
  let riskLabel = '🟢 เขียว (ความเสี่ยงต่ำ 0-7 คะแนน)';

  if (totalScore >= 16 || q4_12Score >= 3) {
    riskLevel = 'RED';
    riskLabel = '🔴 แดง (ความเสี่ยงสูง/วิกฤต ≥16 คะแนน)';
  } else if (totalScore >= 8) {
    riskLevel = 'YELLOW';
    riskLabel = '🟡 เหลือง (ความเสี่ยงปานกลาง 8-15 คะแนน)';
  }

  const lat = String(answers['q2_5'] || '').trim();
  const lng = String(answers['q2_6'] || '').trim();
  const googleMapsLink =
    lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : '';

  return {
    totalScore,
    dimensionScores,
    riskLevel,
    riskLabel,
    googleMapsLink,
  };
}

export function buildRecordFromAnswers(
  id: string,
  timestamp: string,
  answers: Record<string, string | string[]>,
  photos: HazardPhotoAttachment[] = []
): AssessmentRecord {
  const metrics = calculateAssessmentMetrics(answers);
  return {
    id,
    timestamp,
    answers,
    ...metrics,
    photos,
  };
}

/**
 * Ensures that all records in the list have globally unique IDs and React keys,
 * deduplicating by ID/name or appending an incremental suffix if a duplicate ID (like SNR-0614) is encountered.
 */
export function ensureUniqueRecordIds(records: AssessmentRecord[]): AssessmentRecord[] {
  const seenIds = new Set<string>();
  const signatureToIndex = new Map<string, number>();
  const uniqueList: AssessmentRecord[] = [];

  for (let idx = 0; idx < records.length; idx++) {
    const rec = records[idx];
    if (!rec) continue;

    // Check signature deduplication (same ID and same senior name)
    const seniorName = String(rec.answers?.['q2_2'] || '').trim();
    const signature = `${rec.id}:::${seniorName}`;
    if (signatureToIndex.has(signature)) {
      const existingIdx = signatureToIndex.get(signature)!;
      const existingRec = uniqueList[existingIdx];
      const existingAddr = String(existingRec.answers?.['q2_4'] || '').trim();
      const incomingAddr = String(rec.answers?.['q2_4'] || '').trim();
      const mergedPhotos =
        rec.photos && rec.photos.length > 0
          ? rec.photos
          : existingRec.photos;

      // Prefer the record with the more detailed address or newer submission while preserving photos and unique id
      if (incomingAddr.length >= existingAddr.length || (rec.photos?.length || 0) > (existingRec.photos?.length || 0)) {
        uniqueList[existingIdx] = {
          ...rec,
          id: existingRec.id,
          photos: mergedPhotos,
        };
      } else if (mergedPhotos && mergedPhotos.length > (existingRec.photos?.length || 0)) {
        uniqueList[existingIdx] = {
          ...existingRec,
          photos: mergedPhotos,
        };
      }
      continue;
    }

    let uniqueId = rec.id || `REC-${idx + 1}`;
    if (seenIds.has(uniqueId)) {
      let suffix = 2;
      while (seenIds.has(`${uniqueId}_${suffix}`)) {
        suffix++;
      }
      uniqueId = `${uniqueId}_${suffix}`;
    }
    seenIds.add(uniqueId);
    signatureToIndex.set(signature, uniqueList.length);

    if (uniqueId !== rec.id) {
      uniqueList.push({
        ...rec,
        id: uniqueId,
      });
    } else {
      uniqueList.push(rec);
    }
  }

  return uniqueList;
}

export function createFieldHazardSvgDataUrl(
  title: string,
  subtitle: string,
  accentHex: string
): string {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 56);
  const safeSub = subtitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 68);
  const safeAccent = accentHex || '#2563eb';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
    <defs>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#eff6ff"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
      <pattern id="gridPat" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.8"/>
      </pattern>
    </defs>
    <!-- Background Canvas -->
    <rect width="480" height="300" fill="url(#skyGrad)"/>
    <rect width="480" height="150" fill="url(#gridPat)"/>

    <!-- Green median grass strip & trees -->
    <rect x="0" y="136" width="480" height="24" fill="#bbf7d0"/>
    <circle cx="50" cy="132" r="18" fill="#4ade80"/>
    <circle cx="85" cy="136" r="14" fill="#22c55e"/>
    <circle cx="395" cy="132" r="18" fill="#4ade80"/>
    <circle cx="430" cy="136" r="15" fill="#22c55e"/>

    <!-- Concrete crossing bridge / pedestrian refuge -->
    <rect x="180" y="128" width="120" height="36" rx="4" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
    <line x1="180" y1="146" x2="300" y2="146" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="240" y="142" text-anchor="middle" fill="#1e40af" font-family="sans-serif" font-size="10" font-weight="bold">สะพานคอนกรีตข้ามร่องกลาง</text>
    <text x="240" y="158" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="9">จุดพักข้าม 2 จังหวะ</text>

    <!-- Asphalt Road Surface -->
    <rect x="0" y="160" width="480" height="140" fill="#475569"/>
    <!-- Road shoulder / curb -->
    <rect x="0" y="160" width="480" height="6" fill="#cbd5e1"/>
    <!-- Yellow center dashed line -->
    <line x1="0" y1="230" x2="480" y2="230" stroke="#facc15" stroke-width="4" stroke-dasharray="24 16"/>

    <!-- Pedestrian Zebra Crossing Stripes -->
    <rect x="205" y="170" width="12" height="50" fill="#ffffff"/>
    <rect x="225" y="170" width="12" height="50" fill="#ffffff"/>
    <rect x="245" y="170" width="12" height="50" fill="#ffffff"/>
    <rect x="265" y="170" width="12" height="50" fill="#ffffff"/>

    <rect x="205" y="240" width="12" height="50" fill="#ffffff"/>
    <rect x="225" y="240" width="12" height="50" fill="#ffffff"/>
    <rect x="245" y="240" width="12" height="50" fill="#ffffff"/>
    <rect x="265" y="240" width="12" height="50" fill="#ffffff"/>

    <!-- Top Info Card -->
    <rect x="14" y="14" width="452" height="96" rx="8" fill="#ffffff" stroke="${safeAccent}" stroke-width="2"/>
    <rect x="26" y="24" width="190" height="20" rx="4" fill="#eff6ff"/>
    <text x="34" y="38" fill="#1d4ed8" font-family="sans-serif" font-size="11" font-weight="bold">📷 ผังจุดเสี่ยงหน้าบ้าน (Section 2)</text>
    <text x="26" y="66" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold">${safeTitle}</text>
    <text x="26" y="88" fill="#475569" font-family="sans-serif" font-size="12">${safeSub}</text>

    <!-- Bottom road label -->
    <rect x="14" y="268" width="150" height="22" rx="4" fill="#1e293b" opacity="0.85"/>
    <text x="24" y="283" fill="#f8fafc" font-family="sans-serif" font-size="10">ถนนชุมชน (4 ช่องจราจร)</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Extracts a Google Drive File ID from any Google Drive / Docs / UserContent URL
 */
export function extractDriveFileId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (
    trimmed.includes('google.com/maps') ||
    trimmed.includes('maps.google') ||
    trimmed.includes('goo.gl/maps') ||
    trimmed.includes('maps.app.goo.gl')
  ) {
    return null;
  }

  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (fileDMatch) return fileDMatch[1];

  const shortDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (
    shortDMatch &&
    (trimmed.includes('drive.google.com') ||
      trimmed.includes('docs.google.com') ||
      trimmed.includes('googleusercontent.com'))
  ) {
    return shortDMatch[1];
  }

  const queryIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (queryIdMatch) return queryIdMatch[1];

  return null;
}

/**
 * Converts a raw URL (including Google Drive share/open/view links) into a direct renderable image URL
 */
export function toRenderableImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const cleaned = rawUrl
    .trim()
    .replace(/^[("'<\s]+|[)"'>\s,;]+$/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('data:image/') || cleaned.startsWith('blob:')) {
    return cleaned;
  }
  const fileId = extractDriveFileId(cleaned);
  if (fileId) {
    // lh3.googleusercontent.com/d/FILE_ID serves direct images reliably without Drive cookie walls
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  }
  return cleaned;
}

/**
 * Returns an ordered list of candidate image URLs to try in <img src="..."> with automatic fallback
 */
export function getImageFallbackCandidates(photo: {
  dataUrl?: string;
  driveViewLink?: string;
  driveFileId?: string;
}): string[] {
  const candidates: string[] = [];
  const addUnique = (url: string | undefined) => {
    if (!url) return;
    const trimmed = url.trim();
    if (trimmed && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  if (
    photo.dataUrl &&
    (photo.dataUrl.startsWith('data:image/') || photo.dataUrl.startsWith('blob:'))
  ) {
    addUnique(photo.dataUrl);
  }

  const fileId =
    photo.driveFileId ||
    extractDriveFileId(photo.dataUrl || '') ||
    extractDriveFileId(photo.driveViewLink || '');

  if (fileId) {
    addUnique(`https://lh3.googleusercontent.com/d/${fileId}=w1000`);
    addUnique(`https://lh3.googleusercontent.com/d/${fileId}`);
    addUnique(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
    addUnique(`https://drive.google.com/thumbnail?id=${fileId}`);
    addUnique(`https://drive.google.com/uc?export=view&id=${fileId}`);
    addUnique(`https://drive.google.com/uc?id=${fileId}`);
  }

  const isHtmlDriveViewer = (u: string) =>
    u.includes('drive.google.com/file/d/') || u.includes('drive.google.com/open?');

  if (photo.dataUrl && photo.dataUrl.startsWith('http') && !isHtmlDriveViewer(photo.dataUrl)) {
    addUnique(photo.dataUrl);
  }
  if (
    photo.driveViewLink &&
    photo.driveViewLink.startsWith('http') &&
    !isHtmlDriveViewer(photo.driveViewLink)
  ) {
    addUnique(photo.driveViewLink);
  }

  return candidates;
}

function isPhotoColumnHeader(headerText: string): boolean {
  const h = headerText.trim().toLowerCase();
  if (!h) return false;
  // Exclude standard Section 4 questions that happen to mention 'ภาพเบลอ' or 'ทัศนวิสัย'
  if (/^[1-5]\.\d+/.test(h) && !h.includes('แนบ') && !h.includes('ถ่ายภาพ') && !h.includes('photo') && !h.includes('link')) {
    return false;
  }
  return (
    h.includes('photo') ||
    h.includes('image') ||
    h.includes('attachment') ||
    h.includes('ภาพถ่าย') ||
    h.includes('แนบภาพ') ||
    h.includes('รูปถ่าย') ||
    h.includes('รูปหน้าบ้าน') ||
    h.includes('ภาพหน้าบ้าน') ||
    h.includes('จุดข้ามถนนหน้าบ้าน') ||
    h.includes('สภาพแวดล้อมหน้าบ้าน') ||
    h.includes('สภาพแวดล้อมและจุดข้าม') ||
    h.includes('ลิงก์ภาพ') ||
    h.includes('ลิงก์รูป') ||
    h.includes('link ภาพ') ||
    h.includes('link รูป')
  );
}

function isComputedSummaryHeader(headerText: string): boolean {
  const h = headerText.trim().toLowerCase();
  return (
    h.startsWith('total_score') ||
    h.startsWith('risk_level') ||
    h.startsWith('google_maps_link') ||
    h.includes('สำหรับ my maps')
  );
}

/**
 * Maps each QuestionDefinition.id to its 0-based column index in a Google Sheet / Excel header row,
 * accurately handling inserted Section 2 photo columns or renamed headers.
 */
export function mapSheetColumnsToQuestions(headerRow: string[]): Map<string, number> {
  const mapping = new Map<string, number>();
  const usedCols = new Set<number>();

  const normalizedHeaders = headerRow.map((h) => String(h || '').trim());

  // Pass 1: Match by exact question code prefix (e.g., "2.1" but NOT matching "2.10")
  for (const q of QUESTIONS) {
    const escapedCode = q.code.replace('.', '\\.');
    const codeRegex = new RegExp(`^\\s*(?:ข้อ(?:ที่)?\\s*)?${escapedCode}(?!\\d)`);
    const idx = normalizedHeaders.findIndex(
      (h, colIdx) => !usedCols.has(colIdx) && (codeRegex.test(h) || h === q.title)
    );
    if (idx !== -1) {
      mapping.set(q.id, idx);
      usedCols.add(idx);
    }
  }

  // Pass 2: Match remaining questions by core title or common aliases
  const QUESTION_ALIASES: Record<string, string[]> = {
    q2_1: ['senior id', 'senior_id', 'รหัสประจำตัวผู้สูงอายุ'],
    q2_2: ['ชื่อ-นามสกุล ผู้สูงอายุ', 'ชื่อผู้สูงอายุ'],
    q2_3: ['เบอร์โทรศัพท์ติดต่อ', 'เบอร์โทรผู้ดูแล', 'เบอร์โทรศัพท์'],
    q2_4: ['บ้านเลขที่ / หมู่ที่', 'บ้านเลขที่_หมู่บ้าน', 'บ้านเลขที่'],
    q2_5: ['พิกัดละติจูด', 'ละติจูด'],
    q2_6: ['พิกัดลองจิจูด', 'ลองจิจูด'],
    q2_8: ['เพศ'],
    q2_9: ['อายุจริง', 'ช่วงอายุ', 'อายุ (ปี)'],
    q2_10: ['สถานะการอยู่อาศัย'],
  };

  for (const q of QUESTIONS) {
    if (mapping.has(q.id)) continue;
    const coreTitle = q.title.replace(/^[1-5]\.\d+\s*(\[มิติ\s*\d+\]\s*)?/, '').trim();
    const aliases = [coreTitle, ...(QUESTION_ALIASES[q.id] || [])].filter(Boolean);

    const idx = normalizedHeaders.findIndex((h, colIdx) => {
      if (usedCols.has(colIdx) || isPhotoColumnHeader(h) || isComputedSummaryHeader(h)) {
        return false;
      }
      const lowerH = h.toLowerCase();
      return aliases.some((alias) => lowerH.includes(alias.toLowerCase()));
    });

    if (idx !== -1) {
      mapping.set(q.id, idx);
      usedCols.add(idx);
    }
  }

  // Pass 3: Positional fallback (skipping column 0 Timestamp and any photo/computed columns)
  let nextAvailableCol = 1;
  for (const q of QUESTIONS) {
    if (mapping.has(q.id)) {
      const assigned = mapping.get(q.id)!;
      if (assigned >= nextAvailableCol) {
        nextAvailableCol = assigned + 1;
      }
      continue;
    }
    while (
      nextAvailableCol < Math.max(normalizedHeaders.length, QUESTIONS.length + 5) &&
      (usedCols.has(nextAvailableCol) ||
        isPhotoColumnHeader(normalizedHeaders[nextAvailableCol] || '') ||
        isComputedSummaryHeader(normalizedHeaders[nextAvailableCol] || ''))
    ) {
      nextAvailableCol++;
    }
    mapping.set(q.id, nextAvailableCol);
    usedCols.add(nextAvailableCol);
    nextAvailableCol++;
  }

  return mapping;
}

function inferCategoryFromText(text: string): {
  category: HazardPhotoCategory;
  categoryLabel: string;
} {
  const lower = text.toLowerCase();
  if (lower.includes('สะพาน') || lower.includes('ร่องกลาง') || lower.includes('bridge')) {
    return {
      category: 'CONCRETE_BRIDGE',
      categoryLabel: 'สะพานคอนกรีต / ร่องกลางถนนลึก 1 เมตร',
    };
  }
  if (
    lower.includes('ต้นไม้') ||
    lower.includes('พุ่มไม้') ||
    lower.includes('หญ้า') ||
    lower.includes('บดบัง')
  ) {
    return {
      category: 'VEGETATION_BLINDSPOT',
      categoryLabel: 'ต้นไม้ / หญ้าร่องกลางบดบังทัศนวิสัย',
    };
  }
  return {
    category: 'HOUSE_CROSSING',
    categoryLabel: 'ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2)',
  };
}

/**
 * Extracts HazardPhotoAttachment[] from any photo columns or URL cells in a Google Sheets / Excel row.
 * Supports:
 * - Section 2 photo attachment columns ("แนบภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน", etc.)
 * - Photo_Attachments column ("[Category] Caption (URL) | ...")
 * - Google Forms File Upload columns (comma-separated Google Drive URLs)
 * - =IMAGE("...") or =HYPERLINK("...") formulas and cell hyperlinks
 * - Direct image URLs and data:image/ URLs
 */
export function parsePhotosFromSheetRow(
  headerRow: string[],
  row: (string | number)[],
  usedQuestionCols: Set<number>,
  extraCellTexts?: (string | undefined)[],
  seniorNameHint?: string,
  timestampHint?: string
): HazardPhotoAttachment[] {
  const photos: HazardPhotoAttachment[] = [];
  const seenKeys = new Set<string>();
  const maxCols = Math.max(
    headerRow.length,
    row.length,
    extraCellTexts ? extraCellTexts.length : 0
  );

  const isMapsCoordinateLink = (u: string): boolean => {
    const l = u.toLowerCase();
    return (
      l.includes('google.com/maps') ||
      l.includes('maps.google') ||
      l.includes('goo.gl/maps') ||
      l.includes('maps.app.goo.gl')
    );
  };

  const addPhotoAttachment = (
    rawUrl: string | undefined,
    categoryLabelInput: string | undefined,
    captionInput: string | undefined,
    headerText: string
  ) => {
    const cleanedUrl = rawUrl
      ? rawUrl.trim().replace(/^[("'<\s]+|[)"'>\s,;]+$/g, '')
      : '';
    if (cleanedUrl && isMapsCoordinateLink(cleanedUrl)) return;

    const fileId = cleanedUrl ? extractDriveFileId(cleanedUrl) : null;
    const dedupeKey = fileId || cleanedUrl || `${categoryLabelInput || ''}:${captionInput || ''}`;
    if (!dedupeKey || seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);

    const inferred = inferCategoryFromText(
      `${categoryLabelInput || ''} ${captionInput || ''} ${headerText || ''}`
    );
    const categoryLabel =
      categoryLabelInput?.trim() || inferred.categoryLabel;
    const caption =
      captionInput?.trim() ||
      (seniorNameHint
        ? `ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (${seniorNameHint})`
        : 'ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2)');

    const renderableUrl = cleanedUrl
      ? toRenderableImageUrl(cleanedUrl)
      : createFieldHazardSvgDataUrl(
          categoryLabel,
          caption,
          inferred.category === 'CONCRETE_BRIDGE' ? '#d97706' : '#2563eb'
        );

    photos.push({
      id: `SHT-PHOTO-${photos.length + 1}-${fileId ? fileId.slice(0, 8) : Date.now()}`,
      category: inferred.category,
      categoryLabel,
      caption,
      dataUrl: renderableUrl,
      driveFileId: fileId || undefined,
      driveViewLink:
        cleanedUrl && cleanedUrl.startsWith('http')
          ? cleanedUrl
          : fileId
          ? `https://drive.google.com/file/d/${fileId}/view`
          : undefined,
      capturedAt: timestampHint || new Date().toLocaleDateString('th-TH'),
    });
  };

  for (let c = 0; c < maxCols; c++) {
    const headerText = String(headerRow[c] || '').trim();
    if (headerText.toLowerCase().startsWith('google_maps_link')) continue;

    const rawVal = String(row[c] ?? '').trim();
    const extraVal = String(extraCellTexts?.[c] ?? '').trim();
    if (!rawVal && !extraVal) continue;

    const combinedSource =
      extraVal && extraVal !== rawVal ? `${rawVal} ${extraVal}` : rawVal;

    // Normalize bare drive.google.com/... links without https://
    const normalizedText = combinedSource.replace(
      /(^|[\s,;|("'])((?:drive\.google\.com|docs\.google\.com|lh3\.googleusercontent\.com)\/[^\s,;|)"']+)/gi,
      '$1https://$2'
    );

    const isPhotoCol = isPhotoColumnHeader(headerText);
    const urlMatches =
      normalizedText.match(
        /(https?:\/\/[^\s,;|)"'>\]]+|data:image\/[a-zA-Z0-9+.-]+;base64,[^\s,;|)"'>\]]+)/gi
      ) || [];
    const nonMapsUrls = urlMatches.filter((u) => !isMapsCoordinateLink(u));

    // Only process cells that either belong to a Photo Column or contain a non-Maps URL
    if (!isPhotoCol && nonMapsUrls.length === 0) {
      continue;
    }

    // Check if formatted in pipe-separated "[Category] Caption (URL) | ..." format
    if (normalizedText.includes('[') && normalizedText.includes(']')) {
      const segments = normalizedText
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const seg of segments) {
        const segUrls =
          seg
            .match(
              /(https?:\/\/[^\s,;|)"'>\]]+|data:image\/[a-zA-Z0-9+.-]+;base64,[^\s,;|)"'>\]]+)/gi
            )
            ?.filter((u) => !isMapsCoordinateLink(u)) || [];

        const catMatch = seg.match(/^\[([^\]]+)\]\s*(.*)$/);
        const catLabel = catMatch ? catMatch[1].trim() : undefined;
        let restCaption = catMatch ? catMatch[2].trim() : seg;
        // Remove trailing (https://...) from caption
        restCaption = restCaption
          .replace(/\(https?:\/\/[^\s)]+\)/gi, '')
          .replace(/https?:\/\/[^\s)]+/gi, '')
          .trim();

        if (segUrls.length > 0) {
          for (const u of segUrls) {
            addPhotoAttachment(u, catLabel, restCaption, headerText);
          }
        } else if (isPhotoCol && (catLabel || restCaption)) {
          addPhotoAttachment(undefined, catLabel, restCaption, headerText);
        }
      }
      continue;
    }

    // Otherwise extract all non-Maps URLs from the cell
    if (nonMapsUrls.length > 0) {
      // Check if there is human caption text alongside the URL (not a formula like =HYPERLINK or =IMAGE)
      let captionCandidate = rawVal
        .replace(/=?(?:HYPERLINK|IMAGE)\s*\([^)]*\)/gi, '')
        .replace(/https?:\/\/[^\s,;|)"'>\]]+/gi, '')
        .replace(/[,;|()"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!captionCandidate && headerText && !headerText.toLowerCase().startsWith('photo_attachments')) {
        captionCandidate = headerText;
      }

      for (let uIdx = 0; uIdx < nonMapsUrls.length; uIdx++) {
        const u = nonMapsUrls[uIdx];
        const cap =
          nonMapsUrls.length > 1 && captionCandidate
            ? `${captionCandidate} (ภาพที่ ${uIdx + 1})`
            : captionCandidate || undefined;
        addPhotoAttachment(u, undefined, cap, headerText);
      }
    }
  }

  return photos;
}

export const INITIAL_RECORDS: AssessmentRecord[] = [
  buildRecordFromAnswers(
    'REC-001',
    '2026-11-01 08:30:00',
    {
      q1_1: 'อสม. (อาสาสมัครสาธารณสุขประจำหมู่บ้าน)',
      q1_2: 'นางสมศรี รักษ์ถิ่น',
      q1_3: '2026-11-01',
      q2_1: 'SNR-001',
      q2_2: 'นายเปรม ทองคำ',
      q2_3: '081-452-9102',
      q2_4: '142/1 หมู่ที่ 2 ชุมชนโพธิ์เสด็จ',
      q2_5: '8.43210',
      q2_6: '99.96543',
      q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
      q2_8: 'ชาย',
      q2_9: '82',
      q2_10: 'อาศัยอยู่คนเดียวตามลำพัง (กลุ่มเสี่ยงสูง)',
      q3_1: ['ข้อเข่าเสื่อม/ปวดข้อ/เคลื่อนไหวลำบาก', 'เบาหวาน (ชาปลายเท้า/น้ำตาลตก)'],
      q3_2: 'มียาที่ทานแล้วง่วงซึม/เวียนศีรษะ',
      q3_3: 'ใช้ไม้เท้า (Cane/Walker)',
      q3_4: 'เคยเกือบถูกชน (Near-Miss)',
      q3_5: 'เคยสะดุดล้มบนทางเท้า/ขอบทาง/ร่องกลางถนน',
      q3_6: 'ข้ามบ่อยมาก (≥ 3 ครั้ง/วัน) (เสี่ยงสะสมสูง)',
      q3_7: 'เช้ามืด/เย็นชั่วโมงเร่งด่วน',
      q3_8: ['ไปตลาด/ซื้อของ', 'ไปวัด/ทำบุญ', 'ไปพบแพทย์/รพ.สต.'],
      q3_9: 'มีโรคทางตา (ต้อกระจก/ต้อหิน/จอประสาทตาเสื่อม)',
      q4_1: '(2) ภาพเบลอมัวรุนแรง / เป็นต้อกระจกหรือจอประสาทตาเสื่อม',
      q4_2: '(2) ลานสายตาแคบมาก / เป็นต้อหิน (มองไม่เห็นรถเลนฝั่งไกล/รถพุ่งแซง)',
      q4_3: '(2) แพ้แสงจ้าไฟหน้ารถรุนแรง / มองไม่เห็นรถในสภาวะแสงสลัว',
      q4_4: '(2) เดินช้ามาก (< 0.8 m/s) เสี่ยงติดค้างกลางถนน',
      q4_5: '(2) ตอบสนองช้ามาก/ลังเลสูง (> 2.5 วินาที)',
      q4_6: '(2) ก้มมองแต่พื้นเท้าตนเอง / พยายามก้าวลงร่องกลางถนนแทนการใช้สะพาน',
      q4_7: '(2) กะข้ามทันเมื่อรถวิ่งเร็ว (> 50 กม./ชม.) (มองแต่ระยะทางไกล)',
      q4_8: '(2) โฟกัสเฉพาะรถเลนฝั่งใกล้ ละเลยการมองรถเลนฝั่งไกล',
      q4_9: '(1) ก้าวลงถนนก่อนแล้วค่อยมองหาจราจรกลางทาง',
      q4_10: '(2) ตื่นตระหนก สับสน หรือยืนค้างกลางจราจรสองทิศทาง',
      q4_11: '(2) หยุดเดินทันทีเมื่อต้องคิดหรือพูด (Stops Walking)',
      q4_12: '(3) ไม่ใช้สะพาน พยายามก้าว/ปีนข้ามร่องกลางถนนลึก 1 เมตรโดยตรง',
      q4_13: '(1) คิดว่าตนเองเดินไวกว่าความเป็นจริงเล็กน้อย',
      q4_14: '(2) ข้ามบ่อยมาก (≥ 3 ครั้ง/วัน) หรือข้ามช่วงกลางคืน/ฝนตกประจำ',
      q5_1: ['ส่งพบจักษุแพทย์ (ต้อกระจก/ต้อหิน)'],
      q5_2: ['จัดระบบ "เพื่อนช่วยพาข้าม (Pedestrian Companion)"', 'เข้าอบรมทักษะ Hazard Perception / VR'],
      q5_3: ['นำพิกัดเข้าระบบแผนที่ GIS ชุมชน', 'นัดหมายติดตามประเมินผลซ้ำใน 3 เดือน'],
    },
    [
      {
        id: 'PHOTO-001',
        category: 'CONCRETE_BRIDGE',
        categoryLabel: 'สะพานคอนกรีต / ร่องกลางถนนลึก 1 เมตร',
        caption: 'จุดข้ามหน้าบ้านหมู่ 2 ร่องกลางลึก 1 เมตร สะพานคอนกรีตอยู่ห่างออกไป 45 เมตร',
        dataUrl: createFieldHazardSvgDataUrl(
          'จุดเสี่ยง: ร่องกลางถนนลึก 1 เมตร (หน้าบ้านนายเปรม)',
          'สะพานคอนกรีตอยู่ไกล ผู้สูงอายุมักก้าวลงร่องกลางโดยตรง',
          '#dc2626'
        ),
        capturedAt: '2026-11-01 08:28',
      },
      {
        id: 'PHOTO-002',
        category: 'VEGETATION_BLINDSPOT',
        categoryLabel: 'ต้นไม้ / หญ้าร่องกลางบดบังทัศนวิสัย',
        caption: 'พุ่มไม้ร่องกลางสูงประมาณ 1.3 เมตร บังสายตาขณะมองรถเลนฝั่งไกล',
        dataUrl: createFieldHazardSvgDataUrl(
          'จุดเสี่ยง: พุ่มไม้ร่องกลางบดบังสายตา (ข้อ 4.9)',
          'บดบังทัศนวิสัยการสแกนรถทางตรงความเร็วสูง > 60 กม./ชม.',
          '#d97706'
        ),
        capturedAt: '2026-11-01 08:29',
      },
    ]
  ),
  buildRecordFromAnswers(
    'REC-002',
    '2026-11-02 09:15:00',
    {
      q1_1: 'เจ้าหน้าที่ รพ.สต. / สาธารณสุข',
      q1_2: 'น.ส.กานดา พิทักษ์สุข',
      q1_3: '2026-11-02',
      q2_1: 'SNR-002',
      q2_2: 'นางละม่อม ศรีวิชัย',
      q2_3: '089-734-1120',
      q2_4: '88 หมู่ที่ 2 ชุมชนโพธิ์เสด็จ',
      q2_5: '8.43480',
      q2_6: '99.96210',
      q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
      q2_8: 'หญิง',
      q2_9: '74',
      q2_10: 'อยู่กับคู่สมรสผู้สูงอายุ',
      q3_1: ['ความดันโลหิตสูง/โรคหัวใจ', 'ข้อเข่าเสื่อม/ปวดข้อ/เคลื่อนไหวลำบาก'],
      q3_2: 'ไม่มียาที่ส่งผลกระทบ',
      q3_3: 'ไม่ใช้อุปกรณ์',
      q3_4: 'ไม่เคยมีประวัติ',
      q3_5: 'เคยล้มในบ้าน/รอบบ้าน',
      q3_6: 'ข้ามปานกลาง (1–2 ครั้ง/วัน)',
      q3_7: 'กลางวันแดดจัด',
      q3_8: ['ไปตลาด/ซื้อของ', 'ไปเยี่ยมญาติ/เพื่อนบ้าน'],
      q3_9: 'มีสายตาผิดปกติแต่ไม่ใส่แว่นข้าม',
      q4_1: '(1) ภาพเบลอเล็กน้อย / มีสายตาผิดปกติแต่ไม่ใส่แว่นข้าม',
      q4_2: '(1) ลานสายตาแคบลง ต้องหันคอช่วยมากกว่าปกติ',
      q4_3: '(1) ตาพร่ามัวเมื่อเจอแสงแดดจัดหรือแสงสะท้อน',
      q4_4: '(1) เดินช้ากว่ามาตรฐานทางข้าม (0.8 – 1.0 m/s)',
      q4_5: '(1) ตอบสนองช้า/ลังเลเล็กน้อย (1.5 – 2.5 วินาที)',
      q4_6: '(1) เดินบนสะพานได้ แต่ก้าวช้า/เกร็งเนื่องจากกลัวล้ม',
      q4_7: '(1) ไม่กล้าข้ามแม้รถวิ่งช้า (ประเมินความเร็วสูงเกินจริง)',
      q4_8: '(1) มองสแกนรถเลนฝั่งไกลเฉพาะเมื่อยืนอยู่บนสะพานกลางถนน',
      q4_9: '(0) เดินไปชะโงกมองบนสะพานจนเห็นรถชัดเจนก่อนก้าวข้าม',
      q4_10: '(1) เกิดอาการลังเล หยุดๆ ก้าวๆ กลางถนน',
      q4_11: '(1) ความเร็วการเดินลดลงอย่างเห็นได้ชัดเมื่อต้องพูดคุย',
      q4_12: '(1) ใช้สะพานคอนกรีต แต่พยายามข้ามรวดเดียว 4 เลนโดยไม่หยุดพัก',
      q4_13: '(0) ประเมินเวลาตรงกับความเร็วจริงของตนเอง',
      q4_14: '(1) ข้ามปานกลาง (1–2 ครั้ง/วัน หรือ 12–50 ครั้ง/เดือน)',
      q5_1: ['ส่งตัดแว่นสายตาใหม่'],
      q5_2: ['เข้าอบรมทักษะ Hazard Perception / VR'],
      q5_3: ['นำพิกัดเข้าระบบแผนที่ GIS ชุมชน', 'นัดหมายติดตามประเมินผลซ้ำใน 3 เดือน'],
    },
    [
      {
        id: 'PHOTO-003',
        category: 'CONCRETE_BRIDGE',
        categoryLabel: 'สะพานคอนกรีต / ร่องกลางถนนลึก 1 เมตร',
        caption: 'สะพานคอนกรีตหน้าซอย 4 ไม่มีราวกันตก ทำให้ผู้สูงอายุเดินเกร็งและก้าวช้า',
        dataUrl: createFieldHazardSvgDataUrl(
          'สภาพสะพานคอนกรีตข้ามร่องกลาง (ไม่มีราวจับ)',
          'ผู้สูงอายุมีอาการข้อเข่าเสื่อม ก้าวเดินช้าบนแผ่นคอนกรีต',
          '#d97706'
        ),
        capturedAt: '2026-11-02 09:12',
      },
    ]
  ),
  buildRecordFromAnswers('REC-003', '2026-11-03 10:05:00', {
    q1_1: 'ผู้ใหญ่บ้าน / ผู้ช่วยผู้ใหญ่บ้าน',
    q1_2: 'นายวิชัย ชูเกียรติ',
    q1_3: '2026-11-03',
    q2_1: 'SNR-003',
    q2_2: 'นายคล่อง แข็งแรง',
    q2_3: '086-912-3344',
    q2_4: '45/3 หมู่ที่ 1 ชุมชนท่าเรียน',
    q2_5: '8.42950',
    q2_6: '99.96820',
    q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
    q2_8: 'ชาย',
    q2_9: '64',
    q2_10: 'อยู่กับครอบครัว/ลูกหลาน',
    q3_1: ['ไม่มีโรคประจำตัวร้ายแรง'],
    q3_2: 'ไม่มียาที่ส่งผลกระทบ',
    q3_3: 'ไม่ใช้อุปกรณ์',
    q3_4: 'ไม่เคยมีประวัติ',
    q3_5: 'ไม่เคยล้ม',
    q3_6: 'ข้ามน้อย (< 3 ครั้ง/สัปดาห์)',
    q3_7: 'กลางวันแดดจัด',
    q3_8: ['ไปวัด/ทำบุญ'],
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
    q4_11: '(1) ความเร็วการเดินลดลงอย่างเห็นได้ชัดเมื่อต้องพูดคุย',
    q4_12: '(0) ข้ามแบบ 2 จังหวะ ยืนพักบนสะพานสแกนรถเลนฝั่งไกลก่อนข้ามต่อ',
    q4_13: '(0) ประเมินเวลาตรงกับความเร็วจริงของตนเอง',
    q4_14: '(0) ข้ามน้อย (< 3 ครั้ง/สัปดาห์)',
    q5_1: ['ไม่ต้องส่งต่อ'],
    q5_2: ['แต่งตั้งเป็น อสม. แกนนำผู้สูงวัยปลอดภัย'],
    q5_3: ['นำพิกัดเข้าระบบแผนที่ GIS ชุมชน'],
  }),
  buildRecordFromAnswers(
    'REC-004',
    '2026-11-04 14:20:00',
    {
      q1_1: 'เจ้าหน้าที่ตำรวจ',
      q1_2: 'ร.ต.อ.เกรียงไกร สายตรวจ',
      q1_3: '2026-11-04',
      q2_1: 'SNR-004',
      q2_2: 'นางประทุม แก้วมณี',
      q2_3: '084-118-7765',
      q2_4: '210 หมู่ที่ 3 ชุมชนตลาดหัวอิฐ',
      q2_5: '8.43620',
      q2_6: '99.96910',
      q2_7: 'บันทึกพิกัดใน Google Maps / Smart Health App เรียบร้อยแล้ว',
      q2_8: 'หญิง',
      q2_9: '85',
      q2_10: 'อาศัยอยู่คนเดียวตามลำพัง (กลุ่มเสี่ยงสูง)',
      q3_1: ['โรคหลอดเลือดสมอง (Stroke/อัมพฤกษ์)', 'สมองเสื่อมระยะแรก/หลงลืม (MCI)'],
      q3_2: 'มียาที่ทานแล้วง่วงซึม/เวียนศีรษะ',
      q3_3: 'ใช้ไม้เท้า (Cane/Walker)',
      q3_4: 'เคยถูกเฉี่ยว/ชนบาดเจ็บเล็กน้อย-ปานกลาง',
      q3_5: 'เคยสะดุดล้มบนทางเท้า/ขอบทาง/ร่องกลางถนน',
      q3_6: 'ข้ามบ่อยมาก (≥ 3 ครั้ง/วัน) (เสี่ยงสะสมสูง)',
      q3_7: 'กลางคืน/แสงสลัว (เสี่ยงจากไฟหน้ารถ)',
      q3_8: ['ไปตลาด/ซื้อของ', 'ไปพบแพทย์/รพ.สต.'],
      q3_9: 'มีโรคทางตา (ต้อกระจก/ต้อหิน/จอประสาทตาเสื่อม)',
      q4_1: '(2) ภาพเบลอมัวรุนแรง / เป็นต้อกระจกหรือจอประสาทตาเสื่อม',
      q4_2: '(1) ลานสายตาแคบลง ต้องหันคอช่วยมากกว่าปกติ',
      q4_3: '(2) แพ้แสงจ้าไฟหน้ารถรุนแรง / มองไม่เห็นรถในสภาวะแสงสลัว',
      q4_4: '(2) เดินช้ามาก (< 0.8 m/s) เสี่ยงติดค้างกลางถนน',
      q4_5: '(2) ตอบสนองช้ามาก/ลังเลสูง (> 2.5 วินาที)',
      q4_6: '(1) เดินบนสะพานได้ แต่ก้าวช้า/เกร็งเนื่องจากกลัวล้ม',
      q4_7: '(2) กะข้ามทันเมื่อรถวิ่งเร็ว (> 50 กม./ชม.) (มองแต่ระยะทางไกล)',
      q4_8: '(2) โฟกัสเฉพาะรถเลนฝั่งใกล้ ละเลยการมองรถเลนฝั่งไกล',
      q4_9: '(2) ก้าวข้ามสุ่มเสี่ยงทันทีโดยไม่สนใจพุ่มไม้/หญ้าที่บดบังสายตา',
      q4_10: '(2) ตื่นตระหนก สับสน หรือยืนค้างกลางจราจรสองทิศทาง',
      q4_11: '(2) หยุดเดินทันทีเมื่อต้องคิดหรือพูด (Stops Walking)',
      q4_12: '(1) ใช้สะพานคอนกรีต แต่พยายามข้ามรวดเดียว 4 เลนโดยไม่หยุดพัก',
      q4_13: '(2) คิดว่าตนเองเดินไวมาก (ไม่ตระหนักถึงความเสื่อมถอยทางกาย)',
      q4_14: '(2) ข้ามบ่อยมาก (≥ 3 ครั้ง/วัน) หรือข้ามช่วงกลางคืน/ฝนตกประจำ',
      q5_1: ['ส่งพบจักษุแพทย์ (ต้อกระจก/ต้อหิน)', 'ส่งตัดแว่นสายตาใหม่'],
      q5_2: ['จัดระบบ "เพื่อนช่วยพาข้าม (Pedestrian Companion)"'],
      q5_3: ['นำพิกัดเข้าระบบแผนที่ GIS ชุมชน', 'นัดหมายติดตามประเมินผลซ้ำใน 3 เดือน'],
    },
    [
      {
        id: 'PHOTO-004',
        category: 'HOUSE_CROSSING',
        categoryLabel: 'จุดข้ามถนน 4 เลนหน้าบ้านผู้สูงอายุ',
        caption: 'จุดข้ามไปตลาดเช้ามืดหน้าชุมชนตลาดหัวอิฐ แสงสว่างไม่เพียงพอและมีพุ่มไม้บัง',
        dataUrl: createFieldHazardSvgDataUrl(
          'จุดเสี่ยง: ทางข้ามไปตลาดหัวอิฐ (ช่วงเช้ามืด/แสงสลัว)',
          'ไฟส่องสว่างริมทางไม่เพียงพอ เสี่ยงจากแสงไฟหน้ารถพร่ามัว',
          '#dc2626'
        ),
        capturedAt: '2026-11-04 14:18',
      },
    ]
  ),
];

export type RoadHazardType =
  | 'BLIND_SPOT'
  | 'BROKEN_BRIDGE'
  | 'HIGH_SPEED_ZONE'
  | 'POOR_LIGHTING'
  | 'NO_REFUGE_ISLAND';

export type RoadHazardSeverity = 'CRITICAL' | 'WARNING';

export type RoadHazardStatus = 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED';

export const ROAD_HAZARD_TYPE_LABELS: Record<RoadHazardType, string> = {
  BLIND_SPOT: 'พุ่มไม้ / ป้ายโฆษณา / เสาไฟบดบังทัศนวิสัย',
  BROKEN_BRIDGE: 'สะพานคอนกรีตข้ามร่องกลางชำรุด / ไม่มีราวจับ',
  HIGH_SPEED_ZONE: 'จุดรถวิ่งความเร็วสูง (>60 กม./ชม.) ขาดป้ายเตือน',
  POOR_LIGHTING: 'จุดอับแสง / ไฟส่องสว่างริมทางชำรุดช่วงเช้ามืด-ค่ำ',
  NO_REFUGE_ISLAND: 'จุดข้ามถนน 4 เลนไม่มีเกาะกลาง/จุดพักรอ 2 จังหวะ',
};

export const ROAD_HAZARD_STATUS_LABELS: Record<RoadHazardStatus, string> = {
  REPORTED: 'แจ้งจุดเสี่ยงแล้ว (รอดำเนินการ)',
  IN_PROGRESS: 'กำลังประสาน อบต./หมวดทางหลวงแก้ไข',
  RESOLVED: 'ดำเนินการแก้ไขเรียบร้อยแล้ว',
};

export interface RoadHazardPoint {
  id: string;
  title: string;
  type: RoadHazardType;
  severity: RoadHazardSeverity;
  status: RoadHazardStatus;
  lat: number;
  lng: number;
  description: string;
  recommendedAction: string;
  responsibleAgency: string;
  reportedBy: string;
  reportedDate: string;
  photoDataUrl?: string;
  driveFileId?: string;
  driveViewLink?: string;
}

export const INITIAL_ROAD_HAZARDS: RoadHazardPoint[] = [
  {
    id: 'HAZ-001',
    title: 'พุ่มไม้และป้ายร้านค้าบังสายตาทางโค้ง หมู่ 4 ชุมชนโพธิ์เสด็จ',
    type: 'BLIND_SPOT',
    severity: 'CRITICAL',
    status: 'REPORTED',
    lat: 8.43265,
    lng: 99.9659,
    description:
      'กิ่งไม้ริมทางและป้ายไวนิลร้านค้ายื่นบดบังรถทางตรงที่มาด้วยความเร็วสูง ทำให้ผู้สูงอายุมองไม่เห็นรถในระยะปลอดภัย 60 เมตร',
    recommendedAction:
      'ตัดแต่งกิ่งไม้ริมทางทุกเดือน และรื้อถอนป้ายที่ล้ำเขตไหล่ทางก่อนถึงจุดข้าม 50 เมตร',
    responsibleAgency: 'กองช่าง เทศบาล/อบต. และหมวดทางหลวง',
    reportedBy: 'นางสมศรี ใจดี (อสม.)',
    reportedDate: '2026-11-01',
    photoDataUrl: createFieldHazardSvgDataUrl(
      'HAZ-001: พุ่มไม้และป้ายบังสายตาก่อนถึงทางข้าม 30 ม.',
      'บดบังทัศนวิสัยรถทางตรง ผู้สูงอายุต้องก้าวลงผิวจราจรเพื่อชะโงกมอง',
      '#dc2626'
    ),
  },
  {
    id: 'HAZ-002',
    title: 'สะพานคอนกรีตข้ามร่องน้ำกลางถนนแคบและไม่มีราวกันตก (ซอย 4 บ้านสวน)',
    type: 'BROKEN_BRIDGE',
    severity: 'WARNING',
    status: 'IN_PROGRESS',
    lat: 8.43455,
    lng: 99.9631,
    description:
      'แผ่นคอนกรีตข้ามร่องกลางถนนกว้างเพียง 80 ซม. ขอบปูนกะเทาะและไม่มีราวจับ ทำให้ผู้สูงอายุที่มีอาการข้อเข่าเสื่อมไม่กล้าหยุดพักกลางทาง (ข้ามแบบ 2 จังหวะไม่ได้)',
    recommendedAction:
      'ขยายความกว้างแผ่นคอนกรีตข้ามร่องกลาง และติดตั้งเสาราวจับสีเหลืองสะท้อนแสงสำหรับยืนพักสแกนรถเลนฝั่งไกล',
    responsibleAgency: 'หมวดทางหลวง / กองช่าง อบต.',
    reportedBy: 'น.ส.กานดา สุขใจ (รพ.สต.)',
    reportedDate: '2026-11-02',
    photoDataUrl: createFieldHazardSvgDataUrl(
      'HAZ-002: สะพานคอนกรีตข้ามร่องกลางไม่มีราวจับกันตก',
      'เสนอขยายจุดยืนพักกลางถนนเพื่อให้ผู้สูงอายุข้ามแบบ 2 จังหวะได้ปลอดภัย',
      '#d97706'
    ),
  },
  {
    id: 'HAZ-003',
    title: 'จุดอับแสงไฟส่องสว่างริมทางหน้าทางเข้าตลาดเช้ามืดหัวอิฐ',
    type: 'POOR_LIGHTING',
    severity: 'CRITICAL',
    status: 'REPORTED',
    lat: 8.43585,
    lng: 99.96875,
    description:
      'โคมไฟกิ่งริมถนนดับ 3 ต้นติดต่อกัน ช่วงเวลา 05.00–06.00 น. มีผู้สูงอายุเดินข้ามไปตลาดและใส่บาตรจำนวนมาก เสี่ยงต่อการพร่ามัวจากไฟหน้ารถสูง',
    recommendedAction:
      'ซ่อมแซมโคมไฟส่องสว่าง LED เหนือจุดข้ามถนน และติดตั้งไฟกระพริบเตือนคนข้ามถนนพลังงานแสงอาทิตย์',
    responsibleAgency: 'กองช่าง เทศบาล / การไฟฟ้าส่วนภูมิภาค',
    reportedBy: 'ร.ต.อ.เกรียงไกร สายตรวจ',
    reportedDate: '2026-11-04',
    photoDataUrl: createFieldHazardSvgDataUrl(
      'HAZ-003: จุดอับแสงทางข้ามหน้าตลาดหัวอิฐ (05.00-06.00 น.)',
      'ไฟกิ่งริมทางชำรุด 3 จุด เสี่ยงผู้สูงอายุสายตาพร่ามัวจากไฟหน้ารถ',
      '#dc2626'
    ),
  },
  {
    id: 'HAZ-004',
    title: 'ทางตรง 4 เลนรถใช้ความเร็วสูงหน้าวัดท่าเรียน (ติดตั้งป้ายเตือนแล้ว)',
    type: 'HIGH_SPEED_ZONE',
    severity: 'WARNING',
    status: 'RESOLVED',
    lat: 8.42995,
    lng: 99.9678,
    description:
      'ช่วงทางตรงก่อนถึงหน้าวัดมีรถบรรทุกและรถยนต์ใช้ความเร็วเกิน 70 กม./ชม. ในช่วงเวลาทำบุญเช้า',
    recommendedAction:
      'ตีเส้นชะลอความเร็ว (Rumble Strips) และติดตั้งป้ายเตือนระวังผู้สูงอายุข้ามถนน',
    responsibleAgency: 'หมวดทางหลวง และงานจราจร สภ.',
    reportedBy: 'นายวิชัย ชูเกียรติ (ผู้ใหญ่บ้าน)',
    reportedDate: '2026-11-03',
    photoDataUrl: createFieldHazardSvgDataUrl(
      'HAZ-004: ติดตั้งป้ายเตือนและเส้นชะลอความเร็วหน้าวัดท่าเรียนแล้ว',
      'ดำเนินการแก้ไขร่วมกับหมวดทางหลวงและผู้นำชุมชนเรียบร้อย',
      '#16a34a'
    ),
  },
];


