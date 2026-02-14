import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../utils/axios';
import PageMeta from '../../components/common/PageMeta';
import Cookies from 'js-cookie';
import {
  ActivityChart,
  DashboardStats,
  RecentChanges,
  StockDetails,
  RecentStock
} from '../../components/dashboard';

// Define all TypeScript interfaces
interface Shade {
  id: number;
  colorName: string;
  color: string;
  quantity: number;
  unit: string;
  length: number;
  lengthUnit: string;
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
  shades: Shade[];
  createdAt: string;
  updatedAt: string;
}

interface StockTracking {
  id: number;
  stockId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST' | 'IMAGE_UPLOAD';
  description: string;
  oldData: any;
  newData: any;
  performedBy: string;
  performedAt: string;
  ipAddress?: string;
  userAgent?: string;
  stock?: Stock;
}

interface User {
  id: number;
  email: string;
  username: string;
  phone: string | null;
  imagePath: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStatsType {
  totalItems: number;
  totalQuantity: number;
  totalUsers: number;
  lowStockItems: number;
  recentAdditions: number;
  totalChanges: number;
}

interface TrackingStats {
  totalActions: number;
  byAction: {
    CREATE: number;
    UPDATE: number;
    DELETE: number;
    ADJUST: number;
    IMAGE_UPLOAD: number;
  };
  recentStocks: any[];
}

const Home: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [editingShades, setEditingShades] = useState<Map<number, Shade>>(new Map());
  const [tracking, setTracking] = useState<StockTracking[]>([]);
  const [trackingStats, setTrackingStats] = useState<TrackingStats | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [username, setUsername] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsType>({
    totalItems: 0,
    totalQuantity: 0,
    totalUsers: 0,
    lowStockItems: 0,
    recentAdditions: 0,
    totalChanges: 0
  });


