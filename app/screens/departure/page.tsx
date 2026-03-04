/**
 * 출발처리 화면 (w_scm_030_q)
 *
 * 발주잔량(POBLKT)에서 출발할 품목을 선택하고, 출발수량을 입력하여
 * POBLKT_HIST에 납품이력을 생성하는 화면입니다.
 * 3개 화면 중 가장 복잡합니다.
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Toolbar from '@/app/components/Toolbar';
import SearchHeader, { SearchField, getDepartureDefaultDates } from '@/app/components/SearchHeader';
import DataGrid, { GridColumnDef } from '@/app/components/DataGrid';
import VendorPopup from '@/app/components/VendorPopup';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { TOOLBAR_PRESETS } from '@/app/lib/types';
import type { DepartureRow, DepartureSaveRow, Vendor } from '@/app/lib/types';
import { formatNumber } from '@/app/lib/formatters';

/* ========================================
 * 조회조건 필드 정의
 * ======================================== */

const defaultDates = getDepartureDefaultDates();

const SEARCH_FIELDS: SearchField[] = [
  { key: 'cvcod', label: '거래처', type: 'vendor', required: true, width: 'w-28' },
  { key: 'cvnas', label: '거래처명', type: 'text', width: 'w-32', placeholder: '자동표시' },
  {
    key: 'saupj', label: '사업장', type: 'select', required: true,
    defaultValue: '10',
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
  { key: 'iodate', label: '출발일자', type: 'date', required: true, defaultValue: defaultDates.iodate },
  {
    key: 'depot', label: '납품창고', type: 'select',
    defaultValue: '%',
    options: [
      { value: '%', label: '전체' },
    ],
  },
  { key: 'desc', label: '품명검색', type: 'text', width: 'w-32', placeholder: 'LIKE 검색' },
];

/* ========================================
 * 그리드 컬럼 정의
 * ======================================== */

const GRID_COLUMNS: GridColumnDef<DepartureRow>[] = [
  { accessorKey: 'baljpno', header: '발주번호', size: 130 },
  { accessorKey: 'balseq', header: '순번', size: 50, align: 'center' },
  { accessorKey: 'itnbr', header: '품번', size: 120 },
  { accessorKey: 'itdsc', header: '품명', size: 180 },
  { accessorKey: 'ispec', header: '규격', size: 100 },
  {
    accessorKey: 'balqty', header: '발주수량', size: 90, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'vndinqty', header: '기납품수량', size: 90, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'janru', header: '잔량', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'janrate', header: '허용잔량', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'young', header: '출발수량', size: 90, align: 'right',
    editType: 'number', /* 편집 가능 */
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'kcp_qty', header: 'KCP수량', size: 80, align: 'right',
    editType: 'number', /* 편집 가능 */
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'box_qty', header: 'BOX수량', size: 80, align: 'right',
    editType: 'number', /* 편집 가능 */
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'lotno', header: 'LOT번호', size: 120,
    editType: 'text', /* 편집 가능 */
  },
  { accessorKey: 'boxsize', header: 'BOX규격', size: 80 },
  { accessorKey: 'nadat', header: '납품일', size: 90 },
  { accessorKey: 'depot_nm', header: '창고', size: 100 },
  {
    accessorKey: 'unprc', header: '단가', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  { accessorKey: 'bigo', header: '비고', size: 120 },
];

/* ========================================
 * 컴포넌트 본체
 * ======================================== */

export default function DeparturePage() {
  /* 상태 관리 */
  const [data, setData] = useState<DepartureRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [vendorPopupOpen, setVendorPopupOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [externalValues, setExternalValues] = useState<Record<string, string>>({});

  const { showToast } = useToast();

  /* ========================================
   * 조회 처리
   * ======================================== */

  const handleSearch = useCallback(async (values: Record<string, string>) => {
    /* 거래처코드 필수 확인 */
    if (!values.cvcod) {
      showToast('거래처코드를 입력하세요.', 'warning');
      return;
    }

    setLoading(true);
    setSearchParams(values);

    try {
      const res = await fetch('/api/departure/search', {
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
    } catch (error) {
      showToast('조회 중 오류가 발생했습니다.', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* ========================================
   * 저장 처리
   * ======================================== */

  const handleSave = useCallback(async () => {
    /* 체크된 행 필터링 */
    const checkedRows = data.filter((row) => row.checks === 'T');

    if (checkedRows.length === 0) {
      showToast('저장할 항목을 선택하세요.', 'warning');
      return;
    }

    /* 클라이언트 측 기본 검증 */
    const errors: string[] = [];
    for (const row of checkedRows) {
      if (!row.young || row.young <= 0) {
        errors.push(`[${row.itnbr}] 출발수량을 입력하세요.`);
      }
      if (row.young > row.janru) {
        errors.push(`[${row.itnbr}] 출발수량(${row.young})이 잔량(${row.janru})을 초과합니다.`);
      }
      if (row.box_qty > row.young) {
        errors.push(`[${row.itnbr}] BOX수량(${row.box_qty})이 출발수량(${row.young})을 초과합니다.`);
      }
    }

    if (errors.length > 0) {
      showToast(errors.join('\n'), 'error');
      return;
    }

    /* 저장 확인 다이얼로그 */
    setConfirmDialog({
      open: true,
      title: '저장 확인',
      message: `${checkedRows.length}건을 저장하시겠습니까?`,
      onConfirm: () => executeSave(checkedRows),
    });
  }, [data, showToast]);

  /** 실제 저장 실행 */
  const executeSave = async (checkedRows: DepartureRow[]) => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setSaving(true);

    try {
      /* 저장 요청 데이터 구성 */
      const saveRows: DepartureSaveRow[] = checkedRows.map((row) => ({
        baljpno: row.baljpno,
        balseq: row.balseq,
        itnbr: row.itnbr,
        young: row.young,
        lotno: row.lotno || '',
        kcp_qty: row.kcp_qty || 1,
        box_qty: row.box_qty || row.young,
        boxsize: row.boxsize || '',
        pspec: row.pspec || '',
        saupj: row.saupj,
        ipdpt: row.ipdpt,
        cvcod: row.cvcod,
      }));

      /* 서버 측 유효성 검증 */
      const validateRes = await fetch('/api/departure/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iodate: searchParams.iodate,
          rows: saveRows,
        }),
      });

      const validateJson = await validateRes.json();
      if (!validateJson.success) {
        const errorMsg = validateJson.errors?.join('\n') || validateJson.error;
        showToast(`검증 실패:\n${errorMsg}`, 'error');
        setSaving(false);
        return;
      }

      /* 저장 API 호출 */
      const saveRes = await fetch('/api/departure/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iodate: searchParams.iodate,
          cvcod: searchParams.cvcod,
          saupj: searchParams.saupj,
          depot: searchParams.depot,
          rows: saveRows,
        }),
      });

      const saveJson = await saveRes.json();

      if (saveJson.success) {
        showToast(saveJson.message, 'success');
        /* 저장 후 재조회 */
        if (searchParams.cvcod) {
          handleSearch(searchParams);
        }
      } else {
        showToast(`저장 실패: ${saveJson.error}`, 'error');
      }
    } catch (error) {
      showToast('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
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

  /** 그리드 데이터 변경 시 (셀 편집, 체크 변경) */
  const handleDataChange = useCallback((newData: DepartureRow[]) => {
    /* 출발수량 입력 시 자동 체크 (wf_datachk 로직)
       - young > 0으로 변경되면 자동으로 체크 ON
       - 사용자가 수동으로 체크한 것은 해제하지 않음 */
    const processed = newData.map((row) => {
      if (row.young > 0) {
        return { ...row, checks: 'T' as const };
      }
      return row;
    });
    setData(processed);
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
        <span>출발처리</span>
      </div>

      <div className="p-4 space-y-3">
        {/* 툴바 */}
        <Toolbar
          title="출발처리 (w_scm_030_q)"
          config={TOOLBAR_PRESETS.departure}
          onSearch={() => handleSearch(searchParams)}
          onSave={handleSave}
          loading={loading || saving}
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
        <DataGrid<DepartureRow>
          data={data}
          columns={GRID_COLUMNS}
          showCheckbox={true}
          checkField="checks"
          checkedValue="T"
          uncheckedValue="F"
          onDataChange={handleDataChange}
          height="500px"
          showRowNumber={true}
        />
      </div>

      {/* 거래처 검색 팝업 */}
      <VendorPopup
        isOpen={vendorPopupOpen}
        onClose={() => setVendorPopupOpen(false)}
        onSelect={handleVendorSelect}
      />

      {/* 저장 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
