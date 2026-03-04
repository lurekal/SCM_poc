/**
 * 출발처리 조회 API
 *
 * POST /api/departure/search
 * 발주잔량(POBLKT)에서 출발 가능한 품목을 조회합니다.
 * 명세서 3.2 SQL 기반.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { departureSearchSchema } from '@/app/lib/validators';
import type { DepartureRow } from '@/app/lib/types';

export async function POST(request: NextRequest) {
  try {
    /* 요청 본문 파싱 및 유효성 검증 */
    const body = await request.json();
    const params = departureSearchSchema.parse(body);

    /* 검색 조건 기본값 처리 ('%'는 전체 검색) */
    const saupjParam = params.saupj || '%';
    const depotParam = params.depot || '%';
    const descParam = params.desc ? `%${params.desc}%` : '%';

    /**
     * 출발처리 조회 SQL (명세서 3.2)
     *
     * POBLKT(발주잔량) + ITEMAS(품목마스터) + POMAST(발주마스터) +
     * VNDMST(거래처) + POBLKT_HIST_BOXSTD(BOX규격) 조인
     *
     * 조건: 납품일(nadat) 범위, 발주상태(balsts)='1',
     *       거래처코드, 사업장, 창고, 품명 필터
     */
    /**
     * ANSI JOIN 문법 사용 (Oracle 11g ORA-01417 회피)
     * - POMAST G 중복 제거
     * - POBLKT_HIST_BOXSTD F를 LEFT JOIN으로 변경
     * - BOX_QTY: FUN_GET_LABELQTY 함수 호출 (없으면 0)
     */
    /* Oracle은 대문자로 컬럼명을 반환하므로 소문자 별칭 사용 */
    const sql = `
      SELECT A.BALJPNO AS "baljpno", A.BALSEQ AS "balseq",
        A.ITNBR AS "itnbr", B.ITDSC AS "itdsc", C.BALDATE AS "baldate",
        A.BALQTY AS "balqty", A.GUDAT AS "gudat", A.NADAT AS "nadat",
        0 AS "young", C.CVCOD AS "cvcod", 'F' AS "checks",
        NVL(B.ISPEC,' ') AS "ispec", A.SAUPJ AS "saupj", A.UNPRC AS "unprc",
        NVL(A.VNDINQTY,0) AS "vndinqty",
        A.IPDPT AS "ipdpt", D.CVNAS AS "depot_nm",
        '' AS "lotno", A.PSPEC AS "pspec", 0 AS "kcp_qty",
        B.ITTYP AS "ittyp",
        NVL(DECODE(B.BALRATE, 0, 100, B.BALRATE), 100) AS "balrate",
        A.BIGO AS "bigo",
        NVL(F.BOX_QTY, 0) AS "box_qty",
        F.BOXSIZE AS "boxsize",
        A.BALQTY - NVL(A.VNDINQTY,0) AS "janru",
        (A.BALQTY - NVL(A.VNDINQTY,0)) *
          (NVL(DECODE(B.BALRATE,0,100,B.BALRATE),100)/100) AS "janrate"
      FROM POBLKT A
        INNER JOIN ITEMAS B ON A.ITNBR = B.ITNBR
        INNER JOIN POMAST C ON A.BALJPNO = C.BALJPNO
        INNER JOIN VNDMST D ON A.IPDPT = D.CVCOD
        LEFT JOIN POBLKT_HIST_BOXSTD F
          ON F.CVCOD = C.CVCOD AND F.ITNBR = A.ITNBR
      WHERE A.NADAT BETWEEN :arg_sdate AND :arg_edate
        AND A.BALSTS = '1'
        AND C.CVCOD = :arg_cvcod
        AND (:arg_saupj = '%' OR A.SAUPJ LIKE :arg_saupj)
        AND (:arg_depot = '%' OR A.IPDPT LIKE :arg_depot)
        AND (:arg_desc = '%' OR
          UPPER(A.ITNBR||B.ITDSC||NVL(B.ISPEC,' ')) LIKE UPPER(:arg_desc))
    `;

    const result = await query<DepartureRow>(sql, {
      arg_sdate: params.sdate,
      arg_edate: params.edate,
      arg_cvcod: params.cvcod,
      arg_saupj: saupjParam,
      arg_depot: depotParam,
      arg_desc: descParam,
    });

    /* 잔량(janru) > 0인 행만 필터링 (화면에 잔량 있는 것만 표시) */
    const filtered = result.filter(
      (row) => (row.janru ?? 0) > 0
    );

    return NextResponse.json({
      success: true,
      data: filtered,
      totalCount: filtered.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /departure/search] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
