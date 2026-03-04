/**
 * 납입카드 출력 미리보기 API
 *
 * POST /api/common/print-preview
 * 납입카드 HTML을 생성하여 반환합니다.
 * 사업장(saupj)에 따라 표준/대진 양식을 분기합니다.
 *
 * 자사(유신정밀) 정보는 VNDMST에 별도 코드로 관리됨:
 *   saupj 10(본사)→10001, 20(당진)→10002, 30(군산)→10003, 40(송도)→10004
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

/** 사업장 → 자사 거래처코드 매핑 */
const SAUPJ_TO_OWN: Record<string, string> = {
  '10': '10001', /* 유신정밀공업(주) 본사 */
  '20': '10002', /* 유신정밀공업(주) 당진 */
  '30': '10003', /* 유신정밀공업(주) 군산 */
  '40': '10004', /* 유신정밀공업(주) 송도 */
};

/** 납입카드 출력 데이터 타입 */
interface PrintData {
  /* 거래처 정보 */
  cvcod: string;
  cvnas: string;
  sano: string;
  ownam: string;
  addr1: string;
  addr2: string;
  /* 자사 정보 (사업장별 유신정밀 정보) */
  jasa_sano: string;
  jasa_cvnas: string;
  jasa_ownam: string;
  jasa_addr1: string;
  jasa_addr2: string;
  /* 전표번호 */
  prt_jpno: string;
  barcode: string;
  /* 상세 내역 */
  items: PrintItem[];
}

/** 납입카드 상세 항목 */
interface PrintItem {
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
  pspnm?: string;    /* 대진 양식 전용: 포장사양명 */
  depot_name: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prt_jpno, saupj } = body as { prt_jpno: string; saupj: string };

    if (!prt_jpno) {
      return NextResponse.json({
        success: false,
        error: '출력전표번호가 필요합니다.',
      }, { status: 400 });
    }

    /**
     * 납입카드 출력 데이터 조회 SQL
     * PB 원본의 d_scm_030_prt / d_scm_030_prt_dj 기반
     *
     * VNDMST에는 JASA_* 컬럼이 없으므로
     * 거래처(B) 정보만 조회하고, 자사 정보는 별도 쿼리로 처리
     */
    const sql = `
      SELECT
        A.CVCOD,
        B.CVNAS, B.SANO, NVL(B.OWNAM,' ') AS OWNAM,
        NVL(B.ADDR1,' ') AS ADDR1, NVL(B.ADDR2,' ') AS ADDR2,
        A.IPSAUPJ,
        A.JPNO,
        SUBSTR(A.JPNO,13,3) AS JPNO_SEQ,
        A.BALJPNO, A.BALSEQ,
        A.ITNBR, C.ITDSC, NVL(C.ISPEC,' ') AS ISPEC, C.UNMSR,
        A.NAQTY, A.NADATE, NVL(A.LOTNO,' ') AS LOTNO,
        NVL(E.UNPRC,0) AS UNPRC,
        A.NAQTY * NVL(E.UNPRC,0) AS UNAMT,
        NVL(A.BOX_QTY,0) AS BOX_QTY,
        NVL(A.KCP_QTY,0) AS KCP_QTY,
        NVL(A.BOXSIZE,' ') AS BOXSIZE,
        A.PRT_JPNO,
        '*' || TRIM(SUBSTR(A.PRT_JPNO,1,12)) || '*' AS BARCODE,
        FUN_GET_CVNAS(A.PSPEC) AS PSPNM,
        FUN_GET_CVNAS(A.DEPOT_NO) AS DEPOT_NAME
      FROM POBLKT_HIST A, VNDMST B, ITEMAS C, POBLKT E
      WHERE A.PRT_JPNO = :prt_jpno
        AND A.CVCOD = B.CVCOD
        AND A.ITNBR = C.ITNBR
        AND A.BALJPNO = E.BALJPNO AND A.BALSEQ = E.BALSEQ
      ORDER BY A.JPNO
    `;

    const rows = await query<Record<string, unknown>>(sql, { prt_jpno });

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '출력할 데이터가 없습니다.',
      }, { status: 404 });
    }

    /**
     * 자사(유신정밀) 정보 조회
     * POBLKT_HIST.IPSAUPJ 또는 파라미터 saupj로 자사코드를 결정
     */
    const histSaupj = String(rows[0].IPSAUPJ || saupj || '10');
    const ownCvcod = SAUPJ_TO_OWN[histSaupj] || '10001';

    const ownRows = await query<Record<string, unknown>>(
      `SELECT CVNAS, SANO, NVL(OWNAM,' ') AS OWNAM,
              NVL(ADDR1,' ') AS ADDR1, NVL(ADDR2,' ') AS ADDR2
       FROM VNDMST WHERE CVCOD = :cvcod`,
      { cvcod: ownCvcod }
    );

    /* 자사 정보 기본값 */
    const ownInfo = ownRows[0] || {};

    /* 첫 번째 행에서 공통 정보 추출 */
    const first = rows[0];
    const printData: PrintData = {
      cvcod: String(first.CVCOD || ''),
      cvnas: String(first.CVNAS || ''),
      sano: String(first.SANO || ''),
      ownam: String(first.OWNAM || ''),
      addr1: String(first.ADDR1 || ''),
      addr2: String(first.ADDR2 || ''),
      /* 자사 정보 (VNDMST에서 별도 조회) */
      jasa_sano: String(ownInfo.SANO || ''),
      jasa_cvnas: String(ownInfo.CVNAS || ''),
      jasa_ownam: String(ownInfo.OWNAM || ''),
      jasa_addr1: String(ownInfo.ADDR1 || ''),
      jasa_addr2: String(ownInfo.ADDR2 || ''),
      prt_jpno,
      barcode: String(first.BARCODE || ''),
      items: rows.map((row) => ({
        jpno: String(row.JPNO || ''),
        jpno_seq: String(row.JPNO_SEQ || ''),
        baljpno: String(row.BALJPNO || ''),
        balseq: Number(row.BALSEQ || 0),
        itnbr: String(row.ITNBR || ''),
        itdsc: String(row.ITDSC || ''),
        ispec: String(row.ISPEC || ''),
        unmsr: String(row.UNMSR || ''),
        naqty: Number(row.NAQTY || 0),
        nadate: String(row.NADATE || ''),
        lotno: String(row.LOTNO || ''),
        unprc: Number(row.UNPRC || 0),
        unamt: Number(row.UNAMT || 0),
        box_qty: Number(row.BOX_QTY || 0),
        kcp_qty: Number(row.KCP_QTY || 0),
        boxsize: String(row.BOXSIZE || ''),
        pspnm: String(row.PSPNM || ''),
        depot_name: String(row.DEPOT_NAME || ''),
      })),
    };

    /* 양식 분기: 사업장 20(당진)이면 대진양식 */
    const isDaejin = histSaupj === '20';

    return NextResponse.json({
      success: true,
      data: printData,
      template: isDaejin ? 'daejin' : 'standard',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /common/print-preview] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
