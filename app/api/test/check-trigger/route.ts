/**
 * POBLKT 관련 트리거 및 ZNEW_POBLKT 테이블 구조 확인
 */
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    /* 1. POBLKT 테이블의 트리거 목록 */
    const triggers = await query<Record<string, unknown>>(`
      SELECT TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS
      FROM USER_TRIGGERS
      WHERE TABLE_NAME = 'POBLKT'
    `);

    /* 2. ZNEW_TRI_POBLKT_AFTER 트리거 소스 */
    const triggerSrc = await query<Record<string, unknown>>(`
      SELECT TEXT
      FROM USER_SOURCE
      WHERE NAME = 'ZNEW_TRI_POBLKT_AFTER'
        AND TYPE = 'TRIGGER'
      ORDER BY LINE
    `);

    /* 3. ZNEW_POBLKT 테이블 구조 */
    const znewCols = await query<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'ZNEW_POBLKT'
      ORDER BY COLUMN_ID
    `);

    /* 4. ZNEW_POBLKT PK */
    const znewPK = await query<Record<string, unknown>>(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME
      FROM USER_CONS_COLUMNS
      WHERE TABLE_NAME = 'ZNEW_POBLKT'
        AND CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME FROM USER_CONSTRAINTS
          WHERE TABLE_NAME = 'ZNEW_POBLKT' AND CONSTRAINT_TYPE = 'P'
        )
      ORDER BY POSITION
    `);

    /* 5. ZNEW_POBLKT 기존 데이터 수 */
    const znewCount = await query<{ CNT: number }>(`
      SELECT COUNT(*) AS CNT FROM ZNEW_POBLKT
    `);

    /* 6. POMAST 트리거 확인 */
    const pomastTriggers = await query<Record<string, unknown>>(`
      SELECT TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS
      FROM USER_TRIGGERS
      WHERE TABLE_NAME = 'POMAST'
    `);

    return NextResponse.json({
      success: true,
      triggers,
      triggerSource: triggerSrc,
      znewPoblkt: { pk: znewPK, columns: znewCols, count: znewCount[0]?.CNT },
      pomastTriggers,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
