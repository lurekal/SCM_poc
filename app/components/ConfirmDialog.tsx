/**
 * 확인 다이얼로그 컴포넌트
 *
 * Yes/No 확인이 필요한 작업 전에 사용하는 모달 다이얼로그입니다.
 * PB의 MessageBox를 대체합니다.
 */
'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  /** 다이얼로그 표시 여부 */
  isOpen: boolean;
  /** 다이얼로그 제목 */
  title: string;
  /** 다이얼로그 메시지 */
  message: string;
  /** 확인 버튼 텍스트 (기본: '확인') */
  confirmText?: string;
  /** 취소 버튼 텍스트 (기본: '취소') */
  cancelText?: string;
  /** 확인 버튼 클릭 핸들러 */
  onConfirm: () => void;
  /** 취소 버튼 클릭 핸들러 */
  onCancel: () => void;
  /** 확인 버튼 위험 스타일 여부 (삭제 등) */
  danger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  /* 다이얼로그 열릴 때 확인 버튼에 포커스 */
  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  /* ESC 키로 닫기 */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    /* 백드롭 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      {/* 다이얼로그 본체 */}
      <div
        className="bg-white rounded-lg shadow-xl min-w-[350px] max-w-[500px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* 메시지 본문 */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
        </div>

        {/* 버튼 영역 */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md
              text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2
              focus:ring-gray-300"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-md text-white
              focus:outline-none focus:ring-2
              ${danger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
