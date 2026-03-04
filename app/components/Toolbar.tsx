/**
 * 공통 툴바 컴포넌트
 *
 * 화면 상단에 표시되는 버튼 바입니다.
 * PB의 f_set_event_activate 함수처럼 화면별로 버튼 활성화를 제어합니다.
 */
'use client';

import { ToolbarConfig } from '@/app/lib/types';

interface ToolbarProps {
  /** 화면 제목 */
  title: string;
  /** 버튼 활성화 설정 */
  config: ToolbarConfig;
  /** 조회 버튼 클릭 */
  onSearch?: () => void;
  /** 저장 버튼 클릭 */
  onSave?: () => void;
  /** 삭제 버튼 클릭 */
  onDelete?: () => void;
  /** 출력 버튼 클릭 */
  onPrint?: () => void;
  /** 엑셀 버튼 클릭 */
  onExcel?: () => void;
  /** 확정 버튼 클릭 */
  onConfirm?: () => void;
  /** 첨부파일 버튼 클릭 */
  onAttach?: () => void;
  /** 로딩 상태 */
  loading?: boolean;
}

/** 툴바 버튼 정의 */
interface ToolbarButton {
  key: keyof ToolbarConfig;
  label: string;
  color: string;       /* 배경색 클래스 */
  hoverColor: string;  /* 호버 배경색 클래스 */
}

/** 버튼 목록 정의 */
const BUTTONS: ToolbarButton[] = [
  { key: 'search',  label: '조회',   color: 'bg-blue-600',   hoverColor: 'hover:bg-blue-700' },
  { key: 'save',    label: '저장',   color: 'bg-green-600',  hoverColor: 'hover:bg-green-700' },
  { key: 'delete',  label: '삭제',   color: 'bg-red-600',    hoverColor: 'hover:bg-red-700' },
  { key: 'print',   label: '출력',   color: 'bg-purple-600', hoverColor: 'hover:bg-purple-700' },
  { key: 'excel',   label: '엑셀',   color: 'bg-emerald-600', hoverColor: 'hover:bg-emerald-700' },
  { key: 'confirm', label: '확정',   color: 'bg-orange-600', hoverColor: 'hover:bg-orange-700' },
  { key: 'attach',  label: '첨부',   color: 'bg-gray-600',   hoverColor: 'hover:bg-gray-700' },
];

export default function Toolbar({
  title,
  config,
  onSearch,
  onSave,
  onDelete,
  onPrint,
  onExcel,
  onConfirm,
  onAttach,
  loading = false,
}: ToolbarProps) {
  /** 버튼 키 → 핸들러 매핑 */
  const handlers: Record<string, (() => void) | undefined> = {
    search: onSearch,
    save: onSave,
    delete: onDelete,
    print: onPrint,
    excel: onExcel,
    confirm: onConfirm,
    attach: onAttach,
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white rounded-t-lg">
      {/* 화면 제목 */}
      <h2 className="text-lg font-semibold">{title}</h2>

      {/* 버튼 영역 */}
      <div className="flex gap-1">
        {BUTTONS.map((btn) => {
          /* 비활성화된 버튼은 표시하지 않음 */
          if (!config[btn.key]) return null;

          const handler = handlers[btn.key];
          return (
            <button
              key={btn.key}
              onClick={handler}
              disabled={loading}
              className={`px-3 py-1.5 text-sm rounded text-white
                ${btn.color} ${btn.hoverColor}
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors`}
            >
              {/* 로딩 중 조회 버튼에 스피너 표시 */}
              {loading && btn.key === 'search' ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin">⟳</span> 조회중...
                </span>
              ) : (
                btn.label
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
