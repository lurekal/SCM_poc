/**
 * 조회조건 폼 컴포넌트
 *
 * 화면 상단의 조회조건 입력 영역입니다.
 * 날짜범위, 거래처 팝업검색, 사업장 셀렉트 등 공통 조회조건을 제공합니다.
 * PB의 dw_head (조회조건 DataWindow)를 대체합니다.
 */
'use client';

import { useState, useEffect } from 'react';
import {
  getToday,
  getFirstDayOfMonth,
  addDays,
  formatDateDisplay,
  parseDateInput,
} from '@/app/lib/formatters';

/* ========================================
 * 타입 정의
 * ======================================== */

/** 조회조건 필드 설정 */
export interface SearchField {
  /** 필드 키 (조건 객체의 key) */
  key: string;
  /** 라벨 텍스트 */
  label: string;
  /** 입력 유형 */
  type: 'text' | 'date' | 'select' | 'vendor';
  /** 필수 여부 */
  required?: boolean;
  /** 기본값 */
  defaultValue?: string;
  /** select 유형일 때 옵션 목록 */
  options?: { value: string; label: string }[];
  /** 너비 클래스 (기본: 'w-40') */
  width?: string;
  /** 플레이스홀더 */
  placeholder?: string;
}

/** SearchHeader 속성 */
interface SearchHeaderProps {
  /** 조회조건 필드 목록 */
  fields: SearchField[];
  /** 조회 버튼 클릭 시 콜백 */
  onSearch: (values: Record<string, string>) => void;
  /** 거래처 검색 팝업 열기 콜백 */
  onVendorSearch?: (fieldKey: string) => void;
  /** 외부에서 값 변경 시 (거래처 팝업 선택 등) */
  externalValues?: Record<string, string>;
  /** 로딩 상태 */
  loading?: boolean;
}

/* ========================================
 * 컴포넌트 본체
 * ======================================== */

export default function SearchHeader({
  fields,
  onSearch,
  onVendorSearch,
  externalValues,
  loading = false,
}: SearchHeaderProps) {
  /* 조회조건 값 상태 */
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      initial[field.key] = field.defaultValue || '';
    });
    return initial;
  });

  /* 외부 값 변경 반영 (거래처 팝업 선택 시) */
  useEffect(() => {
    if (externalValues) {
      setValues((prev) => ({ ...prev, ...externalValues }));
    }
  }, [externalValues]);

  /** 개별 필드 값 변경 핸들러 */
  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  /** 조회 실행 (엔터키 또는 조회 버튼) */
  const handleSearch = () => {
    /* 날짜 필드는 YYYYMMDD 형식으로 변환 */
    const searchValues = { ...values };
    fields.forEach((field) => {
      if (field.type === 'date' && searchValues[field.key]) {
        searchValues[field.key] = parseDateInput(searchValues[field.key]);
      }
    });
    onSearch(searchValues);
  };

  /** 엔터키로 조회 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div
      className="bg-gray-50 border border-gray-200 rounded-md p-3"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-wrap gap-3 items-end">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            {/* 라벨 */}
            <label className="text-xs font-medium text-gray-600">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {/* 입력 필드 (유형별 분기) */}
            {field.type === 'date' ? (
              /* 날짜 입력 */
              <input
                type="date"
                value={values[field.key] ? formatDateDisplay(values[field.key]) : ''}
                onChange={(e) => handleChange(field.key, parseDateInput(e.target.value))}
                className={`${field.width || 'w-36'} px-2 py-1.5 text-sm border
                  border-gray-300 rounded focus:outline-none focus:ring-1
                  focus:ring-blue-500 focus:border-blue-500`}
              />
            ) : field.type === 'select' ? (
              /* 드롭다운 셀렉트 */
              <select
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className={`${field.width || 'w-36'} px-2 py-1.5 text-sm border
                  border-gray-300 rounded focus:outline-none focus:ring-1
                  focus:ring-blue-500 focus:border-blue-500 bg-white`}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'vendor' ? (
              /* 거래처 검색 필드 (코드 입력 + 팝업 버튼) */
              <div className="flex gap-1">
                <input
                  type="text"
                  value={values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || '거래처코드'}
                  className={`${field.width || 'w-28'} px-2 py-1.5 text-sm border
                    border-gray-300 rounded-l focus:outline-none focus:ring-1
                    focus:ring-blue-500 focus:border-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => onVendorSearch?.(field.key)}
                  className="px-2 py-1.5 text-sm bg-gray-200 border
                    border-gray-300 rounded-r hover:bg-gray-300
                    focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="거래처 검색"
                >
                  🔍
                </button>
              </div>
            ) : (
              /* 텍스트 입력 */
              <input
                type="text"
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                className={`${field.width || 'w-36'} px-2 py-1.5 text-sm border
                  border-gray-300 rounded focus:outline-none focus:ring-1
                  focus:ring-blue-500 focus:border-blue-500`}
              />
            )}
          </div>
        ))}

        {/* 조회 버튼 */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded
            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500 self-end"
        >
          {loading ? '조회중...' : '조회'}
        </button>
      </div>
    </div>
  );
}

/* ========================================
 * 기본 날짜 값 헬퍼
 * ======================================== */

/**
 * 출발처리 화면의 기본 날짜값을 생성합니다.
 * - sdate: 이번 달 1일
 * - edate: 오늘 + 10일
 * - iodate: 오늘
 */
export function getDepartureDefaultDates() {
  return {
    sdate: getFirstDayOfMonth(),
    edate: addDays(10),
    iodate: getToday(),
  };
}

/**
 * 납입카드/출발취소 화면의 기본 날짜값을 생성합니다.
 * - sdate: 이번 달 1일
 * - edate: 이번 달 마지막날
 */
export function getDefaultDateRange() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    sdate: getFirstDayOfMonth(),
    edate: `${lastDay.getFullYear()}${String(lastDay.getMonth() + 1).padStart(2, '0')}${String(lastDay.getDate()).padStart(2, '0')}`,
  };
}
