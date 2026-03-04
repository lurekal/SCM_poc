/**
 * 출발취소 화면 (w_scm_050_q)
 *
 * 출발처리된 내역을 선택하여 삭제(취소)하는 화면입니다.
 * PRT_JPNO 그룹 연동 체크를 지원합니다.
 * 삭제 전 IMHIST 입고이력 검증을 수행합니다.
 */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Toolbar from '@/app/components/Toolbar';
import SearchHeader, { SearchField, getDefaultDateRange } from '@/app/components/SearchHeader';
import DataGrid, { GridColumnDef } from '@/app/components/DataGrid';
import VendorPopup from '@/app/components/VendorPopup';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { TOOLBAR_PRESETS } from '@/app/lib/types';
import type { CancellationRow, Vendor } from '@/app/lib/types';
import { formatNumber } from '@/app/lib/formatters';

/* ========================================
 * 조회조건 필드 정의
 * ======================================== */

const defaultDates = getDefaultDateRange();

const SEARCH_FIELDS: SearchField[] = [
  { key: 'cvcod', label: '거래처', type: 'vendor', required: true, width: 'w-28' },
  { key: 'cvnas', label: '거래처명', type: 'text', width: 'w-32', placeholder: '자동표시' },
  {
    key: 'saupj', label: '사업장', type: 'select',
    defaultValue: '%',
    options: [
      { value: '%', label: '전체' },
      { value: '10', label: '10-본사' },
      { value: '20', label: '20-당진' },
      { value: '30', label: '30-군산' },
      { value: '40', label: '40-송도' },
    ],
  },
  { key: 'sdate', label: '시작일', type: 'date', required: true, defaultValue: defaultDates.sdate },
  { key: 'edate', label: '종료일', type: 'date', required: true, defaultValue: defaultDates.edate },
  { key: 'desc', label: '품명검색', type: 'text', width: 'w-32', placeholder: 'LIKE 검색' },
];

/* ========================================
 * 그리드 컬럼 정의
 * ======================================== */

