import React from "react";

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
      return d.toLocaleTimeString("fr-TN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  })();

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] ${isSender ? "order-2" : ""}`}>
        {/* Sender Name */}
        {!isSender && (
          <p className="text-xs font-medium text-neutral-500 mb-1 ml-1">
            {senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isSender
              ? "bg-brand-600 text-white rounded-br-md"
              : "bg-neutral-100 text-neutral-800 rounded-bl-md"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>

        {/* Meta */}
        <div
          className={`flex items-center gap-1.5 mt-1 ${isSender ? "justify-end" : "justify-start"} px-1`}
        >
          <span className="text-[10px] text-neutral-400">{timeLabel}</span>
          {isSender && isRead !== undefined && (
            <span
              className={`text-[10px] ${isRead ? "text-brand-600" : "text-neutral-400"}`}
            >
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
