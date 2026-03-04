/**
 * 투입한 샘플 데이터 직접 조회 디버그용
 */
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    /* 1. POMAST 확인 */
    const pomast = await query<Record<string, unknown>>(`
      SELECT BALJPNO, CVCOD, BALDATE FROM POMAST
      WHERE BALJPNO LIKE 'TST%'
    `);

    /* 2. POBLKT 확인 */
    const poblkt = await query<Record<string, unknown>>(`
      SELECT BALJPNO, BALSEQ, ITNBR, BALQTY, NADAT, BALSTS, SAUPJ, IPDPT, VNDINQTY, BLQTY, WBALQTY
      FROM POBLKT
      WHERE BALJPNO LIKE 'TST%'
    `);

    /* 3. ITEMAS 조인 확인 */
    const join = await query<Record<string, unknown>>(`
      SELECT A.BALJPNO, A.ITNBR, B.ITDSC, A.NADAT, A.BALSTS, A.SAUPJ, A.IPDPT
      FROM POBLKT A
        INNER JOIN ITEMAS B ON A.ITNBR = B.ITNBR
      WHERE A.BALJPNO LIKE 'TST%'
    `);

    /* 4. POMAST 조인까지 */
    const joinPomast = await query<Record<string, unknown>>(`
      SELECT A.BALJPNO, A.ITNBR, C.CVCOD, A.NADAT, A.BALSTS, A.SAUPJ
      FROM POBLKT A
        INNER JOIN POMAST C ON A.BALJPNO = C.BALJPNO
      WHERE A.BALJPNO LIKE 'TST%'
    `);

    /* 5. VNDMST 조인까지 (IPDPT) */
    const joinVndmst = await query<Record<string, unknown>>(`
      SELECT A.BALJPNO, A.ITNBR, A.IPDPT, D.CVNAS
      FROM POBLKT A
        INNER JOIN VNDMST D ON A.IPDPT = D.CVCOD
      WHERE A.BALJPNO LIKE 'TST%'
    `);

    return NextResponse.json({
      success: true,
      pomast,
      poblkt,
      itemasJoin: join,
      pomastJoin: joinPomast,
      vndmstJoin: joinVndmst,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
