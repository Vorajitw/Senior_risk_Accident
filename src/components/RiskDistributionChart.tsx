import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { AssessmentRecord, RiskLevelCode } from '../data/assessmentSchema';
import { PieChart as PieChartIcon, Filter } from 'lucide-react';

interface RiskDistributionChartProps {
  records: AssessmentRecord[];
  activeRiskFilter: 'ALL' | RiskLevelCode;
  onSelectRiskFilter: (filter: 'ALL' | RiskLevelCode) => void;
}

interface PieSliceData {
  code: RiskLevelCode;
  name: string;
  shortLabel: string;
  value: number;
  percentage: number;
  color: string;
  actionHint: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PieSliceData }>;
}

const CustomPieTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md p-2.5 text-xs space-y-1">
      <div className="font-bold text-slate-900">{item.name}</div>
      <div className="font-mono tabular-nums text-slate-800">
        จำนวน: <strong>{item.value} ราย</strong> ({item.percentage}%)
      </div>
      <div className="text-[11px] text-slate-500">{item.actionHint}</div>
    </div>
  );
};

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  records,
  activeRiskFilter,
  onSelectRiskFilter,
}) => {
  const total = records.length;
  const countRed = records.filter((r) => r.riskLevel === 'RED').length;
  const countYellow = records.filter((r) => r.riskLevel === 'YELLOW').length;
  const countGreen = records.filter((r) => r.riskLevel === 'GREEN').length;

  const pieData: PieSliceData[] = [
    {
      code: 'RED',
      name: '🔴 สีแดง: ความเสี่ยงสูง / วิกฤต',
      shortLabel: 'แดง (เสี่ยงสูง)',
      value: countRed,
      percentage: total > 0 ? Math.round((countRed / total) * 100) : 0,
      color: '#dc2626',
      actionHint: 'คะแนน ≥ 16 หรือไม่ใช้สะพานข้ามร่องกลาง · ต้องมีเพื่อนช่วยพาข้าม',
    },
    {
      code: 'YELLOW',
      name: '🟡 สีเหลือง: ความเสี่ยงปานกลาง',
      shortLabel: 'เหลือง (ปานกลาง)',
      value: countYellow,
      percentage: total > 0 ? Math.round((countYellow / total) * 100) : 0,
      color: '#d97706',
      actionHint: 'คะแนน 8–15 · ส่งตรวจสายตา/ตัดแว่น และอบรมประเมินความเร็วรถ',
    },
    {
      code: 'GREEN',
      name: '🟢 สีเขียว: ความเสี่ยงต่ำ',
      shortLabel: 'เขียว (เสี่ยงต่ำ)',
      value: countGreen,
      percentage: total > 0 ? Math.round((countGreen / total) * 100) : 0,
      color: '#16a34a',
      actionHint: 'คะแนน 0–7 · ส่งเสริมเป็น อสม. แกนนำผู้สูงวัยปลอดภัย',
    },
  ];

  // Calculate average score per dimension across all records
  const dimensionConfig = [
    { id: 1, label: 'มิติ 1: การมองเห็นและรับรู้แสง (Visual & Glare)', max: 6 },
    { id: 2, label: 'มิติ 2: ความเร็วการเดินและการทรงตัว (Gait & Balance)', max: 6 },
    { id: 3, label: 'มิติ 3: การกะความเร็วรถและสแกนถนน (TTA & Scanning)', max: 6 },
    { id: 4, label: 'มิติ 4: สมาธิและการตัดสินใจเมื่อจราจรซับซ้อน', max: 4 },
    { id: 5, label: 'มิติ 5: กลยุทธ์ข้าม 2 จังหวะและใช้สะพานคอนกรีต', max: 5 },
    { id: 6, label: 'มิติ 6: ความถี่การข้ามและความเสี่ยงสะสม', max: 2 },
  ];

  const dimensionAverages = dimensionConfig.map((dim) => {
    const sum = records.reduce(
      (acc, r) => acc + (r.dimensionScores[dim.id] || 0),
      0
    );
    const avg = total > 0 ? sum / total : 0;
    const ratioPct = Math.min(100, Math.round((avg / dim.max) * 100));
    return {
      ...dim,
      avg: avg.toFixed(1),
      ratioPct,
    };
  });

  const handleSliceClick = (code: RiskLevelCode) => {
    onSelectRiskFilter(activeRiskFilter === code ? 'ALL' : code);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-700" />
            <span>
              สัดส่วนผู้สูงอายุแยกตามสัญญาณไฟจราจรชีวิต (Risk Distribution Pie Chart) และค่าเฉลี่ยความเสี่ยง 6 มิติ
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            คลิกที่ชิ้นส่วนกราฟวงกลม (Pie Chart) หรือแถบสีเพื่อกรองข้อมูลผู้สูงอายุบนแผนที่ GIS และตารางด้านล่างได้ทันที
          </p>
        </div>

        {activeRiskFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectRiskFilter('ALL')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>ล้างตัวกรอง (แสดงครบทั้ง {total} ราย)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 7 Cols: Recharts PieChart + Interactive Legend Breakdown */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-5 h-[220px] w-full relative">
            {total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลการประเมิน
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={2}
                    onClick={(_, index) => {
                      const clicked = pieData[index];
                      if (clicked) handleSliceClick(clicked.code);
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {pieData.map((entry) => {
                      const isDimmed =
                        activeRiskFilter !== 'ALL' &&
                        activeRiskFilter !== entry.code;
                      return (
                        <Cell
                          key={entry.code}
                          fill={entry.color}
                          fillOpacity={isDimmed ? 0.35 : 1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Center KPI overlay inside Donut */}
            <div className="inset-0 absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] text-slate-500 font-medium">
                ทั้งหมด
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {total}
              </span>
              <span className="text-[10px] text-slate-500">ราย</span>
            </div>
          </div>

          {/* Interactive Legend & Proportion Cards */}
          <div className="sm:col-span-7 space-y-2">
            {pieData.map((slice) => {
              const isSelected = activeRiskFilter === slice.code;
              return (
                <button
                  key={slice.code}
                  type="button"
                  onClick={() => handleSliceClick(slice.code)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0 mt-1"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        {slice.name}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {slice.actionHint}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="text-sm font-bold text-slate-900">
                      {slice.value} ราย
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {slice.percentage}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Secondary 6-Dimension Community Risk Profile */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs">
            <span className="font-bold text-slate-900">
              คะแนนความเสี่ยงเฉลี่ยรายมิติ (6 มิติของชุมชน)
            </span>
            <span className="text-[11px] text-slate-500">
              คะแนนเฉลี่ย / คะแนนเต็ม
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {dimensionAverages.map((dim) => {
              const barColor =
                dim.ratioPct >= 65
                  ? 'bg-red-600'
                  : dim.ratioPct >= 35
                  ? 'bg-amber-500'
                  : 'bg-emerald-600';

              return (
                <div key={dim.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-700 font-medium truncate">
                      {dim.label}
                    </span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                      {dim.avg} / {dim.max} ({dim.ratioPct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-xs overflow-hidden">
                    <div
                      className={`h-full ${barColor}`}
                      style={{ width: `${dim.ratioPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
