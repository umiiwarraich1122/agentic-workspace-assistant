import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

interface Reminder {
  title: string;
  message: string;
}

interface NotificationContextType {
  reminderPopup: Reminder | null;
  clearReminder: () => void;
  requestNotificationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reminderPopup, setReminderPopup] = useState<Reminder | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Request browser notification permissions
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  useEffect(() => {
    if (!user?.userId) return;

    // Optional: Try to request permissions silently on mount if possible,
    // though browsers prefer this to be triggered by a user action.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/notifications/stream?x_user_id=${user.userId}`;
      const evtSource = new EventSource(url);
      eventSourceRef.current = evtSource;

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reminder') {
            const reminder = { message: data.message, title: data.title };
            
            // 1. Set the in-app popup state
            setReminderPopup(reminder);

            // 2. Trigger native OS push notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(data.title, {
                body: data.message,
                icon: '/vite.svg', // Provide a path to a Jarvis icon if available
                requireInteraction: true // Keep it on screen until the user dismisses it
              });
            }

            // Optional: Play a sound
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.warn('Could not play notification sound:', e));
            } catch (e) {
              console.warn(e);
            }
          }
        } catch (error) {
          console.error("Error parsing SSE data", error);
        }
      };

      evtSource.onerror = () => {
        console.error("EventSource failed. Reconnecting in 5s...");
        evtSource.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user]);

  const clearReminder = () => setReminderPopup(null);

  return (
    <NotificationContext.Provider value={{ reminderPopup, clearReminder, requestNotificationPermission }}>
      {children}
    </NotificationContext.Provider>
  );
};
