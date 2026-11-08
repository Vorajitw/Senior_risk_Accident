import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Filter,
  RotateCcw,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { AssessmentRecord, RiskLevelCode } from '../data/assessmentSchema';

interface RiskTrendLineChartProps {
  records: AssessmentRecord[];
  activeSearchQuery?: string;
  onSelectVillageFilter?: (villageKeyword: string) => void;
}

/**
 * Extracts a clean, standardized village / community label from q2_4 ("บ้านเลขที่ / หมู่ที่ / ชุมชน")
 * and returns both a display name and a filter keyword that matches substrings in q2_4.
 */
export function extractVillageInfo(rawAddress: string): {
  villageLabel: string;
  filterKeyword: string;
  mooNumber: number;
} {
  const addr = String(rawAddress || '').trim();
  if (!addr) {
    return {
      villageLabel: 'ไม่ระบุหมู่บ้าน/ชุมชน',
      filterKeyword: '',
      mooNumber: 999,
    };
  }

  // Match patterns like "หมู่ที่ 2 ชุมชนโพธิ์เสด็จ", "ม.6 บ้านชะเมา", "หมู่ 1 ชุมชนท่าเรียน"
  const mooMatch = addr.match(/(?:หมู่ที่|หมู่|ม\.)\s*(\d+)\s*(.*)/i);
  if (mooMatch) {
    const mooNum = parseInt(mooMatch[1], 10);
    const tail = (mooMatch[2] || '').trim();
    if (tail) {
      return {
        villageLabel: `หมู่ ${mooNum} ${tail}`,
        filterKeyword: tail,
        mooNumber: mooNum,
      };
    }
    return {
      villageLabel: `หมู่ที่ ${mooNum}`,
      filterKeyword: `${mooNum}`,
      mooNumber: mooNum,
    };
  }

  // Match community or village names without explicit Moo number
  const communityMatch = addr.match(/(ชุมชน[^\s,]+|บ้าน[^\s,]+)/);
  if (communityMatch) {
    return {
      villageLabel: communityMatch[1].trim(),
      filterKeyword: communityMatch[1].trim(),
      mooNumber: 500,
    };
  }

  return {
    villageLabel: 'พื้นที่ทั่วไป (ระบุเฉพาะบ้านเลขที่)',
    filterKeyword: addr.split(/\s+/)[0] || addr,
    mooNumber: 900,
  };
}

function formatThaiShortDate(dateStr: string): string {
  const clean = String(dateStr || '').trim();
  if (!clean) return 'ไม่ระบุวันที่';

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const thaiMonths = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];

  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const thaiYearShort = ((year < 2400 ? year + 543 : year) % 100)
      .toString()
      .padStart(2, '0');
    const monthName = thaiMonths[monthIdx] || isoMatch[2];
    return `${day} ${monthName} ${thaiYearShort}`;
  }

  return clean.slice(0, 12);
}

function getSensoryGaitScore(rec: AssessmentRecord): number {
  const d = rec.dimensionScores || {};
  return (d[1] || 0) + (d[2] || 0) + (d[3] || 0);
}

function getCrossingStrategyScore(rec: AssessmentRecord): number {
  const d = rec.dimensionScores || {};
  return (d[4] || 0) + (d[5] || 0) + (d[6] || 0);
}

interface TimelineDataPoint {
  key: string;
  displayLabel: string;
  fullDate: string;
  avgScore: number;
  maxScore: number;
  minScore: number;
  avgSensoryGaitScore: number;
  avgCrossingScore: number;
  count: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  topSeniorName: string;
  topSeniorVillage: string;
  seniorNamesList: string[];
}

interface IndividualTimelinePoint {
  index: number;
  code: string;
  seniorName: string;
  dateStr: string;
  displayDate: string;
  villageLabel: string;
  totalScore: number;
  sensoryGaitScore: number;
  crossingScore: number;
  movingAvgScore: number;
  riskLevel: RiskLevelCode;
}

