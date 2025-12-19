import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBell, FiX, FiCheck, FiTrash2, FiPackage, FiEdit,
  FiPlus, FiMinus, FiImage, FiEye
} from "react-icons/fi";
import api from '../../utils/axios';
import { useNotifications } from '../../context/NotificationContext';

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

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Use notifications from context
  const {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    fetchNotifications
  } = useNotifications();

  // Fetch notifications from API
  const fetchNotificationsFromAPI = async () => {
    setLoading(true);
    try {
      await fetchNotifications();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotificationsFromAPI();
    }
  }, [isOpen]);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
  };

  // Handle view stock history
  const handleViewStockHistory = (stockId: number) => {
    navigate(`/stock/${stockId}/history`);
    closeDropdown();
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

  // Format time difference
  const getTimeDifference = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Group notifications by date
  const groupNotificationsByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups = {
      today: [] as Notification[],
      yesterday: [] as Notification[],
      thisWeek: [] as Notification[],
      older: [] as Notification[]
    };

    notifications.forEach(notification => {
      const notifDate = new Date(notification.timestamp);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notifDate.getTime() >= thisWeek.getTime()) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  const notificationGroups = groupNotificationsByDate();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${unreadCount === 0 ? "hidden" : "flex"
            }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <FiBell className="w-5 h-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Stock Activities
            </h5>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium text-white bg-orange-500 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllAsRead}
                  className="p-1 text-gray-500 transition rounded-lg dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Mark all as read"
                >
                  <FiCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="p-1 text-gray-500 transition rounded-lg dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Clear all notifications"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={closeDropdown}
              className="p-1 text-gray-500 transition rounded-lg dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <FiBell className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">No stock activities</p>
              <p className="text-xs text-gray-400">Stock changes will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notificationGroups.today.length > 0 && (
                <div>
                  <h6 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    Today
                  </h6>
                  <div className="space-y-2">
                    {notificationGroups.today.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClear={clearNotification}
                        onMarkAsRead={markAsRead}
                        onViewHistory={handleViewStockHistory}
                        getTimeDifference={getTimeDifference}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </div>
              )}

              {notificationGroups.yesterday.length > 0 && (
                <div>
                  <h6 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    Yesterday
                  </h6>
                  <div className="space-y-2">
                    {notificationGroups.yesterday.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClear={clearNotification}
                        onMarkAsRead={markAsRead}
                        onViewHistory={handleViewStockHistory}
                        getTimeDifference={getTimeDifference}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </div>
              )}

              {notificationGroups.thisWeek.length > 0 && (
                <div>
                  <h6 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    This Week
                  </h6>
                  <div className="space-y-2">
                    {notificationGroups.thisWeek.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClear={clearNotification}
                        onMarkAsRead={markAsRead}
                        onViewHistory={handleViewStockHistory}
                        getTimeDifference={getTimeDifference}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </div>
              )}

              {notificationGroups.older.length > 0 && (
                <div>
                  <h6 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    Older
                  </h6>
                  <div className="space-y-2">
                    {notificationGroups.older.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClear={clearNotification}
                        onMarkAsRead={markAsRead}
                        onViewHistory={handleViewStockHistory}
                        getTimeDifference={getTimeDifference}
                        getActionIcon={getActionIcon}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <Link
            to="/app/notifications"
            className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={closeDropdown}
          >
            View All Notifications
          </Link>
        )}
      </Dropdown>
    </div>
  );
}

// Notification Item Component
interface NotificationItemProps {
  notification: Notification;
  onClear: (id: number) => void;
  onMarkAsRead: (id: number) => void;
  onViewHistory: (stockId: number) => void;
  getTimeDifference: (timestamp: Date) => string;
  getActionIcon: (action: string) => any;
}

function NotificationItem({
  notification,
  onClear,
  onMarkAsRead,
  onViewHistory,
  getTimeDifference,
  getActionIcon
}: NotificationItemProps) {
  const ActionIcon = getActionIcon(notification.action);

  return (
    <div className={`relative flex gap-3 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-white/5 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}>
      {/* User avatar with action icon */}
      <div className="relative flex-shrink-0">
        <div className="relative">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white ${notification.userColor}`}>
            <span className="font-semibold text-sm">{notification.userInitial}</span>
          </div>
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white ${notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
                notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
            } dark:border-gray-900`}>
            <ActionIcon className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      </div>

      {/* Notification content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className={`font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-white/90'}`}>
                {notification.userName}
              </span>
              {' '}{notification.message}
            </p>

            <div className="mt-1">
              <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-white/90'}`}>
                {notification.project}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {notification.category}
              </span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getTimeDifference(notification.timestamp)}
              </span>
              {notification.stockItem && (
                <>
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    {notification.stockItem.stockId}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1">
            {notification.stockItem && (
              <button
                onClick={() => onViewHistory(notification.stockItem!.id)}
                className="p-1 text-blue-400 transition rounded hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                title="View stock history"
              >
                <FiEye className="w-3 h-3" />
              </button>
            )}
            {!notification.read && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="p-1 text-gray-400 transition rounded hover:text-green-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Mark as read"
              >
                <FiCheck className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => onClear(notification.id)}
              className="p-1 text-gray-400 transition rounded hover:text-red-600 hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Clear notification"
            >
              <FiX className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </div>
  );
}