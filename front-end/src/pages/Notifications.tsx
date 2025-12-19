import { useState } from "react";
import { FiBell, FiCheck, FiTrash2, FiSearch, FiArrowLeft, FiPackage, FiEdit, FiPlus, FiMinus, FiImage, FiEye } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

interface Notification {
  id: number;
  trackingId: number;
  userName: string;
  userInitial: string;
  userColor: string;
  message: string;
  project: string;
  type: "success" | "error" | "warning" | "info";
  timestamp: Date;
  read: boolean;
  category: string;
  action: string;
  stockItem?: {
    id: number;
    stockId: string;
    product: string;
    category: string;
  };
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const navigate = useNavigate();

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchTerm === '' ||
      notification.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (notification.stockItem?.stockId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = filterAction === "ALL" || notification.action === filterAction;
    const matchesCategory = filterCategory === "ALL" || notification.category === filterCategory;

    return matchesSearch && matchesAction && matchesCategory;
  });

  // Get unique actions and categories for filters
  const uniqueActions = ["ALL", ...new Set(notifications.map(n => n.action))];
  const uniqueCategories = ["ALL", ...new Set(notifications.map(n => n.category))];

  // Handle view stock history
  const handleViewStockHistory = (stockId: number) => {
    navigate(`/app/stock/${stockId}/history`);
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return FiPlus;
      case 'UPDATE': return FiEdit;
      case 'ADJUST': return FiPackage;
      case 'DELETE': return FiMinus;
      case 'IMAGE_UPLOAD': return FiImage;
      default: return FiPackage;
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group by date
  const groupByDate = () => {
    const groups: { [key: string]: Notification[] } = {};

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    });

    return groups;
  };

  const notificationGroups = groupByDate();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen p-4 bg-gray-50 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <FiArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">
            Stock Activity Notifications
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-800">{notifications.length}</p>
              </div>
              <FiBell className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
              <FiPackage className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.action === 'CREATE').length}
                </p>
              </div>
              <FiPlus className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Updated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {notifications.filter(n => n.action === 'UPDATE').length}
                </p>
              </div>
              <FiEdit className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute text-gray-400 left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search activities, users, or products..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                {uniqueActions.map(action => (
                  <option key={action} value={action}>
                    {action === "ALL" ? "All Actions" : action}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>
                    {category === "ALL" ? "All Categories" : category}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50"
                >
                  <FiCheck size={16} />
                  Mark All Read
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                >
                  <FiTrash2 size={16} />
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FiBell className="w-16 h-16 mb-4 text-gray-300" />
            <p className="mb-2 text-lg">No activities found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(notificationGroups).map(([date, dayNotifications]) => (
              <div key={date}>
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-700">{date}</h3>
                </div>
                {dayNotifications.map((notification) => {
                  const ActionIcon = getActionIcon(notification.action);
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-6 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''
                        }`}
                    >
                      {/* User avatar */}
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white ${notification.userColor}`}>
                        <span className="text-lg font-semibold">{notification.userInitial}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-gray-900">
                              <span className="font-semibold">{notification.userName}</span>
                              {' '}{notification.message}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-gray-800">
                              {notification.project}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <ActionIcon size={14} />
                                {notification.action}
                              </span>
                              <span>•</span>
                              <span>{notification.category}</span>
                              <span>•</span>
                              <span>{formatDate(notification.timestamp)}</span>
                              {notification.stockItem && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-blue-600">
                                    {notification.stockItem.stockId}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {notification.stockItem && (
                              <button
                                onClick={() => handleViewStockHistory(notification.stockItem!.id)}
                                className="p-2 text-blue-400 rounded-lg hover:text-blue-600 hover:bg-blue-50"
                                title="View stock history"
                              >
                                <FiEye size={16} />
                              </button>
                            )}
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 text-gray-400 rounded-lg hover:text-green-600 hover:bg-green-50"
                                title="Mark as read"
                              >
                                <FiCheck size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => clearNotification(notification.id)}
                              className="p-2 text-gray-400 rounded-lg hover:text-red-600 hover:bg-red-50"
                              title="Remove notification"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}