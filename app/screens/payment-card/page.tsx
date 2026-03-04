/**
 * 납입카드발행 화면 (w_scm_040_q)
 *
 * 출발처리된 납품이력을 조회하여 납입카드를 발행(인쇄)하는 화면입니다.
 * 모드 분기: N(신규발행) / Y(재발행)
 * 사업장별 양식 분기: saupj='20' → 대진양식, 그 외 → 표준양식
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Toolbar from '@/app/components/Toolbar';
import SearchHeader, { SearchField, getDefaultDateRange } from '@/app/components/SearchHeader';
import DataGrid, { GridColumnDef } from '@/app/components/DataGrid';
import VendorPopup from '@/app/components/VendorPopup';
import PrintPreview, { PrintData } from '@/app/components/PrintPreview';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { TOOLBAR_PRESETS } from '@/app/lib/types';
import type { PaymentCardRow, Vendor } from '@/app/lib/types';
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
  {
    key: 'mode', label: '모드', type: 'select', required: true,
    defaultValue: 'N',
    options: [
      { value: 'N', label: '미발행(신규)' },
      { value: 'Y', label: '발행(재발행)' },
    ],
  },
];

/* ========================================
 * 그리드 컬럼 정의
 * ======================================== */

const GRID_COLUMNS: GridColumnDef<PaymentCardRow>[] = [
  { accessorKey: 'jpno', header: '전표번호', size: 150 },
  { accessorKey: 'nadate', header: '납품일', size: 90 },
  { accessorKey: 'baljpno', header: '발주번호', size: 130 },
  { accessorKey: 'balseq', header: '순번', size: 50, align: 'center' },
  { accessorKey: 'itnbr', header: '품번', size: 120 },
  { accessorKey: 'itdsc', header: '품명', size: 180 },
  { accessorKey: 'ispec', header: '규격', size: 100 },
  { accessorKey: 'unmsr', header: '단위', size: 50 },
  {
    accessorKey: 'naqty', header: '납품수량', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'unprc', header: '단가', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'balqty', header: '발주수량', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  {
    accessorKey: 'jjanru', header: '잔량', size: 80, align: 'right',
    formatter: (v) => formatNumber(v as number),
  },
  { accessorKey: 'print_txt', header: '출력상태', size: 70, align: 'center' },
  { accessorKey: 'prt_jpno', header: '출력번호', size: 130 },
  { accessorKey: 'prt_cnt', header: '출력횟수', size: 70, align: 'center' },
  { accessorKey: 'qcgub', header: 'QC구분', size: 80 },
  { accessorKey: 'lotno', header: 'LOT번호', size: 120 },
  { accessorKey: 'ipsaupj', header: '사업장', size: 60 },
];

/* ========================================
 * 컴포넌트 본체
 * ======================================== */

export default function PaymentCardPage() {
  /* 상태 관리 */
  const [data, setData] = useState<PaymentCardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [vendorPopupOpen, setVendorPopupOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [externalValues, setExternalValues] = useState<Record<string, string>>({});
  /* 미리보기 상태 */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PrintData | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<'standard' | 'daejin'>('standard');

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
      const res = await fetch('/api/payment-card/search', {
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
   * 출력(확정) 처리
   * ======================================== */

  const handlePrint = useCallback(async () => {
    /* 체크된 행 필터링 */
    const checkedRows = data.filter((row) => row.is_chek === 1);

    if (checkedRows.length === 0) {
      showToast('출력할 항목을 선택하세요.', 'warning');
      return;
    }

    const mode = searchParams.mode || 'N';

    if (mode === 'N') {
      /* 신규발행: 동일 품번 중복 체크 */
      const itnbrSet = new Set<string>();
      for (const row of checkedRows) {
        if (itnbrSet.has(row.itnbr)) {
          showToast(`같은 납입카드는 한번만 발행 가능합니다. (품번: ${row.itnbr})`, 'error');
          return;
        }
        itnbrSet.add(row.itnbr);
      }
    } else {
      /* 재발행: 같은 PRT_JPNO만 허용 */
      const prtJpnos = new Set(checkedRows.map((r) => r.prt_jpno));
      if (prtJpnos.size > 1) {
        showToast('재발행은 1건의 발행건만 선택 가능합니다.', 'error');
        return;
      }
    }

    /* 출력 확인 다이얼로그 */
    setConfirmDialog({
      open: true,
      title: mode === 'N' ? '신규발행 확인' : '재발행 확인',
      message: `${checkedRows.length}건을 ${mode === 'N' ? '신규발행' : '재발행'}하시겠습니까?`,
      onConfirm: () => executePrint(checkedRows, mode),
    });
  }, [data, searchParams, showToast]);

  /** 실제 출력 실행 */
  const executePrint = async (checkedRows: PaymentCardRow[], mode: string) => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setPrinting(true);

    try {
      const requestBody = {
        mode,
        saupj: searchParams.saupj || '%',
        jpnos: checkedRows.map((r) => r.jpno),
        prt_jpno: mode === 'Y' ? checkedRows[0]?.prt_jpno : undefined,
      };

      const res = await fetch('/api/payment-card/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const json = await res.json();

      if (json.success) {
        showToast(json.message, 'success');

        /* 출력 성공 후 미리보기 호출 */
        const prtJpno = json.data?.prt_jpno;
        if (prtJpno) {
          try {
            const previewRes = await fetch('/api/common/print-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prt_jpno: prtJpno, saupj: searchParams.saupj }),
            });
            const previewJson = await previewRes.json();
            if (previewJson.success) {
              setPreviewData(previewJson.data);
              setPreviewTemplate(previewJson.template === 'daejin' ? 'daejin' : 'standard');
              setPreviewOpen(true);
            }
          } catch {
            /* 미리보기 실패해도 출력 자체는 성공 */
          }
        }

        /* 출력 후 재조회 */
        if (searchParams.cvcod) {
          handleSearch(searchParams);
        }
      } else {
        showToast(`출력 실패: ${json.error}`, 'error');
      }
    } catch {
      showToast('출력 중 오류가 발생했습니다.', 'error');
    } finally {
      setPrinting(false);
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
   * 데이터 변경 처리 (체크박스)
   * ======================================== */

  const handleDataChange = useCallback((newData: PaymentCardRow[]) => {
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
        <span>납입카드발행</span>
      </div>

      <div className="p-4 space-y-3">
        {/* 툴바 */}
        <Toolbar
          title="납입카드발행 (w_scm_040_q)"
          config={TOOLBAR_PRESETS.paymentCard}
          onSearch={() => handleSearch(searchParams)}
          onPrint={handlePrint}
          onConfirm={handlePrint}
          loading={loading || printing}
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
        <DataGrid<PaymentCardRow>
          data={data}
          columns={GRID_COLUMNS}
          showCheckbox={true}
          checkField="is_chek"
          checkedValue={1 as unknown as string}
          uncheckedValue={0 as unknown as string}
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

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />

      {/* 납입카드 미리보기 */}
      <PrintPreview
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
        template={previewTemplate}
      />
    </div>
  );
}
