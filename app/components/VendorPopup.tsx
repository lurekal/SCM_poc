/**
 * 거래처 검색 모달 컴포넌트
 *
 * VNDMST 테이블에서 거래처코드/거래처명으로 검색하여 선택하는 팝업입니다.
 * PB의 w_itemas_vendor_popup을 대체합니다.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Vendor } from '@/app/lib/types';

interface VendorPopupProps {
  /** 팝업 표시 여부 */
  isOpen: boolean;
  /** 팝업 닫기 핸들러 */
  onClose: () => void;
  /** 거래처 선택 완료 핸들러 */
  onSelect: (vendor: Vendor) => void;
}

export default function VendorPopup({
  isOpen,
  onClose,
  onSelect,
}: VendorPopupProps) {
  /* 검색어 */
  const [searchText, setSearchText] = useState('');
  /* 검색 결과 목록 */
  const [vendors, setVendors] = useState<Vendor[]>([]);
  /* 로딩 상태 */
  const [loading, setLoading] = useState(false);
  /* 검색 입력 필드 참조 */
  const inputRef = useRef<HTMLInputElement>(null);

  /** 거래처 검색 API 호출 (검색어 직접 전달) */
  const fetchVendors = useCallback(async (term: string) => {
    /* 검색어 없으면 '%' (전체검색) */
    const q = term.trim() || '%';

    setLoading(true);
    try {
      const res = await fetch(
        `/api/common/vendor-lookup?q=${encodeURIComponent(q)}&limit=50`
      );
      const json = await res.json();

      if (json.success) {
        setVendors(json.data || []);
      } else {
        setVendors([]);
      }
    } catch (error) {
      console.error('[VendorPopup] 검색 오류:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 검색 버튼 클릭 핸들러 */
  const handleSearch = useCallback(() => {
    fetchVendors(searchText);
  }, [searchText, fetchVendors]);

  /* 팝업 열릴 때 초기화, 포커스, 자동 전체 검색 */
  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setVendors([]);
      setTimeout(() => {
        inputRef.current?.focus();
        /* 팝업 열리면 자동으로 전체 목록 조회 */
        fetchVendors('');
      }, 100);
    }
  }, [isOpen, fetchVendors]);

  /* ESC 키로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /** 엔터키로 검색 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /** 거래처 선택 */
  const handleSelect = (vendor: Vendor) => {
    onSelect(vendor);
    onClose();
  };

  if (!isOpen) return null;

  return (
    /* 백드롭 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {/* 팝업 본체 */}
      <div
        className="bg-white rounded-lg shadow-xl w-[500px] max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">거래처 검색</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 검색 영역 */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="거래처코드 또는 거래처명 입력"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  검색중
                </span>
              ) : '검색'}
            </button>
          </div>
        </div>

        {/* 결과 목록 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b w-32">
                  거래처코드
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b">
                  거래처명
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b w-32">
                  사업자번호
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-400">
                    <span className="inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    검색 중...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-400">
                    검색어를 입력하고 검색 버튼을 클릭하세요
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.cvcod}
                    onClick={() => handleSelect(vendor)}
                    className="cursor-pointer hover:bg-blue-50 border-b border-gray-100"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{vendor.cvcod}</td>
                    <td className="px-3 py-2">{vendor.cvnas}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{vendor.sano || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 정보 */}
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500 text-right">
          {vendors.length > 0 && `${vendors.length}건 검색됨`}
        </div>
      </div>
    </div>
  );
}
