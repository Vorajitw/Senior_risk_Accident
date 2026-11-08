import * as XLSX from 'xlsx';
import {
  AssessmentRecord,
  QUESTIONS,
  RoadHazardPoint,
  ROAD_HAZARD_TYPE_LABELS,
  ROAD_HAZARD_STATUS_LABELS,
  formatSeniorAge,
  buildRecordFromAnswers,
  mapSheetColumnsToQuestions,
  parsePhotosFromSheetRow,
  ensureUniqueRecordIds,
} from '../data/assessmentSchema';
import { getSheetHeaderRow, colIndexToLetter } from './workspaceService';

/**
 * Generates and downloads `senior_risk_assessment_template.xlsx` with embedded formulas
 * for automatic scoring, traffic-light risk grading, and Google Maps link generation.
 */
export function downloadExcelTemplate(
  records: AssessmentRecord[],
  roadHazards: RoadHazardPoint[] = []
): void {
  const wb = XLSX.utils.book_new();
  const headers = getSheetHeaderRow();

  const sec4StartColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q4_1'); // 23 -> X
  const sec4EndColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q4_14'); // 36 -> AK
  const q4_12ColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q4_12'); // 34 -> AI
  const latColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q2_5'); // 8 -> I
  const lngColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q2_6'); // 9 -> J
  const seniorNameColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q2_2'); // 5 -> F

  const totalScoreColIndex = 1 + QUESTIONS.length; // 40 -> AO
  const riskLevelColIndex = totalScoreColIndex + 1; // 41 -> AP
  const cleanLatColIndex = totalScoreColIndex + 2; // 42 -> AQ
  const cleanLngColIndex = totalScoreColIndex + 3; // 43 -> AR
  const cleanNameColIndex = totalScoreColIndex + 4; // 44 -> AS
  const mapsLinkColIndex = totalScoreColIndex + 5; // 45 -> AT
  const photoColIndex = totalScoreColIndex + 6; // 46 -> AU

  const totalScoreColLetter = colIndexToLetter(totalScoreColIndex);
  const q4_12ColLetter = colIndexToLetter(q4_12ColIndex);
  const latColLetter = colIndexToLetter(latColIndex);
  const lngColLetter = colIndexToLetter(lngColIndex);
  const seniorNameColLetter = colIndexToLetter(seniorNameColIndex);

  const aoa: (string | number)[][] = [headers];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const row: (string | number)[] = [rec.timestamp];
    for (const q of QUESTIONS) {
      const val = rec.answers[q.id];
      row.push(Array.isArray(val) ? val.join(', ') : val ?? '');
    }
    const photoSummary =
      rec.photos && rec.photos.length > 0
        ? rec.photos
            .map((p) => {
              const linkUrl =
                p.driveViewLink ||
                (p.dataUrl && p.dataUrl.startsWith('http') ? p.dataUrl : '');
              return linkUrl
                ? `[${p.categoryLabel}] ${p.caption} (${linkUrl})`
                : `[${p.categoryLabel}] ${p.caption}`;
            })
            .join(' | ')
        : '';

    row.push(
      rec.totalScore,
      rec.riskLabel,
      rec.answers['q2_5'] ? String(rec.answers['q2_5']) : '',
      rec.answers['q2_6'] ? String(rec.answers['q2_6']) : '',
      rec.answers['q2_2'] ? String(rec.answers['q2_2']) : '',
      rec.googleMapsLink,
      photoSummary
    );
    aoa.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Attach live Excel/Google Sheets formulas to rows 2..30 so new rows and existing rows evaluate automatically
  const totalFormulaRows = Math.max(records.length + 15, 25);
  for (let r = 2; r <= totalFormulaRows; r++) {
    const scoreTerms: string[] = [];
    for (let c = sec4StartColIndex; c <= sec4EndColIndex; c++) {
      const colLet = colIndexToLetter(c);
      scoreTerms.push(`IFERROR(VALUE(MID(${colLet}${r},2,1)),0)`);
    }
    const totalScoreFormula = `IF(COUNTA(B${r}:AK${r})=0, "", ${scoreTerms.join('+')})`;
    const riskLevelFormula = `IF(${totalScoreColLetter}${r}="", "", IF(OR(${totalScoreColLetter}${r}>=16, IFERROR(VALUE(MID(${q4_12ColLetter}${r},2,1)),0)>=3), "🔴 แดง (ความเสี่ยงสูง/วิกฤต)", IF(${totalScoreColLetter}${r}>=8, "🟡 เหลือง (ความเสี่ยงปานกลาง)", "🟢 เขียว (ความเสี่ยงต่ำ)")))`;
    const cleanLatFormula = `IF(${latColLetter}${r}="", "", IFERROR(VALUE(${latColLetter}${r}), ${latColLetter}${r}))`;
    const cleanLngFormula = `IF(${lngColLetter}${r}="", "", IFERROR(VALUE(${lngColLetter}${r}), ${lngColLetter}${r}))`;
    const cleanNameFormula = `IF(${seniorNameColLetter}${r}="", "", ${seniorNameColLetter}${r})`;
    const mapsLinkFormula = `IF(OR(${latColLetter}${r}="", ${lngColLetter}${r}=""), "", "https://www.google.com/maps/search/?api=1&query="&${latColLetter}${r}&","&${lngColLetter}${r})`;

    const rec = records[r - 2];

    ws[`${colIndexToLetter(totalScoreColIndex)}${r}`] = {
      t: rec ? 'n' : 's',
      v: rec ? rec.totalScore : '',
      f: totalScoreFormula,
    };
    ws[`${colIndexToLetter(riskLevelColIndex)}${r}`] = {
      t: 's',
      v: rec ? rec.riskLabel : '',
      f: riskLevelFormula,
    };
    ws[`${colIndexToLetter(cleanLatColIndex)}${r}`] = {
      t: 's',
      v: rec ? String(rec.answers['q2_5'] || '') : '',
      f: cleanLatFormula,
    };
    ws[`${colIndexToLetter(cleanLngColIndex)}${r}`] = {
      t: 's',
      v: rec ? String(rec.answers['q2_6'] || '') : '',
      f: cleanLngFormula,
    };
    ws[`${colIndexToLetter(cleanNameColIndex)}${r}`] = {
      t: 's',
      v: rec ? String(rec.answers['q2_2'] || '') : '',
      f: cleanNameFormula,
    };
    ws[`${colIndexToLetter(mapsLinkColIndex)}${r}`] = {
      t: 's',
      v: rec ? rec.googleMapsLink : '',
      f: mapsLinkFormula,
    };
  }

  // Update sheet range so all formula rows are included
  ws['!ref'] = `A1:${colIndexToLetter(photoColIndex)}${totalFormulaRows}`;
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(Math.min(h.length + 6, 38), 18) }));

  XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลการประเมิน (Responses)');

  // Sheet 2: Road Hazard Layer (จุดเสี่ยงบนถนน)
  const hazardHeaders = [
    'รหัสจุดเสี่ยง (Hazard_ID)',
    'ชื่อจุดเสี่ยงบนถนน',
    'ประเภทจุดเสี่ยง',
    'ระดับความรุนแรง',
    'สถานะการแก้ไข',
    'Latitude',
    'Longitude',
    'รายละเอียดปัญหา',
    'ข้อเสนอแนะเชิงวิศวกรรม',
    'หน่วยงานรับผิดชอบ',
    'ผู้แจ้งจุดเสี่ยง',
    'วันที่แจ้ง',
    'Google_Maps_Link',
  ];
  const hazardAoa: (string | number)[][] = [hazardHeaders];
  for (const h of roadHazards) {
    hazardAoa.push([
      h.id,
      h.title,
      ROAD_HAZARD_TYPE_LABELS[h.type] || h.type,
      h.severity === 'CRITICAL' ? 'วิกฤต (ต้องเร่งแก้ไข)' : 'เฝ้าระวัง (ควรปรับปรุง)',
      ROAD_HAZARD_STATUS_LABELS[h.status] || h.status,
      h.lat,
      h.lng,
      h.description,
      h.recommendedAction,
      h.responsibleAgency,
      h.reportedBy,
      h.reportedDate,
      `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`,
    ]);
  }
  const wsHazards = XLSX.utils.aoa_to_sheet(hazardAoa);
  wsHazards['!cols'] = hazardHeaders.map((h) => ({
    wch: Math.max(Math.min(h.length + 8, 42), 18),
  }));
  XLSX.utils.book_append_sheet(wb, wsHazards, 'จุดเสี่ยงบนถนน (Road_Hazards)');

  // Sheet 3: Summary & Guide
  const guideData = [
    ['คู่มือการเชื่อมต่อ Google Forms เข้ากับไฟล์ senior_risk_assessment_template.xlsx และ Google My Maps'],
    [''],
    ['ส่วนที่ 1: ขั้นตอนการนำไฟล์ไปเชื่อมต่อใน Google Drive และ Google Sheets'],
    ['1. อัปโหลดไฟล์ senior_risk_assessment_template.xlsx ลงใน Google Drive (กดปุ่ม + ใหม่ -> อัปโหลดไฟล์)'],
    ['2. คลิกขวาที่ไฟล์ใน Google Drive เลือก "เปิดด้วย (Open with) -> Google สเปรดชีต (Google Sheets)" แล้วกด "ไฟล์ -> บันทึกเป็น Google สเปรดชีต"'],
    ['3. เปิดแบบฟอร์ม Google Form ที่สร้างไว้ -> ไปที่แถบ "การตอบกลับ (Responses)" -> คลิกไอคอนจุดสามจุด (⋮) -> เลือก "เลือกปลายทางของการตอบกลับ (Select response destination)"'],
    ['4. เลือก "เลือกสเปรดชีตที่มีอยู่แล้ว (Select existing spreadsheet)" -> เลือกไฟล์ senior_risk_assessment_template ที่เปิดไว้'],
    [''],
    ['ส่วนที่ 2: การทำงานของสูตรคำนวณอัตโนมัติ (Traffic Light Scoring Engine)'],
    ['- คอลัมน์ Total_Score: สกัดตัวเลขในวงเล็บ (0), (1), (2), (3) จากข้อ 4.1 ถึง 4.14 รวมกันโดยอัตโนมัติ'],
    ['- คอลัมน์ Risk_Level: ตัดเกรดสัญญาณไฟจราจรชีวิตเป็น 🟢 เขียว (0-7 คะแนน), 🟡 เหลือง (8-15 คะแนน), และ 🔴 แดง (≥16 คะแนน หรือข้อ 4.12 ได้ 3 คะแนน)'],
    ['- คอลัมน์ Google_Maps_Link: สร้างลิงก์พิกัดบ้านจาก Latitude และ Longitude เพื่อให้กดนำทางได้ทันที'],
    [''],
    ['ส่วนที่ 3: ขั้นตอนการนำไปปักหมุดใน Google My Maps'],
    ['1. เข้าไปที่ https://mymaps.google.com -> กด "+ สร้างแผนที่ใหม่ (Create a new map)"'],
    ['2. กด "นำเข้า (Import)" -> เลือกดึงไฟล์ senior_risk_assessment_template จาก Google Drive หรืออัปโหลดไฟล์ CSV/KML จากระบบนี้'],
    ['3. เลือกคอลัมน์ Latitude และ Longitude สำหรับตำแหน่งหมุด และเลือกคอลัมน์ ชื่อ-นามสกุล สำหรับชื่อหัวข้อ'],
    ['4. ตั้งค่าสีหมุดแยกตามคอลัมน์ Risk_Level -> หมุดจะแยกสี 🟢-🟡-🔴 ตามระดับความเสี่ยงให้อัตโนมัติ'],
    ['5. กด "แชร์ (Share)" ลิงก์เข้ากลุ่ม Line ชุมชน เพื่อให้ทีมงานเปิดดูบนแอป Google Maps ในมือถือขณะลงพื้นที่'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'คู่มือการตั้งค่า (Manual)');

  XLSX.writeFile(wb, 'senior_risk_assessment_template.xlsx');
}

