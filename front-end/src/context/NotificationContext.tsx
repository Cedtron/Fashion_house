import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/axios';

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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearNotification: (id: number) => void;
  clearAllNotifications: () => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface StockAlertPayload {
  stockId: number;
  stockCode: string;
  product: string;
  quantity: number;
  shadeId?: number;
  shadeName?: string;
}

interface AlertsResponse {
  lowShadeAlerts: StockAlertPayload[];
  highShadeAlerts: StockAlertPayload[];
  lowStocks: StockAlertPayload[];
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const alertKeysRef = useRef<Set<string>>(new Set());

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('stock-notifications');
    if (saved) {
      try {
        const parsed: Notification[] = JSON.parse(saved);
        const notificationsWithDates = parsed.map((n) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
        const keys = parsed
          .map((n) => n.action)
          .filter((action): action is string => Boolean(action));
        alertKeysRef.current = new Set(keys);
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('stock-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  }, []);

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    alertKeysRef.current.clear();
  };

  const pushAlertNotification = (key: string, notification: Notification) => {
    if (alertKeysRef.current.has(key)) {
      return;
    }
    alertKeysRef.current.add(key);
    addNotification(notification);
  };

  const syncAlerts = useCallback(async () => {
    try {
      const res = await api.get('/stock/alerts');
      const data = res.data || {};
      const now = Date.now();

      (data.lowShadeAlerts || []).forEach((alert: any) => {
        const key = `LOW_SHADE_${alert.shadeId}`;
        pushAlertNotification(key, {
          id: now + alert.shadeId,
          trackingId: alert.stockId,
          userName: alert.product,
          userInitial: alert.product?.[0] || 'S',
          userColor: '#6F4E37',
          message: `${alert.product} (${alert.stockCode}) shade ${alert.shadeName} is low (${alert.quantity} units)`,
          project: alert.stockCode,
          type: "warning",
          timestamp: new Date(),
          read: false,
          category: "inventory",
          action: key,
          stockItem: {
            id: alert.stockId,
            stockId: alert.stockCode,
            product: alert.product,
            category: "Fabric"
          }
        });
      });

      (data.highShadeAlerts || []).forEach((alert: any) => {
        const key = `HIGH_SHADE_${alert.shadeId}`;
        pushAlertNotification(key, {
          id: now + alert.shadeId + 1000,
          trackingId: alert.stockId,
          userName: alert.product,
          userInitial: alert.product?.[0] || 'S',
          userColor: '#D4AF37',
          message: `${alert.product} shade ${alert.shadeName} is overstocked (${alert.quantity} units)`,
          project: alert.stockCode,
          type: "info",
          timestamp: new Date(),
          read: false,
          category: "inventory",
          action: key,
          stockItem: {
            id: alert.stockId,
            stockId: alert.stockCode,
            product: alert.product,
            category: "Fabric"
          }
        });
      });

      (data.lowStocks || []).forEach((item: any) => {
        const key = `LOW_STOCK_${item.stockId}`;
        pushAlertNotification(key, {
          id: now + item.stockId + 2000,
          trackingId: item.stockId,
          userName: item.product,
          userInitial: item.product?.[0] || 'S',
          userColor: '#B45309',
          message: `${item.product} is low (${item.quantity} units remaining)`,
          project: item.stockCode,
          type: "warning",
          timestamp: new Date(),
          read: false,
          category: "inventory",
          action: key,
          stockItem: {
            id: item.stockId,
            stockId: item.stockCode,
            product: item.product,
            category: "Stock"
          }
        });
      });
    } catch (error) {
      console.error('Failed to sync alerts', error);
    }
  }, [addNotification]);

  useEffect(() => {
    syncAlerts();
    const interval = setInterval(syncAlerts, 60000);
    return () => clearInterval(interval);
  }, [syncAlerts]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAllNotifications,
      fetchNotifications: syncAlerts
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};