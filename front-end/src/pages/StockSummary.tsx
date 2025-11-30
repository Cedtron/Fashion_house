import { useState, useEffect } from "react";
import { FiSearch, FiEye, FiTrendingUp, FiTrendingDown, FiPackage, FiFilter, FiDownload, FiChevronDown, FiChevronUp, FiDroplet } from "react-icons/fi";
import api from '../utils/axios';
import { useNavigate } from "react-router-dom";

interface Stock {
  id: number;
  stockId: string;
  product: string;
  category: string;
  quantity: number;
  cost: number;
  price: number;
  imagePath?: string;
  shades: {
    id: number;
    colorName: string;
    color: string;
    quantity: number;
    unit: string;
    length: number;
    lengthUnit: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface StockTracking {
  id: number;
  stockId: number;
  action: string;
  description: string;
  performedBy: string;
  performedAt: string;
  oldData: any;
  newData: any;
  ipAddress?: string;
  userAgent?: string;
  stock?: Stock;
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
  shadeDetails: {
    totalShades: number;
    shadeQuantities: { colorName: string; quantity: number; color: string; netChange?: number }[];
  };
  hasShades: boolean;
  quantityChanges: {
    oldQuantity: number;
    newQuantity: number;
    changeType: 'increase' | 'decrease';
    changeAmount: number;
    performedAt: string;
    performedBy: string;
    action: string;
    description: string;
    isShadeUpdate: boolean;
    shadeName?: string;
    itemType: 'stock' | 'shade';
  }[];
}

const StockSummary = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [trackingData, setTrackingData] = useState<StockTracking[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedShadeFilter, setSelectedShadeFilter] = useState("ALL");
  const [sortField, setSortField] = useState<keyof StockMovement>("product");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Date range filter
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });

  // Fetch stocks and tracking data
  useEffect(() => {
    fetchStocks();
    fetchTrackingData();
  }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/stock');
      const stocksData = response.data || [];
      // Sort by creation date (newest first)
      const sortedStocks = stocksData.sort((a: Stock, b: Stock) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setStocks(sortedStocks);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingData = async () => {
    try {
      const response = await api.get('/stock/tracking/all');
      // Ensure trackingData is always an array
      const data = response.data || [];
      setTrackingData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      // Set as empty array on error
      setTrackingData([]);
    }
  };

  // Calculate stock movements with quantity changes
  useEffect(() => {
    if (stocks.length === 0 || !Array.isArray(trackingData)) return;

    const movements: StockMovement[] = stocks.map(stock => {
      const hasShades = stock.shades && stock.shades.length > 0;
      const isFabric = stock.category === "Fabric";
      
      // Get all tracking data for this stock
      const stockTracking = Array.isArray(trackingData) 
        ? trackingData.filter(track => track.stockId === stock.id)
        : [];

      // Calculate current stock
      let currentStock = 0;
      if (isFabric && hasShades) {
        currentStock = stock.shades.reduce((sum, shade) => sum + (shade.quantity || 0), 0);
      } else {
        currentStock = stock.quantity;
      }

      // Initialize totals
      let totalAdded = 0;
      let totalRemoved = 0;
      const quantityChanges: StockMovement['quantityChanges'] = [];
      const shadeNetChanges: { [colorName: string]: number } = {};

      console.log(`=== Processing stock ${stock.stockId} (${stock.product}) ===`);
      console.log('Total tracking entries:', stockTracking.length);

      // Process each tracking entry
      stockTracking.forEach((track, index) => {
        console.log(`\n--- Track ${index + 1}: ${track.action} ---`);
        console.log('Old Data:', track.oldData);
        console.log('New Data:', track.newData);

        // Handle CREATE actions
        if (track.action === "CREATE" && track.newData) {
          console.log('CREATE ACTION DETECTED');
          
          if (isFabric && track.newData.shades && Array.isArray(track.newData.shades)) {
            // Fabric with shades - sum all initial shade quantities
            track.newData.shades.forEach((shade: any) => {
              const initialQuantity = Number(shade.quantity) || 0;
              console.log(`Shade ${shade.colorName}: initial quantity = ${initialQuantity}`);
              
              if (initialQuantity > 0) {
                totalAdded += initialQuantity;
                console.log(`ADDED ${initialQuantity} to totalAdded. New total: ${totalAdded}`);
                
                quantityChanges.push({
                  oldQuantity: 0,
                  newQuantity: initialQuantity,
                  changeType: 'increase',
                  changeAmount: initialQuantity,
                  performedAt: track.performedAt,
                  performedBy: track.performedBy,
                  action: track.action,
                  description: `Initial creation of shade ${shade.colorName}`,
                  isShadeUpdate: true,
                  shadeName: shade.colorName,
                  itemType: 'shade'
                });

                // Initialize net change for this shade
                if (!shadeNetChanges[shade.colorName]) {
                  shadeNetChanges[shade.colorName] = 0;
                }
                shadeNetChanges[shade.colorName] += initialQuantity;
              }
            });
          } else if (track.newData.quantity > 0) {
            // Non-fabric stock creation
            const initialQuantity = Number(track.newData.quantity) || 0;
            console.log(`Non-fabric creation with quantity: ${initialQuantity}`);
            
            totalAdded += initialQuantity;
            console.log(`ADDED ${initialQuantity} to totalAdded. New total: ${totalAdded}`);
            
            quantityChanges.push({
              oldQuantity: 0,
              newQuantity: initialQuantity,
              changeType: 'increase',
              changeAmount: initialQuantity,
              performedAt: track.performedAt,
              performedBy: track.performedBy,
              action: track.action,
              description: track.description,
              isShadeUpdate: false,
              itemType: 'stock'
            });
          }
        }

        // Handle UPDATE actions - this is where we calculate quantity changes
        else if (track.action === "UPDATE" && track.oldData && track.newData) {
          console.log('UPDATE ACTION DETECTED');
          
          // Check if this is a shade update
          if (isFabric && track.oldData.colorName && track.newData.colorName) {
            const oldQuantity = Number(track.oldData.quantity) || 0;
            const newQuantity = Number(track.newData.quantity) || 0;
            
            console.log(`Shade ${track.oldData.colorName}: OLD=${oldQuantity}, NEW=${newQuantity}`);

            if (oldQuantity !== newQuantity) {
              const difference = newQuantity - oldQuantity;
              console.log(`Difference: ${difference}`);

              if (difference > 0) {
                // Quantity increased
                totalAdded += difference;
                console.log(`ADDED ${difference} to totalAdded. New total: ${totalAdded}`);
                
                quantityChanges.push({
                  oldQuantity,
                  newQuantity,
                  changeType: 'increase',
                  changeAmount: difference,
                  performedAt: track.performedAt,
                  performedBy: track.performedBy,
                  action: track.action,
                  description: track.description,
                  isShadeUpdate: true,
                  shadeName: track.oldData.colorName,
                  itemType: 'shade'
                });
              } else if (difference < 0) {
                // Quantity decreased
                const removedAmount = Math.abs(difference);
                totalRemoved += removedAmount;
                console.log(`ADDED ${removedAmount} to totalRemoved. New total: ${totalRemoved}`);
                
                quantityChanges.push({
                  oldQuantity,
                  newQuantity,
                  changeType: 'decrease',
                  changeAmount: removedAmount,
                  performedAt: track.performedAt,
                  performedBy: track.performedBy,
                  action: track.action,
                  description: track.description,
                  isShadeUpdate: true,
                  shadeName: track.oldData.colorName,
                  itemType: 'shade'
                });
              }

              // Update net change for this shade
              if (!shadeNetChanges[track.oldData.colorName]) {
                shadeNetChanges[track.oldData.colorName] = 0;
              }
              shadeNetChanges[track.oldData.colorName] += difference;
              console.log(`Shade ${track.oldData.colorName} net change: ${shadeNetChanges[track.oldData.colorName]}`);
            }
          }
          // Check if this is a stock quantity update
          else if (track.oldData.quantity !== undefined && track.newData.quantity !== undefined) {
            const oldQuantity = Number(track.oldData.quantity) || 0;
            const newQuantity = Number(track.newData.quantity) || 0;
            
            console.log(`Stock quantity: OLD=${oldQuantity}, NEW=${newQuantity}`);

            if (oldQuantity !== newQuantity) {
              const difference = newQuantity - oldQuantity;
              console.log(`Difference: ${difference}`);

              if (difference > 0) {
                // Quantity increased
                totalAdded += difference;
                console.log(`ADDED ${difference} to totalAdded. New total: ${totalAdded}`);
                
                quantityChanges.push({
                  oldQuantity,
                  newQuantity,
                  changeType: 'increase',
                  changeAmount: difference,
                  performedAt: track.performedAt,
                  performedBy: track.performedBy,
                  action: track.action,
                  description: track.description,
                  isShadeUpdate: false,
                  itemType: 'stock'
                });
              } else if (difference < 0) {
                // Quantity decreased
                const removedAmount = Math.abs(difference);
                totalRemoved += removedAmount;
                console.log(`ADDED ${removedAmount} to totalRemoved. New total: ${totalRemoved}`);
                
                quantityChanges.push({
                  oldQuantity,
                  newQuantity,
                  changeType: 'decrease',
                  changeAmount: removedAmount,
                  performedAt: track.performedAt,
                  performedBy: track.performedBy,
                  action: track.action,
                  description: track.description,
                  isShadeUpdate: false,
                  itemType: 'stock'
                });
              }
            }
          }
        }
      });

      const netChange = totalAdded - totalRemoved;

      console.log(`=== FINAL for ${stock.product} ===`);
      console.log('TOTAL ADDED:', totalAdded);
      console.log('TOTAL REMOVED:', totalRemoved);
      console.log('NET CHANGE:', netChange);
      console.log('CURRENT STOCK:', currentStock);
      console.log('QUANTITY CHANGES COUNT:', quantityChanges.length);
      console.log('SHADE NET CHANGES:', shadeNetChanges);

      const shadeDetails = {
        totalShades: stock.shades?.length || 0,
        shadeQuantities: stock.shades?.map(shade => ({
          colorName: shade.colorName,
          quantity: shade.quantity,
          color: shade.color,
          netChange: shadeNetChanges[shade.colorName] || 0
        })) || []
      };

      // Get last activity date
      const lastActivity = stockTracking.length > 0 
        ? stockTracking[0].performedAt
        : stock.updatedAt;

      return {
        stockId: stock.stockId,
        product: stock.product,
        category: stock.category,
        currentStock,
        totalAdded,
        totalRemoved,
        netChange,
        lastActivity,
        lastAction: stockTracking.length > 0 ? stockTracking[0].action : 'CREATE',
        cost: stock.cost,
        price: stock.price,
        stockItem: stock,
        shadeDetails,
        hasShades,
        createdAt: stock.createdAt,
        quantityChanges: quantityChanges.sort((a, b) => 
          new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
        )
      };
    });

    // Log final system totals
    console.log('=== SYSTEM FINAL TOTALS ===');
    const systemTotalAdded = movements.reduce((sum, m) => sum + m.totalAdded, 0);
    const systemTotalRemoved = movements.reduce((sum, m) => sum + m.totalRemoved, 0);
    console.log('SYSTEM TOTAL ADDED:', systemTotalAdded);
    console.log('SYSTEM TOTAL REMOVED:', systemTotalRemoved);
    
    movements.forEach(movement => {
      console.log(`${movement.product}: +${movement.totalAdded} / -${movement.totalRemoved}`);
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
        movement.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.shadeDetails.shadeQuantities.some(shade => 
          shade.colorName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      filtered = filtered.filter(movement => movement.category === selectedCategory);
    }

    // Shade filter
    if (selectedShadeFilter !== "ALL") {
      if (selectedShadeFilter === "WITH_SHADES") {
        filtered = filtered.filter(movement => movement.hasShades);
      } else if (selectedShadeFilter === "WITHOUT_SHADES") {
        filtered = filtered.filter(movement => !movement.hasShades);
      }
    }

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Include entire end date

      filtered = filtered.filter(movement => {
        const movementDate = new Date(movement.stockItem.createdAt);
        return movementDate >= startDate && movementDate <= endDate;
      });
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
  }, [stockMovements, searchTerm, selectedCategory, selectedShadeFilter, dateRange, sortField, sortDirection]);

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
    totalProducts: filteredMovements.length,
    fabricProducts: filteredMovements.filter(m => m.category === "Fabric").length,
    totalShades: filteredMovements.reduce((sum, m) => sum + m.shadeDetails.totalShades, 0),
    withShades: filteredMovements.filter(m => m.hasShades).length,
    withoutShades: filteredMovements.filter(m => !m.hasShades).length,
    totalAdded: filteredMovements.reduce((sum, m) => sum + m.totalAdded, 0),
    totalRemoved: filteredMovements.reduce((sum, m) => sum + m.totalRemoved, 0)
  };

  console.log('=== RENDER TOTALS ===');
  console.log('Total Added in cards:', totals.totalAdded);
  console.log('Total Removed in cards:', totals.totalRemoved);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Stock ID', 
      'Product', 
      'Category', 
      'Current Stock', 
      'Total Added', 
      'Total Removed', 
      'Net Change',
      'Has Shades', 
      'Total Shades', 
      'Cost', 
      'Price', 
      'Created Date',
      'Last Updated'
    ];
    
    const csvData = filteredMovements.map(movement => [
      movement.stockId,
      movement.product,
      movement.category,
      movement.currentStock,
      movement.totalAdded,
      movement.totalRemoved,
      movement.netChange,
      movement.hasShades ? 'Yes' : 'No',
      movement.shadeDetails.totalShades,
      movement.cost,
      movement.price,
      new Date(movement.stockItem.createdAt).toLocaleDateString(),
      new Date(movement.lastActivity).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stock-summary-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // View stock history
  const viewStockHistory = (stock: Stock) => {
    navigate(`/app/${stock.id}/history`);
  };

  // Toggle shade details
  const toggleShadeDetails = (stockId: string) => {
    setExpandedStock(expandedStock === stockId ? null : stockId);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format date with time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get sort icon
  const getSortIcon = (field: keyof StockMovement) => {
    if (sortField !== field) return <FiChevronDown className="opacity-30" />;
    return sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />;
  };

  // Clear date range
  const clearDateRange = () => {
    setDateRange({ startDate: "", endDate: "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-600">Loading stock summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">
          📦 Stock Inventory Summary
        </h1>
        <p className="text-gray-600">
          Complete overview of all stock items with quantity change tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">{totals.totalProducts}</p>
              <p className="mt-1 text-xs text-gray-500">Inventory items</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiPackage className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">With Shades</p>
              <p className="text-2xl font-bold text-purple-600">{totals.withShades}</p>
              <p className="mt-1 text-xs text-gray-500">Color variants</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FiDroplet className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Added</p>
              <p className="text-2xl font-bold text-green-600">+{totals.totalAdded}</p>
              <p className="mt-1 text-xs text-gray-500">Total additions</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiTrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Removed</p>
              <p className="text-2xl font-bold text-red-600">-{totals.totalRemoved}</p>
              <p className="mt-1 text-xs text-gray-500">Total reductions</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FiTrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Stock</p>
              <p className="text-2xl font-bold text-orange-600">{totals.currentStock}</p>
              <p className="mt-1 text-xs text-gray-500">Available units</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FiPackage className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-4 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute text-gray-400 left-3 top-3" />
              <input
                type="text"
                placeholder="Search products, stock IDs, categories, or colors..."
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category === "ALL" ? "All Categories" : category}
                </option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedShadeFilter}
              onChange={(e) => setSelectedShadeFilter(e.target.value)}
            >
              <option value="ALL">All Items</option>
              <option value="WITH_SHADES">With Shades</option>
              <option value="WITHOUT_SHADES">Without Shades</option>
            </select>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
            >
              <FiDownload size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <div className="flex flex-col items-end gap-4 sm:flex-row">
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div>
                <button
                  onClick={clearDateRange}
                  className="w-full px-4 py-2 text-gray-600 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear Dates
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary Table */}
      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="px-4 py-4 border-b border-gray-200 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="mb-2 text-lg font-semibold text-gray-800 sm:mb-0">
              Stock Inventory ({filteredMovements.length} products)
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Added: <strong className="text-green-600">+{totals.totalAdded}</strong></span>
              <span>Removed: <strong className="text-red-600">-{totals.totalRemoved}</strong></span>
              <span>Shades: <strong>{totals.totalShades}</strong></span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6 hover:bg-gray-100"
                  onClick={() => handleSort('product')}
                >
                  <div className="flex items-center gap-1">
                    Product
                    {getSortIcon('product')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6 hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {getSortIcon('category')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6 hover:bg-gray-100"
                  onClick={() => handleSort('currentStock')}
                >
                  <div className="flex items-center gap-1">
                    Current Stock
                    {getSortIcon('currentStock')}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                  Quantity Changes
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                  Shades
                </th>
                <th 
                  className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer md:px-6 hover:bg-gray-100"
                  onClick={() => handleSort('lastActivity')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {getSortIcon('lastActivity')}
                  </div>
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <>
                  <tr key={movement.stockId} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4 md:px-6">
                      <div>
                        <div className="font-medium text-gray-900">{movement.product}</div>
                        <div className="font-mono text-sm text-gray-500">{movement.stockId}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        movement.category === "Fabric" 
                          ? "bg-purple-100 text-purple-800" 
                          : movement.category === "Accessory"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {movement.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                      <div className="text-lg font-semibold text-gray-900">
                        {movement.currentStock}
                      </div>
                      {movement.category === "Fabric" && movement.hasShades && (
                        <div className="text-xs text-gray-500">
                          from {movement.shadeDetails.totalShades} shades
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 md:px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-green-600">+{movement.totalAdded}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-medium text-red-600">-{movement.totalRemoved}</span>
                        </div>
                        {movement.quantityChanges.length > 0 && (
                          <button
                            onClick={() => toggleShadeDetails(movement.stockId)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            {expandedStock === movement.stockId ? 'Hide' : 'Show'} details
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 md:px-6">
                      <div className="flex items-center gap-2">
                        {movement.hasShades ? (
                          <div className="flex items-center gap-1">
                            <FiDroplet className="text-purple-500" size={14} />
                            <span className="text-sm text-gray-600">
                              {movement.shadeDetails.totalShades} colors
                            </span>
                            <button
                              onClick={() => toggleShadeDetails(movement.stockId)}
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                            >
                              {expandedStock === movement.stockId ? '▲' : '▼'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No shades</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(movement.stockItem.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm md:px-6 whitespace-nowrap">
                      <button
                        onClick={() => viewStockHistory(movement.stockItem)}
                        className="flex items-center gap-1 px-3 py-1 text-blue-600 transition-colors rounded-md hover:text-blue-800 hover:bg-blue-50"
                      >
                        <FiEye size={14} />
                        View History
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row - Show both quantity changes and shade details */}
                  {expandedStock === movement.stockId && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-4 md:px-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Quantity Changes Section */}
                          <div className="p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Quantity Change History</h4>
                              <div className="text-sm text-gray-500">
                                Total Changes: {movement.quantityChanges.length}
                              </div>
                            </div>
                            
                            {movement.quantityChanges.length > 0 ? (
                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {movement.quantityChanges.map((change, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-3 h-3 rounded-full ${
                                        change.changeType === 'increase' ? 'bg-green-500' : 'bg-red-500'
                                      }`}></div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">
                                          {change.isShadeUpdate ? (
                                            <span>
                                              <span className="font-semibold">{change.shadeName}</span>: {change.oldQuantity} → {change.newQuantity} units
                                            </span>
                                          ) : (
                                            <span>Stock: {change.oldQuantity} → {change.newQuantity} units</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          <span className={`font-semibold ${
                                            change.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            {change.changeType === 'increase' ? '+' : '-'}{change.changeAmount} units
                                          </span> • {formatDateTime(change.performedAt)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                          {change.description}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-gray-700">
                                        {change.performedBy}
                                      </div>
                                      <div className="text-xs text-gray-500 capitalize">
                                        {change.action.toLowerCase()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-4 text-center text-gray-500">
                                No quantity changes recorded
                              </div>
                            )}
                          </div>

                          {/* Shade Details Section */}
                          <div className="p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Current Shades</h4>
                              <div className="text-sm text-gray-500">
                                Total: {movement.shadeDetails.totalShades}
                              </div>
                            </div>
                            
                            {movement.hasShades ? (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {movement.shadeDetails.shadeQuantities.map((shade, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-4 h-4 rounded border border-gray-300"
                                        style={{ backgroundColor: shade.color }}
                                        title={shade.color}
                                      ></div>
                                      <div>
                                        <span className="text-sm font-medium">{shade.colorName}</span>
                                        {(shade.netChange ?? 0) !== 0 && (
                                          <div className={`text-xs ${(shade.netChange ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(shade.netChange ?? 0) > 0 ? '+' : ''}{shade.netChange ?? 0} net change
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-gray-700">
                                        {shade.quantity} units
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Current stock
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-4 text-center text-gray-500">
                                No shades available
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMovements.length === 0 && (
          <div className="py-12 text-center">
            <FiFilter className="mx-auto mb-3 text-gray-400" size={32} />
            <p className="text-gray-500">No stock items found matching your filters</p>
            <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="p-4 mt-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          <div>
            <span className="text-gray-600">Total Products:</span>
            <span className="ml-2 font-semibold">{totals.totalProducts}</span>
          </div>
          <div>
            <span className="text-gray-600">Stock Added:</span>
            <span className="ml-2 font-semibold text-green-600">+{totals.totalAdded}</span>
          </div>
          <div>
            <span className="text-gray-600">Stock Removed:</span>
            <span className="ml-2 font-semibold text-red-600">-{totals.totalRemoved}</span>
          </div>
          <div>
            <span className="text-gray-600">With Shades:</span>
            <span className="ml-2 font-semibold">{totals.withShades}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Shades:</span>
            <span className="ml-2 font-semibold">{totals.totalShades}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSummary;