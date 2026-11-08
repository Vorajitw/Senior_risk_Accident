import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from './authService';
import {
  QUESTIONS,
  SECTIONS,
  AssessmentRecord,
  HazardPhotoAttachment,
  RoadHazardPoint,
  RoadHazardType,
  RoadHazardSeverity,
  RoadHazardStatus,
  INITIAL_ROAD_HAZARDS,
  ROAD_HAZARD_TYPE_LABELS,
  ROAD_HAZARD_STATUS_LABELS,
  buildRecordFromAnswers,
  mapSheetColumnsToQuestions,
  parsePhotosFromSheetRow,
  extractDriveFileId,
  toRenderableImageUrl,
  ensureUniqueRecordIds,
} from '../data/assessmentSchema';

export interface ProvisionedFormInfo {
  formId: string;
  title: string;
  responderUri: string;
  editUri: string;
  createdAt: string;
}

export interface ProvisionedSheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetName: string;
  createdAt: string;
}

/**
 * Creates a complete 5-Section Google Form via the Google Forms v1 API
 * matching 100% of the Senior Road Crossing Risk Assessment specification.
 */
export async function createSeniorRiskGoogleForm(
  accessToken: string
): Promise<ProvisionedFormInfo> {
  // Step 1: Create initial blank form with title
  const formTitle =
    'แบบประเมินคัดกรองความเสี่ยงการข้ามถนนของผู้สูงอายุ (ฉบับมาตรฐาน 5 ส่วน 6 มิติ)';
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: formTitle,
        documentTitle: 'Senior_Road_Crossing_Risk_Assessment_Form',
      },
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `สร้าง Google Form ไม่สำเร็จ (HTTP ${createRes.status})`
    );
  }

  const createdForm = await createRes.json();
  const formId: string = createdForm.formId;
  const safeFormId = encodeURIComponent(formId.trim());

  // Step 2: Build batchUpdate requests for description + all 5 sections & 30 questions
  const requests: unknown[] = [
    {
      updateFormInfo: {
        info: {
          title: formTitle,
          description:
            'แบบฟอร์มคัดกรองและประเมินความเสี่ยงการข้ามถนนของผู้สูงอายุ (5 ส่วน 6 มิติ) สำหรับ อสม., เจ้าหน้าที่ รพ.สต., ตำรวจ และผู้นำชุมชน เพื่อเชื่อมต่อฐานข้อมูล Google Sheets และปักหมุดพิกัดแผนที่ GIS ชุมชน',
        },
        updateMask: 'description',
      },
    },
  ];

  let itemIndex = 0;

  for (const section of SECTIONS) {
    // Section 1 uses the top form header; Sections 2..5 insert a PageBreakItem first
    if (section.id > 1) {
      requests.push({
        createItem: {
          item: {
            title: section.title,
            description: `${section.subtitle} — ${section.description}`,
            pageBreakItem: {},
          },
          location: { index: itemIndex++ },
        },
      });
    } else {
      // Add a section header text item at the start of Section 1
      requests.push({
        createItem: {
          item: {
            title: section.title,
            description: `${section.subtitle} — ${section.description}`,
            textItem: {},
          },
          location: { index: itemIndex++ },
        },
      });
    }

    const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);
    for (const q of sectionQuestions) {
      let questionPayload: Record<string, unknown> = {
        required: q.required,
      };

      if (q.type === 'RADIO' || q.type === 'CHECKBOX') {
        questionPayload = {
          required: q.required,
          choiceQuestion: {
            type: q.type === 'RADIO' ? 'RADIO' : 'CHECKBOX',
            options: (q.options || []).map((opt) => ({ value: opt })),
            shuffle: false,
          },
        };
      } else if (q.type === 'DATE') {
        questionPayload = {
          required: q.required,
          dateQuestion: {
            includeTime: false,
            includeYear: true,
          },
        };
      } else {
        questionPayload = {
          required: q.required,
          textQuestion: {
            paragraph: false,
          },
        };
      }

      requests.push({
        createItem: {
          item: {
            title: q.title,
            description: q.dimensionLabel || q.helperText || undefined,
            questionItem: {
              question: questionPayload,
            },
          },
          location: { index: itemIndex++ },
        },
      });
    }
  }

  const batchRes = await fetch(
    `https://forms.googleapis.com/v1/forms/${safeFormId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!batchRes.ok) {
    const errData = await batchRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `ตั้งค่าคำถามใน Google Form ไม่สำเร็จ (HTTP ${batchRes.status})`
    );
  }

  return {
    formId,
    title: formTitle,
    responderUri:
      createdForm.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
    createdAt: new Date().toLocaleString('th-TH'),
  };
}

/**
 * Helper to convert 0-based column index to Excel/Sheets column letter (A, B, ..., Z, AA, AB...)
 */
export function colIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Builds the row array (including automatic Google Sheets formulas for Total_Score, Risk_Level, and Google_Maps_Link)
 */
export function buildSheetRowValues(
  record: AssessmentRecord,
  rowNumber: number
): (string | number)[] {
  const baseValues: (string | number)[] = [record.timestamp];

  for (const q of QUESTIONS) {
    const val = record.answers[q.id];
    if (Array.isArray(val)) {
      baseValues.push(val.join(', '));
    } else {
      baseValues.push(val ?? '');
    }
  }

  // Question indices in sheet (Column A = index 0 = Timestamp, Column B = index 1 = q1_1, ...)
  // Section 4 questions are q4_1..q4_14 -> indices 23..36 (Columns X to AK)
  const sec4StartColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q4_1'); // 23 -> X
  const sec4EndColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q4_14'); // 36 -> AK
  const q4_12ColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q4_12'); // 34 -> AI
  const latColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q2_5'); // 8 -> I
  const lngColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q2_6'); // 9 -> J
  const seniorNameColIndex = 1 + QUESTIONS.findIndex((q) => q.id === 'q2_2'); // 5 -> F

  // Total_Score column is right after all 39 questions -> index 40 (Column AO)
  const totalScoreColIndex = 1 + QUESTIONS.length;
  const totalScoreColLetter = colIndexToLetter(totalScoreColIndex);
  const q4_12ColLetter = colIndexToLetter(q4_12ColIndex);
  const latColLetter = colIndexToLetter(latColIndex);
  const lngColLetter = colIndexToLetter(lngColIndex);
  const seniorNameColLetter = colIndexToLetter(seniorNameColIndex);

  // Build sum of extracted numbers from (0), (1), (2), (3) across Section 4 columns
  const scoreTerms: string[] = [];
  for (let c = sec4StartColIndex; c <= sec4EndColIndex; c++) {
    const colLet = colIndexToLetter(c);
    scoreTerms.push(`IFERROR(VALUE(MID(${colLet}${rowNumber},2,1)),0)`);
  }
  const totalScoreFormula = `=${scoreTerms.join('+')}`;

  // Traffic Light Risk Level formula:
  // Red >= 16 or q4_12 == (3), Yellow 8-15, Green 0-7
  const riskLevelFormula = `=IF(OR(${totalScoreColLetter}${rowNumber}>=16, IFERROR(VALUE(MID(${q4_12ColLetter}${rowNumber},2,1)),0)>=3), "🔴 แดง (ความเสี่ยงสูง/วิกฤต)", IF(${totalScoreColLetter}${rowNumber}>=8, "🟡 เหลือง (ความเสี่ยงปานกลาง)", "🟢 เขียว (ความเสี่ยงต่ำ)"))`;

  // Clean Latitude / Longitude columns for Google My Maps import
  const cleanLatFormula = `=IFERROR(VALUE(${latColLetter}${rowNumber}), "")`;
  const cleanLngFormula = `=IFERROR(VALUE(${lngColLetter}${rowNumber}), "")`;
  const cleanNameFormula = `=${seniorNameColLetter}${rowNumber}`;

  // Google Maps clickable pin link formula
  const mapsLinkFormula = `=IF(AND(ISNUMBER(VALUE(${latColLetter}${rowNumber})), ISNUMBER(VALUE(${lngColLetter}${rowNumber}))), "https://www.google.com/maps/search/?api=1&query="&${latColLetter}${rowNumber}&","&${lngColLetter}${rowNumber}, "รอระบุพิกัด GPS")`;

  const photoSummary =
    record.photos && record.photos.length > 0
      ? record.photos
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
    ...baseValues,
    totalScoreFormula,
    riskLevelFormula,
    cleanLatFormula,
    cleanLngFormula,
    cleanNameFormula,
    mapsLinkFormula,
    photoSummary,
  ];
}

export function getSheetHeaderRow(): string[] {
  return [
    'ประทับเวลา (Timestamp)',
    ...QUESTIONS.map((q) => q.title),
    'Total_Score (คะแนนรวม 6 มิติ)',
    'Risk_Level (สัญญาณไฟจราจรชีวิต)',
    'Latitude (พิกัดละติจูดสำหรับ My Maps)',
    'Longitude (พิกัดลองจิจูดสำหรับ My Maps)',
    'ชื่อ-นามสกุล (สำหรับหัวข้อหมุด My Maps)',
    'Google_Maps_Link (ลิงก์กดนำทาง)',
    'Photo_Attachments (ภาพถ่ายจุดเสี่ยงหน้าบ้าน / Google Drive Link)',
  ];
}

/**
 * Uploads a compressed field hazard photo to the user's Google Drive (`drive.file` scope)
 * and returns the fileId and webViewLink.
 */
export async function uploadHazardPhotoToDrive(
  accessToken: string,
  fileName: string,
  dataUrl: string,
  description: string
): Promise<{ fileId: string; webViewLink: string }> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  let mimeType = 'image/jpeg';
  let base64Data = '';

  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  } else {
    // Fallback if SVG UTF-8 data URL
    const rawContent = decodeURIComponent(dataUrl.replace(/^data:[^,]+,/, ''));
    mimeType = 'image/svg+xml';
    base64Data = btoa(unescape(encodeURIComponent(rawContent)));
  }

  const metadata = {
    name: fileName,
    description,
    mimeType,
  };

  const boundary = '-------SeniorRiskHazardPhotoBoundary314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `อัปโหลดรูปภาพลง Google Drive ไม่สำเร็จ (HTTP ${uploadRes.status})`
    );
  }

  const uploaded = await uploadRes.json();

  // Best-effort: make the uploaded hazard photo link readable so map thumbnails render across sessions
  if (uploaded.id) {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        uploaded.id
      )}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    ).catch(() => null);
  }

  return {
    fileId: uploaded.id,
    webViewLink:
      uploaded.webViewLink ||
      `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

/**
 * Creates the `senior_risk_assessment_template` spreadsheet in Google Sheets
 * with pre-built formulas and populates the initial records.
 */
export async function createSeniorRiskGoogleSheet(
  accessToken: string,
  records: AssessmentRecord[]
): Promise<ProvisionedSheetInfo> {
  const sheetTitle = 'senior_risk_assessment_template';
  const mainTabName = 'ข้อมูลการประเมิน (Responses)';
  const summaryTabName = 'สรุปผลและคู่มือ GIS (Summary)';

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sheetTitle,
        locale: 'th_TH',
      },
      sheets: [
        {
          properties: {
            title: mainTabName,
            gridProperties: {
              rowCount: 500,
              columnCount: 50,
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: summaryTabName,
            gridProperties: {
              rowCount: 60,
              columnCount: 10,
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `สร้างไฟล์ Google Sheets ไม่สำเร็จ (HTTP ${createRes.status})`
    );
  }

  const createdSheet = await createRes.json();
  const spreadsheetId: string = createdSheet.spreadsheetId;

  const headers = getSheetHeaderRow();
  const rows = records.map((rec, idx) => buildSheetRowValues(rec, idx + 2));

  // Populate main sheet values with USER_ENTERED so formulas evaluate live!
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`'${mainTabName}'!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `เขียนข้อมูลและสูตรลง Google Sheets ไม่สำเร็จ (HTTP ${updateRes.status})`
    );
  }

  // Populate summary tab with dynamic COUNTIF formulas and instructions
  const summaryValues = [
    ['สรุปผลการคัดกรองความเสี่ยงการข้ามถนนของผู้สูงอายุ (Dashboard Summary)', '', ''],
    ['รายการตัวชี้วัด', 'จำนวน (คน)', 'เกณฑ์การประเมินและแนวทางดูแล'],
    [
      'ผู้สูงอายุที่ได้รับการคัดกรองทั้งหมด',
      `=COUNTA('${mainTabName}'!F2:F500)`,
      'นับจากรายชื่อผู้สูงอายุทั้งหมดในแผ่นงาน ข้อมูลการประเมิน (Responses)',
    ],
    [
      '🟢 กลุ่มเสี่ยงต่ำ (สีเขียว 0-7 คะแนน)',
      `=COUNTIF('${mainTabName}'!AP2:AP500, "*เขียว*")`,
      'สามารถข้ามถนนได้ด้วยตนเอง ส่งเสริมการเป็นแกนนำผู้สูงวัยปลอดภัย',
    ],
    [
      '🟡 กลุ่มเสี่ยงปานกลาง (สีเหลือง 8-15 คะแนน)',
      `=COUNTIF('${mainTabName}'!AP2:AP500, "*เหลือง*")`,
      'เฝ้าระวัง ส่งตรวจวัดสายตา/ตัดแว่น และอบรมทักษะการประเมินความเร็วรถ (Hazard Perception)',
    ],
    [
      '🔴 กลุ่มเสี่ยงสูง/วิกฤต (สีแดง ≥16 คะแนน หรือข้ามร่องกลางโดยไม่ใช้สะพาน)',
      `=COUNTIF('${mainTabName}'!AP2:AP500, "*แดง*")`,
      'ต้องจัดระบบ "เพื่อนช่วยพาข้าม (Pedestrian Companion)" ส่งพบจักษุแพทย์ และปักหมุดสีแดงติดตามรายบ้าน',
    ],
    ['', '', ''],
    ['ขั้นตอนการนำไฟล์ไปปักหมุดใน Google My Maps', '', ''],
    ['1. เปิด https://mymaps.google.com แล้วกด "+ สร้างแผนที่ใหม่ (Create a new map)"', '', ''],
    ['2. กด "นำเข้า (Import)" แล้วเลือกไฟล์ senior_risk_assessment_template จาก Google Drive', '', ''],
    ['3. เลือกคอลัมน์ Latitude และ Longitude สำหรับตำแหน่งหมุด และเลือกคอลัมน์ ชื่อ-นามสกุล สำหรับชื่อหมุด', '', ''],
    ['4. ตั้งค่ารูปแบบสีตามคอลัมน์ Risk_Level เพื่อแยกสีหมุด 🟢-🟡-🔴 อัตโนมัติ', '', ''],
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`'${summaryTabName}'!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: summaryValues,
      }),
    }
  );

  return {
    spreadsheetId,
    title: sheetTitle,
    spreadsheetUrl:
      createdSheet.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetName: mainTabName,
    createdAt: new Date().toLocaleString('th-TH'),
  };
}

