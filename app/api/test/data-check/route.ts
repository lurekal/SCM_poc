/**
 * 샘플 데이터 투입을 위한 기초 데이터 분석 API
 * 각 섹션을 독립적으로 조회하여 하나가 실패해도 나머지는 반환
 */
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

/* 개별 쿼리를 안전하게 실행하는 헬퍼 */
async function safeQuery<T>(sql: string, params?: Record<string, unknown>): Promise<T[] | { error: string }> {
  try {
    return await query<T>(sql, params);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  try {
    /* 0. VNDMST 컬럼 구조 확인 */
    const vndmstCols = await safeQuery<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'VNDMST'
      ORDER BY COLUMN_ID
    `);

    /* 1. 주요 거래처 샘플 (1로 시작하는 협력업체) */
    const vendors = await safeQuery<Record<string, unknown>>(`
      SELECT * FROM (
        SELECT CVCOD, CVNAS, SANO
        FROM VNDMST
        WHERE CVCOD LIKE '1%'
          AND CVNAS IS NOT NULL
        ORDER BY CVCOD
      ) WHERE ROWNUM <= 20
    `);

    /* 2. 유신정밀 자사 정보 */
    const ownCompany = await safeQuery<Record<string, unknown>>(`
      SELECT CVCOD, CVNAS, SANO
      FROM VNDMST
      WHERE CVCOD IN ('000000','10001','10002','10003','10004')
    `);

    /* 3. 품목 샘플 (ITTYP 별 분포) */
    const itemsByType = await safeQuery<Record<string, unknown>>(`
      SELECT ITTYP, COUNT(*) AS CNT
      FROM ITEMAS
      GROUP BY ITTYP
      ORDER BY ITTYP
    `);

    /* 4. 품목 샘플 (처음 20건) */
    const items = await safeQuery<Record<string, unknown>>(`
      SELECT * FROM (
        SELECT ITNBR, ITDSC, ISPEC, UNMSR, ITTYP
        FROM ITEMAS
        ORDER BY ITNBR
      ) WHERE ROWNUM <= 20
    `);

    /* 5. 창고 후보 거래처 */
    const depots = await safeQuery<Record<string, unknown>>(`
      SELECT * FROM (
        SELECT CVCOD, CVNAS
        FROM VNDMST
        WHERE CVNAS LIKE '%창고%' OR CVNAS LIKE '%물류%' OR CVNAS LIKE '%센터%'
      ) WHERE ROWNUM <= 10
    `);

    /* 6. POMAST 테이블 구조 */
    const pomastCols = await safeQuery<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'POMAST'
      ORDER BY COLUMN_ID
    `);

    /* 7. POBLKT 테이블 구조 */
    const poblktCols = await safeQuery<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'POBLKT'
      ORDER BY COLUMN_ID
    `);

    /* 8. POBLKT_HIST 테이블 구조 */
    const histCols = await safeQuery<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'POBLKT_HIST'
      ORDER BY COLUMN_ID
    `);

    /* 9. POBLKT_HIST_BOXSTD 구조 */
    const boxstdCols = await safeQuery<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'POBLKT_HIST_BOXSTD'
      ORDER BY COLUMN_ID
    `);

    /* 10. Z로 시작하는 품번 (소수점 검증용) */
    const zItems = await safeQuery<Record<string, unknown>>(`
      SELECT * FROM (
        SELECT ITNBR, ITDSC, ISPEC, UNMSR
        FROM ITEMAS
        WHERE ITNBR LIKE 'Z%'
      ) WHERE ROWNUM <= 5
    `);

    /* 11. POMAST PK */
    const pomastPK = await safeQuery<Record<string, unknown>>(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME
      FROM USER_CONS_COLUMNS
      WHERE TABLE_NAME = 'POMAST'
        AND CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME FROM USER_CONSTRAINTS
          WHERE TABLE_NAME = 'POMAST' AND CONSTRAINT_TYPE = 'P'
        )
      ORDER BY POSITION
    `);

    /* 12. POBLKT PK */
    const poblktPK = await safeQuery<Record<string, unknown>>(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME
      FROM USER_CONS_COLUMNS
      WHERE TABLE_NAME = 'POBLKT'
        AND CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME FROM USER_CONSTRAINTS
          WHERE TABLE_NAME = 'POBLKT' AND CONSTRAINT_TYPE = 'P'
        )
      ORDER BY POSITION
    `);

    /* 13. POBLKT_HIST PK */
    const histPK = await safeQuery<Record<string, unknown>>(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME
      FROM USER_CONS_COLUMNS
      WHERE TABLE_NAME = 'POBLKT_HIST'
        AND CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME FROM USER_CONSTRAINTS
          WHERE TABLE_NAME = 'POBLKT_HIST' AND CONSTRAINT_TYPE = 'P'
        )
      ORDER BY POSITION
    `);

    /* 14. ITEMAS 컬럼 구조 (BALRATE 등 확인) */
    const itemasCols = await safeQuery<Record<string, unknown>>(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = 'ITEMAS'
      ORDER BY COLUMN_ID
    `);

    /* 15. 시퀀스 또는 FUN_JUNPYO 함수 존재 확인 */
    const functions = await safeQuery<Record<string, unknown>>(`
      SELECT OBJECT_NAME, OBJECT_TYPE
      FROM USER_OBJECTS
      WHERE OBJECT_NAME IN ('FUN_JUNPYO','FUN_SCM_JUNPYO','SEQ_JPNO','SEQ_POBLKT')
        OR OBJECT_NAME LIKE '%JUNPYO%'
        OR OBJECT_NAME LIKE '%SCM%'
    `);

    return NextResponse.json({
      success: true,
      vndmstStructure: vndmstCols,
      vendors,
      ownCompany,
      itemsByType,
      items,
      depots,
      zItems,
      pomastStructure: { pk: pomastPK, columns: pomastCols },
      poblktStructure: { pk: poblktPK, columns: poblktCols },
      histStructure: { pk: histPK, columns: histCols },
      boxstdStructure: boxstdCols,
      itemasCols,
      functions,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
