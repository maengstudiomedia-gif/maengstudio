"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type AlertVariant = "error" | "success" | "info";

type AlertModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  confirmLabel?: string;
  onClose: () => void;
};

const variantStyles: Record<AlertVariant, { icon: React.ReactNode; ring: string; iconBg: string }> = {
  error: {
    icon: <AlertTriangle className="w-7 h-7 text-red-400" />,
    ring: "border-red-500/20",
    iconBg: "bg-red-500/10",
  },
  success: {
    icon: <CheckCircle2 className="w-7 h-7 text-green-400" />,
    ring: "border-green-500/20",
    iconBg: "bg-green-500/10",
  },
  info: {
    icon: <Info className="w-7 h-7 text-amber-400" />,
    ring: "border-amber-500/20",
    iconBg: "bg-amber-500/10",
  },
};

export default function AlertModal({
  isOpen,
  title,
  message,
  variant = "info",
  confirmLabel = "Tutup",
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const tone = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-md bg-[#111] border border-white/10 ${tone.ring} rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200`}>
        <div className={`w-14 h-14 rounded-2xl ${tone.iconBg} flex items-center justify-center`}>{tone.icon}</div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-white/65 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
