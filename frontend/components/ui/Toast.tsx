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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-error-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "info":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-[#ECFDF5] border-green-200 text-[#0F9B6C]";
      case "error":
        return "bg-error-50 border-error-200 text-error-700";
      case "warning":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "info":
        return "bg-blue-50 border-blue-200 text-info-ink";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-20 end-4 z-[1070] flex max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            // Selecteur generique par type, plutot qu'un identifiant par flux :
            // le toast est le seul retour visible de plusieurs actions, et une
            // liste de testids specifiques deriverait a chaque nouvelle action.
            data-testid={`toast-${toast.type}`}
            role="status"
            className={`flex items-center gap-3 rounded-tile border px-4 py-3
              text-[14px] font-medium shadow-card animate-slide-in-r
              ${getStyles(toast.type)}`}
          >
            {getIcon(toast.type)}
            <p className="text-[14px] font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="ms-2 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/5"
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