interface VillageTrendPoint {
  villageLabel: string;
  shortLabel: string;
  filterKeyword: string;
  mooNumber: number;
  count: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  avgSensoryGaitScore: number;
  avgCrossingScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  highOrMediumPct: number;
  riskClassification: 'HIGH_ZONE' | 'WATCH_ZONE' | 'SAFE_ZONE';
  topRiskSenior: string;
}

const TimelineCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: TimelineDataPoint = payload[0].payload;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-xl p-3.5 shadow-xl text-xs min-w-[260px] max-w-[320px]">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-900">{item.displayLabel}</span>
          <span className="text-[11px] font-mono text-slate-400">({item.fullDate})</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold tabular-nums">
          สำรวจ {item.count} ราย
        </span>
      </div>

      <div className="space-y-1.5 mb-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            คะแนนความเสี่ยงเฉลี่ย:
          </span>
          <span className="font-mono font-bold text-blue-700 text-sm tabular-nums">
            {item.avgScore.toFixed(1)} / 29
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            คะแนนสูงสุดในวันนั้น:
          </span>
          <span className="font-mono font-bold text-red-600 tabular-nums">
            {item.maxScore} คะแนน
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            เฉลี่ยด้านสายตา/การเดิน/กะระยะ (มิติ 1–3):
          </span>
          <span className="font-mono font-semibold text-amber-700 tabular-nums">
            {item.avgSensoryGaitScore.toFixed(1)} / 18
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            เฉลี่ยพฤติกรรมข้ามถนน/สะพาน (มิติ 4–6):
          </span>
          <span className="font-mono font-semibold text-teal-700 tabular-nums">
            {item.avgCrossingScore.toFixed(1)} / 11
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 bg-slate-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500 font-medium">สัดส่วนความเสี่ยงในวันนั้น:</span>
          <div className="flex items-center gap-1.5 font-mono font-semibold">
            <span className="text-red-600">แดง {item.highRiskCount}</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-600">เหลือง {item.mediumRiskCount}</span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-600">เขียว {item.lowRiskCount}</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-600 truncate">
          <span className="font-semibold text-slate-700">ผู้มีคะแนนสูงสุด:</span>{' '}
          {item.topSeniorName} ({item.topSeniorVillage})
        </div>
      </div>
    </div>
  );
};

const IndividualCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: IndividualTimelinePoint = payload[0].payload;

  const badgeStyle =
    item.riskLevel === 'RED'
      ? 'bg-red-50 text-red-700 border-red-200'
      : item.riskLevel === 'YELLOW'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const badgeLabel =
    item.riskLevel === 'RED'
      ? 'สีแดง (เสี่ยงสูง)'
      : item.riskLevel === 'YELLOW'
      ? 'สีเหลือง (ปานกลาง)'
      : 'สีเขียว (เสี่ยงต่ำ)';

  return (
    <div className="bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-xl p-3.5 shadow-xl text-xs min-w-[250px]">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-900 text-sm">{item.seniorName}</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            {item.villageLabel} · {item.displayDate}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeStyle}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">คะแนนความเสี่ยงรวม:</span>
          <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
            {item.totalScore} / 29 คะแนน
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">ค่าเฉลี่ยสะสม (Moving Avg):</span>
          <span className="font-mono font-semibold text-blue-600 tabular-nums">
            {item.movingAvgScore.toFixed(1)} คะแนน
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
          <span className="text-amber-700 font-medium">
            กายภาพ/สายตา (มิติ 1-3): {item.sensoryGaitScore}/18
          </span>
          <span className="text-teal-700 font-medium">
            พฤติกรรมข้าม (มิติ 4-6): {item.crossingScore}/11
          </span>
        </div>
      </div>
    </div>
  );
};

const VillageCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: VillageTrendPoint = payload[0].payload;

  return (
    <div className="bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-xl p-3.5 shadow-xl text-xs min-w-[260px] max-w-[320px]">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-900">{item.villageLabel}</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold tabular-nums">
          {item.count} ครัวเรือน
        </span>
      </div>

      <div className="space-y-1.5 mb-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            คะแนนความเสี่ยงเฉลี่ยพื้นที่:
          </span>
          <span className="font-mono font-bold text-indigo-700 text-sm tabular-nums">
            {item.avgScore.toFixed(1)} / 29
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            คะแนนสูงสุดที่พบในพื้นที่:
          </span>
          <span className="font-mono font-bold text-red-600 tabular-nums">
            {item.maxScore} คะแนน
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            เฉลี่ยด้านสายตา/การเดิน (มิติ 1–3):
          </span>
          <span className="font-mono font-semibold text-amber-700 tabular-nums">
            {item.avgSensoryGaitScore.toFixed(1)} / 18
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            เฉลี่ยกลยุทธ์ข้ามถนน/สะพาน (มิติ 4–6):
          </span>
          <span className="font-mono font-semibold text-teal-700 tabular-nums">
            {item.avgCrossingScore.toFixed(1)} / 11
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 bg-slate-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500 font-medium">จำนวนผู้สูงอายุแยกตามกลุ่ม:</span>
          <div className="flex items-center gap-1.5 font-mono font-semibold">
            <span className="text-red-600">แดง {item.highRiskCount}</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-600">เหลือง {item.mediumRiskCount}</span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-600">เขียว {item.lowRiskCount}</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-600 truncate">
          <span className="font-semibold text-slate-700">เคสเฝ้าระวังสูงสุด:</span>{' '}
          {item.topRiskSenior}
        </div>
      </div>
    </div>
  );
};

