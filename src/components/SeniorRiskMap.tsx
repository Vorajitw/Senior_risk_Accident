import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  AssessmentRecord,
  RoadHazardPoint,
  RoadHazardStatus,
  ROAD_HAZARD_TYPE_LABELS,
  ROAD_HAZARD_STATUS_LABELS,
  formatSeniorAge,
} from '../data/assessmentSchema';
import {
  ExternalLink,
  MapPin,
  Phone,
  ShieldAlert,
  Printer,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { SmartHazardImage } from './SmartHazardImage';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

interface MarkerItemProps {
  record: AssessmentRecord;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onOpenPrintCard?: (record: AssessmentRecord) => void;
  displayPosition?: { lat: number; lng: number };
}

const RiskMarkerItem: React.FC<MarkerItemProps> = ({
  record,
  isSelected,
  onSelect,
  onOpenPrintCard,
  displayPosition,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const rawLat = Number(record.answers['q2_5']);
  const rawLng = Number(record.answers['q2_6']);
  const lat = displayPosition ? displayPosition.lat : rawLat;
  const lng = displayPosition ? displayPosition.lng : rawLng;

  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const pinColors =
    record.riskLevel === 'RED'
      ? { background: '#dc2626', borderColor: '#7f1d1d', glyphColor: '#ffffff' }
      : record.riskLevel === 'YELLOW'
      ? { background: '#d97706', borderColor: '#78350f', glyphColor: '#ffffff' }
      : { background: '#16a34a', borderColor: '#14532d', glyphColor: '#ffffff' };

  const seniorName = String(record.answers['q2_2'] || record.id);
  const address = String(record.answers['q2_4'] || '-');
  const phone = String(record.answers['q2_3'] || '-');
  const ageRange = formatSeniorAge(record.answers['q2_9']);
  const livingStatus = String(record.answers['q2_10'] || '-');
  const medicalPlan = Array.isArray(record.answers['q5_1'])
    ? record.answers['q5_1'].join(', ')
    : String(record.answers['q5_1'] || '-');
  const protectionPlan = Array.isArray(record.answers['q5_2'])
    ? record.answers['q5_2'].join(', ')
    : String(record.answers['q5_2'] || '-');

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        title={`${seniorName} (${record.riskLabel})`}
        onClick={() => onSelect(isSelected ? null : record.id)}
      >
        <Pin
          background={pinColors.background}
          borderColor={pinColors.borderColor}
          glyphColor={pinColors.glyphColor}
          scale={record.riskLevel === 'RED' ? 1.25 : 1.1}
        >
          <span className="font-mono text-[11px] font-bold tabular-nums">
            {record.totalScore}
          </span>
        </Pin>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={320}
          onCloseClick={() => onSelect(null)}
        >
          <div className="p-1 text-slate-900 font-sans text-xs space-y-2">
            <div className="border-b border-slate-200 pb-1.5">
              <div className="font-bold text-sm text-slate-900">{seniorName}</div>
              <div className="text-slate-600 mt-0.5">
                {ageRange} · {livingStatus}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
              <span className="font-semibold text-slate-700">
                {record.riskLabel}
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {record.totalScore}/29 คะแนน
              </span>
            </div>

            <div className="space-y-1 text-slate-700">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  {address} ({lat.toFixed(5)}, {lng.toFixed(5)})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-mono tabular-nums">{phone}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>แผนช่วยเหลือ:</strong> {medicalPlan} · {protectionPlan}
                </span>
              </div>
            </div>

            {record.photos && record.photos.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                  <span className="inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      ภาพสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน ({record.photos.length} ภาพ)
                    </span>
                  </span>
                </div>
                <div
                  className={
                    record.photos.length === 1
                      ? 'grid grid-cols-1 gap-1.5'
                      : 'grid grid-cols-2 gap-1.5'
                  }
                >
                  {record.photos.slice(0, 4).map((p, pIdx) => {
                    const driveLink = p.driveViewLink;
                    const externalHref = driveLink || p.dataUrl;
                    const isSinglePhoto = (record.photos?.length ?? 0) === 1;

                    return (
                      <div
                        key={`${p.id}__${pIdx}`}
                        className="rounded-md overflow-hidden border border-slate-200 bg-white flex flex-col shadow-xs"
                      >
                        <div
                          className={`w-full relative overflow-hidden bg-slate-100 flex items-center justify-center ${
                            isSinglePhoto ? 'h-32' : 'h-24'
                          }`}
                        >
                          <SmartHazardImage
                            photo={p}
                            className="w-full h-full object-cover max-w-full block"
                            compact={!isSinglePhoto}
                          />
                        </div>
                        <div className="p-1.5 bg-white text-[10px] text-slate-700 space-y-0.5 border-t border-slate-100">
                          <div className="font-semibold text-slate-900 truncate">
                            {p.categoryLabel || 'ภาพหน้าบ้าน (Section 2)'}
                          </div>
                          {p.caption && (
                            <div className="text-slate-600 line-clamp-2 leading-tight">
                              {p.caption}
                            </div>
                          )}
                          {externalHref && (
                            <a
                              href={externalHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-800 underline pt-0.5"
                            >
                              <span>
                                {driveLink ? 'เปิดดูไฟล์บน Google Drive' : 'เปิดดูภาพต้นฉบับ'}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200">
              {record.googleMapsLink ? (
                <a
                  href={record.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold underline"
                >
                  <span>เปิดนำทาง</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span />
              )}
              {onOpenPrintCard && (
                <button
                  type="button"
                  onClick={() => onOpenPrintCard(record)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold hover:bg-slate-800"
                >
                  <Printer className="w-3 h-3" />
                  <span>พิมพ์บัตรสรุปผล</span>
                </button>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface RoadHazardMarkerItemProps {
  hazard: RoadHazardPoint;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onUpdateStatus?: (hazardId: string, status: RoadHazardStatus) => void;
}

const RoadHazardMarkerItem: React.FC<RoadHazardMarkerItemProps> = ({
  hazard,
  isSelected,
  onSelect,
  onUpdateStatus,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (isNaN(hazard.lat) || isNaN(hazard.lng) || hazard.lat === 0 || hazard.lng === 0) {
    return null;
  }

  const isResolved = hazard.status === 'RESOLVED';
  const badgeColor = isResolved
    ? 'bg-emerald-700 border-emerald-900 text-white'
    : hazard.severity === 'CRITICAL'
    ? 'bg-red-700 border-red-950 text-white'
    : 'bg-amber-600 border-amber-900 text-white';

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${hazard.lat},${hazard.lng}`;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: hazard.lat, lng: hazard.lng }}
        title={`จุดเสี่ยงบนถนน: ${hazard.title}`}
        onClick={() => onSelect(isSelected ? null : hazard.id)}
      >
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded border-2 shadow-md cursor-pointer transition-transform hover:scale-105 ${badgeColor}`}
        >
          {isResolved ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="font-mono text-[10px] font-bold tracking-tight whitespace-nowrap">
            {hazard.id}
          </span>
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={340}
          onCloseClick={() => onSelect(null)}
        >
          <div className="p-1 text-slate-900 font-sans text-xs space-y-2">
            <div className="border-b border-slate-200 pb-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-500">
                  {hazard.id} · จุดเสี่ยงบนถนน
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isResolved
                      ? 'bg-emerald-100 text-emerald-800'
                      : hazard.severity === 'CRITICAL'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isResolved
                    ? 'แก้ไขแล้ว'
                    : hazard.severity === 'CRITICAL'
                    ? 'จุดเสี่ยงวิกฤต'
                    : 'จุดเฝ้าระวัง'}
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 mt-0.5 leading-snug">
                {hazard.title}
              </div>
              <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                ประเภท: {ROAD_HAZARD_TYPE_LABELS[hazard.type]}
              </div>
            </div>

            {hazard.photoDataUrl && (
              <div className="rounded overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={hazard.photoDataUrl}
                  alt={hazard.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover"
                />
              </div>
            )}

            <div className="space-y-1 text-slate-700 leading-snug">
              <div>
                <strong className="text-slate-900">รายละเอียดปัญหา:</strong>{' '}
                {hazard.description}
              </div>
              <div className="flex items-start gap-1.5 bg-amber-50/80 border border-amber-200 rounded p-2 text-amber-950">
                <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>ข้อเสนอแนะเชิงวิศวกรรม:</strong>{' '}
                  {hazard.recommendedAction}
                </div>
              </div>
              <div>
                <strong className="text-slate-900">หน่วยงานรับผิดชอบ:</strong>{' '}
                {hazard.responsibleAgency}
              </div>
              <div className="text-[11px] text-slate-500">
                ผู้แจ้ง: {hazard.reportedBy} ({hazard.reportedDate}) · พิกัด{' '}
                <span className="font-mono tabular-nums">
                  {hazard.lat.toFixed(5)}, {hazard.lng.toFixed(5)}
                </span>
              </div>
            </div>

            {onUpdateStatus && (
              <div className="pt-1.5 border-t border-slate-200 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  สถานะการแก้ไขจุดเสี่ยง:
                </label>
                <select
                  value={hazard.status}
                  onChange={(e) =>
                    onUpdateStatus(hazard.id, e.target.value as RoadHazardStatus)
                  }
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  {(
                    Object.keys(ROAD_HAZARD_STATUS_LABELS) as RoadHazardStatus[]
                  ).map((st) => (
                    <option key={st} value={st}>
                      {ROAD_HAZARD_STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between border-t border-slate-200">
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold underline"
              >
                <span>เปิดพิกัดจุดเสี่ยงใน Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const MapViewportController: React.FC<{
  targetPosition: { lat: number; lng: number } | null;
}> = ({ targetPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetPosition) return;
    if (
      !isNaN(targetPosition.lat) &&
      !isNaN(targetPosition.lng) &&
      targetPosition.lat !== 0 &&
      targetPosition.lng !== 0
    ) {
      map.panTo(targetPosition);
    }
  }, [map, targetPosition?.lat, targetPosition?.lng]);

  return null;
};

interface SeniorRiskMapProps {
  records: AssessmentRecord[];
  selectedRecordId: string | null;
  onSelectRecord: (id: string | null) => void;
  onOpenPrintCard?: (record: AssessmentRecord) => void;
  roadHazards?: RoadHazardPoint[];
  showSeniorHomes?: boolean;
  showRoadHazards?: boolean;
  selectedHazardId?: string | null;
  onSelectHazard?: (id: string | null) => void;
  onUpdateHazardStatus?: (hazardId: string, status: RoadHazardStatus) => void;
  pickerPosition?: { lat: number; lng: number } | null;
  onPickLocation?: (lat: number, lng: number) => void;
  heightClass?: string;
}

export const SeniorRiskMap: React.FC<SeniorRiskMapProps> = ({
  records,
  selectedRecordId,
  onSelectRecord,
  onOpenPrintCard,
  roadHazards = [],
  showSeniorHomes = true,
  showRoadHazards = true,
  selectedHazardId,
  onSelectHazard,
  onUpdateHazardStatus,
  pickerPosition,
  onPickLocation,
  heightClass = 'h-[480px]',
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );
  const [internalHazardId, setInternalHazardId] = useState<string | null>(null);

  const activeSelectedId =
    selectedRecordId !== undefined ? selectedRecordId : internalSelectedId;
  const activeHazardId =
    selectedHazardId !== undefined ? selectedHazardId : internalHazardId;

  const handleSelect = (id: string | null) => {
    setInternalSelectedId(id);
    onSelectRecord(id);
    if (id) {
      setInternalHazardId(null);
      onSelectHazard?.(null);
    }
  };

  const handleSelectHazard = (id: string | null) => {
    setInternalHazardId(id);
    onSelectHazard?.(id);
    if (id) {
      setInternalSelectedId(null);
      onSelectRecord(null);
    }
  };

  // Compute center from records or default to 8.43210, 99.96543
  const validCoords = records
    .map((r) => ({
      lat: Number(r.answers['q2_5']),
      lng: Number(r.answers['q2_6']),
    }))
    .filter((c) => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0 && c.lng !== 0);

  const defaultCenter =
    pickerPosition && !isNaN(pickerPosition.lat) && !isNaN(pickerPosition.lng)
      ? pickerPosition
      : validCoords.length > 0
      ? validCoords[0]
      : { lat: 8.4321, lng: 99.96543 };

  const handleMapClick = (e: MapMouseEvent) => {
    if (onPickLocation && e.detail.latLng) {
      onPickLocation(
        Number(e.detail.latLng.lat.toFixed(5)),
        Number(e.detail.latLng.lng.toFixed(5))
      );
    }
  };

  if (!MAPS_API_KEY) {
    return (
      <div
        className={`${heightClass} w-full bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-6 text-center`}
      >
        <MapPin className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700">
          ยังไม่ได้ตั้งค่า Google Maps API Key
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          กรุณาตรวจสอบค่า VITE_GOOGLE_MAPS_API_KEY เพื่อแสดงแผนที่พิกัดบ้านผู้สูงอายุแบบโต้ตอบ
        </p>
      </div>
    );
  }

  const selectedRecord = records.find((r) => r.id === activeSelectedId) || null;
  const selectedHazard =
    roadHazards.find((h) => h.id === activeHazardId) || null;

  // Compute non-overlapping display positions when multiple records share the exact same GPS coordinate
  const coordCounts = new Map<string, number>();
  const displayPositionsById = new Map<string, { lat: number; lng: number }>();
  for (const rec of records) {
    const lat = Number(rec.answers['q2_5']);
    const lng = Number(rec.answers['q2_6']);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const dupIdx = coordCounts.get(key) || 0;
    coordCounts.set(key, dupIdx + 1);
    if (dupIdx === 0) {
      displayPositionsById.set(rec.id, { lat, lng });
    } else {
      // Spiral ring offset (~18m per ring) so stacked village markers are all individually clickable
      const angle = dupIdx * 0.95;
      const radius = 0.00016 * (1 + Math.floor(dupIdx / 7) * 0.65);
      displayPositionsById.set(rec.id, {
        lat: lat + Math.sin(angle) * radius,
        lng: lng + Math.cos(angle) * radius,
      });
    }
  }

  const targetViewportPos = selectedRecord
    ? displayPositionsById.get(selectedRecord.id) || {
        lat: Number(selectedRecord.answers['q2_5']),
        lng: Number(selectedRecord.answers['q2_6']),
      }
    : selectedHazard
    ? { lat: selectedHazard.lat, lng: selectedHazard.lng }
    : null;

  return (
    <div className="space-y-3">
      <div
        className={`${heightClass} w-full rounded-lg overflow-hidden border border-slate-200 relative bg-slate-100`}
      >
        <APIProvider
          apiKey={MAPS_API_KEY}
          libraries={['marker']}
          language="th"
          region="TH"
        >
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultZoom={15}
            defaultCenter={defaultCenter}
            gestureHandling="greedy"
            onClick={handleMapClick}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            <MapViewportController targetPosition={targetViewportPos} />

            {showSeniorHomes &&
              records.map((rec, idx) => (
                <RiskMarkerItem
                  key={`${rec.id}__${idx}`}
                  record={rec}
                  isSelected={activeSelectedId === rec.id}
                  onSelect={handleSelect}
                  onOpenPrintCard={onOpenPrintCard}
                  displayPosition={displayPositionsById.get(rec.id)}
                />
              ))}

            {showRoadHazards &&
              roadHazards.map((haz) => (
                <RoadHazardMarkerItem
                  key={haz.id}
                  hazard={haz}
                  isSelected={activeHazardId === haz.id}
                  onSelect={handleSelectHazard}
                  onUpdateStatus={onUpdateHazardStatus}
                />
              ))}

            {pickerPosition &&
              !isNaN(pickerPosition.lat) &&
              !isNaN(pickerPosition.lng) && (
                <AdvancedMarker
                  position={pickerPosition}
                  title="พิกัดที่เลือกบนแผนที่"
                >
                  <Pin
                    background="#1d4ed8"
                    borderColor="#1e3a8a"
                    glyphColor="#ffffff"
                    scale={1.25}
                  />
                </AdvancedMarker>
              )}
          </GoogleMap>
        </APIProvider>
      </div>

      {/* Selected Senior House-Front & Road-Crossing Photo Inspector (Section 2) */}
      {!onPickLocation && selectedRecord && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-sm text-slate-900">
                <Camera className="w-4 h-4 text-blue-700" />
                <span>
                  ข้อมูลหมุดและภาพถ่ายสภาพแวดล้อม/จุดข้ามถนนหน้าบ้าน (Section 2):{' '}
                  {String(selectedRecord.answers['q2_2'] || selectedRecord.id)}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-300 font-semibold text-slate-800">
                {selectedRecord.riskLabel} ({selectedRecord.totalScore}/29 คะแนน)
              </span>
              <span className="text-slate-600">
                อายุ {formatSeniorAge(selectedRecord.answers['q2_9'])} ·{' '}
                {String(selectedRecord.answers['q2_4'] || '-')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedRecord.googleMapsLink && (
                <a
                  href={selectedRecord.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>นำทาง Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {onOpenPrintCard && (
                <button
                  type="button"
                  onClick={() => onOpenPrintCard(selectedRecord)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>เปิดบัตรสรุปผล / จัดการรูปหน้าบ้าน</span>
                </button>
              )}
            </div>
          </div>

          {selectedRecord.photos && selectedRecord.photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedRecord.photos.map((photo, phIdx) => {
                const externalHref =
                  photo.driveViewLink ||
                  (photo.dataUrl && photo.dataUrl.startsWith('http')
                    ? photo.dataUrl
                    : undefined);
                return (
                  <div
                    key={`${photo.id}__${phIdx}`}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-xs"
                  >
                    <div className="h-40 bg-slate-100 border-b border-slate-200 overflow-hidden relative">
                      <SmartHazardImage
                        photo={photo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            {photo.categoryLabel ||
                              'ภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2)'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {photo.capturedAt}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-snug">
                          {photo.caption}
                        </p>
                      </div>
                      {externalHref && (
                        <div className="pt-1.5">
                          <a
                            href={externalHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold underline"
                          >
                            <span>เปิดดูไฟล์ภาพต้นฉบับ (Google Drive / ลิงก์ภาพ)</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-3.5 py-2.5 text-slate-600">
              <span>
                ยังไม่มีภาพถ่ายสภาพแวดล้อมและจุดข้ามถนนหน้าบ้าน (Section 2) สำหรับรายการของ{' '}
                <strong className="text-slate-900">
                  {String(selectedRecord.answers['q2_2'] || selectedRecord.id)}
                </strong>
              </span>
              {onOpenPrintCard && (
                <button
                  type="button"
                  onClick={() => onOpenPrintCard(selectedRecord)}
                  className="inline-flex items-center gap-1 text-blue-700 font-semibold underline hover:text-blue-800"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ แนบภาพหน้าบ้านหรือวางลิงก์รูปภาพจาก Google Drive</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