/**
 * Exports records as a UTF-8 CSV ready for direct import into Google My Maps
 */
export function downloadMyMapsCSV(records: AssessmentRecord[]): void {
  const headers = [
    'Senior_ID',
    'ชื่อ-นามสกุล',
    'Latitude',
    'Longitude',
    'Risk_Level',
    'Total_Score',
    'ช่วงอายุ',
    'เบอร์โทรศัพท์',
    'บ้านเลขที่_หมู่บ้าน',
    'สถานะการอยู่อาศัย',
    'อุปกรณ์ช่วยเดิน',
    'ความถี่การข้ามถนน',
    'การส่งต่อทางการแพทย์',
    'มาตรการคุ้มครองรายบุคคล',
    'ผู้ประเมิน',
    'วันที่ประเมิน',
    'Google_Maps_Link',
    'Photo_Attachments',
  ];

  const escapeCsv = (val: string | number | undefined) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((rec) => {
    const a = rec.answers;
    const photoSummary =
      rec.photos && rec.photos.length > 0
        ? rec.photos
            .map((p) => {
              const linkUrl =
                p.driveViewLink ||
                (p.dataUrl && p.dataUrl.startsWith('http') ? p.dataUrl : '');
              return linkUrl
                ? `[${p.categoryLabel}] ${p.caption} (${linkUrl})`
                : `[${p.categoryLabel}] ${p.caption}`;
            })
            .join(' | ')
        : '';

    return [
      escapeCsv(String(a['q2_1'] || rec.id)),
      escapeCsv(String(a['q2_2'] || '')),
      escapeCsv(String(a['q2_5'] || '')),
      escapeCsv(String(a['q2_6'] || '')),
      escapeCsv(rec.riskLabel),
      escapeCsv(rec.totalScore),
      escapeCsv(formatSeniorAge(a['q2_9'])),
      escapeCsv(String(a['q2_3'] || '')),
      escapeCsv(String(a['q2_4'] || '')),
      escapeCsv(String(a['q2_10'] || '')),
      escapeCsv(String(a['q3_3'] || '')),
      escapeCsv(String(a['q3_6'] || '')),
      escapeCsv(Array.isArray(a['q5_1']) ? a['q5_1'].join('; ') : String(a['q5_1'] || '')),
      escapeCsv(Array.isArray(a['q5_2']) ? a['q5_2'].join('; ') : String(a['q5_2'] || '')),
      escapeCsv(`${a['q1_2'] || ''} (${a['q1_1'] || ''})`),
      escapeCsv(String(a['q1_3'] || '')),
      escapeCsv(rec.googleMapsLink),
      escapeCsv(photoSummary),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'senior_risk_mymaps_import.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports records AND Road Hazard Layer as a KML file with two folders for Google My Maps
 */
export function downloadMyMapsKML(
  records: AssessmentRecord[],
  roadHazards: RoadHazardPoint[] = []
): void {
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const placemarks = records
    .filter((rec) => {
      const lat = Number(rec.answers['q2_5']);
      const lng = Number(rec.answers['q2_6']);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    })
    .map((rec) => {
      const a = rec.answers;
      const lat = Number(a['q2_5']);
      const lng = Number(a['q2_6']);
      const name = escapeXml(String(a['q2_2'] || rec.id));
      const styleUrl =
        rec.riskLevel === 'RED'
          ? '#risk-red'
          : rec.riskLevel === 'YELLOW'
          ? '#risk-yellow'
          : '#risk-green';

      const desc = escapeXml(
        `ระดับความเสี่ยง: ${rec.riskLabel}\n` +
          `คะแนนรวม 6 มิติ: ${rec.totalScore} / 29 คะแนน\n` +
          `บ้านเลขที่/ชุมชน: ${a['q2_4'] || '-'}\n` +
          `เบอร์โทรศัพท์: ${a['q2_3'] || '-'}\n` +
          `สถานะการอยู่อาศัย: ${a['q2_10'] || '-'}\n` +
          `การส่งต่อแพทย์: ${
            Array.isArray(a['q5_1']) ? a['q5_1'].join(', ') : a['q5_1'] || '-'
          }\n` +
          `มาตรการคุ้มครอง: ${
            Array.isArray(a['q5_2']) ? a['q5_2'].join(', ') : a['q5_2'] || '-'
          }\n` +
          `ลิงก์นำทาง: ${rec.googleMapsLink}`
      );

      return `
      <Placemark>
        <name>${name}</name>
        <description>${desc}</description>
        <styleUrl>${styleUrl}</styleUrl>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
      </Placemark>`;
    })
    .join('\n');

  const hazardPlacemarks = roadHazards
    .filter((h) => !isNaN(h.lat) && !isNaN(h.lng) && h.lat !== 0 && h.lng !== 0)
    .map((h) => {
      const name = escapeXml(`[${h.id}] ${h.title}`);
      const styleUrl =
        h.status === 'RESOLVED'
          ? '#risk-green'
          : h.severity === 'CRITICAL'
          ? '#risk-red'
          : '#risk-yellow';
      const desc = escapeXml(
        `ประเภทจุดเสี่ยง: ${ROAD_HAZARD_TYPE_LABELS[h.type] || h.type}\n` +
          `ระดับความรุนแรง: ${h.severity === 'CRITICAL' ? 'จุดเสี่ยงวิกฤต' : 'จุดเฝ้าระวัง'}\n` +
          `สถานะการแก้ไข: ${ROAD_HAZARD_STATUS_LABELS[h.status] || h.status}\n` +
          `รายละเอียดปัญหา: ${h.description}\n` +
          `ข้อเสนอแนะเชิงวิศวกรรม: ${h.recommendedAction}\n` +
          `หน่วยงานรับผิดชอบ: ${h.responsibleAgency}\n` +
          `ผู้แจ้ง: ${h.reportedBy} (${h.reportedDate})`
      );

      return `
      <Placemark>
        <name>${name}</name>
        <description>${desc}</description>
        <styleUrl>${styleUrl}</styleUrl>
        <Point>
          <coordinates>${h.lng},${h.lat},0</coordinates>
        </Point>
      </Placemark>`;
    })
    .join('\n');

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>แผนที่พิกัดบ้านผู้สูงอายุและจุดเสี่ยงบนถนน (Senior Crossing Risk &amp; Road Hazard GIS)</name>
    <Style id="risk-red">
      <IconStyle>
        <color>ff2626dc</color>
        <scale>1.2</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/red-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="risk-yellow">
      <IconStyle>
        <color>ff0677d9</color>
        <scale>1.1</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/yellow-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="risk-green">
      <IconStyle>
        <color>ff4aa316</color>
        <scale>1.0</scale>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/green-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Folder>
      <name>พิกัดบ้านผู้สูงอายุ (Senior Homes Layer)</name>
      ${placemarks}
    </Folder>
    <Folder>
      <name>จุดเสี่ยงบนถนน (Road Hazard Layer)</name>
      ${hazardPlacemarks}
    </Folder>
  </Document>
</kml>`;

  const blob = new Blob([kmlContent], {
    type: 'application/vnd.google-earth.kml+xml;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'senior_risk_mymaps_pins.kml');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseWorkbookToRecords(wb: XLSX.WorkBook): AssessmentRecord[] {
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('ไม่พบแผ่นงานในไฟล์ที่อัปโหลด');
  }

  const ws = wb.Sheets[firstSheetName];
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rows.length <= 1) {
    throw new Error('ไฟล์ไม่มีแถวข้อมูลสำหรับนำเข้า');
  }

  const headerRow = rows[0].map((h) => String(h || '').trim());
  const parsed: AssessmentRecord[] = [];

  // Check if this is a MyMaps summary CSV (has 'Senior_ID' and 'ชื่อ-นามสกุล')
  const isSummaryCsv =
    headerRow.includes('Senior_ID') && headerRow.includes('Latitude');

  const colMapping = mapSheetColumnsToQuestions(headerRow);
  const usedQuestionCols = new Set<number>(colMapping.values());

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    if (!row || row.every((cell) => !String(cell ?? '').trim())) continue;

    const answersMap: Record<string, string | string[]> = {};
    let timestamp = new Date().toLocaleString('th-TH');

    if (isSummaryCsv) {
      const getByHeader = (name: string) => {
        const idx = headerRow.indexOf(name);
        return idx >= 0 ? String(row[idx] ?? '').trim() : '';
      };
      answersMap['q2_1'] = getByHeader('Senior_ID');
      answersMap['q2_2'] = getByHeader('ชื่อ-นามสกุล');
      answersMap['q2_5'] = getByHeader('Latitude');
      answersMap['q2_6'] = getByHeader('Longitude');
      answersMap['q2_9'] =
        getByHeader('ช่วงอายุ') || getByHeader('อายุ') || getByHeader('อายุจริง');
      answersMap['q2_3'] = getByHeader('เบอร์โทรศัพท์');
      answersMap['q2_4'] = getByHeader('บ้านเลขที่_หมู่บ้าน');
      answersMap['q2_10'] = getByHeader('สถานะการอยู่อาศัย');
      answersMap['q3_3'] = getByHeader('อุปกรณ์ช่วยเดิน');
      answersMap['q3_6'] = getByHeader('ความถี่การข้ามถนน');
      answersMap['q5_1'] = getByHeader('การส่งต่อทางการแพทย์')
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      answersMap['q5_2'] = getByHeader('มาตรการคุ้มครองรายบุคคล')
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      answersMap['q1_2'] = getByHeader('ผู้ประเมิน');
      answersMap['q1_3'] = getByHeader('วันที่ประเมิน');
      timestamp = String(answersMap['q1_3'] || timestamp);
    } else {
      timestamp = String(row[0] || timestamp);
      for (const q of QUESTIONS) {
        const colIndex = colMapping.get(q.id);
        if (colIndex === undefined) continue;
        const rawCell = String(row[colIndex] ?? '').trim();
        if (q.type === 'CHECKBOX') {
          answersMap[q.id] = rawCell
            ? rawCell.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        } else {
          answersMap[q.id] = rawCell;
        }
      }
    }

    const hasNameOrCoord =
      Boolean(answersMap['q2_2']) ||
      Boolean(answersMap['q2_5']) ||
      Boolean(answersMap['q1_2']);
    if (!hasNameOrCoord) continue;

    // Also inspect worksheet cell objects for embedded hyperlinks (.l.Target) or formulas (.f)
    const extraCellTexts: (string | undefined)[] = [];
    for (let c = 0; c < Math.max(headerRow.length, row.length); c++) {
      const cellAddress = `${colIndexToLetter(c)}${rIdx + 1}`;
      const cellObj = (ws as any)[cellAddress];
      const parts: string[] = [];
      if (cellObj?.l?.Target) {
        parts.push(String(cellObj.l.Target));
      }
      if (cellObj?.f) {
        parts.push(String(cellObj.f));
      }
      extraCellTexts[c] = parts.length > 0 ? parts.join(' ') : undefined;
    }

    const seniorName = String(answersMap['q2_2'] || '').trim();
    const photos = parsePhotosFromSheetRow(
      headerRow,
      row,
      usedQuestionCols,
      extraCellTexts,
      seniorName,
      timestamp
    );

    const recId =
      String(answersMap['q2_1'] || '').trim() ||
      `IMP-${String(rIdx).padStart(3, '0')}`;

    parsed.push(buildRecordFromAnswers(recId, timestamp, answersMap, photos));
  }

  return ensureUniqueRecordIds(parsed);
}

/**
 * Parses raw UTF-8 CSV text into AssessmentRecord[]
 */
export function parseRecordsFromCsvText(csvText: string): AssessmentRecord[] {
  const wb = XLSX.read(csvText, { type: 'string', raw: true });
  return parseWorkbookToRecords(wb);
}

/**
 * Automatically fetches and parses the attached Google Sheets dataset
 * (`/assets/aistudio/senior_risk_assessment_template_d039f233`)
 */
export async function fetchAttachedSheetTemplateRecords(): Promise<
  AssessmentRecord[]
> {
  try {
    const res = await fetch(
      '/assets/aistudio/senior_risk_assessment_template_d039f233'
    );
    if (!res.ok) return [];
    const csvText = await res.text();
    if (!csvText || !csvText.trim()) return [];
    return parseRecordsFromCsvText(csvText);
  } catch (err) {
    console.warn('Could not load attached sheet template asset:', err);
    return [];
  }
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV (.csv) file and returns AssessmentRecord[]
 * ready to display on the Dashboard Pie Chart, GIS Map, and Responses Table.
 */
export async function parseRecordsFromSpreadsheetFile(
  file: File
): Promise<AssessmentRecord[]> {
  const buffer = await file.arrayBuffer();
  const isCsvOrText =
    file.name.toLowerCase().endsWith('.csv') ||
    file.type.includes('csv') ||
    file.type.includes('text');

  if (isCsvOrText) {
    const utf8Text = new TextDecoder('utf-8').decode(buffer);
    return parseRecordsFromCsvText(utf8Text);
  }

  const wb = XLSX.read(buffer, { type: 'array', codepage: 65001 });
  return parseWorkbookToRecords(wb);
}


