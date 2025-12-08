import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiEye,
  FiTrendingUp,
  FiTrendingDown,
  FiPackage,
  FiFilter,
  FiDownload,
  FiDroplet,
  FiAlertTriangle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageLoader from "../components/common/PageLoader";

interface ShadeSnapshot {
  colorName: string;
  color: string;
  quantity: number;
}

interface StockRecord {
  id: number;
  stockId: string;
  product: string;
  category: string;
}

interface QuantityChange {
  changeType: "increase" | "decrease" | "none";
  changeAmount: number;
  performedAt: string;
  performedBy: string;
  description: string;
  isShadeUpdate: boolean;
  shadeName?: string;
}

interface MovementItem {
  stockId: string;
  product: string;
  category: string;
  currentStock: number;
  totalAdded: number;
  totalRemoved: number;
  netChange: number;
  lastActivity: string;
  lastAction: string;
  cost: number;
  price: number;
  stockItem: StockRecord;
  hasShades: boolean;
  shadeDetails: {
    totalShades: number;
    shadeQuantities: ShadeSnapshot[];
  };
  quantityChanges: QuantityChange[];
  updatedAt: string;
  createdAt: string;
}

interface InventoryTotals {
  totalProducts: number;
  withShades: number;
  withoutShades: number;
  totalShades: number;
  totalAdded: number;
  totalRemoved: number;
  currentStock: number;
}

interface InventorySummaryResponse {
  totals: InventoryTotals;
  items: MovementItem[];
}

interface AlertEntry {
  stockId: number;
  stockCode: string;
  product: string;
  shadeId?: number;
  shadeName?: string;
  quantity: number;
}

interface StockAlertsResponse {
  thresholds: {
    shadeLow: number;
    shadeHigh: number;
    stockLow: number;
  };
  counts: {
    lowShades: number;
    highShades: number;
    lowStocks: number;
  };
  lowShadeAlerts: AlertEntry[];
  highShadeAlerts: AlertEntry[];
  lowStocks: AlertEntry[];
}

type SortField = "product" | "category" | "currentStock" | "netChange" | "updatedAt";

