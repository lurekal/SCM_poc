/**
 * 납입카드 미리보기 모달 컴포넌트
 *
 * 표준 양식(d_scm_030_prt)과 대진 양식(d_scm_030_prt_dj)을 지원합니다.
 * HTML 기반으로 렌더링하고, 브라우저 인쇄/PDF 저장 기능을 제공합니다.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ========================================
 * 타입 정의
 * ======================================== */

/** 납입카드 출력 데이터 */
export interface PrintData {
  cvcod: string;
  cvnas: string;
  sano: string;
  ownam: string;
  addr1: string;
  addr2: string;
  jasa_sano: string;
  jasa_cvnas: string;
  jasa_ownam: string;
  jasa_addr1: string;
  jasa_addr2: string;
  prt_jpno: string;
  barcode: string;
  items: PrintItem[];
}

/** 납입카드 상세 항목 */
export interface PrintItem {
  jpno: string;
  jpno_seq: string;
  baljpno: string;
  balseq: number;
  itnbr: string;
  itdsc: string;
  ispec: string;
  unmsr: string;
  naqty: number;
  nadate: string;
  lotno: string;
  unprc: number;
  unamt: number;
  box_qty: number;
  kcp_qty: number;
  boxsize: string;
  pspnm?: string;
  depot_name: string;
}

interface PrintPreviewProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 모달 닫기 */
  onClose: () => void;
  /** 출력 데이터 */
  data: PrintData | null;
  /** 양식 종류: 'standard' | 'daejin' */
  template: 'standard' | 'daejin';
}

/* ========================================
 * 숫자 포맷 헬퍼
 * ======================================== */

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

