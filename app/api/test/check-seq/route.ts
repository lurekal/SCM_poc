/**
 * ZNEW_POBLKT 시퀀스 상태 확인
 */
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    /* 시퀀스 현재값 확인 */
    const seqInfo = await query<Record<string, unknown>>(`
      SELECT SEQUENCE_NAME, LAST_NUMBER, MIN_VALUE, MAX_VALUE, INCREMENT_BY
      FROM USER_SEQUENCES
      WHERE SEQUENCE_NAME = 'ZNEW_POBLKT_SEQNO'
    `);

    /* ZNEW_POBLKT 테이블의 MAX SEQNO */
    const maxSeq = await query<{ MAX_SEQ: number }>(`
      SELECT MAX(SEQNO) AS MAX_SEQ FROM ZNEW_POBLKT
    `);

    return NextResponse.json({
      success: true,
      sequence: seqInfo[0],
      maxSeqInTable: maxSeq[0]?.MAX_SEQ,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