/**
 * Appends a single new assessment record to the existing Google Sheet
 */
export async function appendRecordToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  record: AssessmentRecord,
  nextRowNumber: number
): Promise<void> {
  // Fetch metadata first to find the first sheet tab name safely
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!metaRes.ok) {
    throw new Error(`ไม่สามารถเข้าถึงไฟล์ Google Sheets ได้ (HTTP ${metaRes.status})`);
  }
  const meta = await metaRes.json();
  const sheetName = meta?.sheets?.[0]?.properties?.title || 'ข้อมูลการประเมิน (Responses)';

  const rowValues = buildSheetRowValues(record, nextRowNumber);

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`'${sheetName}'!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!appendRes.ok) {
    const errData = await appendRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `บันทึกข้อมูลลง Google Sheets ไม่สำเร็จ (HTTP ${appendRes.status})`
    );
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Hydrates Google Drive photo attachments using the signed-in user's OAuth token when possible,
 * ensuring even private Google Form file uploads or Drive files render inside <img> on the GIS Map.
 */
async function hydrateDrivePhotosWithToken(
  accessToken: string,
  photos: HazardPhotoAttachment[]
): Promise<HazardPhotoAttachment[]> {
  if (!photos || photos.length === 0) return [];

  return Promise.all(
    photos.map(async (photo) => {
      if (photo.dataUrl && photo.dataUrl.startsWith('data:image/')) {
        return photo;
      }

      const fileId =
        photo.driveFileId ||
        extractDriveFileId(photo.driveViewLink || '') ||
        extractDriveFileId(photo.dataUrl || '');

      if (!fileId) {
        return {
          ...photo,
          dataUrl: toRenderableImageUrl(photo.dataUrl || photo.driveViewLink || ''),
        };
      }

      // 1. Try downloading image binary directly via Drive v3 alt=media with Bearer token
      try {
        const mediaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
          )}?alt=media&supportsAllDrives=true`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (mediaRes.ok) {
          const blob = await mediaRes.blob();
          if (
            blob.size > 0 &&
            (blob.type.startsWith('image/') || blob.type === 'application/octet-stream')
          ) {
            const base64Url = await blobToDataUrl(blob);
            if (base64Url.startsWith('data:')) {
              return {
                ...photo,
                driveFileId: fileId,
                driveViewLink:
                  photo.driveViewLink ||
                  `https://drive.google.com/file/d/${fileId}/view`,
                dataUrl: base64Url,
              };
            }
          }
        }
      } catch {
        // Ignore and try metadata thumbnailLink or public thumbnail endpoint next
      }

      // 2. Try fetching metadata thumbnailLink via Drive v3 API
      try {
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
          )}?fields=thumbnailLink,webViewLink&supportsAllDrives=true`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          if (metaJson.thumbnailLink) {
            const highResThumb = String(metaJson.thumbnailLink).replace(
              /=s\d+$/,
              '=s1000'
            );
            return {
              ...photo,
              driveFileId: fileId,
              driveViewLink:
                photo.driveViewLink ||
                metaJson.webViewLink ||
                `https://drive.google.com/file/d/${fileId}/view`,
              dataUrl: highResThumb,
            };
          }
        }
      } catch {
        // Fallback to standard Drive thumbnail endpoint
      }

      return {
        ...photo,
        driveFileId: fileId,
        driveViewLink:
          photo.driveViewLink ||
          `https://drive.google.com/file/d/${fileId}/view`,
        dataUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      };
    })
  );
}

