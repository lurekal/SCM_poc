/**
 * 출발취소 조회 API
 *
 * POST /api/cancellation/search
 * 출발처리된 납품이력(POBLKT_HIST)을 조회합니다.
 * 취소 가능한 건만 조회합니다 (입고처리 전, STATUS IS NULL OR '1').
 * 명세서 5.2 SQL 기반.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { cancellationSearchSchema } from '@/app/lib/validators';
import type { CancellationRow } from '@/app/lib/types';

export async function POST(request: NextRequest) {
  try {
    /* 요청 본문 파싱 및 유효성 검증 */
    const body = await request.json();
    const params = cancellationSearchSchema.parse(body);

    /* 검색 조건 기본값 처리 */
    const saupjParam = params.saupj || '%';
    const cvcodParam = params.cvcod || '%';
    const descParam = params.desc ? `%${params.desc}%` : '%';

    /**
     * 출발취소 조회 SQL (명세서 5.2)
     *
     * POBLKT_HIST(납품이력) + ITEMAS(품목마스터) + POBLKT(발주잔량) 조인
     *
     * 조건: 거래처, 사업장, 납품일 범위, 품명검색
     *       STATUS IS NULL 또는 '1' (취소 가능 상태)
     *       RCDATE IS NULL (입고일 미설정 = 아직 입고되지 않음)
     */
    /* Oracle 대문자 → 소문자 별칭으로 프론트엔드 타입과 일치 */
    const sql = `
      SELECT A.NADATE AS "chuldat", A.JPNO AS "jpno",
        SUBSTR(A.JPNO,13,3) AS "jpno_seq",
        A.BALJPNO AS "baljpno", A.BALSEQ AS "balseq",
        A.PSPEC AS "pspec",
        FUN_GET_CVNAS(A.PSPEC) AS "pspnm",
        'F' AS "checks", A.ITNBR AS "itnbr", B.ITDSC AS "itdsc",
        NVL(A.NAQTY,0) AS "naqty", NVL(C.UNPRC,0) AS "unprc",
        A.NADATE AS "nadate", B.ISPEC AS "ispec",
        A.PRT_JPNO AS "prt_jpno", C.NADAT AS "nadat",
        C.VNDINQTY AS "vndinqty",
        A.LOTNO AS "lotno", A.QAFILE AS "qafile",
        A.F_GROUPCD AS "f_groupcd", B.ITTYP AS "ittyp"
      FROM POBLKT_HIST A, ITEMAS B, POBLKT C
      WHERE A.ITNBR = B.ITNBR
        AND A.BALJPNO = C.BALJPNO AND A.BALSEQ = C.BALSEQ
        AND A.CVCOD LIKE :sCvcod
        AND A.IPSAUPJ LIKE :sSaupj
        AND A.NADATE BETWEEN :sSday AND :sEday
        AND (A.STATUS IS NULL OR A.STATUS = '1')
        AND A.RCDATE IS NULL
        AND UPPER(A.ITNBR||B.ITDSC||NVL(B.ISPEC,'.')) LIKE UPPER(:sDesc)
      ORDER BY A.NADATE DESC, A.JPNO
    `;

    const result = await query<CancellationRow>(sql, {
      sCvcod: cvcodParam,
      sSaupj: saupjParam,
      sSday: params.sdate,
      sEday: params.edate,
      sDesc: descParam,
    });

    return NextResponse.json({
      success: true,
      data: result,
      totalCount: result.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /cancellation/search] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
