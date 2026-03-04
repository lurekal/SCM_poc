/**
 * 출발처리 유효성 검증 API
 *
 * POST /api/departure/validate
 * 저장 전 서버 측에서 데이터 무결성을 검증합니다.
 * 명세서 3.5 유효성 검증 로직 기반.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { isWithinDateRange, validateDecimal } from '@/app/lib/formatters';
import type { DepartureSaveRow } from '@/app/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { iodate, rows } = body as { iodate: string; rows: DepartureSaveRow[] };
    const errors: string[] = [];

    /* 1. 출발일자 범위 검증: 오늘 ±30일 */
    if (!isWithinDateRange(iodate, 30)) {
      errors.push('출발일자는 오늘 기준 ±30일 범위만 허용됩니다.');
    }

    /* 2. 행별 검증 */
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `[${i + 1}행 ${row.itnbr}]`;

      /* 2-1. 출발수량 > 0 필수 */
      if (!row.young || row.young <= 0) {
        errors.push(`${rowLabel} 출발수량은 0보다 커야 합니다.`);
        continue;
      }

      /* 2-2. 소수점 검증: Z 품번은 소수 1자리, 나머지는 정수 */
      if (!validateDecimal(row.itnbr, row.young)) {
        if (row.itnbr.startsWith('Z')) {
          errors.push(`${rowLabel} 출발수량은 소수 1자리까지만 허용됩니다.`);
        } else {
          errors.push(`${rowLabel} 출발수량은 정수만 허용됩니다.`);
        }
      }

      /* 2-3. BOX수량 > 출발수량 체크 */
      if (row.box_qty > row.young) {
        errors.push(`${rowLabel} BOX수량(${row.box_qty})이 출발수량(${row.young})을 초과합니다.`);
      }

      /* 2-4. POBLKT에서 발주 상태 및 잔량 실시간 확인 */
      const poblktCheck = await query<{
        BALSTS: string;
        BALQTY: number;
        VNDINQTY: number;
        ITNBR: string;
      }>(
        `SELECT BALSTS, BALQTY, NVL(VNDINQTY,0) AS VNDINQTY, ITNBR
         FROM POBLKT
         WHERE BALJPNO = :baljpno AND BALSEQ = :balseq`,
        { baljpno: row.baljpno, balseq: row.balseq }
      );

      if (poblktCheck.length === 0) {
        errors.push(`${rowLabel} 해당 발주 정보를 찾을 수 없습니다.`);
        continue;
      }

      const poblkt = poblktCheck[0];

      /* 2-5. 발주상태 확인 (balsts = '1': 확정된 발주만) */
      if (poblkt.BALSTS !== '1') {
        errors.push(`${rowLabel} 확정된 발주가 아닙니다 (상태: ${poblkt.BALSTS}).`);
      }

      /* 2-6. 품번 변경 여부 확인 */
      if (poblkt.ITNBR !== row.itnbr) {
        errors.push(`${rowLabel} 품번이 변경되었습니다. 재조회 후 다시 시도하세요.`);
      }

      /* 2-7. 잔량 초과 체크 */
      const janru = poblkt.BALQTY - poblkt.VNDINQTY;
      if (row.young > janru) {
        errors.push(`${rowLabel} 출발수량(${row.young})이 잔량(${janru})을 초과합니다.`);
      }
    }

    /* 3. 동일 발주번호+순번의 출발수량 합계 체크 */
    const groupMap = new Map<string, number>();
    for (const row of rows) {
      const key = `${row.baljpno}_${row.balseq}`;
      groupMap.set(key, (groupMap.get(key) || 0) + row.young);
    }

    for (const [key, totalYoung] of groupMap) {
      const [baljpno, balseqStr] = key.split('_');
      const janruResult = await query<{ JANRU: number }>(
        `SELECT (BALQTY - NVL(VNDINQTY,0)) AS JANRU
         FROM POBLKT WHERE BALJPNO = :baljpno AND BALSEQ = :balseq`,
        { baljpno, balseq: Number(balseqStr) }
      );

      if (janruResult.length > 0 && totalYoung > janruResult[0].JANRU) {
        errors.push(
          `발주 ${baljpno}-${balseqStr}: 출발수량 합계(${totalYoung})가 잔량(${janruResult[0].JANRU})을 초과합니다.`
        );
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '유효성 검증 통과',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /departure/validate] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