/**
 * Fetches responses from the provisioned Google Form and converts them into AssessmentRecord[]
 */
export async function fetchGoogleFormResponses(
  accessToken: string,
  formId: string
): Promise<AssessmentRecord[]> {
  const safeFormId = encodeURIComponent(formId.trim());

  // 1. Fetch form structure to map questionId -> our schema question id or photo item
  const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!formRes.ok) {
    throw new Error(`ไม่สามารถอ่านโครงสร้าง Google Form ได้ (HTTP ${formRes.status})`);
  }
  const formDoc = await formRes.json();

  const questionIdToSchemaId: Record<string, string> = {};
  const questionIdToTitle: Record<string, string> = {};
  for (const item of formDoc.items || []) {
    const qId = item?.questionItem?.question?.questionId;
    const itemTitle: string = item?.title || '';
    if (qId && itemTitle) {
      questionIdToTitle[qId] = itemTitle;
      const matched = QUESTIONS.find((q) => {
        const escapedCode = q.code.replace('.', '\\.');
        const codeRegex = new RegExp(`^\\s*(?:ข้อ(?:ที่)?\\s*)?${escapedCode}(?!\\d)`);
        return codeRegex.test(itemTitle) || itemTitle === q.title;
      });
      if (matched) {
        questionIdToSchemaId[qId] = matched.id;
      }
    }
  }

  // 2. Fetch responses
  const respRes = await fetch(
    `https://forms.googleapis.com/v1/forms/${safeFormId}/responses`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!respRes.ok) {
    throw new Error(`ไม่สามารถดึงคำตอบจาก Google Form ได้ (HTTP ${respRes.status})`);
  }
  const respData = await respRes.json();
  const responses = respData.responses || [];

  const parsedRecords: AssessmentRecord[] = [];
  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    const answersMap: Record<string, string | string[]> = {};
    const rawAnswers = r.answers || {};
    const formPhotos: HazardPhotoAttachment[] = [];

    const timestamp = r.lastSubmittedTime
      ? new Date(r.lastSubmittedTime).toLocaleString('th-TH')
      : new Date().toLocaleString('th-TH');

    for (const [googleQId, ansObj] of Object.entries<any>(rawAnswers)) {
      const schemaQId = questionIdToSchemaId[googleQId];
      const itemTitle = questionIdToTitle[googleQId] || '';

      // Extract any Google Forms FileUploadAnswers (e.g. Section 2 house crossing photos)
      const fileUploads: { fileId?: string; fileName?: string }[] =
        ansObj?.fileUploadAnswers?.answers || [];
      for (const f of fileUploads) {
        if (f.fileId) {
          formPhotos.push({
            id: `FRM-PHOTO-${f.fileId.slice(0, 8)}`,
            category: 'HOUSE_CROSSING',
            categoryLabel:
              itemTitle || 'ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2)',
            caption:
              f.fileName ||
              itemTitle ||
              'ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2)',
            dataUrl: `https://drive.google.com/thumbnail?id=${f.fileId}&sz=w1000`,
            driveFileId: f.fileId,
            driveViewLink: `https://drive.google.com/file/d/${f.fileId}/view`,
            capturedAt: timestamp,
          });
        }
      }

      const textAnswers: string[] =
        ansObj?.textAnswers?.answers?.map((a: { value: string }) => a.value) || [];

      if (!schemaQId) {
        // Check if this unmapped question contains photo URLs
        const extraPhotos = parsePhotosFromSheetRow(
          [itemTitle || 'Photo_Attachments'],
          [textAnswers.join(', ')],
          new Set<number>(),
          undefined,
          undefined,
          timestamp
        );
        formPhotos.push(...extraPhotos);
        continue;
      }

      const schemaQuestion = QUESTIONS.find((q) => q.id === schemaQId);

      if (schemaQuestion?.type === 'CHECKBOX') {
        answersMap[schemaQId] = textAnswers;
      } else {
        answersMap[schemaQId] = textAnswers[0] || '';
      }
    }

    const hydratedPhotos = await hydrateDrivePhotosWithToken(
      accessToken,
      formPhotos
    );

    parsedRecords.push(
      buildRecordFromAnswers(
        `FORM-${r.responseId?.slice(0, 6) || i + 1}`,
        timestamp,
        answersMap,
        hydratedPhotos
      )
    );
  }

  return ensureUniqueRecordIds(parsedRecords);
}

