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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const alertKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let savedCleared: string[] = [];
    try {
      const savedClearedRaw = localStorage.getItem('cleared-notification-ids');
      if (savedClearedRaw) {
        savedCleared = JSON.parse(savedClearedRaw);
        setClearedIds(new Set(savedCleared));
      }
    } catch (error) {
      console.error('Error loading cleared notifications:', error);
    }

    const saved = localStorage.getItem('stock-notifications');
    if (saved) {
      try {
        const parsed: Notification[] = JSON.parse(saved);
        const notificationsWithDates = parsed.map((n) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        const filteredNotifications = notificationsWithDates.filter(n => !savedCleared.includes(n.action));
        setNotifications(filteredNotifications);
        alertKeysRef.current = new Set(filteredNotifications.map(n => n.action).filter(Boolean));
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('stock-notifications', JSON.stringify(notifications));
    alertKeysRef.current = new Set(notifications.map(n => n.action).filter(Boolean));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('cleared-notification-ids', JSON.stringify(Array.from(clearedIds)));
  }, [clearedIds]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  }, []);

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearNotification = (id: number) => {
    const notification = notifications.find(n => n.id === id);
    if (notification?.action) {
      setClearedIds(prev => new Set(prev).add(notification.action));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    const keysToClear = notifications.map(n => n.action).filter(Boolean);
    setClearedIds(prev => new Set([...prev, ...keysToClear]));
    setNotifications([]);
  };

  const pushAlertNotification = useCallback((key: string, notification: Notification) => {
    if (alertKeysRef.current.has(key) || clearedIds.has(key)) {
      return;
    }
    addNotification(notification);
  }, [addNotification, clearedIds]);

  const syncAlerts = useCallback(async () => {
    try {
      const res = await api.get('/stock/alerts');
      const data = res.data || {};
      const now = Date.now();
      const activeAlertKeys = new Set<string>();

      const processAlerts = (alerts: any[], type: string) => {
        (alerts || []).forEach((alert: any) => {
          const key = `${type}_${type === 'SHADE' ? alert.shadeId : alert.stockId}`;
          activeAlertKeys.add(key);

          const message = type === 'LOW_SHADE' ? `${alert.product} (${alert.stockCode}) shade ${alert.shadeName} is low (${alert.quantity} units)`
            : type === 'HIGH_SHADE' ? `${alert.product} shade ${alert.shadeName} is overstocked (${alert.quantity} units)`
            : `${alert.product} is low (${alert.quantity} units remaining)`;

          pushAlertNotification(key, {
            id: now + (alert.shadeId || alert.stockId),
            trackingId: alert.stockId,
            userName: alert.product,
            userInitial: alert.product?.[0] || 'S',
            userColor: type === 'LOW_SHADE' ? '#6F4E37' : type === 'HIGH_SHADE' ? '#D4AF37' : '#B45309',
            message,
            project: alert.stockCode,
            type: "warning",
            timestamp: new Date(),
            read: false,
            category: "inventory",
            action: key,
            stockItem: { id: alert.stockId, stockId: alert.stockCode, product: alert.stock, category: "Stock" }
          });
        });
      };

      processAlerts(data.lowShadeAlerts, 'LOW_SHADE');
      processAlerts(data.highShadeAlerts, 'HIGH_SHADE');
      processAlerts(data.lowStocks, 'LOW_STOCK');

      setClearedIds(prevCleared => {
        const newCleared = new Set<string>();
        for (const key of prevCleared) {
          if (activeAlertKeys.has(key)) {
            newCleared.add(key);
          }
        }
        return newCleared;
      });

    } catch (error) {
      console.error('Failed to sync alerts', error);
    }
  }, [pushAlertNotification, setClearedIds]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    syncAlerts();
    const interval = setInterval(syncAlerts, 60000);
    return () => clearInterval(interval);
  }, [isLoading, syncAlerts]);

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