/** 날짜 표시 포맷 (YYYYMMDD → YYYY-MM-DD) */
function fmtDate(d: string): string {
  if (!d || d.length !== 8) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/* ========================================
 * 컴포넌트 본체
 * ======================================== */

export default function PrintPreview({
  isOpen,
  onClose,
  data,
  template,
}: PrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  /* ESC 키로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /** 인쇄 실행 (새 윈도우에서 인쇄 후 자동 닫기) */
  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>납입카드 - ${data?.prt_jpno || ''}</title>
        <style>
          ${PRINT_STYLES}
        </style>
      </head><body>
        ${printRef.current.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            /* 인쇄 대화상자 닫힌 후(완료/취소 모두) 창 자동 닫기 */
            window.onafterprint = function() { window.close(); };
            /* onafterprint 미지원 브라우저 대비: 포커스 복귀 시 닫기 */
            setTimeout(function() { window.close(); }, 1000);
          };
        </script>
      </body></html>
    `);
    printWindow.document.close();
  }, [data]);

  if (!isOpen || !data) return null;

  /* 합계 계산 */
  const totalQty = data.items.reduce((sum, item) => sum + item.naqty, 0);
  const totalAmt = data.items.reduce((sum, item) => sum + item.unamt, 0);

  return (
    /* 백드롭 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[900px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 (버튼 영역) */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-semibold">
            납입카드 미리보기
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({template === 'daejin' ? '대진양식' : '표준양식'})
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              인쇄 / PDF 저장
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div className="flex-1 overflow-auto p-6 bg-gray-200">
          <div
            ref={printRef}
            className="bg-white mx-auto shadow-md"
            style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}
          >
            {/* ============================================
             * 납입카드 본문
             * ============================================ */}

            {/* 제목 */}
            <h1 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
              납 입 카 드
            </h1>

            {/* 바코드 영역 */}
            <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
                {data.barcode}
              </span>
              <br />
              <span style={{ fontSize: '10px', color: '#666' }}>
                {data.prt_jpno}
              </span>
            </div>

            {/* 거래처/자사 정보 테이블 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
              <tbody>
                {/* 거래처 정보 행 */}
                <tr>
                  <td style={headerCellStyle}>업체코드</td>
                  <td style={dataCellStyle}>{data.cvcod}</td>
                  <td style={headerCellStyle}>사업자번호</td>
                  <td style={dataCellStyle}>{data.sano}</td>
                </tr>
                <tr>
                  <td style={headerCellStyle}>상 호</td>
                  <td style={dataCellStyle}>{data.cvnas}</td>
                  <td style={headerCellStyle}>대표자</td>
                  <td style={dataCellStyle}>{data.ownam}</td>
                </tr>
                <tr>
                  <td style={headerCellStyle}>주 소</td>
                  <td colSpan={3} style={dataCellStyle}>{data.addr1} {data.addr2}</td>
                </tr>

                {/* 구분선 */}
                <tr><td colSpan={4} style={{ height: '5px' }}></td></tr>

                {/* 자사 정보 행 */}
                <tr>
                  <td style={headerCellStyle}>사업자번호</td>
                  <td style={dataCellStyle}>{data.jasa_sano}</td>
                  <td style={headerCellStyle}>상 호</td>
                  <td style={dataCellStyle}>{data.jasa_cvnas}</td>
                </tr>
                <tr>
                  <td style={headerCellStyle}>대표자</td>
                  <td style={dataCellStyle}>{data.jasa_ownam}</td>
                  <td style={headerCellStyle}>주 소</td>
                  <td style={dataCellStyle}>{data.jasa_addr1} {data.jasa_addr2}</td>
                </tr>
              </tbody>
            </table>

            {/* 상세 내역 테이블 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={thStyle}>순번</th>
                  <th style={thStyle}>품 번</th>
                  <th style={thStyle}>품 명</th>
                  <th style={thStyle}>규 격</th>
                  <th style={thStyle}>단위</th>
                  <th style={thStyle}>납품수량</th>
                  <th style={thStyle}>단 가</th>
                  <th style={thStyle}>금 액</th>
                  <th style={thStyle}>납품일자</th>
                  <th style={thStyle}>LOT NO</th>
                  <th style={thStyle}>BOX</th>
                  {/* 대진 양식: 포장사양 컬럼 추가 */}
                  {template === 'daejin' && (
                    <th style={thStyle}>고객(포장)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={item.jpno}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '9px' }}>{item.itnbr}</td>
                    <td style={tdStyle}>{item.itdsc}</td>
                    <td style={tdStyle}>{item.ispec}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.unmsr}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.naqty)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.unprc)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.unamt)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtDate(item.nadate)}</td>
                    <td style={tdStyle}>{item.lotno}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.box_qty}</td>
                    {template === 'daejin' && (
                      <td style={tdStyle}>{item.pspnm}</td>
                    )}
                  </tr>
                ))}
              </tbody>

              {/* 합계 행 */}
              <tfoot>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center' }}>합 계</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(totalQty)}</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(totalAmt)}</td>
                  <td colSpan={template === 'daejin' ? 4 : 3} style={tdStyle}></td>
                </tr>
              </tfoot>
            </table>

            {/* 결재 영역 */}
            <table style={{ width: '60%', borderCollapse: 'collapse', marginTop: '20px', marginLeft: 'auto', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={signStyle}>담 당</th>
                  <th style={signStyle}>팀 장</th>
                  <th style={signStyle}>검사자</th>
                  <th style={signStyle}>검 토</th>
                  <th style={signStyle}>등 록</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...signStyle, height: '40px' }}></td>
                  <td style={signStyle}></td>
                  <td style={signStyle}></td>
                  <td style={signStyle}></td>
                  <td style={signStyle}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================
 * 스타일 정의
 * ======================================== */

/** 헤더 셀 스타일 */
const headerCellStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 8px',
  backgroundColor: '#f5f5f5',
  fontWeight: 'bold',
  width: '15%',
  textAlign: 'center',
};

/** 데이터 셀 스타일 */
const dataCellStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 8px',
  width: '35%',
};

/** 테이블 헤더 셀 스타일 */
const thStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 6px',
  textAlign: 'center',
  fontWeight: 'bold',
};

/** 테이블 데이터 셀 스타일 */
const tdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '3px 5px',
};

/** 결재란 셀 스타일 */
const signStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 8px',
  textAlign: 'center',
  width: '20%',
};

/** 인쇄용 CSS */
const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
    margin: 0;
    padding: 0;
  }
  table { border-collapse: collapse; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