/**
 * Reads all rows from a connected Google Sheet and converts them into AssessmentRecord[]
 * (including Section 2 house-front / road-crossing photo links) for immediate display on the Dashboard and GIS Map.
 */
export async function fetchRecordsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<AssessmentRecord[]> {
  const safeId = encodeURIComponent(spreadsheetId.trim());

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `ไม่สามารถเข้าถึงไฟล์ Google Sheets ได้ (HTTP ${metaRes.status})`
    );
  }
  const meta = await metaRes.json();
  const allSheetTitles: string[] = (meta?.sheets || [])
    .map((s: any) => String(s?.properties?.title || '').trim())
    .filter(Boolean);

  // Inspect all candidate data sheets (excluding summary/manual/road-hazard-only tabs)
  const candidateSheetNames = allSheetTitles.filter((title) => {
    const lower = title.toLowerCase();
    return (
      !lower.includes('สรุปผล') &&
      !lower.includes('summary') &&
      !lower.includes('คู่มือ') &&
      !lower.includes('manual') &&
      !lower.includes('จุดเสี่ยงบนถนน') &&
      !lower.includes('road_hazards')
    );
  });

  if (candidateSheetNames.length === 0) {
    candidateSheetNames.push(
      allSheetTitles[0] || 'ข้อมูลการประเมิน (Responses)'
    );
  }

  const parsedByKey = new Map<string, AssessmentRecord>();

  for (const sheetName of candidateSheetNames) {
    const rangeEncoded = encodeURIComponent(`'${sheetName}'!A1:AZ500`);

    // Fetch both formatted values and raw formulas (for =IMAGE("...") or =HYPERLINK("...")) + cell hyperlinks
    const [valRes, formulaRes, gridRes] = await Promise.all([
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${rangeEncoded}?valueRenderOption=FORMATTED_VALUE`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      ),
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${rangeEncoded}?valueRenderOption=FORMULA`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      ).catch(() => null),
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${safeId}?ranges=${rangeEncoded}&includeGridData=true&fields=sheets.data.rowData.values(hyperlink,textFormatRuns.format.link.uri)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      ).catch(() => null),
    ]);

    if (!valRes.ok) {
      if (candidateSheetNames.length === 1) {
        const errData = await valRes.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message ||
            `ไม่สามารถอ่านข้อมูลจากแผ่นงาน Google Sheets ได้ (HTTP ${valRes.status})`
        );
      }
      continue;
    }

    const valData = await valRes.json();
    const rows: string[][] = valData.values || [];
    if (rows.length <= 1) {
      continue;
    }

    const formulaData =
      formulaRes && formulaRes.ok
        ? await formulaRes.json().catch(() => null)
        : null;
    const formulaRows: string[][] = formulaData?.values || [];

    const gridData =
      gridRes && gridRes.ok ? await gridRes.json().catch(() => null) : null;
    const gridRowData: any[] =
      gridData?.sheets?.[0]?.data?.[0]?.rowData || [];

    const headerRow = rows[0].map((h) => String(h || '').trim());
    const isSummaryCsvFormat =
      headerRow.includes('Senior_ID') && headerRow.includes('Latitude');

    const colMapping = mapSheetColumnsToQuestions(headerRow);
    const usedQuestionCols = new Set<number>(colMapping.values());

    for (let rIdx = 1; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row || row.every((cell) => !String(cell || '').trim())) continue;

      const answersMap: Record<string, string | string[]> = {};
      let timestamp = String(row[0] || new Date().toLocaleString('th-TH'));

      if (isSummaryCsvFormat) {
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

        // Fallback for clean Latitude / Longitude / Name columns if q2_5 / q2_6 were empty
        if (!answersMap['q2_5']) {
          const cleanLatIdx = headerRow.findIndex((h) =>
            h.toLowerCase().startsWith('latitude')
          );
          if (cleanLatIdx >= 0 && row[cleanLatIdx]) {
            answersMap['q2_5'] = String(row[cleanLatIdx]).trim();
          }
        }
        if (!answersMap['q2_6']) {
          const cleanLngIdx = headerRow.findIndex((h) =>
            h.toLowerCase().startsWith('longitude')
          );
          if (cleanLngIdx >= 0 && row[cleanLngIdx]) {
            answersMap['q2_6'] = String(row[cleanLngIdx]).trim();
          }
        }
      }

      // Check if there is at least a senior name or coordinates
      const hasNameOrCoord =
        Boolean(answersMap['q2_2']) ||
        Boolean(answersMap['q2_5']) ||
        Boolean(answersMap['q1_2']);
      if (!hasNameOrCoord) continue;

      // Build extraCellTexts combining formula text and any cell hyperlink URIs
      const fRow = formulaRows[rIdx] || [];
      const gCells: any[] = gridRowData[rIdx]?.values || [];
      const maxLen = Math.max(row.length, fRow.length, gCells.length);
      const extraCellTexts: (string | undefined)[] = [];

      for (let c = 0; c < maxLen; c++) {
        const parts: string[] = [];
        if (fRow[c] && String(fRow[c]).trim() !== String(row[c] ?? '').trim()) {
          parts.push(String(fRow[c]).trim());
        }
        const cellObj = gCells[c];
        if (cellObj?.hyperlink) {
          parts.push(String(cellObj.hyperlink));
        }
        if (Array.isArray(cellObj?.textFormatRuns)) {
          for (const run of cellObj.textFormatRuns) {
            if (run?.format?.link?.uri) {
              parts.push(String(run.format.link.uri));
            }
          }
        }
        extraCellTexts[c] = parts.length > 0 ? parts.join(' ') : undefined;
      }

      const seniorName = String(answersMap['q2_2'] || '').trim();
      const rawPhotos = parsePhotosFromSheetRow(
        headerRow,
        row,
        usedQuestionCols,
        extraCellTexts,
        seniorName,
        timestamp
      );

      const hydratedPhotos = await hydrateDrivePhotosWithToken(
        accessToken,
        rawPhotos
      );

      const recId =
        String(answersMap['q2_1'] || '').trim() ||
        `SHT-${String(rIdx).padStart(3, '0')}`;

      const builtRecord = buildRecordFromAnswers(
        recId,
        timestamp,
        answersMap,
        hydratedPhotos
      );

      const dedupeKey = seniorName
        ? `${seniorName}::${String(answersMap['q2_5'] || '')}`
        : recId;

      const existing = parsedByKey.get(dedupeKey);
      if (
        !existing ||
        (builtRecord.photos?.length || 0) >= (existing.photos?.length || 0)
      ) {
        parsedByKey.set(dedupeKey, builtRecord);
      }
    }
  }

  return ensureUniqueRecordIds(Array.from(parsedByKey.values()));
}

/**
 * Hydrates all records' Google Drive photo attachments using the user's OAuth token upon email sign-in.
 */
export async function hydrateRecordsPhotosWithToken(
  accessToken: string,
  records: AssessmentRecord[]
): Promise<AssessmentRecord[]> {
  return Promise.all(
    records.map(async (rec) => {
      if (!rec.photos || rec.photos.length === 0) return rec;
      const hydrated = await hydrateDrivePhotosWithToken(accessToken, rec.photos);
      return {
        ...rec,
        photos: hydrated,
      };
    })
  );
}

/**
 * Automatically finds the user's `senior_risk_assessment_template` spreadsheet in Google Drive
 * (or verifies a saved spreadsheetId) upon Google email login.
 */
export async function findAndConnectUserGoogleSheet(
  accessToken: string,
  preferredSpreadsheetId?: string
): Promise<ProvisionedSheetInfo | null> {
  // 1. If a preferred spreadsheetId is provided, verify it directly via Sheets API
  if (preferredSpreadsheetId && preferredSpreadsheetId.trim()) {
    const cleanId = preferredSpreadsheetId.trim();
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          cleanId
        )}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const title =
          meta?.properties?.title || 'senior_risk_assessment_template';
        const sheetName =
          meta?.sheets?.[0]?.properties?.title ||
          'ข้อมูลการประเมิน (Responses)';
        return {
          spreadsheetId: cleanId,
          title,
          spreadsheetUrl:
            meta?.spreadsheetUrl ||
            `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
          sheetName,
          createdAt: new Date().toLocaleString('th-TH'),
        };
      }
    } catch {
      // Fall through to Drive search
    }
  }

  // 2. Search the user's Google Drive for `senior_risk_assessment_template` or latest assessment spreadsheet
  try {
    const query = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=15&fields=files(id,name,webViewLink,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (driveRes.ok) {
      const driveData = await driveRes.json();
      const files: {
        id: string;
        name: string;
        webViewLink?: string;
        modifiedTime?: string;
      }[] = driveData.files || [];

      if (files.length > 0) {
        const matched =
          files.find((f) =>
            f.name.toLowerCase().includes('senior_risk_assessment_template')
          ) ||
          files.find(
            (f) =>
              f.name.toLowerCase().includes('senior_risk') ||
              f.name.includes('ความเสี่ยง') ||
              f.name.includes('ผู้สูงอายุ')
          ) ||
          files[0];

        if (matched?.id) {
          return {
            spreadsheetId: matched.id,
            title: matched.name || 'senior_risk_assessment_template',
            spreadsheetUrl:
              matched.webViewLink ||
              `https://docs.google.com/spreadsheets/d/${matched.id}/edit`,
            sheetName: 'ข้อมูลการประเมิน (Responses)',
            createdAt: matched.modifiedTime
              ? new Date(matched.modifiedTime).toLocaleString('th-TH')
              : new Date().toLocaleString('th-TH'),
          };
        }
      }
    }
  } catch {
    // Ignore Drive search errors
  }

  return null;
}

// ============================================================================
// Persistent Road Hazard Storage (localStorage + IndexedDB + Google Sheets/Drive)
// ============================================================================

const ROAD_HAZARDS_STORAGE_KEY = 'senior_risk_road_hazards_v1';
const ROAD_HAZARDS_DELETED_KEY = 'senior_risk_deleted_road_hazards_v1';
const ROAD_HAZARDS_IDB_NAME = 'senior_risk_gis_storage_v1';
const ROAD_HAZARDS_IDB_STORE = 'road_hazards_store';
const ROAD_HAZARDS_SHEET_TAB = 'ทะเบียนจุดเสี่ยงบนถนน (Road Hazards)';

function getDeletedHazardIds(): Set<string> {
  try {
    const raw = localStorage.getItem(ROAD_HAZARDS_DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
  } catch {
    // Ignore
  }
  return new Set();
}

export function markRoadHazardDeleted(hazardId: string): void {
  try {
    const deleted = getDeletedHazardIds();
    deleted.add(hazardId);
    localStorage.setItem(
      ROAD_HAZARDS_DELETED_KEY,
      JSON.stringify(Array.from(deleted))
    );
  } catch {
    // Ignore
  }
}

export function clearDeletedRoadHazards(): void {
  try {
    localStorage.removeItem(ROAD_HAZARDS_DELETED_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Detects and filters out the synthetic placeholder HAZ-005 that was temporarily seeded,
 * ensuring only the user's real HAZ-005 (from Google AI Studio / Firestore / Google Sheets) is kept.
 */
function isSyntheticPlaceholderHaz005(item: RoadHazardPoint): boolean {
  if (!item) return false;
  return (
    item.id === 'HAZ-005' &&
    item.title ===
      'จุดเสี่ยงทางข้ามถนน 4 เลนหน้าชุมชนบ้านชะเมา หมู่ 6 (ไม่มีเกาะกลางพักรอ 2 จังหวะ)' &&
    item.reportedBy === 'นางพวงรัตน์ พรหมทอง (อสม. หมู่ 6 บ้านชะเมา)'
  );
}

/**
 * Merges INITIAL_ROAD_HAZARDS (HAZ-001 .. HAZ-004) with any stored/custom/Firestore hazards
 * (such as the user's real HAZ-005 created in Google AI Studio).
 */
export function mergeRoadHazardsWithDefaults(
  stored: RoadHazardPoint[]
): RoadHazardPoint[] {
  const deletedIds = getDeletedHazardIds();
  const byId = new Map<string, RoadHazardPoint>();

  // 1. Seed base INITIAL_ROAD_HAZARDS (HAZ-001 to HAZ-004) unless explicitly deleted
  for (const initHaz of INITIAL_ROAD_HAZARDS) {
    if (!deletedIds.has(initHaz.id) && !isSyntheticPlaceholderHaz005(initHaz)) {
      byId.set(initHaz.id, initHaz);
    }
  }

  // 2. Overlay stored/user-created/Firestore hazards (real HAZ-005, HAZ-006, or user edits take priority)
  for (const item of stored) {
    if (!item || !item.id) continue;
    if (deletedIds.has(item.id)) continue;
    if (isSyntheticPlaceholderHaz005(item)) continue;
    const base = byId.get(item.id);
    byId.set(item.id, {
      ...base,
      ...item,
      photoDataUrl: item.photoDataUrl || base?.photoDataUrl,
      driveFileId: item.driveFileId || base?.driveFileId,
      driveViewLink: item.driveViewLink || base?.driveViewLink,
    });
  }

  // Sort by HAZ-xxx number ascending so HAZ-001, HAZ-002, HAZ-003, HAZ-004, HAZ-005 appear in order
  return Array.from(byId.values()).sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D+/g, ''), 10) || 999;
    const numB = parseInt(b.id.replace(/\D+/g, ''), 10) || 999;
    return numA - numB;
  });
}

function openHazardsIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(ROAD_HAZARDS_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const dbIdb = req.result;
        if (!dbIdb.objectStoreNames.contains(ROAD_HAZARDS_IDB_STORE)) {
          dbIdb.createObjectStore(ROAD_HAZARDS_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Synchronously loads initial road hazards from localStorage merged with INITIAL_ROAD_HAZARDS
 */
export function loadRoadHazardsSync(): RoadHazardPoint[] {
  try {
    const raw = localStorage.getItem(ROAD_HAZARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeRoadHazardsWithDefaults(parsed);
      }
    }
  } catch {
    // Fallback to INITIAL_ROAD_HAZARDS
  }
  return mergeRoadHazardsWithDefaults([]);
}

/**
 * Asynchronously loads full road hazards (including full high-res base64 photos) from IndexedDB or localStorage
 */
export async function loadRoadHazardsAsync(): Promise<RoadHazardPoint[]> {
  try {
    const dbIdb = await openHazardsIndexedDB();
    if (dbIdb) {
      const idbResult = await new Promise<RoadHazardPoint[] | null>((resolve) => {
        try {
          const tx = dbIdb.transaction(ROAD_HAZARDS_IDB_STORE, 'readonly');
          const store = tx.objectStore(ROAD_HAZARDS_IDB_STORE);
          const getReq = store.get('all_road_hazards');
          getReq.onsuccess = () => {
            if (Array.isArray(getReq.result) && getReq.result.length > 0) {
              resolve(getReq.result as RoadHazardPoint[]);
            } else {
              resolve(null);
            }
          };
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      if (idbResult && idbResult.length > 0) {
        return mergeRoadHazardsWithDefaults(idbResult);
      }
    }
  } catch {
    // Fallback to localStorage
  }
  return loadRoadHazardsSync();
}

/**
 * Hydrates Google Drive photos on RoadHazardPoint items when the user signs in with Google
 */
export async function hydrateRoadHazardsPhotosWithToken(
  accessToken: string,
  hazards: RoadHazardPoint[]
): Promise<RoadHazardPoint[]> {
  return Promise.all(
    hazards.map(async (haz) => {
      const fileId =
        haz.driveFileId ||
        (haz.driveViewLink ? extractDriveFileId(haz.driveViewLink) : null);
      if (!fileId) return haz;
      try {
        const hydratedList = await hydrateDrivePhotosWithToken(accessToken, [
          {
            id: `haz-photo-${haz.id}`,
            category: 'OTHER',
            categoryLabel: 'จุดเสี่ยงบนถนน',
            caption: haz.title,
            dataUrl:
              haz.photoDataUrl || toRenderableImageUrl(haz.driveViewLink || ''),
            driveFileId: fileId,
            driveViewLink: haz.driveViewLink,
            capturedAt: haz.reportedDate,
          },
        ]);
        if (hydratedList[0]?.dataUrl) {
          return {
            ...haz,
            photoDataUrl: hydratedList[0].dataUrl,
          };
        }
      } catch {
        // Keep existing photoDataUrl
      }
      return haz;
    })
  );
}

/**
 * Persists road hazards (with photos) to both localStorage and IndexedDB so data never disappears on reload
 */
export async function saveRoadHazardsLocally(
  hazards: RoadHazardPoint[]
): Promise<void> {
  const cleaned = hazards.filter((h) => !isSyntheticPlaceholderHaz005(h));
  // 1. Save full array including base64 photos to IndexedDB (supports >50MB)
  try {
    const dbIdb = await openHazardsIndexedDB();
    if (dbIdb) {
      await new Promise<void>((resolve) => {
        try {
          const tx = dbIdb.transaction(ROAD_HAZARDS_IDB_STORE, 'readwrite');
          const store = tx.objectStore(ROAD_HAZARDS_IDB_STORE);
          store.put(cleaned, 'all_road_hazards');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch {
    // Ignore IDB errors
  }

  // 2. Save to localStorage for instant synchronous hydration on boot
  try {
    localStorage.setItem(ROAD_HAZARDS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // If base64 photos exceed 5MB localStorage limit, store lightweight version in localStorage while IDB holds full photos
    try {
      const lightweight = cleaned.map((h) => ({
        ...h,
        photoDataUrl:
          h.photoDataUrl && h.photoDataUrl.length > 120000
            ? h.driveViewLink
              ? toRenderableImageUrl(h.driveViewLink)
              : undefined
            : h.photoDataUrl,
      }));
      localStorage.setItem(
        ROAD_HAZARDS_STORAGE_KEY,
        JSON.stringify(lightweight)
      );
    } catch {
      // Ignore quota error
    }
  }
}

// ============================================================================
// Firebase Firestore Real-Time Cross-Origin Synchronization for Road Hazards
// ============================================================================

export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeRoadHazardForFirestore(
  h: RoadHazardPoint
): Record<string, unknown> {
  const safeId = String(h.id || 'HAZ-001')
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 32);
  const payload: Record<string, unknown> = {
    id: safeId,
    title: String(h.title || 'จุดเสี่ยงบนถนน').slice(0, 500),
    type: [
      'BLIND_SPOT',
      'BROKEN_BRIDGE',
      'HIGH_SPEED_ZONE',
      'POOR_LIGHTING',
      'NO_REFUGE_ISLAND',
    ].includes(h.type)
      ? h.type
      : 'BLIND_SPOT',
    severity: h.severity === 'WARNING' ? 'WARNING' : 'CRITICAL',
    status: ['REPORTED', 'IN_PROGRESS', 'RESOLVED'].includes(h.status)
      ? h.status
      : 'REPORTED',
    lat: isNaN(Number(h.lat)) ? 8.4332 : Number(h.lat),
    lng: isNaN(Number(h.lng)) ? 99.9661 : Number(h.lng),
    description: String(h.description || '-').slice(0, 2000),
    recommendedAction: String(h.recommendedAction || '-').slice(0, 2000),
    responsibleAgency: String(h.responsibleAgency || '-').slice(0, 500),
    reportedBy: String(h.reportedBy || 'เจ้าหน้าที่').slice(0, 300),
    reportedDate: String(h.reportedDate || new Date().toISOString().slice(0, 10)).slice(
      0,
      50
    ),
    isPublic: true,
  };

  if (h.photoDataUrl && typeof h.photoDataUrl === 'string' && h.photoDataUrl.length <= 920000) {
    payload.photoDataUrl = h.photoDataUrl;
  } else if (h.driveViewLink) {
    payload.photoDataUrl = toRenderableImageUrl(h.driveViewLink).slice(0, 920000);
  }
  if (h.driveFileId && typeof h.driveFileId === 'string') {
    payload.driveFileId = h.driveFileId.slice(0, 200);
  }
  if (h.driveViewLink && typeof h.driveViewLink === 'string') {
    payload.driveViewLink = h.driveViewLink.slice(0, 1000);
  }

  return payload;
}

/**
 * Writes or updates a single RoadHazardPoint in Firebase Firestore (/road_hazards/{id})
 * so it is immediately available across both Google AI Studio and https://senior-road-crossing-risk-gis.ai.studio
 */
export async function upsertRoadHazardToFirestore(
  hazard: RoadHazardPoint
): Promise<void> {
  if (!hazard || !hazard.id || isSyntheticPlaceholderHaz005(hazard)) return;
  const payload = sanitizeRoadHazardForFirestore(hazard);
  const docId = String(payload.id);
  const path = `road_hazards/${docId}`;
  try {
    await setDoc(doc(db, 'road_hazards', docId), payload);
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.WRITE, path);
  }
}

/**
 * Deletes a RoadHazardPoint from Firebase Firestore (/road_hazards/{id})
 */
export async function deleteRoadHazardFromFirestore(
  hazardId: string
): Promise<void> {
  if (!hazardId) return;
  const safeId = hazardId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 32);
  const path = `road_hazards/${safeId}`;
  try {
    await deleteDoc(doc(db, 'road_hazards', safeId));
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.DELETE, path);
  }
}

/**
 * Pushes any locally stored RoadHazardPoint items (such as the user's real HAZ-005 in Google AI Studio)
 * up to Firebase Firestore so that https://senior-road-crossing-risk-gis.ai.studio immediately receives them.
 */
export async function syncLocalRoadHazardsToFirestore(
  hazards: RoadHazardPoint[]
): Promise<void> {
  const deletedIds = getDeletedHazardIds();
  for (const h of hazards) {
    if (!h || !h.id || deletedIds.has(h.id) || isSyntheticPlaceholderHaz005(h)) {
      continue;
    }
    try {
      await upsertRoadHazardToFirestore(h);
    } catch {
      // Ignore individual sync error
    }
  }
}

/**
 * Subscribes to real-time updates from Firebase Firestore (`road_hazards`),
 * automatically merging with local IndexedDB/localStorage and backfilling any local-only hazards (like HAZ-005)
 * up to Firestore so all app URLs display the exact same road hazards and photos!
 */
export function subscribeToRoadHazardsFromFirestore(
  onUpdate: (mergedHazards: RoadHazardPoint[]) => void
): () => void {
  const q = query(collection(db, 'road_hazards'), where('isPublic', '==', true));
  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      const firestoreHazards: RoadHazardPoint[] = [];
      const firestoreIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (!data || !data.id) return;
        const item: RoadHazardPoint = {
          id: String(data.id),
          title: String(data.title || ''),
          type: (data.type as RoadHazardType) || 'BLIND_SPOT',
          severity: (data.severity as RoadHazardSeverity) || 'CRITICAL',
          status: (data.status as RoadHazardStatus) || 'REPORTED',
          lat: Number(data.lat),
          lng: Number(data.lng),
          description: String(data.description || ''),
          recommendedAction: String(data.recommendedAction || ''),
          responsibleAgency: String(data.responsibleAgency || ''),
          reportedBy: String(data.reportedBy || ''),
          reportedDate: String(data.reportedDate || ''),
          photoDataUrl: data.photoDataUrl ? String(data.photoDataUrl) : undefined,
          driveFileId: data.driveFileId ? String(data.driveFileId) : undefined,
          driveViewLink: data.driveViewLink ? String(data.driveViewLink) : undefined,
        };
        if (!isSyntheticPlaceholderHaz005(item)) {
          firestoreHazards.push(item);
          firestoreIds.add(item.id);
        } else {
          // Clean up synthetic placeholder if it ever got into Firestore
          deleteDoc(doc(db, 'road_hazards', item.id)).catch(() => {});
        }
      });

      const localHazards = await loadRoadHazardsAsync();
      const deletedIds = getDeletedHazardIds();

      // Check if local browser (e.g., Google AI Studio preview) has real hazards (like HAZ-005) not yet in Firestore
      for (const loc of localHazards) {
        if (
          loc &&
          loc.id &&
          !deletedIds.has(loc.id) &&
          !isSyntheticPlaceholderHaz005(loc)
        ) {
          const remoteMatch = firestoreHazards.find((f) => f.id === loc.id);
          const localHasBetterPhoto =
            loc.photoDataUrl &&
            (!remoteMatch?.photoDataUrl ||
              (loc.photoDataUrl.startsWith('data:image/jpeg') &&
                !remoteMatch.photoDataUrl.startsWith('data:image/jpeg')));
          if (!firestoreIds.has(loc.id) || localHasBetterPhoto) {
            upsertRoadHazardToFirestore(loc).catch(() => {});
          }
        }
      }

      // Combine local + Firestore hazards (preserving full photos from either source)
      const combinedMap = new Map<string, RoadHazardPoint>();
      for (const h of mergeRoadHazardsWithDefaults(localHazards)) {
        combinedMap.set(h.id, h);
      }
      for (const fh of firestoreHazards) {
        if (deletedIds.has(fh.id)) continue;
        const existing = combinedMap.get(fh.id);
        combinedMap.set(fh.id, {
          ...existing,
          ...fh,
          photoDataUrl: fh.photoDataUrl || existing?.photoDataUrl,
          driveFileId: fh.driveFileId || existing?.driveFileId,
          driveViewLink: fh.driveViewLink || existing?.driveViewLink,
        });
      }

      const finalMerged = Array.from(combinedMap.values()).sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D+/g, ''), 10) || 999;
        const numB = parseInt(b.id.replace(/\D+/g, ''), 10) || 999;
        return numA - numB;
      });

      await saveRoadHazardsLocally(finalMerged);
      onUpdate(finalMerged);
    },
    (error) => {
      try {
        handleFirestoreError(error, FirestoreOperationType.LIST, 'road_hazards');
      } catch {
        // Fallback to local storage if Firestore listener errors
      }
    }
  );

  return unsubscribe;
}

