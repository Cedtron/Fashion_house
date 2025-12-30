import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiUser, 
  FiCalendar, 
  FiPackage, 
  FiPlus, 
  FiMinus, 
  FiEdit, 
  FiTrash2, 
  FiImage,
  FiDownload,
  FiList,
  FiClock,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiTrendingUp,
  FiTrendingDown,
  FiDroplet,
  FiPieChart,
  FiActivity,
  FiChevronUp,
  FiChevronDown
} from "react-icons/fi";
import api from '../utils/axios';
import PageLoader from "../components/common/PageLoader";

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

interface Shade {
  id: number;
  colorName: string;
  color: string;
  quantity: number;
  unit: string;
  length: number;
  lengthUnit: string;
  stockId: number;
  createdAt: string;
  updatedAt: string;
}

interface SummaryStats {
  totalActivities: number;
  created: number;
  updated: number;
  adjusted: number;
  deleted: number;
  imageUploads: number;
  totalShades: number;
  totalShadeQuantity: number;
  totalShadeLength: number;
}

interface AnalyticsData {
  period: string;
  stockAdded: number;
  stockReduced: number;
  shadesAdded: number;
  shadesRemoved: number;
  activities: number;
}

interface ShadeChange {
  shadeId: number;
  colorName: string;
  color: string;
  oldQuantity: number;
  newQuantity: number;
  quantityChange: number;
  unit: string;
  changeType: 'increase' | 'decrease' | 'no-change';
  performedAt: string;
  performedBy: string;
  action: string;
}

interface ShadeAnalytics {
  shadeId: number;
  colorName: string;
  color: string;
  currentQuantity: number;
  unit: string;
  totalReductions: number;
  totalAdditions: number;
  reductionCount: number;
  additionCount: number;
  lastUpdated: string;
  totalChanges: number;
  netChange: number;
}

interface StockChange {
  oldQuantity: number;
  newQuantity: number;
  quantityChange: number;
  changeType: 'increase' | 'decrease' | 'no-change';
  performedAt: string;
  performedBy: string;
  action: string;
}