export const RiskTrendLineChart: React.FC<RiskTrendLineChartProps> = ({
  records,
  activeSearchQuery = '',
  onSelectVillageFilter,
}) => {
  const [timelineSubMode, setTimelineSubMode] = useState<'DAILY' | 'INDIVIDUAL'>('DAILY');
  const [villageSortMode, setVillageSortMode] = useState<'RISK_DESC' | 'MOO_ASC'>('RISK_DESC');

  // 1. Compute Chronological Timeline Data (Grouped by Assessment Date q1_3 / timestamp)
  const { dailyTimelineData, individualTimelineData, timelineSummary } = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        dailyTimelineData: [] as TimelineDataPoint[],
        individualTimelineData: [] as IndividualTimelinePoint[],
        timelineSummary: {
          firstDateLabel: '-',
          lastDateLabel: '-',
          trendDelta: 0,
          overallAvg: 0,
          peakDateLabel: '-',
          peakScore: 0,
        },
      };
    }

    // Sort records chronologically by q1_3 or timestamp
    const sortedRecords = [...records].sort((a, b) => {
      const dateA = String(a.answers['q1_3'] || a.timestamp || '').trim();
      const dateB = String(b.answers['q1_3'] || b.timestamp || '').trim();
      return dateA.localeCompare(dateB);
    });

    // Individual progression with running average
    let runningSum = 0;
    const indivPoints: IndividualTimelinePoint[] = sortedRecords.map((rec, idx) => {
      const dateRaw = String(rec.answers['q1_3'] || rec.timestamp || '').slice(0, 10);
      const { villageLabel } = extractVillageInfo(String(rec.answers['q2_4'] || ''));
      runningSum += rec.totalScore;
      const movingAvg = Number((runningSum / (idx + 1)).toFixed(1));

      return {
        index: idx + 1,
        code: `#${idx + 1} (${String(rec.answers['q2_1'] || 'ไม่ระบุ').split(' ')[0]})`,
        seniorName: String(rec.answers['q2_1'] || 'ไม่ระบุชื่อ'),
        dateStr: dateRaw,
        displayDate: formatThaiShortDate(dateRaw),
        villageLabel,
        totalScore: rec.totalScore,
        sensoryGaitScore: getSensoryGaitScore(rec),
        crossingScore: getCrossingStrategyScore(rec),
        movingAvgScore: movingAvg,
        riskLevel: rec.riskLevel,
      };
    });

    // Group by Date for Daily Timeline
    const dateGroups = new Map<string, AssessmentRecord[]>();
    sortedRecords.forEach((rec) => {
      const rawDate = String(rec.answers['q1_3'] || rec.timestamp || 'ไม่ระบุวันที่')
        .trim()
        .slice(0, 10);
      const list = dateGroups.get(rawDate) || [];
      list.push(rec);
      dateGroups.set(rawDate, list);
    });

    const dailyPoints: TimelineDataPoint[] = Array.from(dateGroups.entries()).map(
      ([dateKey, group]) => {
        const count = group.length;
        const sumTotal = group.reduce((acc, r) => acc + r.totalScore, 0);
        const sumSensory = group.reduce((acc, r) => acc + getSensoryGaitScore(r), 0);
        const sumCrossing = group.reduce((acc, r) => acc + getCrossingStrategyScore(r), 0);

        const sortedByScore = [...group].sort((a, b) => b.totalScore - a.totalScore);
        const topRec = sortedByScore[0];
        const minRec = sortedByScore[sortedByScore.length - 1];
        const topVillage = extractVillageInfo(String(topRec?.answers['q2_4'] || '')).villageLabel;

        return {
          key: dateKey,
          displayLabel: formatThaiShortDate(dateKey),
          fullDate: dateKey,
          avgScore: Number((sumTotal / count).toFixed(1)),
          maxScore: topRec ? topRec.totalScore : 0,
          minScore: minRec ? minRec.totalScore : 0,
          avgSensoryGaitScore: Number((sumSensory / count).toFixed(1)),
          avgCrossingScore: Number((sumCrossing / count).toFixed(1)),
          count,
          highRiskCount: group.filter((r) => r.riskLevel === 'RED').length,
          mediumRiskCount: group.filter((r) => r.riskLevel === 'YELLOW').length,
          lowRiskCount: group.filter((r) => r.riskLevel === 'GREEN').length,
          topSeniorName: topRec
            ? `${topRec.answers['q2_1']} (${topRec.totalScore} คะแนน)`
            : '-',
          topSeniorVillage: topVillage,
          seniorNamesList: group.map((r) => String(r.answers['q2_1'] || '')),
        };
      }
    );

    const totalSum = records.reduce((s, r) => s + r.totalScore, 0);
    const overallAvg = Number((totalSum / records.length).toFixed(1));
    const firstPoint = dailyPoints[0];
    const lastPoint = dailyPoints[dailyPoints.length - 1];
    const trendDelta =
      dailyPoints.length >= 2
        ? Number((lastPoint.avgScore - firstPoint.avgScore).toFixed(1))
        : 0;

    const peakDay = [...dailyPoints].sort((a, b) => b.maxScore - a.maxScore)[0];

    return {
      dailyTimelineData: dailyPoints,
      individualTimelineData: indivPoints,
      timelineSummary: {
        firstDateLabel: firstPoint?.displayLabel || '-',
        lastDateLabel: lastPoint?.displayLabel || '-',
        trendDelta,
        overallAvg,
        peakDateLabel: peakDay?.displayLabel || '-',
        peakScore: peakDay?.maxScore || 0,
      },
    };
  }, [records]);

  // 2. Compute Village / Community Area Risk Comparison Data
  const { villageTrendData, highestRiskVillage, safestVillage } = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        villageTrendData: [] as VillageTrendPoint[],
        highestRiskVillage: null as VillageTrendPoint | null,
        safestVillage: null as VillageTrendPoint | null,
      };
    }

    const vGroups = new Map<
      string,
      {
        villageLabel: string;
        filterKeyword: string;
        mooNumber: number;
        items: AssessmentRecord[];
      }
    >();

    records.forEach((rec) => {
      const info = extractVillageInfo(String(rec.answers['q2_4'] || ''));
      const existing = vGroups.get(info.villageLabel);
      if (existing) {
        existing.items.push(rec);
      } else {
        vGroups.set(info.villageLabel, {
          villageLabel: info.villageLabel,
          filterKeyword: info.filterKeyword,
          mooNumber: info.mooNumber,
          items: [rec],
        });
      }
    });

    const points: VillageTrendPoint[] = Array.from(vGroups.values()).map((grp) => {
      const count = grp.items.length;
      const sumTotal = grp.items.reduce((acc, r) => acc + r.totalScore, 0);
      const sumSensory = grp.items.reduce((acc, r) => acc + getSensoryGaitScore(r), 0);
      const sumCrossing = grp.items.reduce((acc, r) => acc + getCrossingStrategyScore(r), 0);

      const avgScore = Number((sumTotal / count).toFixed(1));
      const sorted = [...grp.items].sort((a, b) => b.totalScore - a.totalScore);
      const maxScore = sorted[0]?.totalScore || 0;
      const minScore = sorted[sorted.length - 1]?.totalScore || 0;

      const highRiskCount = grp.items.filter((r) => r.riskLevel === 'RED').length;
      const mediumRiskCount = grp.items.filter((r) => r.riskLevel === 'YELLOW').length;
      const lowRiskCount = grp.items.filter((r) => r.riskLevel === 'GREEN').length;
      const highOrMediumPct = Math.round(((highRiskCount + mediumRiskCount) / count) * 100);

      const riskClassification: 'HIGH_ZONE' | 'WATCH_ZONE' | 'SAFE_ZONE' =
        avgScore >= 16 || highRiskCount > 0
          ? 'HIGH_ZONE'
          : avgScore >= 8 || mediumRiskCount > 0
          ? 'WATCH_ZONE'
          : 'SAFE_ZONE';

      const shortLabel =
        grp.villageLabel.length > 18
          ? grp.villageLabel.replace('ชุมชน', '').trim()
          : grp.villageLabel;

      return {
        villageLabel: grp.villageLabel,
        shortLabel,
        filterKeyword: grp.filterKeyword,
        mooNumber: grp.mooNumber,
        count,
        avgScore,
        maxScore,
        minScore,
        avgSensoryGaitScore: Number((sumSensory / count).toFixed(1)),
        avgCrossingScore: Number((sumCrossing / count).toFixed(1)),
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        highOrMediumPct,
        riskClassification,
        topRiskSenior: sorted[0]
          ? `${sorted[0].answers['q2_1']} (${sorted[0].totalScore} คะแนน)`
          : '-',
      };
    });

    const byRiskDesc = [...points].sort(
      (a, b) => b.avgScore - a.avgScore || b.maxScore - a.maxScore
    );
    const highest = byRiskDesc[0] || null;
    const safest = byRiskDesc[byRiskDesc.length - 1] || null;

    const sortedPoints =
      villageSortMode === 'RISK_DESC'
        ? byRiskDesc
        : [...points].sort((a, b) => a.mooNumber - b.mooNumber);

    return {
      villageTrendData: sortedPoints,
      highestRiskVillage: highest,
      safestVillage: safest,
    };
  }, [records, villageSortMode]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Top Executive Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                การวิเคราะห์แนวโน้มคะแนนความเสี่ยงตามช่วงเวลา และเปรียบเทียบพื้นที่เสี่ยงรายหมู่บ้าน
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Activity className="w-3 h-3" />
                Longitudinal & Spatial Risk Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ติดตามพัฒนาการความปลอดภัยในชุมชนตามลำดับวันที่ลงสำรวจ (Timeline of Risk Scores) พร้อมจำแนกพื้นที่เสี่ยงมาก–เสี่ยงน้อยรายหมู่บ้านเพื่อจัดลำดับความสำคัญในการลงพื้นที่แก้ไขจุดเสี่ยง
            </p>
          </div>
        </div>

        {/* Executive KPI Summary Strip */}
        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              ค่าเฉลี่ยชุมชนรวม
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {timelineSummary.overallAvg}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">/ 29</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-red-50/70 border border-red-200/80">
            <p className="text-[10px] font-semibold text-red-700 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              พื้นที่เสี่ยงสูงสุด
            </p>
            <p className="text-xs font-bold text-red-900 truncate max-w-[140px] mt-0.5">
              {highestRiskVillage ? highestRiskVillage.shortLabel : '-'}
            </p>
            {highestRiskVillage && (
              <p className="text-[10px] font-mono text-red-700 font-semibold">
                เฉลี่ย {highestRiskVillage.avgScore} คะแนน
              </p>
            )}
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              พื้นที่ปลอดภัยสูงสุด
            </p>
            <p className="text-xs font-bold text-emerald-900 truncate max-w-[140px] mt-0.5">
              {safestVillage ? safestVillage.shortLabel : '-'}
            </p>
            {safestVillage && (
              <p className="text-[10px] font-mono text-emerald-700 font-semibold">
                เฉลี่ย {safestVillage.avgScore} คะแนน
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Dual-Panel Content Grid */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT PANEL (6 cols): Timeline of Risk Scores by Assessment Date */}
        <div className="xl:col-span-6 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/80 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  1. แนวโน้มคะแนนความเสี่ยงตามวันที่ประเมิน (Timeline of Risk Scores)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ช่วงข้อมูล: {timelineSummary.firstDateLabel} – {timelineSummary.lastDateLabel} · เส้นประแสดงเกณฑ์มาตรฐานทางคลินิก (8 และ 16 คะแนน)
              </p>
            </div>

            {/* Sub-mode Toggle: Daily vs Individual */}
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs shrink-0 self-start">
              <button
                type="button"
                onClick={() => setTimelineSubMode('DAILY')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  timelineSubMode === 'DAILY'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายวัน (Daily Avg)
              </button>
              <button
                type="button"
                onClick={() => setTimelineSubMode('INDIVIDUAL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  timelineSubMode === 'INDIVIDUAL'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายบุคคลตามลำดับ ({individualTimelineData.length} ราย)
              </button>
            </div>
          </div>

          {/* Line Chart Canvas */}
          <div className="h-72 w-full bg-white rounded-xl border border-slate-200/70 p-3">
            {timelineSubMode === 'DAILY' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dailyTimelineData}
                  margin={{ top: 14, right: 18, left: -12, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  {/* Clinical Risk Threshold Zones */}
                  <ReferenceArea y1={16} y2={29} fill="#fef2f2" fillOpacity={0.55} />
                  <ReferenceArea y1={8} y2={16} fill="#fffbeb" fillOpacity={0.45} />
                  <ReferenceArea y1={0} y2={8} fill="#ecfdf5" fillOpacity={0.35} />

                  <XAxis
                    dataKey="displayLabel"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 29]}
                    ticks={[0, 8, 16, 24, 29]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TimelineCustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                  />

                  <ReferenceLine
                    y={16}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'เกณฑ์วิกฤต (≥16)',
                      position: 'insideTopRight',
                      fill: '#dc2626',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                  <ReferenceLine
                    y={8}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                    label={{
                      value: 'เกณฑ์เฝ้าระวัง (≥8)',
                      position: 'insideTopRight',
                      fill: '#b45309',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    name="คะแนนรวมเฉลี่ยรายวัน"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4.5, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6.5, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxScore"
                    name="คะแนนสูงสุดในวันนั้น"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3.5, fill: '#dc2626', strokeWidth: 1.5, stroke: '#ffffff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgSensoryGaitScore"
                    name="เฉลี่ยสายตา/การเดิน (มิติ 1-3)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgCrossingScore"
                    name="เฉลี่ยพฤติกรรมข้ามถนน (มิติ 4-6)"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0d9488' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={individualTimelineData}
                  margin={{ top: 14, right: 18, left: -12, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <ReferenceArea y1={16} y2={29} fill="#fef2f2" fillOpacity={0.55} />
                  <ReferenceArea y1={8} y2={16} fill="#fffbeb" fillOpacity={0.45} />
                  <ReferenceArea y1={0} y2={8} fill="#ecfdf5" fillOpacity={0.35} />

                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 29]}
                    ticks={[0, 8, 16, 24, 29]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<IndividualCustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                  />

                  <ReferenceLine
                    y={16}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <ReferenceLine
                    y={8}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                  />

                  <Line
                    type="monotone"
                    dataKey="totalScore"
                    name="คะแนนความเสี่ยงรายบุคคล"
                    stroke="#1e40af"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1e40af', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvgScore"
                    name="ค่าเฉลี่ยสะสมชุมชน (Moving Average)"
                    stroke="#059669"
                    strokeWidth={2.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom Timeline Insight Bar */}
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              {timelineSummary.trendDelta <= 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  แนวโน้มความเสี่ยงวันล่าสุดลดลง {Math.abs(timelineSummary.trendDelta)} คะแนน
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  แนวโน้มวันล่าสุดพบเคสความเสี่ยงเพิ่มขึ้น +{timelineSummary.trendDelta} คะแนน
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                (วันที่พบคะแนนสูงสุด: <strong className="text-slate-700">{timelineSummary.peakDateLabel}</strong> ที่ {timelineSummary.peakScore} คะแนน)
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (6 cols): Spatial Risk Profile by Surveyed Village */}
        <div className="xl:col-span-6 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/80 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  2. กราฟเส้นเปรียบเทียบคะแนนความเสี่ยงตามพื้นที่หมู่บ้าน (Village Spatial Risk Trend)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                เปรียบเทียบค่าเฉลี่ยและค่าสูงสุดของแต่ละหมู่บ้านเพื่อชี้เป้าพื้นที่เสี่ยงมาก–เสี่ยงน้อยอย่างชัดเจน
              </p>
            </div>

            {/* Sort toggle for Village X-Axis */}
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs shrink-0 self-start">
              <button
                type="button"
                onClick={() => setVillageSortMode('RISK_DESC')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  villageSortMode === 'RISK_DESC'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เรียงตามพื้นที่เสี่ยงมาก ➔ น้อย
              </button>
              <button
                type="button"
                onClick={() => setVillageSortMode('MOO_ASC')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  villageSortMode === 'MOO_ASC'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เรียงตามเลขหมู่บ้าน
              </button>
            </div>
          </div>

          {/* Village Line Chart Canvas */}
          <div className="h-72 w-full bg-white rounded-xl border border-slate-200/70 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={villageTrendData}
                margin={{ top: 14, right: 18, left: -12, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <ReferenceArea y1={16} y2={29} fill="#fef2f2" fillOpacity={0.55} />
                <ReferenceArea y1={8} y2={16} fill="#fffbeb" fillOpacity={0.45} />
                <ReferenceArea y1={0} y2={8} fill="#ecfdf5" fillOpacity={0.35} />

                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 10.5, fill: '#334155', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 29]}
                  ticks={[0, 8, 16, 24, 29]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<VillageCustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />

                <ReferenceLine
                  y={16}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'พื้นที่เสี่ยงสูง (≥16)',
                    position: 'insideTopRight',
                    fill: '#dc2626',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <ReferenceLine
                  y={8}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={1.2}
                  label={{
                    value: 'พื้นที่เฝ้าระวัง (≥8)',
                    position: 'insideTopRight',
                    fill: '#b45309',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="คะแนนความเสี่ยงเฉลี่ยของหมู่บ้าน"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#4338ca', stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="maxScore"
                  name="คะแนนสูงสุดในหมู่บ้าน"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 4, fill: '#dc2626', strokeWidth: 1.5, stroke: '#ffffff' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSensoryGaitScore"
                  name="เฉลี่ยด้านสายตา/การเดิน (มิติ 1-3)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgCrossingScore"
                  name="เฉลี่ยกลยุทธ์ข้ามถนน (มิติ 4-6)"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0d9488' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              สำรวจครอบคลุมทั้งหมด <strong className="text-slate-900">{villageTrendData.length} หมู่บ้าน/ชุมชน</strong>
            </span>
            {activeSearchQuery && onSelectVillageFilter && (
              <button
                type="button"
                onClick={() => onSelectVillageFilter('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                ล้างตัวกรองหมู่บ้าน ({activeSearchQuery})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Spatial Ranking Strip: พื้นที่เสี่ยงมาก ➔ พื้นที่เสี่ยงน้อย */}
      <div className="px-6 pb-6">
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                การจัดลำดับพื้นที่เสี่ยงรายหมู่บ้าน/ชุมชน (เรียงจากพื้นที่เสี่ยงมาก ➔ พื้นที่เสี่ยงน้อย)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              คลิกที่การ์ดหมู่บ้านเพื่อกรองดูรายชื่อและตำแหน่งพิกัดหลังคาเรือนในตารางด้านล่าง
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...villageTrendData]
              .sort((a, b) => b.avgScore - a.avgScore || b.maxScore - a.maxScore)
              .map((village, idx) => {
                const isSelected =
                  Boolean(activeSearchQuery) &&
                  Boolean(village.filterKeyword) &&
                  activeSearchQuery.includes(village.filterKeyword);

                const zoneBadge =
                  village.riskClassification === 'HIGH_ZONE'
                    ? {
                        label: 'พื้นที่เสี่ยงมาก (เร่งด่วน)',
                        bg: 'bg-red-50 border-red-200 text-red-700',
                        bar: 'bg-red-600',
                        cardBorder: isSelected
                          ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30'
                          : 'border-slate-200/90 hover:border-red-300 bg-white',
                      }
                    : village.riskClassification === 'WATCH_ZONE'
                    ? {
                        label: 'พื้นที่เฝ้าระวังปานกลาง',
                        bg: 'bg-amber-50 border-amber-200 text-amber-800',
                        bar: 'bg-amber-500',
                        cardBorder: isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30'
                          : 'border-slate-200/90 hover:border-amber-300 bg-white',
                      }
                    : {
                        label: 'พื้นที่เสี่ยงน้อย (ปลอดภัย)',
                        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                        bar: 'bg-emerald-500',
                        cardBorder: isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                          : 'border-slate-200/90 hover:border-emerald-300 bg-white',
                      };

                const scorePct = Math.min(100, Math.round((village.avgScore / 29) * 100));

                return (
                  <button
                    key={village.villageLabel}
                    type="button"
                    onClick={() => {
                      if (!onSelectVillageFilter) return;
                      if (isSelected) {
                        onSelectVillageFilter('');
                      } else {
                        onSelectVillageFilter(village.filterKeyword);
                      }
                    }}
                    className={`text-left rounded-xl border p-3.5 transition-all cursor-pointer shadow-2xs hover:shadow-sm ${zoneBadge.cardBorder}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {village.villageLabel}
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${zoneBadge.bg}`}
                      >
                        {zoneBadge.label}
                      </span>
                    </div>

                    {/* Score Metrics */}
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div>
                        <span className="text-[11px] text-slate-500">คะแนนเฉลี่ย: </span>
                        <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                          {village.avgScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400"> / 29</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        สูงสุด <strong className="text-slate-800">{village.maxScore}</strong> คะแนน
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full ${zoneBadge.bar}`}
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>

                    {/* Household Risk Breakdown */}
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        {village.count} ครัวเรือน
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                          แดง {village.highRiskCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                          เหลือง {village.mediumRiskCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          เขียว {village.lowRiskCount}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