/**
 * Ensures the `ทะเบียนจุดเสี่ยงบนถนน (Road Hazards)` tab exists in the Google Sheet and appends a road hazard row
 */
export async function appendRoadHazardToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  hazard: RoadHazardPoint
): Promise<void> {
  const safeId = encodeURIComponent(spreadsheetId.trim());
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!metaRes.ok) {
    throw new Error(`ไม่สามารถเข้าถึง Google Sheets ได้ (HTTP ${metaRes.status})`);
  }
  const meta = await metaRes.json();
  const existingSheets: string[] = (meta?.sheets || []).map(
    (s: any) => s?.properties?.title || ''
  );

  let hazardTabName =
    existingSheets.find(
      (t) => t.includes('จุดเสี่ยงบนถนน') || t.toLowerCase().includes('road hazard') || t.toLowerCase().includes('road_hazard')
    ) || ROAD_HAZARDS_SHEET_TAB;

  // If the tab doesn't exist yet, create it and populate header row
  if (!existingSheets.includes(hazardTabName)) {
    const addSheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${safeId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: hazardTabName,
                  gridProperties: {
                    rowCount: 300,
                    columnCount: 15,
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        }),
      }
    );

    if (addSheetRes.ok) {
      const headerRow = [
        'รหัสจุดเสี่ยง (Hazard ID)',
        'วันที่แจ้ง',
        'ชื่อจุดเสี่ยง / ตำแหน่งสังเกต',
        'ประเภทจุดเสี่ยง',
        'ระดับความเร่งด่วน',
        'สถานะการแก้ไข',
        'Latitude',
        'Longitude',
        'รายละเอียดปัญหา',
        'ข้อเสนอแนะเชิงวิศวกรรม',
        'หน่วยงานรับผิดชอบ',
        'ผู้แจ้ง',
        'Google Maps Link',
        'Photo Link (ภาพถ่ายจุดเสี่ยง)',
      ];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${encodeURIComponent(
          `'${hazardTabName}'!A1`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [headerRow] }),
        }
      );
    }
  }

  const mapsLink = `https://www.google.com/maps?q=${hazard.lat},${hazard.lng}`;
  const photoCellValue =
    hazard.driveViewLink ||
    (hazard.photoDataUrl && hazard.photoDataUrl.startsWith('http')
      ? hazard.photoDataUrl
      : '');

  const rowValues = [
    hazard.id,
    hazard.reportedDate,
    hazard.title,
    `${hazard.type} (${ROAD_HAZARD_TYPE_LABELS[hazard.type] || hazard.type})`,
    hazard.severity,
    `${hazard.status} (${ROAD_HAZARD_STATUS_LABELS[hazard.status] || hazard.status})`,
    hazard.lat,
    hazard.lng,
    hazard.description,
    hazard.recommendedAction,
    hazard.responsibleAgency,
    hazard.reportedBy,
    mapsLink,
    photoCellValue,
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${encodeURIComponent(
      `'${hazardTabName}'!A1`
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    }
  );
}

/**
 * Fetches road hazards from the `ทะเบียนจุดเสี่ยงบนถนน` or `จุดเสี่ยงบนถนน (Road_Hazards)` tab in Google Sheets,
 * dynamically mapping columns from the header row and hydrating any Google Drive photo links.
 */
export async function fetchRoadHazardsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<RoadHazardPoint[]> {
  try {
    const safeId = encodeURIComponent(spreadsheetId.trim());
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${safeId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return [];
    const meta = await metaRes.json();
    const existingSheets: string[] = (meta?.sheets || []).map(
      (s: any) => s?.properties?.title || ''
    );

    const hazardTabName = existingSheets.find(
      (t) =>
        t.includes('จุดเสี่ยงบนถนน') ||
        t.toLowerCase().includes('road hazard') ||
        t.toLowerCase().includes('road_hazard')
    );
    if (!hazardTabName) return [];

    const rangeEncoded = encodeURIComponent(`'${hazardTabName}'!A1:O300`);
    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${rangeEncoded}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!valRes.ok) return [];
    const valData = await valRes.json();
    const rows: string[][] = valData.values || [];
    if (rows.length < 2) return [];

    const headerRow = (rows[0] || []).map((h) => String(h || '').trim().toLowerCase());
    const findCol = (keywords: string[], fallbackIdx: number): number => {
      const idx = headerRow.findIndex((h) => keywords.some((kw) => h.includes(kw)));
      return idx >= 0 ? idx : fallbackIdx;
    };

    // Detect whether col 1 is "วันที่แจ้ง" (appendRoadHazardToGoogleSheet format) or "ชื่อจุดเสี่ยง" (Excel template format)
    const isDateSecondCol = headerRow[1]?.includes('วันที่');

    const colId = findCol(['hazard_id', 'hazard id', 'รหัสจุดเสี่ยง'], 0);
    const colTitle = findCol(['ชื่อจุดเสี่ยง', 'ตำแหน่งสังเกต'], isDateSecondCol ? 2 : 1);
    const colType = findCol(['ประเภทจุดเสี่ยง'], isDateSecondCol ? 3 : 2);
    const colSev = findCol(['ระดับความเร่งด่วน', 'ระดับความรุนแรง'], isDateSecondCol ? 4 : 3);
    const colStatus = findCol(['สถานะการแก้ไข', 'สถานะ'], isDateSecondCol ? 5 : 4);
    const colLat = findCol(['latitude', 'ละติจูด'], isDateSecondCol ? 6 : 5);
    const colLng = findCol(['longitude', 'ลองจิจูด'], isDateSecondCol ? 7 : 6);
    const colDesc = findCol(['รายละเอียดปัญหา', 'รายละเอียด'], isDateSecondCol ? 8 : 7);
    const colAction = findCol(['ข้อเสนอแนะ', 'วิศวกรรม'], isDateSecondCol ? 9 : 8);
    const colAgency = findCol(['หน่วยงานรับผิดชอบ', 'หน่วยงาน'], isDateSecondCol ? 10 : 9);
    const colReporter = findCol(['ผู้แจ้ง'], isDateSecondCol ? 11 : 10);
    const colDate = findCol(['วันที่แจ้ง', 'วันที่'], isDateSecondCol ? 1 : 11);
    const colPhoto = findCol(['photo', 'ภาพถ่าย', 'รูปภาพ'], 13);

    const parsedHazards: RoadHazardPoint[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 3) continue;
      const id = String(r[colId] || `HAZ-${String(i).padStart(3, '0')}`).trim();
      const title = String(r[colTitle] || '').trim();
      if (!title) continue;
      const reportedDate =
        String(r[colDate] || '').trim() || new Date().toISOString().slice(0, 10);

      const rawType = String(r[colType] || '').toUpperCase();
      const type: RoadHazardType =
        rawType.includes('BROKEN_BRIDGE') || rawType.includes('สะพาน')
          ? 'BROKEN_BRIDGE'
          : rawType.includes('HIGH_SPEED') || rawType.includes('ความเร็ว')
          ? 'HIGH_SPEED_ZONE'
          : rawType.includes('POOR_LIGHTING') || rawType.includes('อับแสง')
          ? 'POOR_LIGHTING'
          : rawType.includes('NO_REFUGE') || rawType.includes('เกาะกลาง')
          ? 'NO_REFUGE_ISLAND'
          : 'BLIND_SPOT';

      const rawSev = String(r[colSev] || '').toUpperCase();
      const severity: RoadHazardSeverity =
        rawSev.includes('WARNING') || rawSev.includes('เฝ้าระวัง')
          ? 'WARNING'
          : 'CRITICAL';

      const rawStatus = String(r[colStatus] || '').toUpperCase();
      const status: RoadHazardStatus =
        rawStatus.includes('RESOLVED') || rawStatus.includes('เรียบร้อย')
          ? 'RESOLVED'
          : rawStatus.includes('IN_PROGRESS') || rawStatus.includes('กำลังประสาน')
          ? 'IN_PROGRESS'
          : 'REPORTED';

      const lat = Number(r[colLat]);
      const lng = Number(r[colLng]);
      if (isNaN(lat) || isNaN(lng)) continue;

      const description =
        String(r[colDesc] || '').trim() || ROAD_HAZARD_TYPE_LABELS[type];
      const recommendedAction = String(r[colAction] || '').trim();
      const responsibleAgency = String(r[colAgency] || '').trim();
      const reportedBy = String(r[colReporter] || '').trim();
      const rawPhotoLink = String(r[colPhoto] || '').trim();

      let photoDataUrl: string | undefined = undefined;
      let driveFileId: string | undefined = undefined;
      let driveViewLink: string | undefined = undefined;

      if (rawPhotoLink) {
        driveViewLink = rawPhotoLink;
        const extractedId = extractDriveFileId(rawPhotoLink);
        if (extractedId) {
          driveFileId = extractedId;
          const hydratedList = await hydrateDrivePhotosWithToken(accessToken, [
            {
              id: `haz-photo-${id}`,
              category: 'OTHER',
              categoryLabel: 'จุดเสี่ยงบนถนน',
              caption: title,
              dataUrl: toRenderableImageUrl(rawPhotoLink),
              driveFileId: extractedId,
              driveViewLink: rawPhotoLink,
              capturedAt: reportedDate,
            },
          ]);
          photoDataUrl =
            hydratedList[0]?.dataUrl || toRenderableImageUrl(rawPhotoLink);
        } else {
          photoDataUrl = toRenderableImageUrl(rawPhotoLink);
        }
      }

      const item: RoadHazardPoint = {
        id,
        title,
        type,
        severity,
        status,
        lat,
        lng,
        description,
        recommendedAction,
        responsibleAgency,
        reportedBy,
        reportedDate,
        photoDataUrl,
        driveFileId,
        driveViewLink,
      };
      if (!isSyntheticPlaceholderHaz005(item)) {
        parsedHazards.push(item);
      }
    }

    return parsedHazards;
  } catch {
    return [];
  }
}



