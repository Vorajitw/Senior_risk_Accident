import {
  QUESTIONS,
  SECTIONS,
  AssessmentRecord,
  HazardPhotoAttachment,
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


