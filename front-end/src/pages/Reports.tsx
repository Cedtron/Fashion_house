import { useState, useEffect } from "react";
import { FiSearch, FiEye, FiTrendingUp, FiTrendingDown, FiPackage, FiFilter, FiDownload, FiArrowUp, FiArrowDown, FiPlus, FiMinus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import api from '../utils/axios';
import { useNavigate } from "react-router-dom";

interface StockTracking {
  id: number;
  stockId: number;
  action: string;
  description: string;
  performedBy: string;
  performedAt: string;
  oldData: any;
  newData: any;
  stock?: {
    id: number;
    stockId: string;
    product: string;
    category: string;
    quantity: number;
    cost: number;
    price: number;
    imagePath?: string;
  };
}

interface Stock {
  id: number;
  stockId: string;
  product: string;
  category: string;
  quantity: number;
  cost: number;
  price: number;
  imagePath?: string;
  shades: any[];
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
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
  stockItem: Stock;
}

const StockReports = () => {
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState<StockTracking[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortField, setSortField] = useState<keyof StockMovement>("product");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  // Fetch all tracking data and stocks
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trackingRes, stocksRes] = await Promise.all([
        api.get('/stock/tracking/all?limit=1000'),
        api.get('/stock')
      ]);
      
      setTrackingData(trackingRes.data.data || []);
      setStocks(stocksRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stock movements for each product
  useEffect(() => {
    if (stocks.length === 0 || trackingData.length === 0) return;

    const movements: StockMovement[] = stocks.map(stock => {
      const stockActivities = trackingData.filter(tracking => 
        tracking.stock?.id === stock.id
      );

      let totalAdded = 0;
      let totalRemoved = 0;
      let lastActivity = "";
      let lastAction = "No Activity";

      stockActivities.forEach(activity => {
        const activityDate = new Date(activity.performedAt);
        if (!lastActivity || activityDate > new Date(lastActivity)) {
          lastActivity = activity.performedAt;
          lastAction = activity.action;
        }

        switch (activity.action) {
          case 'CREATE':
            if (activity.newData?.quantity) {
              totalAdded += activity.newData.quantity;
            }
            break;
          case 'ADJUST':
            const adjustment = activity.newData?.adjustment;
            if (adjustment > 0) {
              totalAdded += adjustment;
            } else {
              totalRemoved += Math.abs(adjustment);
            }
            break;
        }
      });

      return {
        stockId: stock.stockId,
        product: stock.product,
        category: stock.category,
        currentStock: stock.quantity,
        totalAdded,
        totalRemoved,
        netChange: totalAdded - totalRemoved,
        lastActivity,
        lastAction,
        cost: stock.cost,
        price: stock.price,
        stockItem: stock
      };
    });

    setStockMovements(movements);
    setFilteredMovements(movements);
  }, [stocks, trackingData]);

  // Filter and sort movements
  useEffect(() => {
    let filtered = stockMovements;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(movement =>
        movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.stockId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      filtered = filtered.filter(movement => movement.category === selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'lastActivity') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredMovements(filtered);
  }, [stockMovements, searchTerm, selectedCategory, sortField, sortDirection]);

  // Get unique categories for filter
  const uniqueCategories = ["ALL", ...new Set(stockMovements.map(movement => movement.category))];

  // Handle sort
  const handleSort = (field: keyof StockMovement) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate totals
  const totals = {
    currentStock: filteredMovements.reduce((sum, m) => sum + m.currentStock, 0),
    totalAdded: filteredMovements.reduce((sum, m) => sum + m.totalAdded, 0),
    totalRemoved: filteredMovements.reduce((sum, m) => sum + m.totalRemoved, 0),
    netChange: filteredMovements.reduce((sum, m) => sum + m.netChange, 0),
    totalValue: filteredMovements.reduce((sum, m) => sum + (m.currentStock * m.cost), 0)
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Stock ID', 'Product', 'Category', 'Current Stock', 'Total Added', 'Total Removed', 'Net Change', 'Cost', 'Price', 'Last Activity'];
    const csvData = filteredMovements.map(movement => [
      movement.stockId,
      movement.product,
      movement.category,
      movement.currentStock,
      movement.totalAdded,
      movement.totalRemoved,
      movement.netChange,
      movement.cost,
      movement.price,
      new Date(movement.lastActivity).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // View stock details
  const viewStockDetails = (stock: Stock) => {
    navigate(`/stock/${stock.id}/history`);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No activity';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get sort icon
  const getSortIcon = (field: keyof StockMovement) => {
    if (sortField !== field) return <FiChevronDown className="opacity-30" />;
    return sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          📊 Stock Movement Summary
        </h1>
        <p className="text-gray-600">
          Complete overview of stock additions, removals, and current balances
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Current Stock Value</p>
              <p className="text-2xl font-bold text-blue-600">${totals.totalValue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Total inventory value</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiPackage className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Stock Added</p>
              <p className="text-2xl font-bold text-green-600">+{totals.totalAdded}</p>
              <p className="text-xs text-gray-500 mt-1">Total units added</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiArrowUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Stock Removed</p>
              <p className="text-2xl font-bold text-red-600">-{totals.totalRemoved}</p>
              <p className="text-xs text-gray-500 mt-1">Total units removed</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FiArrowDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Net Movement</p>
              <p className={`text-2xl font-bold ${totals.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.netChange >= 0 ? '+' : ''}{totals.netChange}
              </p>
              <p className="text-xs text-gray-500 mt-1">Overall stock change</p>
            </div>
            <div className={`p-3 rounded-full ${totals.netChange >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <FiTrendingUp className={totals.netChange >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, stock IDs, or categories..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category === "ALL" ? "All Categories" : category}
                </option>
              ))}
            </select>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload size={16} />
              Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stock Movement Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Stock Movement Details ({filteredMovements.length} products)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('stockId')}
                >
                  <div className="flex items-center gap-1">
                    Stock ID
                    {getSortIcon('stockId')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('product')}
                >
                  <div className="flex items-center gap-1">
                    Product
                    {getSortIcon('product')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {getSortIcon('category')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('currentStock')}
                >
                  <div className="flex items-center gap-1">
                    Current Stock
                    {getSortIcon('currentStock')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAdded')}
                >
                  <div className="flex items-center gap-1">
                    Total Added
                    {getSortIcon('totalAdded')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalRemoved')}
                >
                  <div className="flex items-center gap-1">
                    Total Removed
                    {getSortIcon('totalRemoved')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('netChange')}
                >
                  <div className="flex items-center gap-1">
                    Net Change
                    {getSortIcon('netChange')}
                  </div>
                </th>
                <th 
                  className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastActivity')}
                >
                  <div className="flex items-center gap-1">
                    Last Activity
                    {getSortIcon('lastActivity')}
                  </div>
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <tr key={movement.stockId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm font-medium text-blue-600">
                      {movement.stockId}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="font-medium text-gray-900">{movement.product}</div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {movement.category}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {movement.currentStock}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${(movement.currentStock * movement.cost).toFixed(2)} value
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                      <FiPlus size={12} />
                      {movement.totalAdded}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm font-semibold text-red-600">
                      <FiMinus size={12} />
                      {movement.totalRemoved}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1 text-sm font-semibold ${
                      movement.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.netChange >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                      {movement.netChange >= 0 ? '+' : ''}{movement.netChange}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatDate(movement.lastActivity)}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {movement.lastAction.toLowerCase()}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => viewStockDetails(movement.stockItem)}
                      className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <FiEye size={14} />
                      View History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMovements.length === 0 && (
          <div className="text-center py-12">
            <FiFilter className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500">No stock items found matching your filters</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Products:</span>
            <span className="font-semibold ml-2">{filteredMovements.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Current Stock:</span>
            <span className="font-semibold ml-2">{totals.currentStock} units</span>
          </div>
          <div>
            <span className="text-gray-600">Stock Added:</span>
            <span className="font-semibold text-green-600 ml-2">+{totals.totalAdded}</span>
          </div>
          <div>
            <span className="text-gray-600">Stock Removed:</span>
            <span className="font-semibold text-red-600 ml-2">-{totals.totalRemoved}</span>
          </div>
          <div>
            <span className="text-gray-600">Net Change:</span>
            <span className={`font-semibold ml-2 ${totals.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.netChange >= 0 ? '+' : ''}{totals.netChange}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockReports;