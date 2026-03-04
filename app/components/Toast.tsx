/**
 * Toast 알림 컴포넌트
 *
 * 성공/오류/경고 메시지를 화면 우상단에 일정 시간 동안 표시합니다.
 * PB의 f_message_chk 함수를 대체합니다.
 */
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

/* ========================================
 * 토스트 타입 정의
 * ======================================== */

/** 토스트 메시지 유형 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/** 토스트 메시지 항목 */
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

/** 토스트 컨텍스트 인터페이스 */
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

/* ========================================
 * 토스트 컨텍스트
 * ======================================== */

const ToastContext = createContext<ToastContextType | null>(null);

/** 토스트 컨텍스트 사용 훅 */
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast는 ToastProvider 내부에서만 사용할 수 있습니다');
  }
  return ctx;
}

/* ========================================
 * 유형별 스타일 매핑
 * ======================================== */

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

/* ========================================
 * 토스트 Provider 컴포넌트
 * ======================================== */

/** 토스트 자동 ID 카운터 */
let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** 토스트 메시지 표시 */
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  /** 토스트 제거 */
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 토스트 표시 영역 (우상단 고정) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ========================================
 * 개별 토스트 메시지 컴포넌트
 * ======================================== */

function ToastMessage({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  /* 3초 후 자동 제거 */
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg
        min-w-[300px] max-w-[400px] animate-slide-in
        ${TOAST_STYLES[toast.type]}`}
    >
      {/* 아이콘 */}
      <span className="text-lg font-bold">{TOAST_ICONS[toast.type]}</span>
      {/* 메시지 */}
      <span className="flex-1 text-sm">{toast.message}</span>
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
