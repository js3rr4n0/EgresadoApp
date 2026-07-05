"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface DashboardChartsProps {
  chartData: ChartData[];
}

// Custom shapes para barras redondeadas en la parte superior
const RoundedBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  if (height === 0) return null;
  return (
    <path
      d={`M${x},${y + height} L${x},${y + 4} Q${x},${y} ${x + 4},${y} L${x + width - 4},${y} Q${x + width},${y} ${x + width},${y + 4} L${x + width},${y + height} Z`}
      fill={fill}
    />
  );
};

export default function DashboardCharts({ chartData }: DashboardChartsProps) {
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Bar Chart - TGs por Estado */}
      <div className="lg:col-span-2 bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-brand-red flex items-center gap-2 mb-6">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          TGs por Estado
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
              barSize={45}
            >
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                dx={-10}
              />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
              />
              <Bar 
                dataKey="value" 
                shape={<RoundedBar />}
                label={{ position: 'top', fill: '#1F2937', fontSize: 11, fontWeight: 700, dy: -10 }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart - Distribución General */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-brand-red mb-2">
          Distribución General
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Centered Total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-card-dark">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4 px-2">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.fill }}></span>
              <span className="text-[10px] font-bold text-card-dark truncate">
                {entry.name} ({entry.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
