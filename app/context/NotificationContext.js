"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Notification from "../components/Notification";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };

    setNotifications((prev) => [...prev, notification]);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message, duration) => showNotification(message, "success", duration),
    [showNotification]
  );

  const showError = useCallback(
    (message, duration) => showNotification(message, "error", duration),
    [showNotification]
  );

  const showWarning = useCallback(
    (message, duration) => showNotification(message, "warning", duration),
    [showNotification]
  );

  const showInfo = useCallback(
    (message, duration) => showNotification(message, "info", duration),
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeNotification,
      }}
    >
      {children}
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          left: "auto",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          pointerEvents: "none",
          maxWidth: "calc(100vw - 48px)",
        }}
        className="notification-container"
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              pointerEvents: "auto",
            }}
          >
            <Notification
              message={notification.message}
              type={notification.type}
              duration={notification.duration}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

