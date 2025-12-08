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
  FiActivity
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
  oldLength: number;
  newLength: number;
  lengthChange: number;
  unit: string;
  lengthUnit: string;
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
  currentLength: number;
  unit: string;
  lengthUnit: string;
  totalReductions: number;
  totalAdditions: number;
  reductionCount: number;
  additionCount: number;
  lastUpdated: string;
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

  useEffect(() => {
    if (id) {
      fetchActivitySummary();
    }
  }, [id]);

  useEffect(() => {
    if (tracking.length > 0) {
      calculateSummaryStats();
      calculateAnalytics();
      analyzeShadeChanges();
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
        setShades(payload.stock.shades || []);
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
      if (Array.isArray(payload.shadeAnalytics)) {
        setShadeAnalytics(payload.shadeAnalytics);
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
    const changes: ShadeChange[] = [];
    
    tracking.forEach(activity => {
      if (activity.action === 'CREATE' && activity.newData && activity.newData.colorName) {
        const newData = activity.newData;
        changes.push({
          shadeId: newData.id,
          colorName: newData.colorName,
          color: newData.color,
          oldQuantity: 0,
          newQuantity: newData.quantity || 0,
          quantityChange: newData.quantity || 0,
          oldLength: 0,
          newLength: newData.length || 0,
          lengthChange: newData.length || 0,
          unit: newData.unit || 'Units',
          lengthUnit: newData.lengthUnit || 'Units',
          changeType: 'increase',
          performedAt: activity.performedAt,
          performedBy: activity.performedBy,
          action: 'CREATE'
        });
      }
      
      if (activity.action === 'UPDATE' && activity.oldData && activity.newData) {
        const oldData = activity.oldData;
        const newData = activity.newData;
        
        if (oldData.colorName && newData.colorName) {
          const quantityChange = (newData.quantity || 0) - (oldData.quantity || 0);
          const lengthChange = (newData.length || 0) - (oldData.length || 0);
          
          changes.push({
            shadeId: oldData.id,
            colorName: oldData.colorName,
            color: oldData.color,
            oldQuantity: oldData.quantity || 0,
            newQuantity: newData.quantity || 0,
            quantityChange: quantityChange,
            oldLength: oldData.length || 0,
            newLength: newData.length || 0,
            lengthChange: lengthChange,
            unit: oldData.unit || 'Units',
            lengthUnit: oldData.lengthUnit || 'Units',
            changeType: quantityChange > 0 ? 'increase' : quantityChange < 0 ? 'decrease' : 'no-change',
            performedAt: activity.performedAt,
            performedBy: activity.performedBy,
            action: 'UPDATE'
          });
        }
      }
      
      if (activity.action === 'DELETE' && activity.oldData && activity.oldData.colorName) {
        const oldData = activity.oldData;
        changes.push({
          shadeId: oldData.id,
          colorName: oldData.colorName,
          color: oldData.color,
          oldQuantity: oldData.quantity || 0,
          newQuantity: 0,
          quantityChange: -(oldData.quantity || 0),
          oldLength: oldData.length || 0,
          newLength: 0,
          lengthChange: -(oldData.length || 0),
          unit: oldData.unit || 'Units',
          lengthUnit: oldData.lengthUnit || 'Units',
          changeType: 'decrease',
          performedAt: activity.performedAt,
          performedBy: activity.performedBy,
          action: 'DELETE'
        });
      }
    });
    
    setShadeChanges(changes);
    calculateShadeAnalytics(changes);
  };

  const analyzeStockChanges = () => {
    const changes: StockChange[] = [];
    
    tracking.forEach(activity => {
      if (activity.action === 'CREATE' && activity.newData) {
        const newData = activity.newData;
        changes.push({
          oldQuantity: 0,
          newQuantity: newData.quantity || 0,
          quantityChange: newData.quantity || 0,
          changeType: 'increase',
          performedAt: activity.performedAt,
          performedBy: activity.performedBy,
          action: 'CREATE'
        });
      }
      
      if (activity.action === 'UPDATE' && activity.oldData && activity.newData) {
        const oldData = activity.oldData;
        const newData = activity.newData;
        
        // Check if this is a stock quantity update
        if (oldData.quantity !== undefined && newData.quantity !== undefined) {
          const quantityChange = (newData.quantity || 0) - (oldData.quantity || 0);
          
          changes.push({
            oldQuantity: oldData.quantity || 0,
            newQuantity: newData.quantity || 0,
            quantityChange: quantityChange,
            changeType: quantityChange > 0 ? 'increase' : quantityChange < 0 ? 'decrease' : 'no-change',
            performedAt: activity.performedAt,
            performedBy: activity.performedBy,
            action: 'UPDATE'
          });
        }
      }
      
      if (activity.action === 'ADJUST' && activity.newData) {
        const newData = activity.newData;
        const adjustment = newData.adjustment || 0;
        
        changes.push({
          oldQuantity: (newData.oldQuantity || 0),
          newQuantity: (newData.oldQuantity || 0) + adjustment,
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

  const calculateShadeAnalytics = (changes: ShadeChange[]) => {
    const analyticsMap = new Map<number, ShadeAnalytics>();
    
    shades.forEach(shade => {
      analyticsMap.set(shade.id, {
        shadeId: shade.id,
        colorName: shade.colorName,
        color: shade.color,
        currentQuantity: shade.quantity,
        currentLength: shade.length,
        unit: shade.unit,
        lengthUnit: shade.lengthUnit,
        totalReductions: 0,
        totalAdditions: 0,
        reductionCount: 0,
        additionCount: 0,
        lastUpdated: shade.updatedAt
      });
    });
    
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
        
        existing.lastUpdated = change.performedAt;
        
        if (change.action !== 'DELETE') {
          existing.currentQuantity = change.newQuantity;
          existing.currentLength = change.newLength;
        }
      } else {
        analyticsMap.set(change.shadeId, {
          shadeId: change.shadeId,
          colorName: change.colorName,
          color: change.color,
          currentQuantity: change.action === 'DELETE' ? 0 : change.newQuantity,
          currentLength: change.action === 'DELETE' ? 0 : change.newLength,
          unit: change.unit,
          lengthUnit: change.lengthUnit,
          totalReductions: change.quantityChange < 0 ? Math.abs(change.quantityChange) : 0,
          totalAdditions: change.quantityChange > 0 ? change.quantityChange : 0,
          reductionCount: change.quantityChange < 0 ? 1 : 0,
          additionCount: change.quantityChange > 0 ? 1 : 0,
          lastUpdated: change.performedAt
        });
      }
    });
    
    setShadeAnalytics(Array.from(analyticsMap.values()));
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

  const parseShadeCount = (description: string): number => {
    const shadesMatch = description.match(/(\d+) shades?/);
    return shadesMatch ? parseInt(shadesMatch[1]) : 0;
  };

  const parseCreatedShades = (description: string): number => {
    const createdMatches = description.match(/created shade/g);
    return createdMatches ? createdMatches.length : 0;
  };

  const parseInitialStock = (description: string): number => {
    const stockMatch = description.match(/Stock:.*?(\d+)/);
    return stockMatch ? parseInt(stockMatch[1]) : 0;
  };

  const calculateSummaryStats = () => {
    if (!stock || !tracking.length) return;

    const totalShadeQuantity = shades.reduce((sum, shade) => sum + shade.quantity, 0);
    const totalShadeLength = shades.reduce((sum, shade) => sum + shade.length, 0);

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
    if (!tracking.length) return;

    const now = new Date();
    let periods: { start: Date; label: string }[] = [];

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
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          periods.push({
            start: new Date(date.getFullYear(), date.getMonth(), 1),
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          });
        }
        break;
      case 'year':
        for (let i = 2; i >= 0; i--) {
          const year = now.getFullYear() - i;
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
          const initialStock = parseInitialStock(activity.description);
          stockAdded += initialStock;
        } else if (activity.action === 'ADJUST') {
          const adjustment = activity.newData?.adjustment || 0;
          if (adjustment > 0) {
            stockAdded += adjustment;
          } else {
            stockReduced += Math.abs(adjustment);
          }
        }

        if (activity.action === 'CREATE') {
          shadesAdded += parseShadeCount(activity.description);
        } else if (activity.action === 'UPDATE') {
          shadesAdded += parseCreatedShades(activity.description);
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

    setAnalyticsData(analytics);
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
    const headers = ['Date', 'Action', 'User', 'Description', 'Quantity Changes', 'Color Changes'];
    const data = getFilteredTracking().map(activity => {
      const colors = parseColorsFromDescription(activity.description);
      const changes = parseQuantityChanges(activity);
      return [
        formatDate(activity.performedAt),
        getActionDisplay(activity.action).label,
        activity.performedBy,
        activity.description,
        changes.join('; '),
        colors.join('; ')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-history-${stock?.stockId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseQuantityChanges = (activity: StockTracking) => {
    const changes: string[] = [];
    
    // Parse stock quantity changes
    if (activity.oldData && activity.newData && activity.oldData.quantity !== undefined && activity.newData.quantity !== undefined) {
      const oldQty = activity.oldData.quantity || 0;
      const newQty = activity.newData.quantity || 0;
      if (oldQty !== newQty) {
        changes.push(`Stock: ${oldQty} → ${newQty} units`);
      }
    }
    
    // Parse shade quantity changes
    if (activity.oldData && activity.newData && activity.oldData.colorName) {
      const oldQty = activity.oldData.quantity || 0;
      const newQty = activity.newData.quantity || 0;
      if (oldQty !== newQty) {
        changes.push(`Color ${activity.oldData.colorName}: ${oldQty} → ${newQty} ${activity.oldData.unit || 'units'}`);
      }
    }
    
    // Parse adjustment changes
    if (activity.action === 'ADJUST' && activity.newData) {
      const adjustment = activity.newData.adjustment || 0;
      const oldQty = activity.newData.oldQuantity || 0;
      const newQty = oldQty + adjustment;
      changes.push(`Stock Adjusted: ${oldQty} → ${newQty} units (${adjustment > 0 ? '+' : ''}${adjustment})`);
    }
    
    return changes;
  };

  const renderColorChips = (colors: string[]) => {
    if (!colors || colors.length === 0) return null;
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

  const renderShadeAnalyticsCard = () => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Color Usage Analytics</h2>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full">
            {shadeAnalytics.length} colors analyzed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="text-2xl font-bold text-red-600">
            {shadeAnalytics.reduce((sum, shade) => sum + shade.reductionCount, 0)}
          </div>
          <div className="text-sm font-medium text-red-600">Total Reductions</div>
        </div>
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="text-2xl font-bold text-green-600">
            {shadeAnalytics.reduce((sum, shade) => sum + shade.additionCount, 0)}
          </div>
          <div className="text-sm font-medium text-green-600">Total Additions</div>
        </div>
        <div className="p-4 border border-coffee-200 rounded-lg bg-coffee-50">
          <div className="text-2xl font-bold text-coffee-600">
            {shadeAnalytics.reduce((sum, shade) => sum + shade.totalReductions, 0)}
          </div>
          <div className="text-sm font-medium text-coffee-600">Total Qty Reduced</div>
        </div>
        <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
          <div className="text-2xl font-bold text-orange-600">
            {shadeAnalytics.reduce((sum, shade) => sum + shade.totalAdditions, 0)}
          </div>
          <div className="text-sm font-medium text-orange-600">Total Qty Added</div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Most Used Colors (Highest Reductions)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shadeAnalytics
            .filter(shade => shade.totalReductions > 0)
            .sort((a, b) => b.totalReductions - a.totalReductions)
            .slice(0, 6)
            .map((shade, index) => (
              <div key={shade.shadeId} className="p-4 border border-gray-200 rounded-lg">
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
                  <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                    #{index + 1}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Times Reduced:</span>
                    <span className="font-medium text-red-600">{shade.reductionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Reduced:</span>
                    <span className="font-medium text-red-600">-{shade.totalReductions} {shade.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Times Added:</span>
                    <span className="font-medium text-green-600">{shade.additionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Added:</span>
                    <span className="font-medium text-green-600">+{shade.totalAdditions} {shade.unit}</span>
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
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Usage Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {shadeAnalytics
              .sort((a, b) => b.reductionCount - a.reductionCount)
              .map((shade) => (
                <tr key={shade.shadeId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 border border-gray-300 rounded-sm shadow-sm"
                        style={{ backgroundColor: shade.color }}
                        title={shade.color}
                      />
                      <span className="font-medium text-gray-800">{shade.colorName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-coffee-600">
                      {shade.currentQuantity} {shade.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiTrendingDown className="text-red-500" size={14} />
                      <span className="text-red-600">
                        {shade.totalReductions} {shade.unit}
                      </span>
                      <span className="px-1 text-xs text-red-500 bg-red-100 rounded">
                        {shade.reductionCount}x
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiTrendingUp className="text-green-500" size={14} />
                      <span className="text-green-600">
                        {shade.totalAdditions} {shade.unit}
                      </span>
                      <span className="px-1 text-xs text-green-500 bg-green-100 rounded">
                        {shade.additionCount}x
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full">
                      {shade.reductionCount + shade.additionCount} changes
                    </span>
                  </td>
                </tr>
              ))}
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

  const renderShadesCard = () => (
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
                    <p className="text-sm text-gray-600">
                      {shade.quantity} {shade.unit} • {shade.length} {shade.lengthUnit}
                    </p>
                  </div>
                  <div
                    className="w-8 h-8 border border-gray-300 rounded-md shadow-sm"
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
          <div className="p-4 border border-coffee-200 rounded-lg bg-coffee-50">
            <div className="text-2xl font-bold text-coffee-600">{summaryStats.totalShadeLength}</div>
            <div className="text-sm font-medium text-coffee-600">Total Length</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalyticsCard = () => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Stock & Shades Analytics</h2>
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

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <div className="p-6 border border-coffee-200 rounded-lg bg-gradient-to-br from-coffee-50 to-coffee-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-coffee-600">
              <FiPackage className="text-white" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-coffee-900">Stock Changes</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{analyticsData.reduce((sum, data) => sum + data.stockAdded, 0)}
              </div>
              <div className="text-sm font-medium text-green-700">Total Added</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                -{analyticsData.reduce((sum, data) => sum + data.stockReduced, 0)}
              </div>
              <div className="text-sm font-medium text-red-700">Total Reduced</div>
            </div>
          </div>
        </div>

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
                +{analyticsData.reduce((sum, data) => sum + data.shadesAdded, 0)}
              </div>
              <div className="text-sm font-medium text-green-700">Total Added</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                -{analyticsData.reduce((sum, data) => sum + data.shadesRemoved, 0)}
              </div>
              <div className="text-sm font-medium text-red-700">Total Removed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Period</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Activities</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Stock Added</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Stock Reduced</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Shades Added</th>
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Shades Removed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {analyticsData.map((data, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{data.period}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="px-2 py-1 text-xs font-medium text-coffee-800 bg-coffee-50 rounded-full">
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
              </tr>
            ))}
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

  const renderSummaryCard = () => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4 lg:grid-cols-5">
        <div className="p-4 border border-coffee-200 rounded-lg bg-coffee-50">
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
              <th className="px-4 py-3 font-semibold text-left text-gray-700">Colors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getPaginatedData().map((activity) => {
              const actionDisplay = getActionDisplay(activity.action);
              const IconComponent = actionDisplay.icon;
              const colors = parseColorsFromDescription(activity.description);
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
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {quantityChanges.slice(0, 2).map((change, idx) => (
                      <div key={idx} className="mb-1 last:mb-0">
                        {change}
                      </div>
                    ))}
                    {quantityChanges.length > 2 && (
                      <div className="text-gray-400">+{quantityChanges.length - 2} more</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {renderColorChips(colors)}
                  </td>
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
          const colors = parseColorsFromDescription(activity.description);
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
                  </p>

                  {quantityChanges.length > 0 && (
                    <div className="p-3 mb-3 bg-white border border-gray-200 rounded-lg">
                      <p className="mb-2 text-sm font-medium text-gray-700">Quantity Changes:</p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {quantityChanges.map((change, idx) => (
                          <li key={idx}>• {change}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {colors.length > 0 && (
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
                      <strong>Price:</strong> ${stock?.price.toFixed(2)}
                    </div>
                  </div>
                  {summaryStats && (
                    <div className="flex flex-wrap gap-4 mt-2">
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Total Length:</span>
                        <span className="px-2 py-1 text-sm font-medium text-coffee-800 bg-coffee-50 rounded-full">
                          {summaryStats.totalShadeLength} {shades[0]?.lengthUnit || 'units'}
                        </span>
                      </div>
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