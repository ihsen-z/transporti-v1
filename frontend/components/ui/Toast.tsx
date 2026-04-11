"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-accent-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-error" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-cta-500" />;
      case "info":
        return <AlertCircle className="w-5 h-5 text-brand-600" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-accent-50 border-accent-200 text-accent-800";
      case "error":
        return "bg-error-light border-error text-error-dark";
      case "warning":
        return "bg-cta-50 border-cta-200 text-cta-800";
      case "info":
        return "bg-brand-600/5 border-brand-600/20 text-brand-700";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
                            flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
                            animate-in slide-in-from-right duration-300
                            ${getStyles(toast.type)}
                        `}
          >
            {getIcon(toast.type)}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded transition-colors ml-2"
            >
              <X className="w-4 h-4 opacity-60" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
