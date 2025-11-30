import React, { useMemo } from "react";
import { FiActivity } from "react-icons/fi";

interface StockTracking {
  id: number;
  stockId: number;
  action: "CREATE" | "UPDATE" | "DELETE" | "ADJUST" | "IMAGE_UPLOAD";
  description: string;
  oldData: any;
  newData: any;
  performedBy: string;
  performedAt: string;
  ipAddress?: string;
  userAgent?: string;
  stock?: {
    product: string;
    stockId: string;
  };
}

interface RecentChangesProps {
  changes: StockTracking[];
}

const RecentChanges: React.FC<RecentChangesProps> = ({ changes }) => {
  // ----------------------------
  // SORT → NEWEST FIRST
  // LIMIT → FIRST 10 ITEMS
  // ----------------------------
  const processedChanges = useMemo(() => {
    return [...changes]
      .sort(
        (a, b) =>
          new Date(b.performedAt).getTime() -
          new Date(a.performedAt).getTime()
      )
      .slice(0, 10);
  }, [changes]);

  return (
    <div className="bg-white shadow-lg rounded-xl h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FiActivity className="w-5 h-5 text-purple-600" />
          Recent Changes
        </h2>
      </div>

      {/* Body with Scroll */}
      <div className="p-6 flex-1 overflow-y-auto max-h-[420px]">
        <div className="space-y-3">
          {processedChanges.map((item) => (
            <div key={item.id} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.stock?.product || "Unknown Product"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.description || item.action.replace("_", " ")}
                  </p>
                </div>

                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.action === "UPDATE"
                      ? "bg-blue-100 text-blue-800"
                      : item.action === "ADJUST"
                      ? "bg-yellow-100 text-yellow-800"
                      : item.action === "CREATE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {item.action}
                </span>
              </div>

              <p className="mt-2 text-xs text-gray-600">
                {new Date(item.performedAt).toLocaleString()}
              </p>
            </div>
          ))}

          {processedChanges.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No recent changes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentChanges;