const StockSummary = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<InventorySummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<StockAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedShadeFilter, setSelectedShadeFilter] = useState("ALL");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const [summaryRes, alertsRes] = await Promise.all([
          api.get("/stock/summary/overview"),
          api.get("/stock/alerts"),
        ]);
        setSummary(summaryRes.data);
        setAlerts(alertsRes.data);
        setError(null);
      } catch (err: any) {
        console.error("Failed to load stock summary:", err);
        setError(err?.response?.data?.message || "Failed to load stock summary");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const filteredMovements = useMemo(() => {
    if (!summary) return [];
    let data = [...summary.items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (item) =>
          item.product.toLowerCase().includes(term) ||
          item.stockId.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term),
      );
    }

    if (selectedCategory !== "ALL") {
      data = data.filter((item) => item.category === selectedCategory);
    }

    if (selectedShadeFilter === "WITH_SHADES") {
      data = data.filter((item) => item.hasShades);
    } else if (selectedShadeFilter === "WITHOUT_SHADES") {
      data = data.filter((item) => !item.hasShades);
    }

    data.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "updatedAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [summary, searchTerm, selectedCategory, selectedShadeFilter, sortField, sortDirection]);

  const uniqueCategories = useMemo(() => {
    if (!summary) return ["ALL"];
    const categories = Array.from(new Set(summary.items.map((item) => item.category)));
    return ["ALL", ...categories];
  }, [summary]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const exportToCSV = () => {
    if (!filteredMovements.length) return;
    const headers = [
      "Stock ID",
      "Product",
      "Category",
      "Current Stock",
      "Total Added",
      "Total Removed",
      "Net Change",
      "Has Shades",
      "Total Shades",
      "Updated At",
    ];
    const rows = filteredMovements.map((item) => [
      item.stockId,
      item.product,
      item.category,
      item.currentStock,
      item.totalAdded,
      item.totalRemoved,
      item.netChange,
      item.hasShades ? "Yes" : "No",
      item.shadeDetails.totalShades,
      new Date(item.updatedAt).toLocaleString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((col) => `"${col}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stock-summary-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const viewStockHistory = (stock: StockRecord) => {
    navigate(`/app/${stock.id}/history`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageMeta title="Stock Summary" description="Inventory overview" />
        <PageBreadcrumb pageTitle="Stock Summary" />
        <PageLoader label="Loading stock summary..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageMeta title="Stock Summary" description="Inventory overview" />
        <PageBreadcrumb pageTitle="Stock Summary" />
        <div className="p-6 mt-10 text-center bg-white border border-red-100 rounded-xl shadow-sm max-w-3xl mx-auto">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const totals = summary.totals;

  return (
    <div className="min-h-screen p-4 bg-gray-50 md:p-6">
      <PageMeta title="Stock Summary" description="Inventory overview" />
      <PageBreadcrumb pageTitle="Stock Summary" />

      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">📦 Inventory Summary</h1>
        <p className="text-gray-600">
          Monitor overall stock health, shade utilization, and low-stock alerts.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3 xl:grid-cols-5">
        <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Products</p>
          <p className="mt-2 text-3xl font-bold text-coffee-700">{totals.totalProducts}</p>
          <p className="text-xs text-gray-400 mt-1">Inventory catalog</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-500">With Shades</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{totals.withShades}</p>
          <p className="text-xs text-gray-400 mt-1">Fabric or color variants</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-500">Stock Added</p>
          <p className="mt-2 text-3xl font-bold text-green-600">+{totals.totalAdded}</p>
          <p className="text-xs text-gray-400 mt-1">All-time increments</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-500">Stock Removed</p>
          <p className="mt-2 text-3xl font-bold text-red-600">-{totals.totalRemoved}</p>
          <p className="text-xs text-gray-400 mt-1">All-time reductions</p>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-medium text-gray-500">Current Stock</p>
          <p className="mt-2 text-3xl font-bold text-gold-600">{totals.currentStock}</p>
          <p className="text-xs text-gray-400 mt-1">Available units</p>
        </div>
      </div>

      {/* Alerts panel */}
      {alerts && (
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <div className="flex items-center gap-3 p-4 bg-white border border-red-100 rounded-xl shadow-sm">
            <FiAlertTriangle className="text-red-500" size={32} />
            <div>
              <p className="text-sm text-gray-500">Low Shade Alerts</p>
              <p className="text-2xl font-semibold text-red-600">{alerts.counts.lowShades}</p>
              <p className="text-xs text-gray-400">
                Below {alerts.thresholds.shadeLow} units across shades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white border border-yellow-100 rounded-xl shadow-sm">
            <FiDroplet className="text-amber-500" size={32} />
            <div>
              <p className="text-sm text-gray-500">Overstocked Shades</p>
              <p className="text-2xl font-semibold text-amber-600">{alerts.counts.highShades}</p>
              <p className="text-xs text-gray-400">
                Above {alerts.thresholds.shadeHigh} units
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-xl shadow-sm">
            <FiPackage className="text-orange-500" size={32} />
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-semibold text-orange-600">{alerts.counts.lowStocks}</p>
              <p className="text-xs text-gray-400">
                Regular items under {alerts.thresholds.stockLow} units
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 mb-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute text-gray-400 left-3 top-3" />
              <input
                type="text"
                placeholder="Search products, stock IDs, or categories..."
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-coffee-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-coffee-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "ALL" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-coffee-500"
              value={selectedShadeFilter}
              onChange={(e) => setSelectedShadeFilter(e.target.value)}
            >
              <option value="ALL">All Items</option>
              <option value="WITH_SHADES">With Shades</option>
              <option value="WITHOUT_SHADES">Without Shades</option>
            </select>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-coffee-600 hover:bg-coffee-700"
            >
              <FiDownload size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Inventory table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-4 py-4 border-b border-gray-200 md:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Stock Inventory</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredMovements.length} of {summary.items.length} products
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-2 text-green-600">
              <FiTrendingUp /> +{totals.totalAdded}
            </span>
            <span className="flex items-center gap-2 text-red-600">
              <FiTrendingDown /> -{totals.totalRemoved}
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              <FiPackage /> {totals.totalShades} shades
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6"
                  onClick={() => handleSort("product")}
                >
                  Product {sortField === "product" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6"
                  onClick={() => handleSort("category")}
                >
                  Category {sortField === "category" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6"
                  onClick={() => handleSort("currentStock")}
                >
                  Current Stock {sortField === "currentStock" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                  Recent Changes
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                  Shades
                </th>
                <th
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6"
                  onClick={() => handleSort("updatedAt")}
                >
                  Updated {sortField === "updatedAt" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center md:px-6">
                    <FiFilter className="mx-auto mb-3 text-gray-400" size={32} />
                    <p className="text-gray-500">No stock items found</p>
                    <p className="mt-1 text-sm text-gray-400">Try adjusting search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => (
                  <tr key={movement.stockId} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4 md:px-6">
                      <div>
                        <div className="font-medium text-gray-900">{movement.product}</div>
                        <div className="font-mono text-sm text-gray-500">{movement.stockId}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          movement.category === "Fabric"
                            ? "bg-purple-100 text-purple-800"
                            : movement.category === "Accessory"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {movement.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                      <div className="text-lg font-semibold text-gray-900">{movement.currentStock}</div>
                      {movement.hasShades && (
                        <div className="text-xs text-gray-500">
                          {movement.shadeDetails.totalShades} shades
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 md:px-6">
                      <div className="text-sm flex items-center gap-3">
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <FiTrendingUp /> +{movement.totalAdded}
                        </span>
                        <span className="font-medium text-red-600 flex items-center gap-1">
                          <FiTrendingDown /> -{movement.totalRemoved}
                        </span>
                      </div>
                      {movement.quantityChanges.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          Last: {movement.quantityChanges[0].changeType === "increase" ? "+" : "-"}
                          {movement.quantityChanges[0].changeAmount}{" "}
                          {movement.quantityChanges[0].isShadeUpdate ? "shade units" : "units"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 md:px-6">
                      {movement.hasShades ? (
                        <div className="flex items-center gap-2">
                          {movement.shadeDetails.shadeQuantities.slice(0, 3).map((shade, index) => (
                            <div
                              key={`${movement.stockId}-shade-${index}`}
                              className="w-4 h-4 border border-gray-300 rounded shadow-sm"
                              style={{ backgroundColor: shade.color }}
                              title={`${shade.colorName} (${shade.quantity})`}
                            />
                          ))}
                          {movement.shadeDetails.totalShades > 3 && (
                            <span className="text-xs text-gray-500">
                              +{movement.shadeDetails.totalShades - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No shades</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 md:px-6 whitespace-nowrap">
                      {new Date(movement.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-sm md:px-6 whitespace-nowrap">
                      <button
                        onClick={() => viewStockHistory(movement.stockItem)}
                        className="flex items-center gap-1 px-3 py-1 text-coffee-600 transition-colors rounded-md hover:text-coffee-800 hover:bg-gold-50"
                      >
                        <FiEye size={14} />
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockSummary;