  // Get username from cookies
  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username || 'System');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUsername('System');
      }
    }
  }, []);

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [stocksResponse, trackingResponse, statsResponse, usersResponse] = await Promise.all([
        api.get('/stock'),
        api.get('/stock/tracking/all?limit=1000'),
        api.get('/stock/tracking/stats'),
        api.get('/users')
      ]);

      console.log('Stocks data:', stocksResponse.data);
      console.log('Tracking data:', trackingResponse.data);
      console.log('Stats data:', statsResponse.data);
      console.log('Users data:', usersResponse.data);

      setStocks(stocksResponse.data);
      setFilteredStocks(stocksResponse.data);

      // Handle both array and object response formats for tracking
      const trackingData = Array.isArray(trackingResponse.data)
        ? trackingResponse.data
        : trackingResponse.data.data || [];
      setTracking(trackingData);

      setTrackingStats(statsResponse.data);
      
      // Calculate dashboard stats
      calculateDashboardStats(stocksResponse.data, trackingData, usersResponse.data);

      toast.success('Data refreshed successfully!');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const calculateDashboardStats = (stocksData: Stock[], trackingData: StockTracking[], usersData: User[]) => {
    const totalItems = stocksData.length;
    const totalQuantity = stocksData.reduce((sum, stock) => sum + stock.quantity, 0);
    const totalUsers = usersData.length;
    const lowStockItems = stocksData.filter(stock => stock.quantity < 10).length;

    // Recent additions (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentAdditions = trackingData.filter(item =>
      item.action === 'CREATE' && new Date(item.performedAt) > weekAgo
    ).length;

    const totalChanges = trackingData.length;

    setDashboardStats({
      totalItems,
      totalQuantity,
      totalUsers,
      lowStockItems,
      recentAdditions,
      totalChanges
    });
  };

  // View stock details
  const viewStockDetails = (stock: Stock) => {
    setSelectedStock(stock);
    setViewMode('details');
  };

  // Start editing stock
  const startEditing = (stock: Stock) => {
    setEditingStock(stock);
    const shadesMap = new Map();
    stock.shades.forEach(shade => {
      shadesMap.set(shade.id, { ...shade });
    });
    setEditingShades(shadesMap);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingStock(null);
    setEditingShades(new Map());
  };

  // Update shade quantity
  const updateShadeQuantity = (shadeId: number, newQuantity: number) => {
    if (newQuantity < 0) return;

    const updatedShades = new Map(editingShades);
    const shade = updatedShades.get(shadeId);
    if (shade) {
      updatedShades.set(shadeId, { ...shade, quantity: newQuantity });
      setEditingShades(updatedShades);
    }
  };

  // Update stock quantity
  const updateStockQuantity = (newQuantity: number) => {
    if (newQuantity < 0 || !editingStock) return;
    setEditingStock({ ...editingStock, quantity: newQuantity });
  };

  // Save changes
  const saveChanges = async () => {
    if (!editingStock || !username) return;

    try {
      if (editingStock.quantity !== selectedStock?.quantity) {
        const adjustment = editingStock.quantity - (selectedStock?.quantity || 0);
        await api.patch(`/stock/${editingStock.id}/adjust`, {
          adjustment,
          reason: 'Manual adjustment',
          username
        });
      }

      for (const [shadeId, shade] of editingShades.entries()) {
        const originalShade = selectedStock?.shades.find(s => s.id === shadeId);
        if (originalShade && shade.quantity !== originalShade.quantity) {
          await api.patch(`/shades/${shadeId}`, {
            quantity: shade.quantity,
            username
          });
        }
      }

      await fetchAllData();
      cancelEditing();
      setSelectedStock(editingStock);
      toast.success('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes. Please try again.');
    }
  };

  // Export data functions
  const exportToCSV = () => {
    try {
      const headers = ['Stock ID', 'Product', 'Category', 'Quantity', 'Cost', 'Price', 'Last Updated'];
      const csvData = filteredStocks.map(stock => [
        stock.stockId,
        `"${stock.product}"`,
        stock.category,
        stock.quantity,
        stock.cost,
        stock.price,
        new Date(stock.updatedAt).toLocaleDateString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-inventory-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  const exportToJSON = () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        totalItems: filteredStocks.length,
        stocks: filteredStocks
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-inventory-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('JSON exported successfully!');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Failed to export JSON. Please try again.');
    }
  };

  // Chat functions

  // Listen for chat-triggered export events (dispatched by global ChatWidget)
  useEffect(() => {
    const onExportCSVFromChat = () => {
      exportToCSV();
    };
    const onExportJSONFromChat = () => {
      exportToJSON();
    };

    window.addEventListener('chatExportCSV', onExportCSVFromChat as EventListener);
    window.addEventListener('chatExportJSON', onExportJSONFromChat as EventListener);

    return () => {
      window.removeEventListener('chatExportCSV', onExportCSVFromChat as EventListener);
      window.removeEventListener('chatExportJSON', onExportJSONFromChat as EventListener);
    };
  }, [filteredStocks]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    // Just use stocks as-is, filter/search removed
    setFilteredStocks(stocks);
  }, [stocks]);

  // Get data for components
  const recentChanges = tracking.filter(item => item.action !== 'CREATE').slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageMeta title="Stock Tracker - Fashion House" description="Track and manage stock inventory" />
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="px-4 py-6 sm:py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Fashion house Dashboard</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">Monitor and manage your inventory in real-time</p>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <>
            <DashboardStats stats={dashboardStats} />

         <div className="grid grid-cols-1 gap-6 mb-6 sm:mb-8 lg:grid-cols-2 xl:gap-8">
  <div className="w-full h-full">
    {/* <ActivityChart data={getChartData()} trackingStats={trackingStats} /> */}

    <ActivityChart changes={trackingStats?.recentStocks || []} />

  </div>

  <div className="w-full h-full">
    <RecentChanges changes={recentChanges} />
  </div>
</div>


            <RecentStock
              stocks={filteredStocks}
              sortOrder={sortOrder}
              onSortChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              onRefresh={fetchAllData}
              onViewDetails={(s) => viewStockDetails(s as unknown as Stock)}
              onEditStock={(s) => startEditing(s as unknown as Stock)}
            />

     
          </>
        ) : (
          <StockDetails
            stock={selectedStock}
            editingStock={editingStock}
            editingShades={editingShades}
            onCancelEditing={cancelEditing}
            onSaveChanges={saveChanges}
            onBackToList={() => {
              setViewMode('list');
              setSelectedStock(null);
              cancelEditing();
            }}
            onUpdateStockQuantity={updateStockQuantity}
            onUpdateShadeQuantity={updateShadeQuantity}
          />
        )}
      </div>
    </div>
  );
};

export default Home;