/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  INITIAL_RECORDS,
  AssessmentRecord,
  RiskLevelCode,
  HazardPhotoAttachment,
  INITIAL_ROAD_HAZARDS,
  RoadHazardPoint,
  RoadHazardType,
  RoadHazardSeverity,
  RoadHazardStatus,
  ROAD_HAZARD_TYPE_LABELS,
  ROAD_HAZARD_STATUS_LABELS,
  formatSeniorAge,
  ensureUniqueRecordIds,
} from './data/assessmentSchema';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/authService';
import {
  ProvisionedFormInfo,
  ProvisionedSheetInfo,
  createSeniorRiskGoogleForm,
  createSeniorRiskGoogleSheet,
  appendRecordToGoogleSheet,
  fetchGoogleFormResponses,
  fetchRecordsFromGoogleSheet,
  uploadHazardPhotoToDrive,
  hydrateRecordsPhotosWithToken,
  findAndConnectUserGoogleSheet,
  loadRoadHazardsSync,
  loadRoadHazardsAsync,
  saveRoadHazardsLocally,
  appendRoadHazardToGoogleSheet,
  fetchRoadHazardsFromGoogleSheet,
} from './services/workspaceService';
import {
  downloadExcelTemplate,
  downloadMyMapsCSV,
  downloadMyMapsKML,
  parseRecordsFromSpreadsheetFile,
  fetchAttachedSheetTemplateRecords,
} from './services/exportService';
import { SeniorRiskMap } from './components/SeniorRiskMap';
import { AssessmentFormWizard } from './components/AssessmentFormWizard';
import { WorkspaceManager } from './components/WorkspaceManager';
import { ManualGuideView } from './components/ManualGuideView';
import { SeniorSummaryCardModal } from './components/SeniorSummaryCardModal';
import { FullAssessmentResponseModal } from './components/FullAssessmentResponseModal';
import { RiskDistributionChart } from './components/RiskDistributionChart';
import { RiskTrendLineChart } from './components/RiskTrendLineChart';
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  LogOut,
  Printer,
  Camera,
  AlertTriangle,
  Layers,
  Crosshair,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  Link2,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';

