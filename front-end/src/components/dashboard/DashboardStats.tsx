import React from 'react';
import { FiPackage, FiUsers, FiTrendingDown, FiActivity } from 'react-icons/fi';

interface DashboardStatsProps {
  stats: {
    totalItems: number;
    totalQuantity: number;
    totalUsers: number;
    lowStockItems: number;
    recentAdditions: number;
    totalChanges: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      <div className="p-6 bg-white border-l-4 border-blue-500 shadow-lg rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <FiPackage className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Across all categories</p>
      </div>
      
      <div className="p-6 bg-white border-l-4 border-green-500 shadow-lg rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <FiUsers className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">System users</p>
      </div>
      
      <div className="p-6 bg-white border-l-4 border-yellow-500 shadow-lg rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Low Stock</p>
            <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <FiTrendingDown className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Need attention</p>
      </div>
      
      <div className="p-6 bg-white border-l-4 border-purple-500 shadow-lg rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Recent Activity</p>
            <p className="text-2xl font-bold text-gray-900">{stats.recentAdditions}</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <FiActivity className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">New items (7 days)</p>
      </div>
    </div>
  );
};

export default DashboardStats;