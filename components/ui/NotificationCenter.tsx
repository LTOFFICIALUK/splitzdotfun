'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  MessageSquare,
  Award,
  Calendar,
  Trash2
} from 'lucide-react';

interface NotificationCenterProps {
  userId: string;
  className?: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export default function NotificationCenter({ userId, className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/notifications?userId=${userId}&limit=50`);
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
      } else {
        setError(result.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      const result = await response.json();

      if (result.success) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();

      if (result.success) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      return;
    }

    try {
      setClearing(true);
      const response = await fetch(`/api/notifications/clear-all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();

      if (result.success) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setError(result.error || 'Failed to clear notifications');
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      setError('Failed to clear notifications');
    } finally {
      setClearing(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        setUnreadCount(prev => {
          const deletedNotif = notifications.find(n => n.id === notificationId);
          return deletedNotif && !deletedNotif.read ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      
      // Set up polling for new notifications
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [userId]);

  // Close notification center when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_bid':
        return <TrendingUp className="w-5 h-5 text-primary-mint" />;
      case 'outbid':
        return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'auction_ended':
      case 'auction_won':
        return <Award className="w-5 h-5 text-primary-aqua" />;
      case 'new_offer':
        return <MessageSquare className="w-5 h-5 text-purple-400" />;
      case 'offer_accepted':
      case 'offer_rejected':
      case 'offer_counter':
        return <MessageSquare className="w-5 h-5 text-primary-mint" />;
      case 'platform_fee_collected':
        return <DollarSign className="w-5 h-5 text-primary-aqua" />;
      case 'token_fee_period_started':
      case 'token_fee_period_completed':
        return <Calendar className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-text-secondary" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'auction_won':
      case 'offer_accepted':
      case 'platform_fee_collected':
        return 'bg-background-elevated border-primary-aqua/20';
      case 'outbid':
      case 'offer_rejected':
        return 'bg-background-elevated border-red-500/20';
      case 'new_bid':
      case 'new_offer':
      case 'offer_counter':
        return 'bg-background-elevated border-primary-mint/20';
      case 'auction_ended':
      case 'token_fee_period_started':
      case 'token_fee_period_completed':
        return 'bg-background-elevated border-purple-400/20';
      default:
        return 'bg-background-elevated border-background-card';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={`relative ${className}`} ref={notificationRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-primary hover:text-primary-mint hover:bg-background-elevated rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-mint focus:ring-offset-2 focus:ring-offset-background-dark"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-background-card rounded-xl shadow-lg border border-background-elevated z-50 max-h-96 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-background-elevated">
            <h3 className="text-lg font-semibold text-text-primary">Notifications</h3>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  disabled={clearing}
                  className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors duration-200"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-mint hover:text-primary-aqua transition-colors duration-200"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-text-secondary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-mint mx-auto"></div>
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-400">
                <p>{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-sm text-primary-mint hover:text-primary-aqua underline transition-colors duration-200"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <Bell className="w-12 h-12 mx-auto mb-2 text-text-muted" />
                <p>No notifications yet</p>
                <p className="text-sm">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-background-elevated">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-background-elevated transition-colors duration-200 ${
                      !notification.read ? 'bg-background-elevated/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-text-primary' : 'text-text-secondary'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-text-secondary mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-text-muted mt-2">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-text-muted hover:text-primary-aqua transition-colors duration-200"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 text-text-muted hover:text-red-400 transition-colors duration-200"
                              title="Delete notification"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-background-elevated bg-background-elevated">
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{unreadCount} unread</span>
                <button
                  onClick={fetchNotifications}
                  className="text-primary-mint hover:text-primary-aqua transition-colors duration-200"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
