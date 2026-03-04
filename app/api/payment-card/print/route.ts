/**
 * 납입카드 출력 처리 API
 *
 * POST /api/payment-card/print
 * 납입카드 발행/재발행 시 POBLKT_HIST의 출력상태를 업데이트합니다.
 * 명세서 4.3 출력 처리 로직 기반.
 */
import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { withTransaction } from '@/app/lib/db';
import { paymentCardPrintSchema } from '@/app/lib/validators';
import { getToday } from '@/app/lib/formatters';

export async function POST(request: NextRequest) {
  try {
    /* 요청 본문 파싱 및 유효성 검증 */
    const body = await request.json();
    const params = paymentCardPrintSchema.parse(body);

    const today = getToday();

    if (params.mode === 'N') {
      /* ============================================
       * 모드 'N' (신규발행)
       * ============================================ */

      /**
       * 전표번호 채번 (출력용)
       * FUN_JUNPYO를 호출하여 prt_jpno 생성
       */
      const result = await withTransaction(async (conn) => {
        /* 출력용 전표번호 채번 */
        const junpyoResult = await conn.execute(
          `BEGIN :result := FUN_JUNPYO(:pgmid, :iogbn, :iodate); END;`,
          {
            pgmid: { val: 'w_scm_040_q', dir: oracledb.BIND_IN },
            iogbn: { val: '', dir: oracledb.BIND_IN },
            iodate: { val: today, dir: oracledb.BIND_IN },
            result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
          }
        );

        const prtno = (junpyoResult.outBinds as Record<string, string>).result;
        if (!prtno) {
          throw new Error('출력 전표번호 채번 실패');
        }

        /**
         * 각 체크된 행의 출력상태 업데이트
         * print_yn='Y', prt_jpno 설정, prt_date=오늘, prt_cnt=1
         */
        for (const jpno of params.jpnos) {
          await conn.execute(
            `UPDATE POBLKT_HIST
             SET PRINT_YN = 'Y',
                 PRT_JPNO = :prtno,
                 UPD_DT = SYSDATE,
                 PRT_DATE = :prt_date,
                 PRT_CNT = 1
             WHERE JPNO = :jpno`,
            { prtno, prt_date: today, jpno }
          );
        }

        return { prtno, count: params.jpnos.length };
      });

      return NextResponse.json({
        success: true,
        message: `신규발행 완료 (출력번호: ${result.prtno}, ${result.count}건)`,
        data: {
          prt_jpno: result.prtno,
          saupj: params.saupj,
          count: result.count,
        },
      });
    } else {
      /* ============================================
       * 모드 'Y' (재발행)
       * 같은 PRT_JPNO의 출력횟수(PRT_CNT)를 +1 증가
       * ============================================ */
      if (!params.prt_jpno) {
        return NextResponse.json({
          success: false,
          error: '재발행 시 출력전표번호(PRT_JPNO)가 필요합니다.',
        }, { status: 400 });
      }

      const result = await withTransaction(async (conn) => {
        const updateResult = await conn.execute(
          `UPDATE POBLKT_HIST
           SET PRT_CNT = PRT_CNT + 1
           WHERE PRT_JPNO = :prtno`,
          { prtno: params.prt_jpno }
        );

        return { count: updateResult.rowsAffected || 0 };
      });

      return NextResponse.json({
        success: true,
        message: `재발행 완료 (출력번호: ${params.prt_jpno}, ${result.count}건)`,
        data: {
          prt_jpno: params.prt_jpno,
          saupj: params.saupj,
          count: result.count,
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /payment-card/print] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
