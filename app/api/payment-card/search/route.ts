/**
 * 납입카드발행 조회 API
 *
 * POST /api/payment-card/search
 * 출발처리된 납품이력(POBLKT_HIST)을 조회합니다.
 * 명세서 4.2 SQL 기반.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { paymentCardSearchSchema } from '@/app/lib/validators';
import type { PaymentCardRow } from '@/app/lib/types';

export async function POST(request: NextRequest) {
  try {
    /* 요청 본문 파싱 및 유효성 검증 */
    const body = await request.json();
    const params = paymentCardSearchSchema.parse(body);

    /* 검색 조건 기본값 처리 */
    const saupjParam = params.saupj || '%';
    const cvcodParam = params.cvcod || '%';

    /**
     * 납입카드발행 조회 SQL (명세서 4.2)
     *
     * POBLKT_HIST(납품이력) + ITEMAS(품목마스터) +
     * POBLKT(발주잔량) + POMAST(발주마스터) 조인
     *
     * 조건: 사업장, 거래처, 납품일 범위, 출력여부(모드)
     */
    /* Oracle 대문자 → 소문자 별칭으로 프론트엔드 타입과 일치 */
    const sql = `
      SELECT A.JPNO AS "jpno", A.CRT_DT AS "crt_dt",
        A.NADATE AS "nadate", A.BALJPNO AS "baljpno", A.BALSEQ AS "balseq",
        A.ITNBR AS "itnbr", B.ITDSC AS "itdsc", B.ISPEC AS "ispec",
        B.UNMSR AS "unmsr", A.NAQTY AS "naqty",
        0 AS "is_chek", A.IPSAUPJ AS "ipsaupj",
        C.UNPRC AS "unprc", C.UNAMT AS "unamt",
        DECODE(A.PRINT_YN, NULL,'N',A.PRINT_YN) AS "print_yn",
        DECODE(A.PRINT_YN,'Y','발행','미발행') AS "print_txt",
        NVL(A.PRT_JPNO,' ') AS "prt_jpno",
        NVL(A.PRT_CNT,0) AS "prt_cnt",
        DECODE(fun_get_qcgub(A.ITNBR,D.CVCOD,B.ITTYP),
          '1','무검사','검사품목') AS "qcgub",
        C.BALQTY AS "balqty",
        C.WBALQTY - Fun_Get_Poinqty(C.BALJPNO,C.BALSEQ) AS "jjanru",
        A.CVCOD AS "cvcod", A.LOTNO AS "lotno"
      FROM POBLKT_HIST A, ITEMAS B, POBLKT C, POMAST D
      WHERE A.IPSAUPJ LIKE :sSaupj
        AND A.CVCOD LIKE :sCvcod
        AND A.NADATE BETWEEN :sSday AND :sEday
        AND A.ITNBR = B.ITNBR
        AND A.BALJPNO = C.BALJPNO AND A.BALSEQ = C.BALSEQ
        AND A.BALJPNO = D.BALJPNO
        AND DECODE(A.PRINT_YN,NULL,'N',A.PRINT_YN) = :sPrint_yn
      ORDER BY A.NADATE DESC, A.JPNO
    `;

    const result = await query<PaymentCardRow>(sql, {
      sSaupj: saupjParam,
      sCvcod: cvcodParam,
      sSday: params.sdate,
      sEday: params.edate,
      sPrint_yn: params.mode,
    });

    return NextResponse.json({
      success: true,
      data: result,
      totalCount: result.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /payment-card/search] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
