import React from "react";
import { getCurrentLocale } from "@/lib/i18n/currentLocale";

/* -------------------------------------------------------------------------- */
/*  MessageBubble — Chat bubble for in-app messaging                          */
/* -------------------------------------------------------------------------- */

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isSender: boolean;
  senderName: string;
  isRead?: boolean;
}

export function MessageBubble({
  content,
  timestamp,
  isSender,
  senderName,
  isRead,
}: MessageBubbleProps) {
  const timeLabel = (() => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString(
        getCurrentLocale() === "ar" ? "ar-TN-u-nu-latn" : "fr-TN",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    } catch {
      return timestamp;
    }
  })();

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] ${isSender ? "order-2" : ""}`}>
        {/* Sender Name */}
        {!isSender && (
          <p className="mb-1 ms-1 text-[11.5px] font-semibold text-ink-500">
            {senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`rounded-tile px-4 py-2.5 ${
            isSender
              ? "rounded-ee-sm bg-blue-700 text-white"
              : "rounded-es-sm bg-neutral-100 text-ink-900"
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.5]">
            {content}
          </p>
        </div>

        {/* Meta */}
        <div
          className={`flex items-center gap-1.5 mt-1 ${isSender ? "justify-end" : "justify-start"} px-1`}
        >
          <span className="text-[11px] font-medium text-ink-300 tabular">
            {timeLabel}
          </span>
          {isSender && isRead !== undefined && (
            <span
              className={`text-[11px] font-semibold ${
                isRead ? "text-green-500" : "text-ink-300"
              }`}
            >
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
