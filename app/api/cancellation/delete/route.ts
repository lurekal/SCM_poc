/**
 * 출발취소 삭제 API
 *
 * POST /api/cancellation/delete
 * 출발처리된 납품이력을 삭제(취소)합니다.
 * 삭제 전 IMHIST 입고이력을 확인하여 입고된 건은 삭제 불가.
 * 명세서 5.3 삭제 처리 로직 기반.
 */
import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { withTransaction } from '@/app/lib/db';
import { cancellationDeleteSchema } from '@/app/lib/validators';

export async function POST(request: NextRequest) {
  try {
    /* 요청 본문 파싱 및 유효성 검증 */
    const body = await request.json();
    const params = cancellationDeleteSchema.parse(body);

    /**
     * 트랜잭션 내에서 삭제 처리
     * 역순으로 처리 (PB 원본의 RowCount to 1, Step -1 방식)
     */
    const result = await withTransaction(async (conn) => {
      let deletedCount = 0;

      /* 역순으로 처리 */
      const reversedItems = [...params.items].reverse();

      for (const item of reversedItems) {
        /* ============================================
         * Step 1: IMHIST 입고이력 체크
         * 입고된 건은 삭제 불가
         * ============================================ */
        const checkResult = await conn.execute(
          `SELECT COUNT(*) AS CNT FROM IMHIST
           WHERE BALJPNO = :baljpno AND BALSEQ = :balseq AND IP_JPNO = :jpno`,
          {
            baljpno: item.baljpno,
            balseq: item.balseq,
            jpno: item.jpno,
          },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        /* 입고이력이 있으면 에러 발생 → 전체 ROLLBACK */
        const rows = checkResult.rows as Array<{ CNT: number }> | undefined;
        if (rows && rows.length > 0 && rows[0].CNT > 0) {
          throw new Error(
            `전표번호 ${item.jpno}: 이미 입고처리된 내역입니다. 삭제할 수 없습니다.`
          );
        }

        /* ============================================
         * Step 2: 삭제 대상의 납품수량(NAQTY) 조회
         * POBLKT.VNDINQTY 차감에 필요
         * ============================================ */
        const histResult = await conn.execute(
          `SELECT NAQTY, BALJPNO, BALSEQ FROM POBLKT_HIST WHERE JPNO = :jpno`,
          { jpno: item.jpno },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const histRows = histResult.rows as Array<{ NAQTY: number; BALJPNO: string; BALSEQ: number }> | undefined;
        const naqty = histRows?.[0]?.NAQTY || 0;

        /* ============================================
         * Step 3: POBLKT 납품수량(VNDINQTY) 차감 → 잔량 복구
         * 출발처리 저장 시 VNDINQTY += naqty 했으므로
         * 취소 시 VNDINQTY -= naqty 로 복원
         * ============================================ */
        if (naqty > 0) {
          await conn.execute(
            `UPDATE POBLKT
             SET VNDINQTY = NVL(VNDINQTY, 0) - :naqty
             WHERE BALJPNO = :baljpno AND BALSEQ = :balseq`,
            {
              naqty,
              baljpno: item.baljpno,
              balseq: item.balseq,
            }
          );
        }

        /* ============================================
         * Step 4: POBLKT_HIST 삭제
         * ============================================ */
        await conn.execute(
          `DELETE FROM POBLKT_HIST WHERE JPNO = :jpno`,
          { jpno: item.jpno }
        );

        deletedCount++;
      }

      /* Step 3: COMMIT은 withTransaction에서 자동 처리 */
      return { deletedCount };
    });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount}건 삭제(취소) 완료`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    /* 트랜잭션 실패 시 자동 ROLLBACK */
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /cancellation/delete] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
