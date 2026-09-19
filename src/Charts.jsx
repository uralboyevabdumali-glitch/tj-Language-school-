/**
 * ============================================================================
 *  CHARTS — loaded on demand
 * ============================================================================
 *  Recharts is the single heaviest dependency in the project (~420 kB before
 *  gzip). Most people who open the app never see a chart: a student checking
 *  their homework, anyone reading the public site, a teacher marking a
 *  register. Keeping it in the main bundle made all of them pay for it.
 *
 *  Every chart therefore lives in this module and App.jsx pulls it in with
 *  React.lazy, so the download only happens on a page that actually draws one.
 *
 *  The components here take plain data and nothing else. They deliberately do
 *  not import anything from App.jsx — that would create a cycle and drag the
 *  whole app back into this chunk.
 * ============================================================================
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const axisStyle = { stroke: '#7B90CE', fontSize: 12, tickLine: false, axisLine: false };
const GRID = '#EEF2FB';
const HOVER = '#F5F7FD';

export const CHART_PALETTE = ['#2563EB', '#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#F43F5E'];

/** Area chart with a soft gradient fill. Used for growth over time. */
export function AreaTrend({
  data, xKey, yKey, height = 250, color = '#2563EB',
  gradientId = 'areaTrend', tickFormatter, labelFormatter, yWidth = 34,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={tickFormatter} {...axisStyle} />
        <YAxis {...axisStyle} width={yWidth} />
        <Tooltip labelFormatter={labelFormatter} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Vertical or horizontal bars.
 * Pass `multicolour` to colour each bar from the palette (used for IELTS bands,
 * where the bars are categories rather than one series).
 */
export function Bars({
  data, xKey, yKey, height = 250, color = '#2563EB', multicolour = false,
  horizontal = false, xTickFormatter, yTickFormatter, labelFormatter, valueFormatter,
  domain, yWidth = 28, allowDecimals = true, angledLabels = false,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={horizontal ? { left: 24 } : undefined}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={!horizontal ? false : true} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...axisStyle} />
            <YAxis type="category" dataKey={xKey} width={130} {...axisStyle} />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tickFormatter={xTickFormatter}
              {...axisStyle}
              {...(angledLabels ? { interval: 0, angle: -20, textAnchor: 'end', height: 70 } : {})}
            />
            <YAxis
              tickFormatter={yTickFormatter}
              domain={domain}
              allowDecimals={allowDecimals}
              {...axisStyle}
              width={yWidth}
            />
          </>
        )}
        <Tooltip cursor={{ fill: HOVER }} labelFormatter={labelFormatter} formatter={valueFormatter} />
        <Bar dataKey={yKey} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} fill={multicolour ? undefined : color}>
          {multicolour && data.map((entry, index) => (
            <Cell key={entry[xKey] ?? index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Donut for a small breakdown (attendance split).
 * Each slice carries its own `color`, because present/late/absent have fixed
 * meanings that should not shuffle with the palette.
 */
export function Donut({ data, height = 220, innerRadius = 56, outerRadius = 82, valueFormatter }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={3}>
          {data.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
        </Pie>
        <Tooltip formatter={valueFormatter} />
      </PieChart>
    </ResponsiveContainer>
  );
}
