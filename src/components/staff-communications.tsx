"use client";

import { useCallback, useEffect, useState } from "react";
import { StaffNotifications } from "./staff-notifications";
import { StaffMessageCenter } from "./staff-message-center";

export function StaffCommunications({ userId }: { userId: string }) {
  const [noticeCount, setNoticeCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const updateNotices = useCallback((count: number) => setNoticeCount(count), []);
  const updateMessages = useCallback((count: number) => setMessageCount(count), []);

  useEffect(() => {
    if (!noticeCount && !messageCount) return;
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    icon.dataset.staffAttentionIcon = "true";
    const image = new window.Image();
    let active = true;
    image.onload = () => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, 64, 64);
      const dot = (x: number, y: number, color: string) => {
        context.beginPath(); context.arc(x, y, 15, 0, Math.PI * 2); context.fillStyle = "#fff"; context.fill();
        context.beginPath(); context.arc(x, y, 12, 0, Math.PI * 2); context.fillStyle = color; context.fill();
      };
      if (noticeCount) dot(49, 15, "#b91c1c");
      if (messageCount) dot(noticeCount ? 15 : 49, 15, "#2563eb");
      icon.href = canvas.toDataURL("image/png");
      document.head.appendChild(icon);
    };
    image.src = "/icon.svg";
    return () => { active = false; icon.remove(); };
  }, [noticeCount, messageCount]);

  return <div className="staff-communications"><StaffNotifications userId={userId} onUnreadChange={updateNotices} /><StaffMessageCenter userId={userId} onUnreadChange={updateMessages} /></div>;
}
