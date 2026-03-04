/**
 * POMAST 관련 트리거/시퀀스 확인
 */
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    /* ZNEW_TRI_POMAST_AFTER 트리거 소스 */
    const triggerSrc = await query<Record<string, unknown>>(`
      SELECT LINE, TEXT
      FROM USER_SOURCE
      WHERE NAME = 'ZNEW_TRI_POMAST_AFTER'
        AND TYPE = 'TRIGGER'
      ORDER BY LINE
    `);

    /* ZNEW_POMAST 시퀀스 확인 */
    const seqInfo = await query<Record<string, unknown>>(`
      SELECT SEQUENCE_NAME, LAST_NUMBER
      FROM USER_SEQUENCES
      WHERE SEQUENCE_NAME LIKE '%POMAST%'
    `);

    /* ZNEW_POMAST 테이블 MAX */
    let maxSeq = null;
    try {
      const maxRow = await query<{ MAX_SEQ: number }>(`
        SELECT NVL(MAX(SEQNO),0) AS MAX_SEQ FROM ZNEW_POMAST
      `);
      maxSeq = maxRow[0]?.MAX_SEQ;
    } catch {
      maxSeq = 'table not found';
    }

    return NextResponse.json({
      success: true,
      triggerSource: triggerSrc,
      sequences: seqInfo,
      maxSeqInTable: maxSeq,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
