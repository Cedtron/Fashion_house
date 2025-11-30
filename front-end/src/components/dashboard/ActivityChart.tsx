import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface StockTracking {
  id: number;
  stockId: number;
  action: "CREATE" | "UPDATE" | "DELETE" | "ADJUST" | "IMAGE_UPLOAD";
  description: string;
  oldData: any;
  newData: any;
  performedBy: string;
  performedAt: string;
}

interface ActivityChartProps {
  changes: StockTracking[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ changes }) => {
  const chartData = useMemo(() => {
    if (!changes || changes.length === 0) return [];

    // Group by date
    const grouped: Record<string, any> = {};

    changes.forEach((c) => {
      const date = new Date(c.performedAt).toLocaleDateString();

      if (!grouped[date]) {
        grouped[date] = {
          date,
          CREATE: 0,
          UPDATE: 0,
          DELETE: 0,
          ADJUST: 0,
          IMAGE_UPLOAD: 0,
        };
      }

      grouped[date][c.action] += 1;
    });

    // Convert to array
    const sortedArray = Object.values(grouped).sort((a: any, b: any) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Only last 10 days
    return sortedArray.slice(-10);
  }, [changes]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No activity data available
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
        📊 Stock Activity by Date (Area Chart)
      </h2>

      <div className="h-80 overflow-y-auto custom-scrollbar">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis allowDecimals={false} stroke="#9ca3af" />
            <Tooltip />
            <Legend />

            <Area type="monotone" dataKey="CREATE" stroke="#22c55e" fill="#22c55e50" />
            <Area type="monotone" dataKey="UPDATE" stroke="#3b82f6" fill="#3b82f650" />
            <Area type="monotone" dataKey="DELETE" stroke="#ef4444" fill="#ef444450" />
            <Area type="monotone" dataKey="ADJUST" stroke="#eab308" fill="#eab30850" />
            <Area type="monotone" dataKey="IMAGE_UPLOAD" stroke="#a855f7" fill="#a855f750" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityChart;