type ActiveTab = 'DASHBOARD' | 'FORM' | 'WORKSPACE' | 'GUIDE';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [records, setRecords] = useState<AssessmentRecord[]>(INITIAL_RECORDS);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    INITIAL_RECORDS[0]?.id || null
  );

  // Road Hazard Layer state (persisted in localStorage + IndexedDB + Google Sheets)
  const [roadHazards, setRoadHazards] = useState<RoadHazardPoint[]>(() =>
    loadRoadHazardsSync()
  );
  const [showSeniorHomesLayer, setShowSeniorHomesLayer] = useState(true);
  const [showRoadHazardsLayer, setShowRoadHazardsLayer] = useState(true);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [isAddingHazard, setIsAddingHazard] = useState(false);
  const [isSavingHazard, setIsSavingHazard] = useState(false);
  const [savingHazardStep, setSavingHazardStep] = useState<string>('');
  const [newHazardTitle, setNewHazardTitle] = useState('');
  const [newHazardType, setNewHazardType] =
    useState<RoadHazardType>('BLIND_SPOT');
  const [newHazardSeverity, setNewHazardSeverity] =
    useState<RoadHazardSeverity>('CRITICAL');
  const [newHazardLat, setNewHazardLat] = useState<string>('8.43320');
  const [newHazardLng, setNewHazardLng] = useState<string>('99.96610');
  const [newHazardDesc, setNewHazardDesc] = useState('');
  const [newHazardAction, setNewHazardAction] = useState('');
  const [newHazardAgency, setNewHazardAgency] = useState(
    'กองช่าง อบต./เทศบาล และหมวดทางหลวง'
  );
  const [newHazardPhoto, setNewHazardPhoto] = useState<string | undefined>(
    undefined
  );

  // Toast Notification state
  const [toastNotification, setToastNotification] = useState<{
    id: number;
    title: string;
    message: string;
    variant: 'SUCCESS' | 'INFO';
  } | null>(null);

  const showToast = (
    title: string,
    message: string,
    variant: 'SUCCESS' | 'INFO' = 'SUCCESS'
  ) => {
    const toastId = Date.now();
    setToastNotification({ id: toastId, title, message, variant });
    window.setTimeout(() => {
      setToastNotification((prev) => (prev?.id === toastId ? null : prev));
    }, 5000);
  };

  // Filtering & Search state for the Responses table
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevelCode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [printingRecord, setPrintingRecord] =
    useState<AssessmentRecord | null>(null);
  const [viewingFullRecord, setViewingFullRecord] =
    useState<AssessmentRecord | null>(null);
  const [editingRecord, setEditingRecord] =
    useState<AssessmentRecord | null>(null);
  const [deletingRecord, setDeletingRecord] =
    useState<AssessmentRecord | null>(null);

  // Email Auth Gate for Edit/Delete/Workspace/Guide/Excel/FullResponse actions
  const [authRequiredPrompt, setAuthRequiredPrompt] = useState<{
    isOpen: boolean;
    actionType:
      | 'EDIT'
      | 'DELETE'
      | 'DELETE_HAZARD'
      | 'WORKSPACE_ACCESS'
      | 'GUIDE_ACCESS'
      | 'DOWNLOAD_EXCEL'
      | 'VIEW_FULL_RESPONSE';
    targetRecord?: AssessmentRecord;
    targetHazardId?: string;
    targetHazardTitle?: string;
  }>({
    isOpen: false,
    actionType: 'EDIT',
  });

  // Auth & Google Workspace state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [autoSyncMessage, setAutoSyncMessage] = useState<string | null>(null);
  const [quickSheetUrlInput, setQuickSheetUrlInput] = useState('');
  const [provisionedForm, setProvisionedForm] =
    useState<ProvisionedFormInfo | null>(() => {
      try {
        const saved = localStorage.getItem('senior_risk_connected_form_v1');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    });
  const [provisionedSheet, setProvisionedSheet] =
    useState<ProvisionedSheetInfo | null>(() => {
      try {
        const saved = localStorage.getItem('senior_risk_connected_sheet_v1');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    });

  const saveProvisionedSheet = (sheet: ProvisionedSheetInfo | null) => {
    setProvisionedSheet(sheet);
    try {
      if (sheet) {
        localStorage.setItem(
          'senior_risk_connected_sheet_v1',
          JSON.stringify(sheet)
        );
      } else {
        localStorage.removeItem('senior_risk_connected_sheet_v1');
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  const saveProvisionedForm = (form: ProvisionedFormInfo | null) => {
    setProvisionedForm(form);
    try {
      if (form) {
        localStorage.setItem(
          'senior_risk_connected_form_v1',
          JSON.stringify(form)
        );
      } else {
        localStorage.removeItem('senior_risk_connected_form_v1');
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  const mergeSyncedRecordsWithLocalPhotos = (
    incoming: AssessmentRecord[],
    existing: AssessmentRecord[]
  ): AssessmentRecord[] => {
    return incoming.map((inc) => {
      const incName = String(inc.answers['q2_2'] || '').trim();
      const localMatch = existing.find(
        (ex) =>
          ex.id === inc.id ||
          (incName && String(ex.answers['q2_2'] || '').trim() === incName)
      );
      if (
        localMatch &&
        localMatch.photos &&
        localMatch.photos.length > 0 &&
        (!inc.photos || inc.photos.length === 0)
      ) {
        return { ...inc, photos: localMatch.photos };
      }
      return inc;
    });
  };

  /**
   * Automatically pulls the database from the attached Google Sheet template
   * and/or the user's live Google Sheet in Google Drive upon email login.
   */
  const runAutoSyncDatabase = async (
    accessToken?: string | null,
    userEmail?: string | null,
    overrideSheetId?: string
  ) => {
    setIsAutoSyncing(true);
    try {
      // 1. Always load the attached Google Sheets dataset (`/assets/aistudio/senior_risk_assessment_template_d039f233`)
      const attachedRecords = await fetchAttachedSheetTemplateRecords();
      let combinedRecords =
        attachedRecords.length > 0
          ? ensureUniqueRecordIds(
              mergeSyncedRecordsWithLocalPhotos(attachedRecords, INITIAL_RECORDS)
            )
          : INITIAL_RECORDS;

      let liveSyncedCount = 0;
      let activeSheetInfo: ProvisionedSheetInfo | null = provisionedSheet;

      // 2. If signed in with Google email, automatically discover & pull from Google Sheets API + hydrate Drive photos
      if (accessToken) {
        const preferredId =
          overrideSheetId || provisionedSheet?.spreadsheetId || undefined;
        const discoveredSheet = await findAndConnectUserGoogleSheet(
          accessToken,
          preferredId
        );

        if (discoveredSheet) {
          activeSheetInfo = discoveredSheet;
          saveProvisionedSheet(discoveredSheet);
          try {
            const sheetRows = await fetchRecordsFromGoogleSheet(
              accessToken,
              discoveredSheet.spreadsheetId
            );
            if (sheetRows.length > 0) {
              liveSyncedCount = sheetRows.length;
              combinedRecords = ensureUniqueRecordIds([
                ...mergeSyncedRecordsWithLocalPhotos(sheetRows, combinedRecords),
                ...combinedRecords,
              ]);
            }

            // Also sync road hazards from Google Sheet if present, merging with locally saved hazards
            try {
              const sheetHazards = await fetchRoadHazardsFromGoogleSheet(
                accessToken,
                discoveredSheet.spreadsheetId
              );
              if (sheetHazards.length > 0) {
                const localStoredHazards = await loadRoadHazardsAsync();
                const mergedMap = new Map<string, RoadHazardPoint>();
                for (const h of localStoredHazards) {
                  mergedMap.set(h.id, h);
                }
                for (const sh of sheetHazards) {
                  const existingLocal = mergedMap.get(sh.id);
                  mergedMap.set(sh.id, {
                    ...sh,
                    photoDataUrl:
                      sh.photoDataUrl || existingLocal?.photoDataUrl,
                  });
                }
                const mergedHazards = Array.from(mergedMap.values());
                setRoadHazards(mergedHazards);
                await saveRoadHazardsLocally(mergedHazards);
              }
            } catch {
              // Keep local road hazards
            }
          } catch (sheetErr) {
            console.warn(
              'Auto-sync from live Google Sheet encountered an issue, using attached dataset:',
              sheetErr
            );
          }
        }

        // Hydrate Google Drive photo links (e.g., SNR-0614 นายทรงศักดิ์ ยุทธชัย) using the user's OAuth token
        combinedRecords = await hydrateRecordsPhotosWithToken(
          accessToken,
          combinedRecords
        );
      }

      setRecords(combinedRecords);

      // Focus SNR-0614 (นายทรงศักดิ์ ยุทธชัย) or the latest record with photos so it's immediately visible on the map
      const songSakRecord = combinedRecords.find(
        (r) =>
          r.id === 'SNR-0614' ||
          String(r.answers['q2_2'] || '').includes('ทรงศักดิ์')
      );
      const recordWithPhotos =
        songSakRecord ||
        combinedRecords.find((r) => r.photos && r.photos.length > 0) ||
        combinedRecords[0];
      if (recordWithPhotos) {
        setSelectedRecordId(recordWithPhotos.id);
      }

      if (accessToken) {
        const sheetLabel = activeSheetInfo
          ? `Google Sheets (${activeSheetInfo.title})`
          : 'ฐานข้อมูล Google Sheets ที่แนบ (senior_risk_assessment_template)';
        setAutoSyncMessage(
          `เข้าระบบด้วยอีเมล ${
            userEmail || 'บัญชี Google'
          } สำเร็จ · ดึงฐานข้อมูลอัตโนมัติจาก ${sheetLabel} จำนวน ${
            liveSyncedCount > 0 ? liveSyncedCount : combinedRecords.length
          } รายการเรียบร้อยแล้ว`
        );
      } else if (attachedRecords.length > 0) {
        setAutoSyncMessage(
          `โหลดฐานข้อมูลจาก Google Sheets ที่แนบ (senior_risk_assessment_template) จำนวน ${combinedRecords.length} รายการโดยอัตโนมัติเรียบร้อยแล้ว`
        );
      }
    } catch (err) {
      console.error('Auto-sync failed:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Load attached Google Sheets dataset & persisted Road Hazards automatically on mount, and listen for Google Auth state
  useEffect(() => {
    loadRoadHazardsAsync().then((savedHazards) => {
      if (savedHazards && savedHazards.length > 0) {
        setRoadHazards(savedHazards);
      }
    });

    runAutoSyncDatabase(null, null);

    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        runAutoSyncDatabase(token, authedUser.email);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        await runAutoSyncDatabase(result.accessToken, result.user.email);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setAutoSyncMessage(null);
  };

  const ensureValidToken = async (): Promise<string> => {
    let token = await getAccessToken();
    if (!token) {
      const loginRes = await googleSignIn();
      if (!loginRes?.accessToken) {
        throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชี Google ก่อนดำเนินการ');
      }
      setUser(loginRes.user);
      token = loginRes.accessToken;
    }
    return token;
  };

  const handleCreateGoogleForm = async () => {
    const token = await ensureValidToken();
    const formInfo = await createSeniorRiskGoogleForm(token);
    saveProvisionedForm(formInfo);
  };

  const handleCreateGoogleSheet = async () => {
    const token = await ensureValidToken();
    const sheetInfo = await createSeniorRiskGoogleSheet(token, records);
    saveProvisionedSheet(sheetInfo);
  };

  const handleConnectExistingSheet = (spreadsheetId: string) => {
    const match = spreadsheetId.trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = match ? match[1] : spreadsheetId.trim();
    if (!cleanId) return;

    const newSheetInfo: ProvisionedSheetInfo = {
      spreadsheetId: cleanId,
      title: 'senior_risk_assessment_template (เชื่อมต่ออัตโนมัติ)',
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
      sheetName: 'ข้อมูลการประเมิน (Responses)',
      createdAt: new Date().toLocaleString('th-TH'),
    };
    saveProvisionedSheet(newSheetInfo);

    // If user is signed in, immediately pull the database from this newly linked sheet
    getAccessToken().then((token) => {
      if (token) {
        runAutoSyncDatabase(token, user?.email, cleanId);
      }
    });
  };

  const handleQuickConnectSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickSheetUrlInput.trim();
    if (!raw) return;
    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = match ? match[1] : raw;
    setQuickSheetUrlInput('');
    handleConnectExistingSheet(cleanId);
    try {
      const token = await ensureValidToken();
      await runAutoSyncDatabase(token, user?.email, cleanId);
    } catch (err) {
      console.error('Quick sheet sync failed:', err);
    }
  };

  const handleSyncFormResponses = async () => {
    if (!provisionedForm) {
      throw new Error('กรุณาสร้างหรือเชื่อมต่อ Google Form ก่อนซิงก์คำตอบ');
    }
    const token = await ensureValidToken();
    const fetched = await fetchGoogleFormResponses(
      token,
      provisionedForm.formId
    );
    if (fetched.length > 0) {
      setRecords((prev) => {
        const merged = [...fetched, ...prev];
        return ensureUniqueRecordIds(merged);
      });
    }
  };

  const handleSyncSheetRecords = async (): Promise<number> => {
    const token = await ensureValidToken();
    if (!provisionedSheet) {
      await runAutoSyncDatabase(token, user?.email);
      return records.length;
    }
    const fetched = await fetchRecordsFromGoogleSheet(
      token,
      provisionedSheet.spreadsheetId
    );
    if (fetched.length > 0) {
      setRecords((prev) => {
        const merged = mergeSyncedRecordsWithLocalPhotos(fetched, prev);
        return ensureUniqueRecordIds([...merged, ...prev]);
      });
      const recordWithPhotos =
        fetched.find((r) => r.photos && r.photos.length > 0) || fetched[0];
      setSelectedRecordId(recordWithPhotos?.id || null);
      setAutoSyncMessage(
        `ดึงข้อมูลล่าสุดจาก Google Sheets (${provisionedSheet.title}) จำนวน ${fetched.length} รายการเรียบร้อยแล้ว`
      );
    }
    return fetched.length;
  };

  const handleImportSpreadsheetFile = async (file: File): Promise<number> => {
    const imported = await parseRecordsFromSpreadsheetFile(file);
    if (imported.length > 0) {
      setRecords((prev) => {
        const merged = mergeSyncedRecordsWithLocalPhotos(imported, prev);
        const importedNames = new Set(
          merged.map((m) => `${m.id}::${String(m.answers['q2_2'] || '')}`)
        );
        const remainingPrev = prev.filter(
          (p) => !importedNames.has(`${p.id}::${String(p.answers['q2_2'] || '')}`)
        );
        return ensureUniqueRecordIds([...merged, ...remainingPrev]);
      });
      const recordWithPhotos =
        imported.find((r) => r.photos && r.photos.length > 0) || imported[0];
      setSelectedRecordId(recordWithPhotos?.id || null);
    }
    return imported.length;
  };

  const handleSaveNewAssessment = async (
    newRecord: AssessmentRecord,
    syncToGoogleSheet: boolean,
    uploadPhotosToDrive: boolean
  ): Promise<AssessmentRecord> => {
    if (editingRecord && !user) {
      throw new Error('จำเป็นต้องเข้าสู่ระบบผ่าน Email ก่อนบันทึกการแก้ไขข้อมูลในฐานข้อมูล');
    }

    const nextRowNumber = records.length + 2;
    let finalRecord = newRecord;

    const shouldUploadPhotos =
      (uploadPhotosToDrive || (syncToGoogleSheet && Boolean(provisionedSheet))) &&
      Boolean(newRecord.photos && newRecord.photos.length > 0);

    if (shouldUploadPhotos || (syncToGoogleSheet && provisionedSheet)) {
      const token = await ensureValidToken();

      if (shouldUploadPhotos && newRecord.photos && newRecord.photos.length > 0) {
        const seniorName = String(newRecord.answers['q2_2'] || newRecord.id);
        const uploadedPhotos: HazardPhotoAttachment[] = [];
        for (const photo of newRecord.photos) {
          if (photo.driveViewLink || (photo.dataUrl && photo.dataUrl.startsWith('http'))) {
            uploadedPhotos.push(photo);
            continue;
          }
          try {
            const driveRes = await uploadHazardPhotoToDrive(
              token,
              `hazard_${newRecord.id}_${photo.category.toLowerCase()}_${photo.id}.jpg`,
              photo.dataUrl,
              `จุดเสี่ยงหน้าบ้านผู้สูงอายุ: ${seniorName} (${photo.caption})`
            );
            uploadedPhotos.push({
              ...photo,
              driveFileId: driveRes.fileId,
              driveViewLink: driveRes.webViewLink,
            });
          } catch (err) {
            console.warn('Could not upload photo to Drive, keeping local dataUrl:', err);
            uploadedPhotos.push(photo);
          }
        }
        finalRecord = {
          ...newRecord,
          photos: uploadedPhotos,
        };
      }

      if (syncToGoogleSheet && provisionedSheet) {
        await appendRecordToGoogleSheet(
          token,
          provisionedSheet.spreadsheetId,
          finalRecord,
          nextRowNumber
        );
      }
    }

    setRecords((prev) => {
      const exists = prev.some((r) => r.id === finalRecord.id);
      const updated = exists
        ? prev.map((r) => (r.id === finalRecord.id ? finalRecord : r))
        : [finalRecord, ...prev];
      return ensureUniqueRecordIds(updated);
    });
    setEditingRecord(null);
    setSelectedRecordId(finalRecord.id);
    return finalRecord;
  };

  const handleLoginFromPrompt = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        await runAutoSyncDatabase(result.accessToken, result.user.email);
        const currentPrompt = { ...authRequiredPrompt };
        setAuthRequiredPrompt({ isOpen: false, actionType: 'EDIT' });

        if (currentPrompt.actionType === 'EDIT' && currentPrompt.targetRecord) {
          setEditingRecord(currentPrompt.targetRecord);
          setActiveTab('FORM');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (
          currentPrompt.actionType === 'DELETE' &&
          currentPrompt.targetRecord
        ) {
          setDeletingRecord(currentPrompt.targetRecord);
        } else if (
          currentPrompt.actionType === 'DELETE_HAZARD' &&
          currentPrompt.targetHazardId
        ) {
          handleDeleteRoadHazard(currentPrompt.targetHazardId);
        } else if (currentPrompt.actionType === 'WORKSPACE_ACCESS') {
          setActiveTab('WORKSPACE');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentPrompt.actionType === 'GUIDE_ACCESS') {
          setActiveTab('GUIDE');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentPrompt.actionType === 'DOWNLOAD_EXCEL') {
          downloadExcelTemplate(records, roadHazards);
        } else if (
          currentPrompt.actionType === 'VIEW_FULL_RESPONSE' &&
          currentPrompt.targetRecord
        ) {
          setViewingFullRecord(currentPrompt.targetRecord);
        }
      }
    } catch (err) {
      console.error('Login from prompt failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRequestOpenWorkspace = () => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'WORKSPACE_ACCESS',
      });
      return;
    }
    setActiveTab('WORKSPACE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestOpenGuide = () => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'GUIDE_ACCESS',
      });
      return;
    }
    setActiveTab('GUIDE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestDownloadExcel = () => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'DOWNLOAD_EXCEL',
      });
      return;
    }
    downloadExcelTemplate(records, roadHazards);
  };

  const handleSwitchTab = (tab: ActiveTab) => {
    if (tab === 'WORKSPACE') {
      handleRequestOpenWorkspace();
      return;
    }
    if (tab === 'GUIDE') {
      handleRequestOpenGuide();
      return;
    }
    setActiveTab(tab);
  };

  const handleRequestViewFullResponse = (rec: AssessmentRecord) => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'VIEW_FULL_RESPONSE',
        targetRecord: rec,
      });
      return;
    }
    setViewingFullRecord(rec);
  };

  const handleRequestEditRecord = (rec: AssessmentRecord) => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'EDIT',
        targetRecord: rec,
      });
      return;
    }
    setEditingRecord(rec);
    setActiveTab('FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestDeleteRecord = (rec: AssessmentRecord) => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'DELETE',
        targetRecord: rec,
      });
      return;
    }
    setDeletingRecord(rec);
  };

  const handleRequestDeleteHazard = (hazardId: string, title?: string) => {
    if (!user) {
      setAuthRequiredPrompt({
        isOpen: true,
        actionType: 'DELETE_HAZARD',
        targetHazardId: hazardId,
        targetHazardTitle: title || hazardId,
      });
      return;
    }
    handleDeleteRoadHazard(hazardId);
  };

  const handleConfirmDeleteRecord = () => {
    if (!user) {
      const rec = deletingRecord;
      setDeletingRecord(null);
      if (rec) {
        setAuthRequiredPrompt({
          isOpen: true,
          actionType: 'DELETE',
          targetRecord: rec,
        });
      }
      return;
    }
    if (!deletingRecord) return;
    const targetId = deletingRecord.id;
    setRecords((prev) => prev.filter((r) => r.id !== targetId));
    if (selectedRecordId === targetId) {
      setSelectedRecordId(null);
    }
    if (editingRecord?.id === targetId) {
      setEditingRecord(null);
    }
    if (printingRecord?.id === targetId) {
      setPrintingRecord(null);
    }
    setDeletingRecord(null);
  };

  const handleDeleteRoadHazard = (hazardId: string) => {
    const target = roadHazards.find((h) => h.id === hazardId);
    setRoadHazards((prev) => {
      const next = prev.filter((h) => h.id !== hazardId);
      saveRoadHazardsLocally(next);
      return next;
    });
    if (selectedHazardId === hazardId) {
      setSelectedHazardId(null);
    }
    showToast(
      'ลบหมุดจุดเสี่ยงสำเร็จ',
      `ลบหมุดจุดเสี่ยง "${target?.title || hazardId}" ออกจากแผนที่และฐานข้อมูลเรียบร้อยแล้ว`,
      'INFO'
    );
  };

  const handleUpdateRecordPhotos = async (
    recordId: string,
    nextPhotos: HazardPhotoAttachment[],
    uploadToDrive: boolean
  ) => {
    let updatedPhotos = nextPhotos;
    if (uploadToDrive && nextPhotos.length > 0) {
      const token = await ensureValidToken();
      const targetRec = records.find((r) => r.id === recordId);
      const seniorName = String(targetRec?.answers['q2_2'] || recordId);
      const uploadedList: HazardPhotoAttachment[] = [];
      for (const photo of nextPhotos) {
        if (photo.driveViewLink) {
          uploadedList.push(photo);
          continue;
        }
        const driveRes = await uploadHazardPhotoToDrive(
          token,
          `hazard_${recordId}_${photo.category.toLowerCase()}_${photo.id}.jpg`,
          photo.dataUrl,
          `จุดเสี่ยงหน้าบ้านผู้สูงอายุ: ${seniorName} (${photo.caption})`
        );
        uploadedList.push({
          ...photo,
          driveFileId: driveRes.fileId,
          driveViewLink: driveRes.webViewLink,
        });
      }
      updatedPhotos = uploadedList;
    }

    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === recordId ? { ...rec, photos: updatedPhotos } : rec
      )
    );
    setPrintingRecord((prev) =>
      prev && prev.id === recordId ? { ...prev, photos: updatedPhotos } : prev
    );
  };

  const handleUpdateHazardStatus = (
    hazardId: string,
    status: RoadHazardStatus
  ) => {
    setRoadHazards((prev) => {
      const next = prev.map((h) => (h.id === hazardId ? { ...h, status } : h));
      saveRoadHazardsLocally(next);
      return next;
    });
    showToast(
      'บันทึกสำเร็จ',
      `อัปเดตสถานะหมุดจุดเสี่ยง ${hazardId} เป็น "${ROAD_HAZARD_STATUS_LABELS[status]}" เรียบร้อยแล้ว`,
      'SUCCESS'
    );
  };

  const handleHazardPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setNewHazardPhoto(canvas.toDataURL('image/jpeg', 0.82));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGetCurrentGpsForHazard = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewHazardLat(pos.coords.latitude.toFixed(5));
        setNewHazardLng(pos.coords.longitude.toFixed(5));
      },
      () => {
        // Keep current coordinates if permission denied
      }
    );
  };

  const handleCreateRoadHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingHazard) return;

    const latNum = Number(newHazardLat);
    const lngNum = Number(newHazardLng);
    if (!newHazardTitle.trim() || isNaN(latNum) || isNaN(lngNum)) return;

    setIsSavingHazard(true);
    setSavingHazardStep(
      'กำลังประมวลผลพิกัด GPS และจัดเก็บข้อมูลลงฐานข้อมูลถาวร...'
    );

    try {
      // Short visual pause so user clearly sees the Saving Indicator state
      await new Promise((resolve) => setTimeout(resolve, 420));

      // Generate unique non-colliding HAZ-xxx ID
      const existingNums = roadHazards
        .map((h) => {
          const m = h.id.match(/HAZ-(\d+)/i);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
      const nextId = `HAZ-${String(maxNum + 1).padStart(3, '0')}`;

      let driveFileId: string | undefined = undefined;
      let driveViewLink: string | undefined = undefined;

      // If signed in with Google email, also upload photo to Google Drive & sync to Google Sheets
      if (user) {
        try {
          const token = await getAccessToken();
          if (token) {
            if (newHazardPhoto && newHazardPhoto.startsWith('data:image')) {
              setSavingHazardStep(
                'กำลังอัปโหลดรูปภาพจุดเสี่ยงขึ้น Google Drive...'
              );
              const driveRes = await uploadHazardPhotoToDrive(
                token,
                `road_hazard_${nextId}_${Date.now()}.jpg`,
                newHazardPhoto,
                `จุดเสี่ยงบนถนน: ${newHazardTitle.trim()} (${nextId})`
              );
              driveFileId = driveRes.fileId;
              driveViewLink = driveRes.webViewLink;
            }
          }
        } catch (driveErr) {
          console.warn(
            'Could not upload road hazard photo to Drive, keeping local IndexedDB copy:',
            driveErr
          );
        }
      }

      const created: RoadHazardPoint = {
        id: nextId,
        title: newHazardTitle.trim(),
        type: newHazardType,
        severity: newHazardSeverity,
        status: 'REPORTED',
        lat: latNum,
        lng: lngNum,
        description:
          newHazardDesc.trim() || ROAD_HAZARD_TYPE_LABELS[newHazardType],
        recommendedAction:
          newHazardAction.trim() ||
          'ประสานกองช่าง อบต./เทศบาล และหมวดทางหลวงลงพื้นที่ตรวจสอบและแก้ไข',
        responsibleAgency:
          newHazardAgency.trim() || 'กองช่าง อบต./เทศบาล และหมวดทางหลวง',
        reportedBy:
          user?.displayName || user?.email || 'เจ้าหน้าที่ชุดสำรวจภาคสนาม',
        reportedDate: new Date().toISOString().slice(0, 10),
        photoDataUrl: newHazardPhoto,
        driveFileId,
        driveViewLink,
      };

      // Update React State and persist immediately to localStorage + IndexedDB
      const nextList = [created, ...roadHazards];
      setRoadHazards(nextList);
      await saveRoadHazardsLocally(nextList);

      // If connected to a Google Sheet and signed in, append to the Road Hazards sheet tab
      if (user && provisionedSheet?.spreadsheetId) {
        try {
          const token = await getAccessToken();
          if (token) {
            setSavingHazardStep(
              'กำลังซิงก์ข้อมูลลงแผ่นงาน ทะเบียนจุดเสี่ยงบนถนน (Google Sheets)...'
            );
            await appendRoadHazardToGoogleSheet(
              token,
              provisionedSheet.spreadsheetId,
              created
            );
          }
        } catch (sheetErr) {
          console.warn('Could not append road hazard to Google Sheet:', sheetErr);
        }
      }

      setSelectedHazardId(created.id);
      setSelectedRecordId(null);
      setShowRoadHazardsLayer(true);
      setIsAddingHazard(false);
      setNewHazardTitle('');
      setNewHazardDesc('');
      setNewHazardAction('');
      setNewHazardPhoto(undefined);

      showToast(
        'บันทึกสำเร็จ',
        `บันทึกหมุดจุดเสี่ยง "${created.title}" (${created.id})${
          created.photoDataUrl ? ' พร้อมรูปภาพ' : ''
        } ลงในแผนที่ GIS และฐานข้อมูลถาวรเรียบร้อยแล้ว (เปิดแอปใหม่ข้อมูลไม่สูญหาย)`,
        'SUCCESS'
      );
    } finally {
      setIsSavingHazard(false);
      setSavingHazardStep('');
    }
  };

  // Filtered records for Dashboard table and GIS map
  const filteredRecords = records.filter((rec) => {
    const matchesRisk =
      riskFilter === 'ALL' || rec.riskLevel === riskFilter;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesRisk;

    const name = String(rec.answers['q2_2'] || '').toLowerCase();
    const address = String(rec.answers['q2_4'] || '').toLowerCase();
    const evaluator = String(rec.answers['q1_2'] || '').toLowerCase();
    const id = String(rec.answers['q2_1'] || rec.id).toLowerCase();

    return (
      matchesRisk &&
      (name.includes(query) ||
        address.includes(query) ||
        evaluator.includes(query) ||
        id.includes(query))
    );
  });

  const countRed = records.filter((r) => r.riskLevel === 'RED').length;
  const countYellow = records.filter((r) => r.riskLevel === 'YELLOW').length;
  const countGreen = records.filter((r) => r.riskLevel === 'GREEN').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('DASHBOARD');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Senior Crossing Risk & GIS
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'DASHBOARD'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            แดชบอร์ดและแผนที่ GIS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FORM')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'FORM'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            แบบประเมิน 5 ส่วน
          </button>
          <button
            type="button"
            onClick={handleRequestOpenWorkspace}
            title={
              user
                ? 'เปิดหน้าสร้างและเชื่อมต่อ Google Form & Sheets'
                : 'ต้องเข้าสู่ระบบด้วย Sign in with Google ก่อนเข้าถึงหน้านี้'
            }
            className={`py-1 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'WORKSPACE'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            {!user && <Lock className="w-3.5 h-3.5 text-amber-600" />}
            <span>สร้าง Google Form & Sheets</span>
          </button>
          <button
            type="button"
            onClick={handleRequestOpenGuide}
            title={
              user
                ? 'เปิดหน้าคู่มือและแม่แบบ Excel'
                : 'ต้องเข้าสู่ระบบด้วย Sign in with Google ก่อนเข้าถึงหน้านี้'
            }
            className={`py-1 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'GUIDE'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            {!user && <Lock className="w-3.5 h-3.5 text-amber-600" />}
            <span>คู่มือและแม่แบบ Excel</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action (Sign in with Google / Account button) */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={handleGoogleLogout}
              title={`เชื่อมต่อแล้ว: ${user.email || user.displayName}`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{user.displayName || user.email || 'บัญชี Google'}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button"
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
                  {isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 ${
            activeTab === 'DASHBOARD'
              ? 'bg-blue-700 text-white'
              : 'text-slate-600'
          }`}
        >
          แดชบอร์ด & แผนที่
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('FORM')}
          className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 ${
            activeTab === 'FORM' ? 'bg-blue-700 text-white' : 'text-slate-600'
          }`}
        >
          แบบประเมิน 5 ส่วน
        </button>
        <button
          type="button"
          onClick={handleRequestOpenWorkspace}
          className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
            activeTab === 'WORKSPACE'
              ? 'bg-blue-700 text-white'
              : 'text-slate-600'
          }`}
        >
          {!user && <Lock className="w-3 h-3 text-amber-600" />}
          <span>Google Form & Sheets</span>
        </button>
        <button
          type="button"
          onClick={handleRequestOpenGuide}
          className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
            activeTab === 'GUIDE' ? 'bg-blue-700 text-white' : 'text-slate-600'
          }`}
        >
          {!user && <Lock className="w-3 h-3 text-amber-600" />}
          <span>คู่มือ & .xlsx</span>
        </button>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'DASHBOARD' && (
          <>
            {/* Top Workspace Action Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    ระบบคัดกรองและประเมินความเสี่ยงการข้ามถนนของผู้สูงอายุ (Senior Road Crossing Risk & GIS)
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    ระบบประเมินความเสี่ยง 5 ส่วน 6 มิติ เชื่อมต่อ Google Forms · Google Sheets (<code className="font-mono">senior_risk_assessment_template</code>) · แผนที่พิกัด GIS ชุมชนอัตโนมัติเมื่อเข้าสู่ระบบอีเมล
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('FORM')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ประเมินผู้สูงอายุรายใหม่ (5 ส่วน)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestOpenWorkspace}
                    title={
                      user
                        ? 'สร้าง Google Form & Sheets อัตโนมัติ'
                        : 'ต้องเข้าสู่ระบบด้วย Sign in with Google ก่อนเข้าถึงหน้านี้'
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    {user ? (
                      <FileText className="w-4 h-4 text-blue-700" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>สร้าง Google Form & Sheets อัตโนมัติ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestDownloadExcel}
                    title={
                      user
                        ? 'ดาวน์โหลดไฟล์ senior_risk_assessment_template.xlsx'
                        : 'ต้องเข้าสู่ระบบด้วย Sign in with Google ก่อนดาวน์โหลดไฟล์ .xlsx'
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    {user ? (
                      <Download className="w-4 h-4" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-200" />
                    )}
                    <span>ดาวน์โหลด senior_risk_assessment_template.xlsx</span>
                  </button>
                </div>
              </div>

              {/* Automatic Database Access & Permission Policy Banner */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 rounded-md p-3">
                <div className="flex items-center gap-2.5 text-xs">
                  {user ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                      <span>
                        {isAutoSyncing
                          ? 'กำลังซิงก์ฐานข้อมูลจาก Google Sheets อัตโนมัติ...'
                          : autoSyncMessage ||
                            `เข้าถึงฐานข้อมูล Google Sheets อัตโนมัติ (${records.length} รายการ)`}
                      </span>
                      {user ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          สิทธิ์ผู้ดูแลระบบ (แก้ไขและลบข้อมูลได้)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-blue-700" />
                          <span>เข้าดูข้อมูลอิสระ · แก้ไข/ลบต้องผ่าน Email</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {user ? (
                        <span>
                          เข้าสู่ระบบด้วย Email: <strong>{user.email}</strong> · คุณได้รับสิทธิ์เต็มในการแก้ไขข้อมูล, ลบข้อมูล, และบันทึกผลการประเมินลง Google Sheets & Drive
                        </span>
                      ) : (
                        <span>
                          ฐานข้อมูล Google Sheets และแผนที่ GIS เปิดให้เข้าถึงได้อัตโนมัติทุกคน · หากต้องการ <strong>แก้ไข</strong> หรือ <strong>ลบ</strong> ข้อมูลในระบบ จะต้องลงชื่อเข้าใช้ผ่าน Email เท่านั้น
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form
                    onSubmit={handleQuickConnectSheetSubmit}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={quickSheetUrlInput}
                      onChange={(e) => setQuickSheetUrlInput(e.target.value)}
                      placeholder="วางลิงก์ Google Sheets เพื่อผูกซิงก์อัตโนมัติ..."
                      className="w-56 sm:w-64 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isAutoSyncing}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
                    >
                      <Link2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>ผูกลิงก์ชีต</span>
                    </button>
                  </form>

                  {user ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const token = await ensureValidToken();
                        await runAutoSyncDatabase(token, user.email);
                      }}
                      disabled={isAutoSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`}
                      />
                      <span>ซิงก์ฐานข้อมูลล่าสุด</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>เข้าสู่ระบบอีเมลเพื่อซิงก์อัตโนมัติ</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4-Column Full-Width KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs text-slate-500">
                  ผู้สูงอายุที่ได้รับการคัดกรองทั้งหมด
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                  {records.length} ราย
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  บันทึกพิกัด GPS พร้อมปักหมุดแผนที่ชุมชน
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-red-700">
                  🔴 กลุ่มเสี่ยงสูง / วิกฤต (Red Light)
                </div>
                <div className="text-2xl font-bold text-red-700 font-mono tabular-nums mt-1">
                  {countRed} ราย
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  คะแนนรวม ≥ 16 หรือไม่ใช้สะพานข้ามร่องกลาง · ต้องมีเพื่อนช่วยพาข้าม
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-amber-700">
                  🟡 กลุ่มเสี่ยงปานกลาง (Yellow Light)
                </div>
                <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                  {countYellow} ราย
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  คะแนนรวม 8–15 คะแนน · ส่งตัดแว่นและอบรมประเมินความเร็วรถ
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-emerald-700">
                  🟢 กลุ่มเสี่ยงต่ำ (Green Light)
                </div>
                <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                  {countGreen} ราย
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  คะแนนรวม 0–7 คะแนน · ส่งเสริมเป็น อสม. แกนนำผู้สูงวัยปลอดภัย
                </div>
              </div>
            </div>

            {/* Interactive Recharts Pie Chart & 6-Dimension Breakdown */}
            <RiskDistributionChart
              records={records}
              activeRiskFilter={riskFilter}
              onSelectRiskFilter={setRiskFilter}
            />

            {/* Interactive Recharts Line Chart: Timeline of Risk Scores & Village Spatial Risk Comparison */}
            <RiskTrendLineChart
              records={records}
              activeSearchQuery={searchQuery}
              onSelectVillageFilter={(villageKeyword) => setSearchQuery(villageKeyword)}
            />

            {/* Interactive GIS Map & Road Hazard Layer */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    แผนที่พิกัดบ้านผู้สูงอายุและชั้นข้อมูลจุดเสี่ยงบนถนน (Community GIS & Road Hazard Layer)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    สลับชั้นข้อมูล (Layers) เพื่อดูพิกัดบ้านผู้สูงอายุคู่กับจุดเสี่ยงทางกายภาพบนถนน 4 เลน พร้อมปักหมุดแจ้งจุดเสี่ยงให้ อบต./หมวดทางหลวงแก้ไข
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {provisionedSheet && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSyncSheetRecords().catch((err) =>
                          console.error(err)
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ซิงก์ข้อมูลและรูปหน้าบ้านจาก Google Sheets</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadMyMapsKML(filteredRecords, roadHazards)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>ส่งออก .KML (2 ชั้นข้อมูล) สำหรับ My Maps</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadMyMapsCSV(filteredRecords)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ส่งออก .CSV สำหรับ My Maps</span>
                  </button>
                </div>
              </div>

              {/* GIS Layer Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-blue-700" />
                    <span>ชั้นข้อมูลแผนที่ (GIS Layers):</span>
                  </span>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-medium text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-300">
                    <input
                      type="checkbox"
                      checked={showSeniorHomesLayer}
                      onChange={(e) => setShowSeniorHomesLayer(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>พิกัดบ้านผู้สูงอายุ ({filteredRecords.length} หลัง)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-medium text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-300">
                    <input
                      type="checkbox"
                      checked={showRoadHazardsLayer}
                      onChange={(e) => setShowRoadHazardsLayer(e.target.checked)}
                      className="rounded border-slate-300 text-red-700 focus:ring-red-600"
                    />
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>จุดเสี่ยงบนถนน ({roadHazards.length} จุด)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingHazard((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    isAddingHazard
                      ? 'bg-slate-800 text-white'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {isAddingHazard
                      ? 'ยกเลิกการปักหมุดจุดเสี่ยง'
                      : '+ ปักหมุดแจ้งจุดเสี่ยงบนถนนใหม่'}
                  </span>
                </button>
              </div>

              {/* Collapsible Add Road Hazard Form */}
              {isAddingHazard && (
                <form
                  onSubmit={handleCreateRoadHazard}
                  className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>
                        บันทึกพิกัดจุดเสี่ยงบนถนนใหม่ (คลิกเลือกตำแหน่งบนแผนที่ด้านล่าง หรือดึงพิกัด GPS)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetCurrentGpsForHazard}
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>ดึงพิกัด GPS ปัจจุบัน</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-800 mb-1">
                        ชื่อจุดเสี่ยง / ตำแหน่งสังเกต *
                      </label>
                      <input
                        type="text"
                        required
                        value={newHazardTitle}
                        onChange={(e) => setNewHazardTitle(e.target.value)}
                        placeholder="เช่น พุ่มไม้บังสายตาปากซอย 6 หรือ สะพานข้ามร่องน้ำหน้าวัดไม่มีราวจับ"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        ประเภทจุดเสี่ยงบนถนน *
                      </label>
                      <select
                        value={newHazardType}
                        onChange={(e) =>
                          setNewHazardType(e.target.value as RoadHazardType)
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      >
                        {(
                          Object.keys(
                            ROAD_HAZARD_TYPE_LABELS
                          ) as RoadHazardType[]
                        ).map((t) => (
                          <option key={t} value={t}>
                            {ROAD_HAZARD_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        ระดับความเร่งด่วน
                      </label>
                      <select
                        value={newHazardSeverity}
                        onChange={(e) =>
                          setNewHazardSeverity(
                            e.target.value as RoadHazardSeverity
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600"
                      >
                        <option value="CRITICAL">
                          จุดเสี่ยงวิกฤต (ต้องเร่งแก้ไขทันที)
                        </option>
                        <option value="WARNING">
                          จุดเฝ้าระวัง (ควรปรับปรุงทัศนวิสัย)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        ละติจูด (Latitude) · คลิกบนแผนที่ได้
                      </label>
                      <input
                        type="text"
                        required
                        value={newHazardLat}
                        onChange={(e) => setNewHazardLat(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        ลองจิจูด (Longitude) · คลิกบนแผนที่ได้
                      </label>
                      <input
                        type="text"
                        required
                        value={newHazardLng}
                        onChange={(e) => setNewHazardLng(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        รายละเอียดปัญหาจุดเสี่ยง
                      </label>
                      <input
                        type="text"
                        value={newHazardDesc}
                        onChange={(e) => setNewHazardDesc(e.target.value)}
                        placeholder="อธิบายสภาพปัญหาที่กระทบผู้สูงอายุ..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        ข้อเสนอแนะเชิงวิศวกรรม
                      </label>
                      <input
                        type="text"
                        value={newHazardAction}
                        onChange={(e) => setNewHazardAction(e.target.value)}
                        placeholder="เช่น ตัดกิ่งไม้, ติดไฟกระพริบ, ทำราวจับสะพาน"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        หน่วยงานรับผิดชอบ
                      </label>
                      <input
                        type="text"
                        value={newHazardAgency}
                        onChange={(e) => setNewHazardAgency(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Attached Photo Preview & Saving Status Indicator */}
                  {newHazardPhoto && (
                    <div className="flex items-center gap-3 p-2.5 bg-white border border-emerald-200 rounded-lg">
                      <img
                        src={newHazardPhoto}
                        alt="ตัวอย่างภาพถ่ายจุดเสี่ยง"
                        className="w-20 h-14 object-cover rounded border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>พร้อมบันทึกภาพถ่ายจุดเสี่ยงลงฐานข้อมูลถาวร</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ระบบจะจัดเก็บรูปภาพลงฐานข้อมูลเครื่อง (IndexedDB/LocalStorage) และอัปโหลดขึ้น Google Drive อัตโนมัติเมื่อเข้าระบบด้วยอีเมล
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingHazard}
                        onClick={() => setNewHazardPhoto(undefined)}
                        className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded border border-red-200 shrink-0"
                      >
                        ลบรูป
                      </button>
                    </div>
                  )}

                  {isSavingHazard && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-medium animate-pulse"
                    >
                      <Loader2 className="w-4 h-4 text-blue-700 animate-spin shrink-0" />
                      <div className="flex-1">
                        <div className="font-bold text-xs text-blue-900">
                          กำลังบันทึกข้อมูลจุดเสี่ยงและพิกัด GPS...
                        </div>
                        <div className="text-[11px] text-blue-700">
                          {savingHazardStep ||
                            'กำลังส่งพิกัดไปยัง State และบันทึกลงฐานข้อมูลถาวร...'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200">
                    <div className="flex items-center gap-2">
                      <label
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 ${
                          isSavingHazard
                            ? 'opacity-50 pointer-events-none'
                            : 'cursor-pointer'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-700" />
                        <span>
                          {newHazardPhoto
                            ? 'เปลี่ยนภาพถ่ายจุดเสี่ยง'
                            : 'ถ่ายภาพ/แนบรูปจุดเสี่ยง'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={isSavingHazard}
                          onChange={handleHazardPhotoChange}
                          className="hidden"
                        />
                      </label>
                      {newHazardPhoto && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>แนบรูปภาพจุดเสี่ยงแล้ว</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingHazard}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white font-semibold rounded-md hover:bg-blue-800 disabled:opacity-70 disabled:cursor-wait shadow-xs transition-all cursor-pointer"
                    >
                      {isSavingHazard ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังบันทึกพิกัดและรูปภาพ...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกหมุดจุดเสี่ยงลงแผนที่ GIS</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <SeniorRiskMap
                records={filteredRecords}
                selectedRecordId={selectedRecordId}
                onSelectRecord={setSelectedRecordId}
                onOpenPrintCard={setPrintingRecord}
                roadHazards={roadHazards}
                showSeniorHomes={showSeniorHomesLayer}
                showRoadHazards={showRoadHazardsLayer}
                selectedHazardId={selectedHazardId}
                onSelectHazard={setSelectedHazardId}
                onUpdateHazardStatus={handleUpdateHazardStatus}
                pickerPosition={
                  isAddingHazard
                    ? {
                        lat: Number(newHazardLat),
                        lng: Number(newHazardLng),
                      }
                    : null
                }
                onPickLocation={
                  isAddingHazard
                    ? (lat, lng) => {
                        setNewHazardLat(lat.toFixed(5));
                        setNewHazardLng(lng.toFixed(5));
                      }
                    : undefined
                }
                heightClass="h-[460px]"
              />

              {/* Compact Road Hazard Registry Strip */}
              {showRoadHazardsLayer && roadHazards.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      ทะเบียนจุดเสี่ยงบนถนนในชุมชน ({roadHazards.length} จุด) · คลิกเพื่อดูตำแหน่งบนแผนที่:
                    </span>
                    <span className="text-slate-500">
                      วิกฤต{' '}
                      {
                        roadHazards.filter(
                          (h) =>
                            h.severity === 'CRITICAL' && h.status !== 'RESOLVED'
                        ).length
                      }{' '}
                      จุด · แก้ไขแล้ว{' '}
                      {roadHazards.filter((h) => h.status === 'RESOLVED').length}{' '}
                      จุด
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    {roadHazards.map((haz) => {
                      const isSelected = selectedHazardId === haz.id;
                      const isResolved = haz.status === 'RESOLVED';
                      return (
                        <div
                          key={haz.id}
                          onClick={() => {
                            setSelectedHazardId(haz.id);
                            setSelectedRecordId(null);
                          }}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors space-y-1 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50'
                              : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[11px] text-slate-700">
                              {haz.id}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isResolved
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : haz.severity === 'CRITICAL'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ROAD_HAZARD_STATUS_LABELS[haz.status]}
                              </span>
                              <button
                                type="button"
                                title={user ? 'ลบหมุดจุดเสี่ยงนี้' : 'ต้องเข้าสู่ระบบผ่าน Email เพื่อลบหมุดจุดเสี่ยง'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestDeleteHazard(haz.id, haz.title);
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 flex items-center gap-0.5"
                              >
                                {!user && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {haz.photoDataUrl && (
                            <div className="w-full h-24 rounded overflow-hidden border border-slate-200 bg-slate-100 my-1">
                              <img
                                src={haz.photoDataUrl}
                                alt={haz.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="font-bold text-slate-900 line-clamp-1">
                            {haz.title}
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-1">
                            {ROAD_HAZARD_TYPE_LABELS[haz.type]}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            พิกัด: {haz.lat.toFixed(5)}, {haz.lng.toFixed(5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* High-Density Assessment Responses Table (Simulating & Syncing with Google Sheets) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ตารางฐานข้อมูลการประเมิน (แผ่นงาน: ข้อมูลการประเมิน / Responses)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    แสดงผลคำนวณคะแนนรวม (<code className="font-mono">Total_Score</code>), ระดับความเสี่ยง (<code className="font-mono">Risk_Level</code>) และลิงก์แผนที่ (<code className="font-mono">Google_Maps_Link</code>) อัตโนมัติ
                  </p>
                </div>

                {/* Interactive Filter Controls & Search */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ, ชุมชน, รหัส..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Segmented Risk Filter Buttons */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRiskFilter('ALL')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        riskFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ทั้งหมด ({records.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskFilter('RED')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        riskFilter === 'RED'
                          ? 'bg-white text-red-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🔴 แดง ({countRed})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskFilter('YELLOW')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        riskFilter === 'YELLOW'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🟡 เหลือง ({countYellow})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskFilter('GREEN')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        riskFilter === 'GREEN'
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🟢 เขียว ({countGreen})
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0">
                    <Upload className="w-3.5 h-3.5 text-blue-700" />
                    <span>นำเข้าไฟล์ .xlsx / .csv</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await handleImportSpreadsheetFile(file);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {provisionedSheet && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSyncSheetRecords().catch((err) =>
                          console.error(err)
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ดึงข้อมูลจาก Google Sheets</span>
                    </button>
                  )}

                  {provisionedForm && (
                    <button
                      type="button"
                      onClick={handleSyncFormResponses}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ดึงคำตอบจาก Google Form</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    ไม่พบรายการข้อมูลผู้สูงอายุที่ตรงกับเงื่อนไขการค้นหา
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRiskFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    แสดงข้อมูลทั้งหมด
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          รหัส / ชื่อ-นามสกุล
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          อายุ · การอยู่อาศัย
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          บ้านเลขที่ / ชุมชน
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">
                          พิกัด GPS (Lat, Lng)
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">
                          คะแนน 6 มิติ (Total)
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          สัญญาณไฟจราจรชีวิต (Risk_Level)
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          การส่งต่อและมาตรการดูแล
                        </th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">
                          แผนที่ / บัตรสรุปผล
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRecords.map((rec, rIdx) => {
                        const a = rec.answers;
                        const isSelected = selectedRecordId === rec.id;
                        const med = Array.isArray(a['q5_1'])
                          ? a['q5_1'].join(', ')
                          : String(a['q5_1'] || '-');
                        const prot = Array.isArray(a['q5_2'])
                          ? a['q5_2'].join(', ')
                          : String(a['q5_2'] || '-');

                        return (
                          <tr
                            key={`${rec.id}__${rIdx}`}
                            onClick={() => setSelectedRecordId(rec.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3 px-3 align-top">
                              <div className="font-bold text-slate-900">
                                {String(a['q2_2'] || '-')}
                              </div>
                              <div className="text-slate-500 font-mono tabular-nums mt-0.5">
                                {String(a['q2_1'] || rec.id)} · โทร{' '}
                                {String(a['q2_3'] || '-')}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top text-slate-700">
                              <div>
                                {String(a['q2_8'] || '-')} · อายุ{' '}
                                {formatSeniorAge(a['q2_9'])}
                              </div>
                              <div className="text-slate-500 mt-0.5">
                                {String(a['q2_10'] || '-')}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top text-slate-700">
                              <div>{String(a['q2_4'] || '-')}</div>
                              <div className="flex flex-wrap items-center gap-2 text-slate-500 mt-0.5">
                                <span>ผู้ประเมิน: {String(a['q1_2'] || '-')}</span>
                                {rec.photos && rec.photos.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                                    <Camera className="w-3 h-3" />
                                    <span>ภาพจุดเสี่ยง {rec.photos.length} ภาพ</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {String(a['q2_5'] || '-')},{' '}
                              {String(a['q2_6'] || '-')}
                            </td>
                            <td className="py-3 px-3 align-top text-right font-mono tabular-nums">
                              <div className="font-bold text-sm text-slate-900">
                                {rec.totalScore} / 29
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {rec.dimensionScores[1]}·{rec.dimensionScores[2]}·
                                {rec.dimensionScores[3]}·{rec.dimensionScores[4]}·
                                {rec.dimensionScores[5]}·{rec.dimensionScores[6]}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-top font-semibold">
                              <span
                                className={
                                  rec.riskLevel === 'RED'
                                    ? 'text-red-700'
                                    : rec.riskLevel === 'YELLOW'
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }
                              >
                                {rec.riskLabel}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-top text-slate-700 max-w-xs">
                              <div>{med}</div>
                              <div className="text-slate-500 mt-0.5">{prot}</div>
                            </td>
                            <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {rec.googleMapsLink ? (
                                  <a
                                    href={rec.googleMapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold underline"
                                  >
                                    <span>เปิดพิกัด</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400">รอปักหมุด</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintingRecord(rec);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
                                >
                                  <Printer className="w-3 h-3 text-blue-700" />
                                  <span>บัตรสรุปผล</span>
                                </button>
                                <button
                                  type="button"
                                  title={
                                    user
                                      ? 'ดูข้อมูลแบบประเมินฉบับสมบูรณ์ (ครบทั้ง 5 Sections · 30 ข้อ)'
                                      : 'ต้องเข้าสู่ระบบด้วย Sign in with Google เพื่อดูแบบประเมิน 30 ข้อ'
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestViewFullResponse(rec);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap shrink-0"
                                >
                                  {user ? (
                                    <FileText className="w-3 h-3 text-blue-700" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-blue-700" />
                                  )}
                                  <span>แบบประเมิน 30 ข้อ</span>
                                </button>
                                <button
                                  type="button"
                                  title={
                                    user
                                      ? 'แก้ไขข้อมูลผู้สูงอายุรายนี้'
                                      : 'ต้องเข้าสู่ระบบผ่าน Email เพื่อแก้ไขข้อมูล'
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestEditRecord(rec);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 whitespace-nowrap shrink-0"
                                >
                                  {user ? (
                                    <Pencil className="w-3 h-3" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-amber-700" />
                                  )}
                                  <span>แก้ไข</span>
                                </button>
                                <button
                                  type="button"
                                  title={
                                    user
                                      ? 'ลบข้อมูลผู้สูงอายุรายนี้'
                                      : 'ต้องเข้าสู่ระบบผ่าน Email เพื่อลบข้อมูล'
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestDeleteRecord(rec);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 whitespace-nowrap shrink-0"
                                >
                                  {user ? (
                                    <Trash2 className="w-3 h-3" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-red-700" />
                                  )}
                                  <span>ลบ</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'FORM' && (
          <AssessmentFormWizard
            existingRecords={records}
            editingRecord={editingRecord}
            onCancelEdit={() => setEditingRecord(null)}
            hasConnectedSheet={Boolean(provisionedSheet)}
            isAuthenticated={Boolean(user)}
            spreadsheetTitle={provisionedSheet?.title}
            onLogin={handleGoogleLogin}
            onSaveAssessment={handleSaveNewAssessment}
            onOpenPrintCard={setPrintingRecord}
          />
        )}

        {activeTab === 'WORKSPACE' && (
          <WorkspaceManager
            isAuthenticated={Boolean(user)}
            userEmail={user?.email}
            records={records}
            provisionedForm={provisionedForm}
            provisionedSheet={provisionedSheet}
            onLogin={handleGoogleLogin}
            onCreateGoogleForm={handleCreateGoogleForm}
            onCreateGoogleSheet={handleCreateGoogleSheet}
            onConnectExistingSheet={handleConnectExistingSheet}
            onSyncFormResponses={handleSyncFormResponses}
            onSyncSheetRecords={handleSyncSheetRecords}
            onImportSpreadsheetFile={handleImportSpreadsheetFile}
          />
        )}

        {activeTab === 'GUIDE' && (
          <ManualGuideView
            isAuthenticated={Boolean(user)}
            userEmail={user?.email}
            onLogin={handleGoogleLogin}
            records={records}
            onSwitchTab={handleSwitchTab}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-8">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            ระบบคัดกรองและประเมินความเสี่ยงการข้ามถนนของผู้สูงอายุ (5 ส่วน · 6 มิติ) สำหรับงานสาธารณสุขและจราจรชุมชน
          </div>
          <div className="flex items-center gap-4">
            {provisionedForm && (
              <a
                href={provisionedForm.responderUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>เปิด Google Form ที่สร้างไว้</span>
              </a>
            )}
            {provisionedSheet && (
              <a
                href={provisionedSheet.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>เปิด Google Sheets ที่เชื่อมต่อ</span>
              </a>
            )}
          </div>
        </div>
      </footer>

      <SeniorSummaryCardModal
        record={printingRecord}
        isAuthenticated={Boolean(user)}
        onUpdateRecordPhotos={handleUpdateRecordPhotos}
        onClose={() => setPrintingRecord(null)}
      />

      <FullAssessmentResponseModal
        record={viewingFullRecord}
        isAuthenticated={Boolean(user)}
        userEmail={user?.email}
        onLogin={handleGoogleLogin}
        onEditRecord={handleRequestEditRecord}
        onClose={() => setViewingFullRecord(null)}
      />

      {/* Email Sign-In Gate Modal for Edit & Delete */}
      {authRequiredPrompt.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {authRequiredPrompt.actionType === 'WORKSPACE_ACCESS'
                    ? 'ต้อง Sign in with Google ก่อนเข้าถึงหน้า Google Form & Sheets'
                    : authRequiredPrompt.actionType === 'GUIDE_ACCESS'
                    ? 'ต้อง Sign in with Google ก่อนเข้าถึงหน้า คู่มือ & .xlsx'
                    : authRequiredPrompt.actionType === 'DOWNLOAD_EXCEL'
                    ? 'ต้อง Sign in with Google ก่อนดาวน์โหลดไฟล์ .xlsx'
                    : authRequiredPrompt.actionType === 'VIEW_FULL_RESPONSE'
                    ? 'ต้อง Sign in with Google ก่อนดูแบบประเมิน 30 ข้อ'
                    : 'ต้องเข้าสู่ระบบผ่าน Email ก่อนดำเนินการ'}
                </h3>
                {authRequiredPrompt.actionType === 'WORKSPACE_ACCESS' ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    การใช้งานและเข้าดูรายละเอียดหน้า{' '}
                    <strong className="text-slate-900">
                      สร้างและเชื่อมต่อ Google Form & Sheets
                    </strong>{' '}
                    จำเป็นต้องลงชื่อเข้าใช้ผ่าน{' '}
                    <strong className="text-slate-900">Sign in with Google</strong>{' '}
                    ก่อนเท่านั้น เพื่อยืนยันสิทธิ์ในการเชื่อมต่อกับ Google Drive ของคุณ
                  </p>
                ) : authRequiredPrompt.actionType === 'GUIDE_ACCESS' ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    การเข้าดูรายละเอียดหน้า{' '}
                    <strong className="text-slate-900">
                      คู่มือปฏิบัติการและไฟล์แม่แบบ Excel (คู่มือ & .xlsx)
                    </strong>{' '}
                    จำเป็นต้องลงชื่อเข้าใช้ผ่าน{' '}
                    <strong className="text-slate-900">Sign in with Google</strong>{' '}
                    ก่อนเท่านั้น เพื่อยืนยันสิทธิ์ผู้ใช้งาน
                  </p>
                ) : authRequiredPrompt.actionType === 'DOWNLOAD_EXCEL' ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    การดาวน์โหลดไฟล์แม่แบบฐานข้อมูล{' '}
                    <strong className="text-slate-900 font-mono">
                      senior_risk_assessment_template.xlsx
                    </strong>{' '}
                    จำเป็นต้องลงชื่อเข้าใช้ผ่าน{' '}
                    <strong className="text-slate-900">Sign in with Google</strong>{' '}
                    ก่อนเท่านั้น เมื่อลงชื่อเข้าใช้สำเร็จ ระบบจะดาวน์โหลดไฟล์ให้โดยอัตโนมัติ
                  </p>
                ) : authRequiredPrompt.actionType === 'VIEW_FULL_RESPONSE' ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    การเข้าดูข้อมูลคำตอบตามโครงสร้างคำถาม Google Forms ฉบับสมบูรณ์{' '}
                    <strong className="text-slate-900">
                      (ครบทั้ง 5 Sections · 30 ข้อ)
                    </strong>{' '}
                    ของผู้สูงอายุรายนี้ จำเป็นต้องลงชื่อเข้าใช้ผ่าน{' '}
                    <strong className="text-slate-900">Sign in with Google</strong>{' '}
                    ก่อนเท่านั้น เมื่อลงชื่อเข้าใช้สำเร็จ ระบบจะเปิดรายงานแบบประเมินฉบับเต็มให้ทันที
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ระบบเปิดให้ทุกคนเข้าถึงและดูฐานข้อมูลได้โดยอัตโนมัติ แต่การ{' '}
                    <strong className="text-slate-900">
                      {authRequiredPrompt.actionType === 'EDIT'
                        ? 'แก้ไข'
                        : authRequiredPrompt.actionType === 'DELETE'
                        ? 'ลบ'
                        : 'จัดการ'}
                    </strong>{' '}
                    ฐานข้อมูล จำเป็นต้องลงชื่อเข้าใช้ผ่าน Email (บัญชี Google) เพื่อยืนยันสิทธิ์
                  </p>
                )}
              </div>
            </div>

            {authRequiredPrompt.targetRecord && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div className="text-slate-500 font-medium">
                  รายการที่ต้องการ
                  {authRequiredPrompt.actionType === 'EDIT'
                    ? 'แก้ไข'
                    : authRequiredPrompt.actionType === 'VIEW_FULL_RESPONSE'
                    ? 'ดูแบบประเมิน 5 ส่วน (30 ข้อ)'
                    : 'ลบ'}
                  :
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {String(
                    authRequiredPrompt.targetRecord.answers['q2_2'] ||
                      authRequiredPrompt.targetRecord.id
                  )}
                </div>
                <div className="text-slate-600 flex items-center gap-2">
                  <span>
                    รหัส:{' '}
                    {String(
                      authRequiredPrompt.targetRecord.answers['q2_1'] ||
                        authRequiredPrompt.targetRecord.id
                    )}
                  </span>
                  <span>·</span>
                  <span>
                    คะแนน {authRequiredPrompt.targetRecord.totalScore}/29 (
                    {authRequiredPrompt.targetRecord.riskLabel})
                  </span>
                </div>
              </div>
            )}

            {authRequiredPrompt.targetHazardTitle && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div className="text-slate-500 font-medium">หมุดจุดเสี่ยงที่ต้องการลบ:</div>
                <div className="font-bold text-slate-900 text-sm">
                  {authRequiredPrompt.targetHazardTitle}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleLoginFromPrompt}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {isLoggingIn
                    ? 'กำลังเข้าสู่ระบบ...'
                    : 'ลงชื่อเข้าใช้ด้วย Google เพื่อดำเนินการต่อ'}
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setAuthRequiredPrompt({ isOpen: false, actionType: 'EDIT' })
                }
                className="w-full px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก (กลับสู่โหมดดูข้อมูล)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-lg">
            <h4 className="text-base font-bold text-slate-900">
              ยืนยันการลบข้อมูลผู้สูงอายุ
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณต้องการลบข้อมูลการประเมินของ{' '}
              <strong className="text-slate-900">
                {String(deletingRecord.answers['q2_2'] || deletingRecord.id)}
              </strong>{' '}
              (รหัส {String(deletingRecord.answers['q2_1'] || deletingRecord.id)}) ออกจากตารางและแผนที่ GIS ใช่หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800"
              >
                ยืนยันการลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification ('บันทึกสำเร็จ') */}
      {toastNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 right-6 z-50 max-w-md w-full sm:w-96 bg-white border border-emerald-300 rounded-xl shadow-xl p-4 flex items-start gap-3 transition-all"
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              toastNotification.variant === 'SUCCESS'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                {toastNotification.title}
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Saved
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {toastNotification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 shrink-0 cursor-pointer"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
