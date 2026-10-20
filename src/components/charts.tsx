import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { money } from "../lib/domain";
export function RevenueChart({
  data,
}: {
  data: Record<string, string | number>[];
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#252d29"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#78877f", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={22}
          />
          <YAxis
            tickFormatter={(v) => `${v >= 1000 ? `${v / 1000}k` : v}`}
            tick={{ fill: "#78877f", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "#18211c",
              border: "1px solid #354239",
              borderRadius: 10,
            }}
            formatter={(v) => money(Number(v))}
          />
          <Area
            name="Receita"
            type="monotone"
            dataKey="revenue"
            stroke="#34d399"
            strokeWidth={2.5}
            fill="url(#revenue)"
          />
          <Area
            name="Resultado líquido"
            type="monotone"
            dataKey="net"
            stroke="#a3bba9"
            strokeWidth={1.5}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function CompareChart({
  data,
  keys = [
    ["revenue", "Receita"],
    ["expense", "Saídas"],
  ],
}: {
  data: Record<string, string | number>[];
  keys?: string[][];
}) {
  return (
    <div className="chart compact">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#252d29" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#78877f", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#78877f", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "#18211c",
              border: "1px solid #354239",
              borderRadius: 10,
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          {keys.map(([key, name], i) => (
            <Bar
              key={key}
              dataKey={key}
              name={name}
              fill={["#34d399", "#586b60", "#f59e0b"][i % 3]}
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