const GRID_COLUMNS: GridColumnDef<CancellationRow>[] = [
  { accessorKey: 'chuldat', header: '출발일', size: 90 },
  { accessorKey: 'jpno', header: '전표번호', size: 150 },
  { accessorKey: 'jpno_seq', header: '순번', size: 50, align: 'center' },
  { accessorKey: 'baljpno', header: '발주번호', size: 130 },
  { accessorKey: 'balseq', header: '발주순번', size: 60, align: 'center' },
  { accessorKey: 'itnbr', header: '품번', size: 120 },
  { accessorKey: 'itdsc', header: '품명', size: 180 },
  { accessorKey: 'ispec', header: '규격', size: 100 },
  {
    accessorKey: 'naqty', header: '납품수량', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'unprc', header: '단가', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  { accessorKey: 'pspec', header: '포장사양', size: 80 },
  { accessorKey: 'pspnm', header: '포장명', size: 100 },
  { accessorKey: 'prt_jpno', header: '출력번호', size: 130 },
  { accessorKey: 'lotno', header: 'LOT번호', size: 120 },
  { accessorKey: 'nadate', header: '납품일', size: 90 },
  { accessorKey: 'ittyp', header: '품목유형', size: 70 },
];

/* ========================================
 * 컴포넌트 본체
 * ======================================== */

export default function CancellationPage() {
  /* 상태 관리 */
  const [data, setData] = useState<CancellationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [vendorPopupOpen, setVendorPopupOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [externalValues, setExternalValues] = useState<Record<string, string>>({});

  const { showToast } = useToast();

  /* ========================================
   * 조회 처리
   * ======================================== */

  const handleSearch = useCallback(async (values: Record<string, string>) => {
    if (!values.cvcod) {
      showToast('거래처코드를 입력하세요.', 'warning');
      return;
    }

    setLoading(true);
    setSearchParams(values);

    try {
      const res = await fetch('/api/cancellation/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (json.success) {
        setData(json.data || []);
        showToast(`${json.totalCount}건 조회되었습니다.`, 'success');
      } else {
        showToast(`조회 실패: ${json.error}`, 'error');
        setData([]);
      }
    } catch {
      showToast('조회 중 오류가 발생했습니다.', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* ========================================
   * 삭제 처리
   * ======================================== */

  const handleDelete = useCallback(async () => {
    /* 체크된 행 필터링 */
    const checkedRows = data.filter((row) => row.checks === 'T');

    if (checkedRows.length === 0) {
      showToast('삭제할 항목을 선택하세요.', 'warning');
      return;
    }

    /* 삭제 확인 다이얼로그 */
    setConfirmDialog({
      open: true,
      title: '삭제 확인',
      message: `${checkedRows.length}건을 삭제(출발취소)하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`,
      onConfirm: () => executeDelete(checkedRows),
    });
  }, [data, showToast]);

  /** 실제 삭제 실행 */
  const executeDelete = async (checkedRows: CancellationRow[]) => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setDeleting(true);

    try {
      const requestBody = {
        items: checkedRows.map((row) => ({
          jpno: row.jpno,
          baljpno: row.baljpno,
          balseq: row.balseq,
        })),
      };

      const res = await fetch('/api/cancellation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const json = await res.json();

      if (json.success) {
        showToast(json.message, 'success');
        /* 삭제 후 재조회 */
        if (searchParams.cvcod) {
          handleSearch(searchParams);
        }
      } else {
        showToast(`삭제 실패: ${json.error}`, 'error');
      }
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ========================================
   * 거래처 팝업 처리
   * ======================================== */

  const handleVendorSelect = useCallback((vendor: Vendor) => {
    setExternalValues({
      cvcod: vendor.cvcod,
      cvnas: vendor.cvnas,
    });
  }, []);

  /* ========================================
   * 데이터 변경 처리
   * ======================================== */

  const handleDataChange = useCallback((newData: CancellationRow[]) => {
    setData(newData);
  }, []);

  /* ========================================
   * 렌더링
   * ======================================== */

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 상단 네비게이션 */}
      <div className="bg-gray-700 text-white px-4 py-1 text-sm">
        <Link href="/" className="hover:text-blue-300">홈</Link>
        <span className="mx-2">/</span>
        <span>출발취소</span>
      </div>

      <div className="p-4 space-y-3">
        {/* 툴바 */}
        <Toolbar
          title="출발취소 (w_scm_050_q)"
          config={TOOLBAR_PRESETS.cancellation}
          onSearch={() => handleSearch(searchParams)}
          onDelete={handleDelete}
          loading={loading || deleting}
        />

        {/* 조회조건 영역 */}
        <SearchHeader
          fields={SEARCH_FIELDS}
          onSearch={handleSearch}
          onVendorSearch={() => setVendorPopupOpen(true)}
          externalValues={externalValues}
          loading={loading}
        />

        {/* 데이터 그리드 영역 */}
        {/*
          그룹 체크 모드 (groupCheckField="prt_jpno"):
          같은 PRT_JPNO를 가진 행들이 함께 체크/해제됨
          (PB 원본의 allcheck='F' 모드와 동일)
        */}
        <DataGrid<CancellationRow>
          data={data}
          columns={GRID_COLUMNS}
          showCheckbox={true}
          checkField="checks"
          checkedValue="T"
          uncheckedValue="F"
          onDataChange={handleDataChange}
          height="500px"
          showRowNumber={true}
          groupCheckField="prt_jpno"
        />
      </div>

      {/* 거래처 검색 팝업 */}
      <VendorPopup
        isOpen={vendorPopupOpen}
        onClose={() => setVendorPopupOpen(false)}
        onSelect={handleVendorSelect}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        danger={true}
      />
    </div>
  );
}
