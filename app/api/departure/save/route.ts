/**
 * 출발처리 저장 API
 *
 * POST /api/departure/save
 * 트랜잭션으로 납품이력(POBLKT_HIST)을 생성하고
 * POBLKT의 납품수량(VNDINQTY)을 갱신합니다.
 * 명세서 3.3 저장 트랜잭션 기반 (POC 간소화 버전).
 */
import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { withTransaction } from '@/app/lib/db';
import { departureSaveSchema } from '@/app/lib/validators';
import { getToday, getTimeNow, formatSeq } from '@/app/lib/formatters';

export async function POST(request: NextRequest) {
  try {
    /* 요청 본문 파싱 및 유효성 검증 */
    const body = await request.json();
    const params = departureSaveSchema.parse(body);

    /* 사용자 ID (실제 운영에서는 세션에서 가져옴) */
    const userId = 'WEB_USER';
    const today = getToday();
    const totime = getTimeNow();

    /**
     * 트랜잭션 처리
     * withTransaction 내부에서 성공 시 COMMIT, 실패 시 자동 ROLLBACK
     */
    const result = await withTransaction(async (conn) => {
      /* ============================================
       * Step 1: 전표번호 채번 (FUN_JUNPYO 호출)
       * ============================================ */
      const junpyoResult = await conn.execute(
        `BEGIN :result := FUN_JUNPYO(:pgmid, :iogbn, :iodate); END;`,
        {
          pgmid: { val: 'w_scm_030_q', dir: oracledb.BIND_IN },
          iogbn: { val: '', dir: oracledb.BIND_IN },
          iodate: { val: params.iodate, dir: oracledb.BIND_IN },
          result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
        }
      );

      /* 채번된 전표번호 (napjpno) */
      const napjpno = (junpyoResult.outBinds as Record<string, string>).result;
      if (!napjpno) {
        throw new Error('전표번호 채번 실패');
      }

      /* ============================================
       * Step 2: POBLKT_HIST INSERT (각 체크된 행)
       * ============================================ */
      for (let i = 0; i < params.rows.length; i++) {
        const row = params.rows[i];
        /* jpno = 전표번호 + 행순번 3자리 (예: JPNO001, JPNO002) */
        const jpno = napjpno + formatSeq(i + 1);

        /* KCP수량 기본값: 0 이하이면 1로 설정 */
        const kcpQty = row.kcp_qty > 0 ? row.kcp_qty : 1;
        /* BOX수량 기본값: 0 이하이면 출발수량으로 설정 */
        const boxQty = row.box_qty > 0 ? row.box_qty : row.young;

        /* 생성일시 (YYYYMMDD HHMMSS 형식) */
        const crtDt = `${today} ${totime}`;

        /**
         * POBLKT_HIST INSERT
         * PRINT_YN='N' → 납입카드발행에서 출력 시 'Y'로 변경
         * STATUS 미설정 → 출발취소에서 조회 가능
         */
        await conn.execute(
          `INSERT INTO POBLKT_HIST (
            JPNO, CVCOD, BALJPNO, BALSEQ, ITNBR,
            NAQTY, NADATE,
            RCQTY, BFAQTY, BPEQTY, BTEQTY, BJOQTY,
            CRT_DT, CRT_ID,
            PRINT_YN, PSPEC, IPSAUPJ,
            LOTNO, DEPOT_NO, KCP_QTY, BOX_QTY, BOXSIZE
          ) VALUES (
            :jpno, :cvcod, :baljpno, :balseq, :itnbr,
            :naqty, :nadate,
            0, 0, 0, 0, 0,
            :crt_dt, :crt_id,
            'N', :pspec, :ipsaupj,
            :lotno, :depot_no, :kcp_qty, :box_qty, :boxsize
          )`,
          {
            jpno,
            cvcod: row.cvcod,
            baljpno: row.baljpno,
            balseq: row.balseq,
            itnbr: row.itnbr,
            naqty: row.young,
            nadate: params.iodate,
            crt_dt: crtDt,
            crt_id: userId,
            pspec: row.pspec || '',
            ipsaupj: row.saupj,
            lotno: row.lotno || '',
            depot_no: row.ipdpt || '',
            kcp_qty: kcpQty,
            box_qty: boxQty,
            boxsize: row.boxsize || '',
          }
        );

        /* ============================================
         * Step 3: POBLKT 납품수량(VNDINQTY) 누적 갱신
         * 잔량이 줄어들어 재조회 시 반영됨
         * ============================================ */
        await conn.execute(
          `UPDATE POBLKT
           SET VNDINQTY = NVL(VNDINQTY, 0) + :naqty,
               UPD_USER = :upd_user,
               UPD_DATE = :upd_date,
               UPD_TIME = :upd_time
           WHERE BALJPNO = :baljpno AND BALSEQ = :balseq`,
          {
            naqty: row.young,
            upd_user: userId,
            upd_date: today,
            upd_time: totime,
            baljpno: row.baljpno,
            balseq: row.balseq,
          }
        );
      }

      /* COMMIT은 withTransaction에서 자동 처리 */
      return { napjpno, rowCount: params.rows.length };
    });

    return NextResponse.json({
      success: true,
      message: `저장 완료 (전표번호: ${result.napjpno}, ${result.rowCount}건)`,
      data: {
        napjpno: result.napjpno,
        rowCount: result.rowCount,
      },
    });
  } catch (error) {
    /* 트랜잭션 실패 시 withTransaction에서 자동 ROLLBACK */
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /departure/save] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
