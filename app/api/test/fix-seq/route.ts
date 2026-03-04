/**
 * ZNEW 시퀀스 일괄 보정 API
 *
 * POST /api/test/fix-seq
 * ZNEW_POBLKT, ZNEW_POBLKT_HIST, ZNEW_POMAST 시퀀스를
 * 각 테이블 MAX(SEQNO) + 100 이상으로 전진시킵니다.
 */
import { NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/oracle';

/* 보정 대상 시퀀스 목록 */
const TARGETS = [
  { seq: 'ZNEW_POBLKT_SEQNO', table: 'ZNEW_POBLKT' },
  { seq: 'ZNEW_POBLKT_HIST_SEQNO', table: 'ZNEW_POBLKT_HIST' },
  { seq: 'ZNEW_POMAST_SEQNO', table: 'ZNEW_POMAST' },
];

export async function POST() {
  let conn = null;
  try {
    conn = await getConnection();
    const results: Record<string, unknown>[] = [];

    for (const target of TARGETS) {
      try {
        /* 테이블 MAX SEQNO */
        const maxResult = await conn.execute<[number]>(
          `SELECT NVL(MAX(SEQNO),0) FROM ${target.table}`
        );
        const maxSeq = maxResult.rows?.[0]?.[0] || 0;

        /* 시퀀스 현재값 */
        const curResult = await conn.execute<[number]>(
          `SELECT ${target.seq}.NEXTVAL FROM DUAL`
        );
        const curVal = curResult.rows?.[0]?.[0] || 0;

        if (curVal > maxSeq + 10) {
          results.push({ seq: target.seq, status: 'OK', curVal, maxSeq });
          continue;
        }

        /* 시퀀스 전진 */
        const gap = maxSeq - curVal + 100;
        await conn.execute(`ALTER SEQUENCE ${target.seq} INCREMENT BY ${gap}`);
        const newResult = await conn.execute<[number]>(
          `SELECT ${target.seq}.NEXTVAL FROM DUAL`
        );
        const newVal = newResult.rows?.[0]?.[0] || 0;
        await conn.execute(`ALTER SEQUENCE ${target.seq} INCREMENT BY 1`);

        results.push({ seq: target.seq, status: 'FIXED', before: curVal, after: newVal, maxSeq });
      } catch (e) {
        results.push({
          seq: target.seq,
          status: 'ERROR',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    await conn.close();
    conn = null;

    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (conn) { try { await conn.close(); } catch { /* 무시 */ } }
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