const StockHistory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<Stock | null>(null);
  const [shades, setShades] = useState<Shade[]>([]);
  const [tracking, setTracking] = useState<StockTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'summary' | 'analytics' | 'shades' | 'shade-analytics'>('timeline');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [shadeChanges, setShadeChanges] = useState<ShadeChange[]>([]);
  const [shadeAnalytics, setShadeAnalytics] = useState<ShadeAnalytics[]>([]);
  const [stockChanges, setStockChanges] = useState<StockChange[]>([]);
  const [hasShades, setHasShades] = useState(false);

  useEffect(() => {
    if (id) {
      fetchActivitySummary();
    }
  }, [id]);

  useEffect(() => {
    if (tracking.length > 0 && shades.length > 0) {
      calculateSummaryStats();
      calculateAnalytics();
      analyzeShadeChanges();
      analyzeStockChanges();
    } else if (tracking.length > 0) {
      calculateSummaryStats();
      calculateAnalytics();
      analyzeStockChanges();
    }
  }, [tracking, analyticsPeriod, shades]);

  const fetchActivitySummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/stock/${id}/activity-summary`);
      const payload = response.data || {};
      if (payload.stock) {
        setStock(payload.stock);
        const stockShades = payload.stock.shades || [];
        setShades(stockShades);
        setHasShades(stockShades.length > 0);
      }
      if (Array.isArray(payload.tracking)) {
        setTracking(payload.tracking);
      }
      if (payload.summary) {
        setSummaryStats((prev) => ({
          ...prev,
          totalActivities: payload.summary.totalActivities ?? prev?.totalActivities ?? 0,
          created: payload.summary.created ?? 0,
          updated: payload.summary.updated ?? 0,
          adjusted: payload.summary.adjusted ?? 0,
          deleted: payload.summary.deleted ?? 0,
          imageUploads: payload.summary.imageUploads ?? 0,
          totalShades: payload.summary.totalShades ?? 0,
          totalShadeQuantity: payload.summary.totalShadeQuantity ?? 0,
          totalShadeLength: payload.summary.totalShadeLength ?? 0,
        }));
      }
      if (Array.isArray(payload.activityByPeriod)) {
        setAnalyticsData(
          payload.activityByPeriod.map((entry: any) => ({
            period: entry.period,
            stockAdded: entry.stockAdded,
            stockReduced: entry.stockReduced,
            shadesAdded: entry.shadesAdded,
            shadesRemoved: entry.shadesRemoved,
            activities: entry.activities,
          })),
        );
      }
    } catch (err: any) {
      console.error('Error fetching stock history:', err);
      setError('Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  const analyzeShadeChanges = () => {
    if (!hasShades) return;
    
    const changes: ShadeChange[] = [];
    
    tracking.forEach(activity => {
      if (activity.action === 'UPDATE' && activity.description) {
        // Parse the description for color changes
        const colorChanges = extractColorChanges(activity.description);
        
        colorChanges.forEach(change => {
          // Find the shade by color code
          const shade = shades.find(s => s.colorName === change.colorName || s.color === change.colorName);
          if (shade) {
            const quantityChange = change.change;
            changes.push({
              shadeId: shade.id,
              colorName: change.colorName,
              color: shade.color,
              oldQuantity: change.oldQuantity,
              newQuantity: change.newQuantity,
              quantityChange: quantityChange,
              unit: shade.unit || 'Rolls',
              changeType: quantityChange > 0 ? 'increase' : quantityChange < 0 ? 'decrease' : 'no-change',
              performedAt: activity.performedAt,
              performedBy: activity.performedBy,
              action: 'UPDATE'
            });
          }
        });
      } else if (activity.action === 'CREATE' && activity.description) {
        // For CREATE, we need to parse initial quantities
        const createdColors = parseColorsFromDescription(activity.description);
        createdColors.forEach(colorCode => {
          const shade = shades.find(s => s.colorName === colorCode || s.color === colorCode);
          if (shade) {
            // Initial quantity would be the current quantity for CREATE
            changes.push({
              shadeId: shade.id,
              colorName: shade.colorName,
              color: shade.color,
              oldQuantity: 0,
              newQuantity: shade.quantity,
              quantityChange: shade.quantity,
              unit: shade.unit || 'Rolls',
              changeType: 'increase',
              performedAt: activity.performedAt,
              performedBy: activity.performedBy,
              action: 'CREATE'
            });
          }
        });
      }
    });
    
    setShadeChanges(changes);
    calculateShadeAnalytics(changes);
  };

  const calculateShadeAnalytics = (changes: ShadeChange[]) => {
    if (!hasShades) return;
    
    const analyticsMap = new Map<number, ShadeAnalytics>();
    
    // Initialize with current shades
    shades.forEach(shade => {
      analyticsMap.set(shade.id, {
        shadeId: shade.id,
        colorName: shade.colorName,
        color: shade.color,
        currentQuantity: shade.quantity,
        unit: shade.unit,
        totalReductions: 0,
        totalAdditions: 0,
        reductionCount: 0,
        additionCount: 0,
        totalChanges: 0,
        netChange: 0,
        lastUpdated: shade.updatedAt
      });
    });
    
    // Process changes to calculate analytics
    changes.forEach(change => {
      const existing = analyticsMap.get(change.shadeId);
      if (existing) {
        if (change.quantityChange < 0) {
          existing.totalReductions += Math.abs(change.quantityChange);
          existing.reductionCount += 1;
        } else if (change.quantityChange > 0) {
          existing.totalAdditions += change.quantityChange;
          existing.additionCount += 1;
        }
        
        existing.totalChanges = existing.reductionCount + existing.additionCount;
        existing.netChange = existing.totalAdditions - existing.totalReductions;
        existing.lastUpdated = change.performedAt;
        
        // Update current quantity to the latest new quantity
        if (change.action === 'UPDATE' || change.action === 'CREATE') {
          existing.currentQuantity = change.newQuantity;
        }
      }
    });
    
    const analyticsArray = Array.from(analyticsMap.values());
    setShadeAnalytics(analyticsArray);
  };

  const analyzeStockChanges = () => {
    const changes: StockChange[] = [];
    
    if (hasShades) {
      // Calculate stock changes from shade changes
      let totalStockAdded = 0;
      let totalStockReduced = 0;
      
      shadeChanges.forEach(change => {
        if (change.quantityChange > 0) {
          totalStockAdded += change.quantityChange;
        } else if (change.quantityChange < 0) {
          totalStockReduced += Math.abs(change.quantityChange);
        }
      });
      
      // Add summary change from shades
      if (shadeChanges.length > 0) {
        changes.push({
          oldQuantity: 0,
          newQuantity: 0,
          quantityChange: totalStockAdded - totalStockReduced,
          changeType: totalStockAdded > totalStockReduced ? 'increase' : totalStockReduced > totalStockAdded ? 'decrease' : 'no-change',
          performedAt: new Date().toISOString(),
          performedBy: 'System',
          action: 'CALCULATED'
        });
      }
    }
    
    // Add any direct stock adjustments from tracking
    tracking.forEach(activity => {
      if (activity.action === 'ADJUST' && activity.newData) {
        const newData = activity.newData;
        const adjustment = newData.adjustment || 0;
        const oldQty = newData.oldQuantity || 0;
        const newQty = oldQty + adjustment;
        
        changes.push({
          oldQuantity: oldQty,
          newQuantity: newQty,
          quantityChange: adjustment,
          changeType: adjustment > 0 ? 'increase' : adjustment < 0 ? 'decrease' : 'no-change',
          performedAt: activity.performedAt,
          performedBy: activity.performedBy,
          action: 'ADJUST'
        });
      }
    });
    
    setStockChanges(changes);
  };

  // Improved color change extraction
  const extractColorChanges = (description: string) => {
    const changes: Array<{
      colorName: string;
      oldQuantity: number;
      newQuantity: number;
      change: number;
    }> = [];
    
    // Pattern to match: #204080: quantity: 137 → 117 (-20)
    const colorPattern = /(#[\w\d]+):\s*quantity:\s*(\d+)\s*→\s*(\d+)\s*\(([+-]?\d+)\)/g;
    
    let match;
    while ((match = colorPattern.exec(description)) !== null) {
      changes.push({
        colorName: match[1], // #204080
        oldQuantity: parseInt(match[2]), // 137
        newQuantity: parseInt(match[3]), // 117
        change: parseInt(match[4]) // -20
      });
    }
    
    return changes;
  };

  // Extract stock adjustments from description
  const extractStockAdjustments = (description: string) => {
    const adjustments: Array<{
      oldQuantity: number;
      newQuantity: number;
      change: number;
      type: 'INCREMENT' | 'DECREMENT';
    }> = [];
    
    // Pattern to match: Stock DECREMENT: POO1 | 3 units | From: 7 → To: 4
    const adjustmentPattern = /Stock\s+(INCREMENT|DECREMENT):\s*[^|]+\|\s*(\d+)\s*units\s*\|\s*From:\s*(\d+)\s*→\s*To:\s*(\d+)/gi;
    
    let match;
    while ((match = adjustmentPattern.exec(description)) !== null) {
      const type = match[1].toUpperCase() as 'INCREMENT' | 'DECREMENT';
      const change = parseInt(match[2]);
      const oldQty = parseInt(match[3]);
      const newQty = parseInt(match[4]);
      
      adjustments.push({
        oldQuantity: oldQty,
        newQuantity: newQty,
        change: type === 'DECREMENT' ? -change : change,
        type
      });
    }
    
    return adjustments;
  };

  const parseColorsFromDescription = (description: string): string[] => {
    const colors: string[] = [];
    const hexColorRegex = /#([a-f0-9]{6}|[a-f0-9]{3})\b/gi;
    const matches = description.match(hexColorRegex);
    if (matches) {
      colors.push(...matches);
    }
    return colors;
  };

  const calculateSummaryStats = () => {
    if (!stock || !tracking.length) return;

    const totalShadeQuantity = hasShades ? shades.reduce((sum, shade) => sum + shade.quantity, 0) : 0;
    const totalShadeLength = hasShades ? shades.reduce((sum, shade) => sum + shade.length, 0) : 0;

    const stats: SummaryStats = {
      totalActivities: tracking.length,
      created: tracking.filter(t => t.action === 'CREATE').length,
      updated: tracking.filter(t => t.action === 'UPDATE').length,
      adjusted: tracking.filter(t => t.action === 'ADJUST').length,
      deleted: tracking.filter(t => t.action === 'DELETE').length,
      imageUploads: tracking.filter(t => t.action === 'IMAGE_UPLOAD').length,
      totalShades: shades.length,
      totalShadeQuantity: totalShadeQuantity,
      totalShadeLength: parseFloat(totalShadeLength.toFixed(2))
    };

    setSummaryStats(stats);
  };

  const calculateAnalytics = () => {
    if (!tracking.length || !stock) return;

    const stockCreatedDate = new Date(stock.createdAt);
    const now = new Date();
    let periods: { start: Date; label: string }[] = [];

    // Start from creation month
    const startDate = new Date(stockCreatedDate.getFullYear(), stockCreatedDate.getMonth(), 1);
    
    switch (analyticsPeriod) {
      case 'day':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          periods.push({
            start: new Date(date.setHours(0, 0, 0, 0)),
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          });
        }
        break;
      case 'week':
        for (let i = 3; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - (i * 7));
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          periods.push({
            start: weekStart,
            label: `Week ${Math.ceil((date.getDate() + 6) / 7)}`
          });
        }
        break;
      case 'month':
        const startMonth = stockCreatedDate.getMonth();
        const startYear = stockCreatedDate.getFullYear();
        const endMonth = now.getMonth();
        const endYear = now.getFullYear();
        
        const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        
        for (let i = 0; i < totalMonths; i++) {
          const date = new Date(startYear, startMonth + i, 1);
          periods.push({
            start: date,
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          });
        }
        break;
      case 'year':
        const startY = stockCreatedDate.getFullYear();
        const endY = now.getFullYear();
        
        for (let year = startY; year <= endY; year++) {
          periods.push({
            start: new Date(year, 0, 1),
            label: year.toString()
          });
        }
        break;
    }

    const analytics: AnalyticsData[] = periods.map((period, index) => {
      const periodEnd = index < periods.length - 1 
        ? periods[index + 1].start 
        : new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const periodActivities = tracking.filter(activity => {
        const activityDate = new Date(activity.performedAt);
        return activityDate >= period.start && activityDate < periodEnd;
      });

      let stockAdded = 0;
      let stockReduced = 0;
      let shadesAdded = 0;
      let shadesRemoved = 0;

      periodActivities.forEach(activity => {
        if (activity.action === 'CREATE') {
          // Count shades from CREATE
          const colors = parseColorsFromDescription(activity.description);
          shadesAdded += colors.length;
          
          // Parse initial quantities if available
          const colorChanges = extractColorChanges(activity.description);
          colorChanges.forEach(change => {
            if (change.change > 0) {
              stockAdded += change.change;
            }
          });
        } else if (activity.action === 'UPDATE') {
          // Calculate from shade changes in description
          const colorChanges = extractColorChanges(activity.description);
          colorChanges.forEach(change => {
            if (change.change > 0) {
              stockAdded += change.change;
            } else if (change.change < 0) {
              stockReduced += Math.abs(change.change);
            }
          });
        } else if (activity.action === 'ADJUST') {
          // Calculate from stock adjustments
          const adjustments = extractStockAdjustments(activity.description);
          adjustments.forEach(adj => {
            if (adj.change > 0) {
              stockAdded += adj.change;
            } else if (adj.change < 0) {
              stockReduced += Math.abs(adj.change);
            }
          });
        }
      });

      return {
        period: period.label,
        stockAdded,
        stockReduced,
        shadesAdded,
        shadesRemoved,
        activities: periodActivities.length
      };
    });

    // Filter out periods with no data
    const filteredAnalytics = analytics.filter(data => 
      data.activities > 0 || 
      data.stockAdded > 0 || 
      data.stockReduced > 0 || 
      data.shadesAdded > 0 || 
      data.shadesRemoved > 0
    );

    setAnalyticsData(filteredAnalytics);
  };

  const getActionDisplay = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { 
          icon: FiPlus, 
          color: 'text-green-600 bg-green-100 border-green-200',
          label: 'Created',
          badgeColor: 'bg-green-500'
        };
      case 'UPDATE':
        return { 
          icon: FiEdit, 
          color: 'text-coffee-600 bg-coffee-50 border-coffee-200',
          label: 'Updated',
          badgeColor: 'bg-coffee-500'
        };
      case 'ADJUST':
        return { 
          icon: FiPackage, 
          color: 'text-orange-600 bg-orange-100 border-orange-200',
          label: 'Adjusted',
          badgeColor: 'bg-orange-500'
        };
      case 'DELETE':
        return { 
          icon: FiTrash2, 
          color: 'text-red-600 bg-red-100 border-red-200',
          label: 'Deleted',
          badgeColor: 'bg-red-500'
        };
      case 'IMAGE_UPLOAD':
        return { 
          icon: FiImage, 
          color: 'text-purple-600 bg-purple-100 border-purple-200',
          label: 'Image Upload',
          badgeColor: 'bg-purple-500'
        };
      default:
        return { 
          icon: FiPackage, 
          color: 'text-gray-600 bg-gray-100 border-gray-200',
          label: action,
          badgeColor: 'bg-gray-500'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredTracking = () => {
    let filtered = [...tracking];
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(t => {
          const activityDate = new Date(t.performedAt);
          return activityDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(t => new Date(t.performedAt) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(t => new Date(t.performedAt) >= monthAgo);
        break;
      default:
        break;
    }
    return filtered;
  };

  const getPaginatedData = () => {
    const filtered = getFilteredTracking();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getFilteredTracking().length / itemsPerPage);

  const exportToCSV = () => {
    // Activity History Section
    const activityHeaders = [
      'ACTIVITY HISTORY',
      'Date & Time',
      'Action', 
      'User',
      'Description', 
      'Old Quantity',
      'New Quantity',
      'Quantity Change',
      'Performed At'
    ];
    
    const activityData = getFilteredTracking().map(activity => {
      if (hasShades) {
        const colorChanges = extractColorChanges(activity.description);
        
        if (colorChanges.length > 0) {
          // Create a row for each color change
          return colorChanges.map(change => [
            '', // Empty for section header
            formatDate(activity.performedAt),
            getActionDisplay(activity.action).label,
            activity.performedBy,
            activity.description,
            change.oldQuantity,
            change.newQuantity,
            change.change > 0 ? `+${change.change}` : change.change.toString(),
            activity.performedAt
          ]);
        }
      }
      
      // For stock adjustments or activities without color changes
      const adjustments = extractStockAdjustments(activity.description);
      if (adjustments.length > 0) {
        return adjustments.map(adj => [
          '', // Empty for section header
          formatDate(activity.performedAt),
          getActionDisplay(activity.action).label,
          activity.performedBy,
          activity.description,
          adj.oldQuantity,
          adj.newQuantity,
          adj.change > 0 ? `+${adj.change}` : adj.change.toString(),
          activity.performedAt
        ]);
      }
      
      // Row for activities without specific changes
      return [[
        '', // Empty for section header
        formatDate(activity.performedAt),
        getActionDisplay(activity.action).label,
        activity.performedBy,
        activity.description,
        '',
        '',
        '',
        activity.performedAt
      ]];
    }).flat();

    const csvSections = [
      activityHeaders.join(','),
      ...activityData.map(row => row.map(field => `"${field}"`).join(','))
    ];

    // Add Color Analytics Section only if there are shades
    if (hasShades && shadeAnalytics.length > 0) {
      const colorAnalyticsHeaders = [
        '\n\nCOLOR ANALYTICS',
        'Color Code',
        'Color Name',
        'Current Quantity',
        'Unit',
        'Total Reductions',
        'Total Additions',
        'Reduction Count',
        'Addition Count',
        'Net Change',
        'Total Changes',
        'Last Updated'
      ];

      const colorAnalyticsData = shadeAnalytics.map(shade => [
        '', // Empty for section header
        shade.color,
        shade.colorName,
        shade.currentQuantity,
        shade.unit,
        shade.totalReductions,
        shade.totalAdditions,
        shade.reductionCount,
        shade.additionCount,
        shade.netChange > 0 ? `+${shade.netChange}` : shade.netChange.toString(),
        shade.totalChanges,
        formatDate(shade.lastUpdated)
      ]);

      csvSections.push(
        colorAnalyticsHeaders.join(','),
        ...colorAnalyticsData.map(row => row.map(field => `"${field}"`).join(','))
      );
    }

    // Add Stock Changes Summary
    const stockChangesHeaders = [
      '\n\nSTOCK CHANGES SUMMARY',
      'Type',
      'Count',
      'Total Quantity',
      'Average Change'
    ];

    let incrementCount = 0;
    let incrementTotal = 0;
    let decrementCount = 0;
    let decrementTotal = 0;

    stockChanges.forEach(change => {
      if (change.quantityChange > 0) {
        incrementCount++;
        incrementTotal += change.quantityChange;
      } else if (change.quantityChange < 0) {
        decrementCount++;
        decrementTotal += Math.abs(change.quantityChange);
      }
    });

    const stockChangesData = [
      ['', 'Increments', incrementCount, `+${incrementTotal}`, incrementCount > 0 ? `+${(incrementTotal / incrementCount).toFixed(1)}` : '0'],
      ['', 'Decrements', decrementCount, `-${decrementTotal}`, decrementCount > 0 ? `-${(decrementTotal / decrementCount).toFixed(1)}` : '0'],
      ['', 'Net Change', incrementCount + decrementCount, 
        (incrementTotal - decrementTotal) > 0 ? `+${incrementTotal - decrementTotal}` : (incrementTotal - decrementTotal).toString(),
        (incrementTotal - decrementTotal) > 0 ? `+${((incrementTotal - decrementTotal) / (incrementCount + decrementCount)).toFixed(1)}` : 
        ((incrementTotal - decrementTotal) / (incrementCount + decrementCount)).toFixed(1)
      ]
    ];

    csvSections.push(
      stockChangesHeaders.join(','),
      ...stockChangesData.map(row => row.map(field => `"${field}"`).join(','))
    );

    // Summary Section
    const summaryHeaders = [
      '\n\nSUMMARY STATISTICS',
      'Metric',
      'Value',
      'Details'
    ];

    const summaryData = [
      ['', 'Total Activities', summaryStats?.totalActivities || 0, 'All tracked activities'],
      ['', 'Created', summaryStats?.created || 0, 'Stock creation events'],
      ['', 'Updated', summaryStats?.updated || 0, 'Update events'],
      ['', 'Adjusted', summaryStats?.adjusted || 0, 'Stock adjustments'],
      ['', 'Deleted', summaryStats?.deleted || 0, 'Deletion events'],
      ['', 'Image Uploads', summaryStats?.imageUploads || 0, 'Image uploads'],
      ['', 'Total Colors', summaryStats?.totalShades || 0, 'Different color shades'],
      ['', 'Total Stock Quantity', stock?.quantity || 0, 'Current stock quantity']
    ];

    if (hasShades) {
      summaryData.push(
        ['', 'Total Shade Quantity', summaryStats?.totalShadeQuantity || 0, 'Total quantity across all colors'],
        ['', 'Total Shade Length', summaryStats?.totalShadeLength || 0, 'Total length across all colors']
      );
    }

    csvSections.push(
      summaryHeaders.join(','),
      ...summaryData.map(row => row.map(field => `"${field}"`).join(','))
    );

    // Stock Information
    const stockInfoHeaders = [
      '\n\nSTOCK INFORMATION',
      'Field',
      'Value'
    ];

    const stockInfoData = [
      ['', 'Stock ID', stock?.stockId || ''],
      ['', 'Product Name', stock?.product || ''],
      ['', 'Category', stock?.category || ''],
      ['', 'Current Stock', stock?.quantity || 0],
      ['', 'Cost', `$${stock?.cost?.toFixed(2) || '0.00'}`],
      ['', 'Price', `$${stock?.price?.toFixed(2) || '0.00'}`],
      ['', 'Created Date', stock ? new Date(stock.createdAt).toLocaleDateString() : ''],
      ['', 'Updated Date', stock ? new Date(stock.updatedAt).toLocaleDateString() : '']
    ];

    csvSections.push(
      stockInfoHeaders.join(','),
      ...stockInfoData.map(row => row.map(field => `"${field}"`).join(','))
    );

    const csvContent = csvSections.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_History_${stock?.stockId}_${stock?.product}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseQuantityChanges = (activity: StockTracking) => {
    const changes: string[] = [];
    
    if (hasShades) {
      // Parse color changes from description
      const colorChanges = extractColorChanges(activity.description);
      
      // Add color changes
      colorChanges.forEach(change => {
        const sign = change.change >= 0 ? '+' : '';
        changes.push(`${change.colorName}: ${change.oldQuantity} → ${change.newQuantity} (${sign}${change.change})`);
      });
    }
    
    // Parse adjustment changes for stock adjustments
    const adjustments = extractStockAdjustments(activity.description);
    adjustments.forEach(adj => {
      const sign = adj.change >= 0 ? '+' : '';
      changes.push(`Stock ${adj.type.toLowerCase()}: ${adj.oldQuantity} → ${adj.newQuantity} (${sign}${adj.change})`);
    });
    
    // Parse adjustment changes from newData for ADJUST actions
    if (activity.action === 'ADJUST' && activity.newData) {
      const adjustment = activity.newData.adjustment || 0;
      const oldQty = activity.newData.oldQuantity || 0;
      const newQty = oldQty + adjustment;
      const sign = adjustment >= 0 ? '+' : '';
      changes.push(`Stock Adjusted: ${oldQty} → ${newQty} (${sign}${adjustment})`);
    }
    
    return changes;
  };

  const renderColorChips = (colors: string[]) => {
    if (!colors || colors.length === 0 || !hasShades) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {colors.slice(0, 6).map((color, index) => (
          <div
            key={index}
            className="w-4 h-4 border border-gray-300 rounded-sm shadow-sm"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        {colors.length > 6 && (
          <div className="flex items-center justify-center w-4 h-4 bg-gray-100 border border-gray-300 rounded-sm">
            <span className="text-xs text-gray-500">+{colors.length - 6}</span>
          </div>
        )}
      </div>
    );
  };

  const renderColorChipsInline = (colors: string[]) => {
    if (!colors || colors.length === 0 || !hasShades) return null;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {colors.slice(0, 3).map((color, index) => (
          <div
            key={index}
            className="w-3 h-3 border border-gray-300 rounded-sm shadow-sm"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        {colors.length > 3 && (
          <div className="flex items-center justify-center w-3 h-3 bg-gray-100 border border-gray-300 rounded-sm">
            <span className="text-xs text-gray-500">+{colors.length - 3}</span>
          </div>
        )}
      </div>
    );
  };

  const renderShadeAnalyticsCard = () => {
    if (!hasShades) {
      return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="py-12 text-center text-gray-500">
            <FiDroplet className="mx-auto mb-3 text-gray-400" size={32} />
            <p>No color shades available for this stock</p>
            <p className="text-sm">This stock item does not have any color shades defined</p>
          </div>
        </div>
      );
    }

    // Calculate totals from parsed data
    const totalReductions = shadeAnalytics.reduce((sum, shade) => sum + shade.totalReductions, 0);
    const totalAdditions = shadeAnalytics.reduce((sum, shade) => sum + shade.totalAdditions, 0);
    const totalReductionCount = shadeAnalytics.reduce((sum, shade) => sum + shade.reductionCount, 0);
    const totalAdditionCount = shadeAnalytics.reduce((sum, shade) => sum + shade.additionCount, 0);
    const totalChanges = shadeAnalytics.reduce((sum, shade) => sum + shade.totalChanges, 0);
    const netChange = shadeAnalytics.reduce((sum, shade) => sum + shade.netChange, 0);

    // Sort by most active (most changes)
    const sortedShades = [...shadeAnalytics].sort((a, b) => b.totalChanges - a.totalChanges);

    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Color Usage Analytics</h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full">
              {shadeAnalytics.length} colors analyzed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-6">
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="text-2xl font-bold text-red-600">
              {totalReductionCount}
            </div>
            <div className="text-sm font-medium text-red-600">Total Reductions</div>
            <div className="text-xs text-red-500">Times reduced</div>
          </div>
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">
              {totalAdditionCount}
            </div>
            <div className="text-sm font-medium text-green-600">Total Additions</div>
            <div className="text-xs text-green-500">Times added</div>
          </div>
          <div className="p-4 border rounded-lg border-coffee-200 bg-coffee-50">
            <div className="text-2xl font-bold text-coffee-600">
              {totalReductions}
            </div>
            <div className="text-sm font-medium text-coffee-600">Total Qty Reduced</div>
            <div className="text-xs text-coffee-500">Rolls decreased</div>
          </div>
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">
              {totalAdditions}
            </div>
            <div className="text-sm font-medium text-orange-600">Total Qty Added</div>
            <div className="text-xs text-orange-500">Rolls increased</div>
          </div>
          <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
            <div className="text-2xl font-bold text-purple-600">
              {totalChanges}
            </div>
            <div className="text-sm font-medium text-purple-600">Total Changes</div>
            <div className="text-xs text-purple-500">All modifications</div>
          </div>
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netChange >= 0 ? '+' : ''}{netChange}
            </div>
            <div className="text-sm font-medium text-blue-600">Net Change</div>
            <div className="text-xs text-blue-500">Overall balance</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Color Performance Overview</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedShades.slice(0, 6).map((shade, index) => (
              <div key={shade.shadeId} className="p-4 border border-gray-200 rounded-lg hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 border border-gray-300 rounded-md shadow-sm"
                      style={{ backgroundColor: shade.color }}
                      title={shade.color}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-800">{shade.colorName}</h4>
                      <p className="text-sm text-gray-600">Current: {shade.currentQuantity} {shade.unit}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">
                    #{index + 1}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reductions:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">{shade.reductionCount}</span>
                      <span className="text-xs text-red-500">({shade.totalReductions} {shade.unit})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Additions:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-600">{shade.additionCount}</span>
                      <span className="text-xs text-green-500">({shade.totalAdditions} {shade.unit})</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Net Change:</span>
                      <span className={`font-medium ${shade.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {shade.netChange >= 0 ? '+' : ''}{shade.netChange} {shade.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Total Changes:</span>
                      <span className="text-xs font-medium text-purple-600">{shade.totalChanges}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Detailed Color Analytics</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Color</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Current Qty</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Reductions</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Additions</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Net Change</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Total Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedShades.map((shade) => {
                const avgReduction = shade.reductionCount > 0 ? (shade.totalReductions / shade.reductionCount).toFixed(1) : '0';
                const avgAddition = shade.additionCount > 0 ? (shade.totalAdditions / shade.additionCount).toFixed(1) : '0';
                
                return (
                  <tr key={shade.shadeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 border border-gray-300 rounded-sm shadow-sm"
                          style={{ backgroundColor: shade.color }}
                          title={shade.color}
                        />
                        <div>
                          <span className="font-medium text-gray-800">{shade.colorName}</span>
                          <div className="text-xs text-gray-500">{shade.color}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-coffee-600">
                        {shade.currentQuantity} {shade.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <FiTrendingDown className="text-red-500" size={14} />
                          <span className="text-red-600">
                            {shade.totalReductions}
                          </span>
                        </div>
                        <span className="px-1 text-xs text-red-500 bg-red-100 rounded">
                          {shade.reductionCount}x
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Avg: {avgReduction} per reduction
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <FiTrendingUp className="text-green-500" size={14} />
                          <span className="text-green-600">
                            {shade.totalAdditions}
                          </span>
                        </div>
                        <span className="px-1 text-xs text-green-500 bg-green-100 rounded">
                          {shade.additionCount}x
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Avg: {avgAddition} per addition
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 font-medium ${shade.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {shade.netChange >= 0 ? (
                          <>
                            <FiTrendingUp size={14} />
                            +{shade.netChange}
                          </>
                        ) : (
                          <>
                            <FiTrendingDown size={14} />
                            {shade.netChange}
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {shade.netChange >= 0 ? 'Increase' : 'Decrease'} overall
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 text-xs font-medium text-center text-purple-800 bg-purple-100 rounded-full">
                          {shade.totalChanges} total
                        </span>
                        <div className="text-xs text-center text-gray-500">
                          {shade.reductionCount}R / {shade.additionCount}A
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {shadeAnalytics.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <FiActivity className="mx-auto mb-3 text-gray-400" size={32} />
            <p>No shade usage analytics available yet</p>
            <p className="text-sm">Shade analytics will appear after shade quantity updates</p>
          </div>
        )}
      </div>
    );
  };

  const renderShadesCard = () => {
    if (!hasShades) {
      return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="py-12 text-center text-gray-500">
            <FiDroplet className="mx-auto mb-3 text-gray-400" size={32} />
            <p>No color shades available for this stock</p>
            <p className="text-sm">This stock item does not have any color shades defined</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Current Color Shades</h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full">
              {shades.length} colors
            </span>
          </div>
        </div>

        {shades.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shades.map((shade) => {
              const analytics = shadeAnalytics.find(s => s.shadeId === shade.id);
              
              return (
                <div
                  key={shade.id}
                  className="p-4 transition-shadow border border-gray-200 rounded-lg hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{shade.colorName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-4 h-4 border border-gray-300 rounded-sm"
                          style={{ backgroundColor: shade.color }}
                          title={shade.color}
                        />
                        <span className="text-xs text-gray-500">{shade.color}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {shade.quantity} {shade.unit} • {shade.length} {shade.lengthUnit}
                      </p>
                    </div>
                    <div
                      className="w-10 h-10 border border-gray-300 rounded-md shadow-sm"
                      style={{ backgroundColor: shade.color }}
                      title={shade.color}
                    />
                  </div>
                  {analytics && (analytics.reductionCount > 0 || analytics.additionCount > 0) && (
                    <div className="p-3 mt-2 rounded-lg bg-gray-50">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-medium text-red-600">-{analytics.totalReductions}</div>
                          <div className="text-gray-500">{analytics.reductionCount} reductions</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">+{analytics.totalAdditions}</div>
                          <div className="text-gray-500">{analytics.additionCount} additions</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <span className={`text-xs font-medium ${analytics.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Net: {analytics.netChange >= 0 ? '+' : ''}{analytics.netChange} {shade.unit}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Updated: {new Date(shade.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <FiDroplet className="mx-auto mb-3 text-gray-400" size={32} />
            <p>No shades found for this stock</p>
          </div>
        )}

        {summaryStats && (
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3">
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">{summaryStats.totalShades}</div>
              <div className="text-sm font-medium text-purple-600">Total Colors</div>
            </div>
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">{summaryStats.totalShadeQuantity}</div>
              <div className="text-sm font-medium text-green-600">Total Quantity</div>
            </div>
            <div className="p-4 border rounded-lg border-coffee-200 bg-coffee-50">
              <div className="text-2xl font-bold text-coffee-600">{summaryStats.totalShadeLength}</div>
              <div className="text-sm font-medium text-coffee-600">Total Length</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalyticsCard = () => {
    // Calculate totals
    const totalStockAdded = analyticsData.reduce((sum, data) => sum + data.stockAdded, 0);
    const totalStockReduced = analyticsData.reduce((sum, data) => sum + data.stockReduced, 0);
    const totalShadesAdded = analyticsData.reduce((sum, data) => sum + data.shadesAdded, 0);
    const totalShadesRemoved = analyticsData.reduce((sum, data) => sum + data.shadesRemoved, 0);

    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Stock Analytics</h2>
          <select 
            value={analyticsPeriod}
            onChange={(e) => setAnalyticsPeriod(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="p-6 border rounded-lg border-coffee-200 bg-gradient-to-br from-coffee-50 to-coffee-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-coffee-600">
                <FiPackage className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-coffee-900">Stock Changes</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{totalStockAdded}
                </div>
                <div className="text-sm font-medium text-green-700">Total Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  -{totalStockReduced}
                </div>
                <div className="text-sm font-medium text-red-700">Total Reduced</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className={`text-lg font-bold ${totalStockAdded - totalStockReduced >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net: {totalStockAdded - totalStockReduced >= 0 ? '+' : ''}{totalStockAdded - totalStockReduced}
              </div>
              <div className="text-sm text-gray-600">Overall Change</div>
            </div>
          </div>

          {hasShades && (
            <div className="p-6 border border-purple-200 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <FiDroplet className="text-white" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-purple-900">Shades Changes</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +{totalShadesAdded}
                  </div>
                  <div className="text-sm font-medium text-green-700">Total Added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    -{totalShadesRemoved}
                  </div>
                  <div className="text-sm font-medium text-red-700">Total Removed</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className={`text-lg font-bold ${totalShadesAdded - totalShadesRemoved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Net: {totalShadesAdded - totalShadesRemoved >= 0 ? '+' : ''}{totalShadesAdded - totalShadesRemoved}
                </div>
                <div className="text-sm text-gray-600">Overall Change</div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Period</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Activities</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Stock Added</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Stock Reduced</th>
                {hasShades && (
                  <>
                    <th className="px-4 py-3 font-semibold text-left text-gray-700">Shades Added</th>
                    <th className="px-4 py-3 font-semibold text-left text-gray-700">Shades Removed</th>
                  </>
                )}
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analyticsData.map((data, index) => {
                const netStock = data.stockAdded - data.stockReduced;
                const netShades = data.shadesAdded - data.shadesRemoved;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{data.period}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="px-2 py-1 text-xs font-medium rounded-full text-coffee-800 bg-coffee-50">
                        {data.activities}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-green-600">
                        <FiTrendingUp size={14} />
                        +{data.stockAdded}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-red-600">
                        <FiTrendingDown size={14} />
                        -{data.stockReduced}
                      </div>
                    </td>
                    {hasShades && (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-medium text-green-600">
                            <FiTrendingUp size={14} />
                            +{data.shadesAdded}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-medium text-red-600">
                            <FiTrendingDown size={14} />
                            -{data.shadesRemoved}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className={`text-xs font-medium ${netStock >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Stock: {netStock >= 0 ? '+' : ''}{netStock}
                        </div>
                        {hasShades && (
                          <div className={`text-xs font-medium ${netShades >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Shades: {netShades >= 0 ? '+' : ''}{netShades}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {analyticsData.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <FiBarChart2 className="mx-auto mb-3 text-gray-400" size={32} />
            <p>No analytics data available for the selected period</p>
          </div>
        )}
      </div>
    );
  };

  const renderSummaryCard = () => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4 lg:grid-cols-5">
        <div className="p-4 border rounded-lg border-coffee-200 bg-coffee-50">
          <div className="text-2xl font-bold text-coffee-600">{summaryStats?.totalActivities || 0}</div>
          <div className="text-sm font-medium text-coffee-600">Total Activities</div>
        </div>
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="text-2xl font-bold text-green-600">{summaryStats?.created || 0}</div>
          <div className="text-sm font-medium text-green-600">Created</div>
        </div>
        <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
          <div className="text-2xl font-bold text-orange-600">{summaryStats?.updated || 0}</div>
          <div className="text-sm font-medium text-orange-600">Updates</div>
        </div>
        <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
          <div className="text-2xl font-bold text-purple-600">{summaryStats?.totalShades || 0}</div>
          <div className="text-sm font-medium text-purple-600">Total Colors</div>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="text-2xl font-bold text-red-600">{summaryStats?.adjusted || 0}</div>
          <div className="text-sm font-medium text-red-600">Adjustments</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Date & Time</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Action</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">User</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Description</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Quantity Changes</th>
              {hasShades && (
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Colors</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getPaginatedData().map((activity) => {
              const actionDisplay = getActionDisplay(activity.action);
              const IconComponent = actionDisplay.icon;
              const colors = hasShades ? parseColorsFromDescription(activity.description) : [];
              const quantityChanges = parseQuantityChanges(activity);

              return (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(activity.performedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionDisplay.color}`}>
                      <IconComponent size={12} className="mr-1" />
                      {actionDisplay.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-2">
                      <FiUser size={14} className="text-gray-400" />
                      {activity.performedBy}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-gray-600">
                    {activity.description}
                    {hasShades && colors.length > 0 && (
                      <div className="mt-1">
                        {renderColorChipsInline(colors)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {quantityChanges.length > 0 ? (
                      quantityChanges.slice(0, 3).map((change, idx) => {
                        // Extract color from change text if it contains a color code
                        const colorMatch = change.match(/#[\w\d]+/);
                        const changeText = colorMatch ? change.replace(colorMatch[0], '').trim() : change;
                        
                        return (
                          <div key={idx} className="mb-1 last:mb-0">
                            {colorMatch && hasShades && (
                              <div className="flex items-center gap-1 mb-1">
                                <div
                                  className="w-3 h-3 border border-gray-300 rounded-sm"
                                  style={{ backgroundColor: colorMatch[0] }}
                                  title={colorMatch[0]}
                                />
                                <span className="text-gray-700">{colorMatch[0]}</span>
                              </div>
                            )}
                            <div className="pl-4 text-gray-600">{changeText}</div>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-gray-400">No quantity changes</span>
                    )}
                    {quantityChanges.length > 3 && (
                      <div className="text-gray-400">+{quantityChanges.length - 3} more</div>
                    )}
                  </td>
                  {hasShades && (
                    <td className="px-4 py-3">
                      {renderColorChips(colors)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredTracking().length)} of {getFilteredTracking().length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <FiChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === pageNum 
                      ? 'bg-coffee-600 text-white' 
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimelineCard = () => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="space-y-6">
        {getPaginatedData().map((activity, index) => {
          const actionDisplay = getActionDisplay(activity.action);
          const IconComponent = actionDisplay.icon;
          const colors = hasShades ? parseColorsFromDescription(activity.description) : [];
          const quantityChanges = parseQuantityChanges(activity);

          return (
            <div key={activity.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full border ${actionDisplay.color} relative z-10`}>
                  <IconComponent size={16} />
                </div>
                {index !== getPaginatedData().length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2 flex-1"></div>
                )}
              </div>

              <div className="flex-1 pb-6">
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex flex-col mb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${actionDisplay.color}`}>
                        {actionDisplay.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatDate(activity.performedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiUser size={14} />
                      {activity.performedBy}
                    </div>
                  </div>

                  <p className="mb-3 font-medium text-gray-800">
                    {activity.description}
                    {hasShades && colors.length > 0 && (
                      <div className="mt-2">
                        {renderColorChipsInline(colors)}
                      </div>
                    )}
                  </p>

                  {quantityChanges.length > 0 && (
                    <div className="p-3 mb-3 bg-white border border-gray-200 rounded-lg">
                      <p className="mb-2 text-sm font-medium text-gray-700">Quantity Changes:</p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {quantityChanges.map((change, idx) => {
                          // Extract color from change text if it contains a color code
                          const colorMatch = change.match(/#[\w\d]+/);
                          const changeText = colorMatch ? change.replace(colorMatch[0], '').trim() : change;
                          
                          return (
                            <li key={idx} className="flex items-start gap-2">
                              {colorMatch && hasShades && (
                                <div
                                  className="w-3 h-3 mt-0.5 border border-gray-300 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: colorMatch[0] }}
                                  title={colorMatch[0]}
                                />
                              )}
                              <span>{colorMatch && hasShades ? `${colorMatch[0]}: ${changeText}` : `• ${change}`}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {hasShades && colors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Colors:</span>
                      {renderColorChips(colors)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredTracking().length)} of {getFilteredTracking().length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <FiChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === pageNum 
                      ? 'bg-coffee-600 text-white' 
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageLoader label="Loading stock history..." />
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-600">❌</div>
          <p className="mb-4 text-gray-600">{error || 'Stock not found'}</p>
          <button
            onClick={() => navigate('/stock-reports')}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-coffee-600 hover:bg-coffee-700"
          >
            <FiArrowLeft size={16} />
            Back to Stock Summary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50 md:p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/stock-reports')}
              className="flex items-center gap-2 mb-4 text-coffee-600 hover:text-coffee-800"
        >
          <FiArrowLeft size={16} />
          Back to Stock Summary
        </button>
        
        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {stock?.imagePath && (
                  <img 
                    src={stock.imagePath.startsWith('http') ? stock.imagePath : `${api.defaults.baseURL}${stock.imagePath}`} 
                    alt={stock.product}
                    className="flex-shrink-0 object-cover w-20 h-20 border rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">
                    {stock?.product}
                  </h1>
                  <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-600">
                    <div>
                      <strong>Stock ID:</strong> 
                      <span className="px-2 py-1 ml-1 font-mono bg-gray-100 rounded">{stock?.stockId}</span>
                    </div>
                    <div>
                      <strong>Category:</strong> {stock?.category}
                    </div>
                    <div>
                      <strong>Current Stock:</strong> {stock?.quantity} units
                    </div>
                    <div>
                      <strong>Price:</strong> Ugx {stock?.price.toFixed(2)}
                    </div>
                  </div>
                  {summaryStats && (
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Total Activities:</span>
                        <span className="px-2 py-1 text-sm font-medium rounded-full text-coffee-800 bg-coffee-50">
                          {summaryStats.totalActivities} activities
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Adjustments:</span>
                        <span className="px-2 py-1 text-sm font-medium text-orange-800 bg-orange-100 rounded-full">
                          {summaryStats.adjusted} adjustments
                        </span>
                      </div>
                      {hasShades && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Total Colors:</span>
                            <span className="px-2 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full">
                              {summaryStats.totalShades} colors
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Shade Quantity:</span>
                            <span className="px-2 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                              {summaryStats.totalShadeQuantity} units
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-3 py-2 text-sm text-gray-500 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <FiCalendar size={14} />
                <span>Created: {stock && new Date(stock.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCalendar size={14} />
                <span>Updated: {stock && new Date(stock.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex p-1 border border-gray-200 rounded-lg bg-gray-50">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'summary' 
                      ? 'bg-white text-coffee-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <FiList size={16} />
                  Summary List
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'timeline' 
                      ? 'bg-white text-coffee-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <FiClock size={16} />
                  Detailed Timeline
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'analytics' 
                      ? 'bg-white text-coffee-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <FiBarChart2 size={16} />
                  Analytics
                </button>
                {hasShades && (
                  <>
                    <button
                      onClick={() => setActiveTab('shades')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'shades' 
                          ? 'bg-white text-purple-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <FiDroplet size={16} />
                      Color Shades ({shades.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('shade-analytics')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'shade-analytics' 
                          ? 'bg-white text-orange-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <FiPieChart size={16} />
                      Color Analytics
                    </button>
                  </>
                )}
              </div>

              {activeTab !== 'analytics' && activeTab !== 'shades' && activeTab !== 'shade-analytics' && (
                <div className="flex items-center gap-2">
                  <FiFilter size={16} className="text-gray-400" />
                  <select 
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
            >
              <FiDownload size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'summary' ? renderSummaryCard() : 
       activeTab === 'timeline' ? renderTimelineCard() : 
       activeTab === 'analytics' ? renderAnalyticsCard() :
       activeTab === 'shades' ? renderShadesCard() :
       renderShadeAnalyticsCard()}
    </div>
  );
};

export default StockHistory;