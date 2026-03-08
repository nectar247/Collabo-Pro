import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { ChartDef, CellValue } from '@/lib/documents/schemas';
import { parseCellKey } from '@/lib/documents/schemas';

// ─── Range parser ─────────────────────────────────────────────────────────────

function parseRange(rangeStr: string): string[] {
  // Supports single col "A1:A6" or multi-col "A1:C1"
  const parts = rangeStr.toUpperCase().split(':');
  if (parts.length !== 2) return [rangeStr.toUpperCase()];
  const { row: r1, col: c1 } = parseCellKey(parts[0]);
  const { row: r2, col: c2 } = parseCellKey(parts[1]);
  const keys: string[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      keys.push(`${String.fromCharCode(65 + c)}${r + 1}`);
    }
  }
  return keys;
}

function getCellValue(key: string, cells: Record<string, CellValue>): number {
  const cell = cells[key];
  const raw = cell?.computed ?? cell?.raw ?? '0';
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

function getCellLabel(key: string, cells: Record<string, CellValue>): string {
  const cell = cells[key];
  return cell?.computed ?? cell?.raw ?? key;
}

// ─── Default chart colours ────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({
  values, labels, colors, width, height,
}: { values: number[]; labels: string[]; colors: string[]; width: number; height: number }) {
  if (!values.length) return null;
  const maxVal = Math.max(...values, 1);
  const chartH = height - 40; // leave 40px for x-axis labels
  const chartW = width - 40;  // leave 40px for y-axis
  const barW = Math.max(10, Math.floor((chartW - values.length * 4) / values.length));
  const totalBarsW = values.length * (barW + 4) - 4;
  const startX = 40 + (chartW - totalBarsW) / 2;

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1.0].map(t => Math.round(maxVal * t));

  return (
    <Svg width={width} height={height}>
      {/* Y-axis ticks */}
      {ticks.map((tick, i) => {
        const y = 10 + chartH - (tick / maxVal) * chartH;
        return (
          <G key={i}>
            <Line x1={38} y1={y} x2={width} y2={y} stroke={Colors.border} strokeWidth={0.5} />
            <SvgText x={2} y={y + 4} fontSize={9} fill={Colors.textDim}>
              {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : String(tick)}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {values.map((val, i) => {
        const barH = Math.max(1, (val / maxVal) * chartH);
        const x = startX + i * (barW + 4);
        const y = 10 + chartH - barH;
        const color = colors[i % colors.length];
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} />
            <SvgText
              x={x + barW / 2} y={height - 4}
              fontSize={9} fill={Colors.textDim} textAnchor="middle"
              numberOfLines={1}
            >
              {(labels[i] ?? '').slice(0, 6)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({
  values, labels, colors, width, height,
}: { values: number[]; labels: string[]; colors: string[]; width: number; height: number }) {
  if (values.length < 2) return null;
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const chartH = height - 40;
  const chartW = width - 40;
  const color = colors[0];

  function toX(i: number) { return 40 + (i / (values.length - 1)) * chartW; }
  function toY(v: number) { return 10 + chartH - ((v - minVal) / range) * chartH; }

  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1.0].map((t, i) => {
        const val = minVal + range * t;
        const y = toY(val);
        return (
          <G key={i}>
            <Line x1={40} y1={y} x2={width} y2={y} stroke={Colors.border} strokeWidth={0.5} />
            <SvgText x={2} y={y + 4} fontSize={9} fill={Colors.textDim}>
              {Math.round(val) >= 1000 ? `${(Math.round(val) / 1000).toFixed(1)}k` : String(Math.round(val))}
            </SvgText>
          </G>
        );
      })}

      {/* Area fill */}
      <Path
        d={`M${toX(0)},${toY(values[0])} ${values.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ')} L${toX(values.length - 1)},${10 + chartH} L${toX(0)},${10 + chartH} Z`}
        fill={color} fillOpacity={0.12}
      />

      {/* Line */}
      <Polyline points={points} stroke={color} strokeWidth={2} fill="none" />

      {/* Dots + labels */}
      {values.map((v, i) => (
        <G key={i}>
          <Circle cx={toX(i)} cy={toY(v)} r={4} fill={color} />
          <SvgText
            x={toX(i)} y={height - 4}
            fontSize={9} fill={Colors.textDim} textAnchor="middle"
          >
            {(labels[i] ?? '').slice(0, 6)}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

function PieChart({
  values, labels, colors, size,
}: { values: number[]; labels: string[]; colors: string[]; size: number }) {
  const total = values.reduce((s, v) => s + Math.abs(v), 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  let startAngle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const angle = (Math.abs(v) / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = startAngle + angle / 2;
    const lx = cx + (r + 14) * Math.cos(midAngle);
    const ly = cy + (r + 14) * Math.sin(midAngle);
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
    startAngle = endAngle;
    return { path, color: colors[i % colors.length], lx, ly, label: labels[i] ?? '', pct: Math.round((Math.abs(v) / total) * 100) };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => (
        <G key={i}>
          <Path d={s.path} fill={s.color} stroke={Colors.background} strokeWidth={1} />
        </G>
      ))}
      {slices.map((s, i) => (
        <SvgText key={i} x={s.lx} y={s.ly} fontSize={9} fill={Colors.text} textAnchor="middle">
          {s.pct > 5 ? `${s.pct}%` : ''}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ labels, colors }: { labels: string[]; colors: string[] }) {
  return (
    <View style={styles.legend}>
      {labels.slice(0, 8).map((label, i) => (
        <View key={i} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors[i % colors.length] }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main SpreadsheetChart ────────────────────────────────────────────────────

interface SpreadsheetChartProps {
  chart: ChartDef;
  cells: Record<string, CellValue>;
  onDelete?: () => void;
  isReadOnly?: boolean;
}

export function SpreadsheetChart({ chart, cells, onDelete, isReadOnly }: SpreadsheetChartProps) {
  const [expanded, setExpanded] = useState(true);

  const dataKeys = parseRange(chart.dataRange);
  const labelKeys = chart.labelRange ? parseRange(chart.labelRange) : [];
  const values = dataKeys.map(k => getCellValue(k, cells));
  const labels = labelKeys.length
    ? labelKeys.map(k => getCellLabel(k, cells))
    : dataKeys.map((_, i) => String(i + 1));
  const colors = chart.colors?.length ? chart.colors : DEFAULT_COLORS;

  const W = 300;
  const H = 180;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ flex: 1 }}>
          <Text style={styles.title}>{chart.title ?? `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`}</Text>
        </TouchableOpacity>
        {!isReadOnly && onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <View style={styles.body}>
          {chart.type === 'bar' && (
            <BarChart values={values} labels={labels} colors={colors} width={W} height={H} />
          )}
          {chart.type === 'line' && (
            <LineChart values={values} labels={labels} colors={colors} width={W} height={H} />
          )}
          {chart.type === 'pie' && (
            <View style={{ alignItems: 'center' }}>
              <PieChart values={values} labels={labels} colors={colors} size={W * 0.7} />
            </View>
          )}
          <Legend labels={labels} colors={colors} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceHigh,
  },
  title: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  deleteBtn: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.danger}18`, borderRadius: Radius.sm,
  },
  deleteBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '700' },
  body: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.xs, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: Colors.textDim, fontSize: 10 },
});
