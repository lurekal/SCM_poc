/**
 * 거래처 검색 API
 *
 * GET /api/common/vendor-lookup?q=검색어&limit=10
 * VNDMST 테이블에서 거래처코드(cvcod) 또는 거래처명(cvnas)으로 검색합니다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import type { Vendor } from '@/app/lib/types';

export async function GET(request: NextRequest) {
  try {
    /* 쿼리 파라미터 추출 */
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 100);

    if (!q.trim()) {
      return NextResponse.json({
        success: false,
        error: '검색어를 입력하세요',
      }, { status: 400 });
    }

    /* 거래처코드 또는 거래처명으로 LIKE 검색 */
    const searchTerm = `%${q.trim().toUpperCase()}%`;

    /* Oracle 11g 호환: FETCH FIRST 대신 ROWNUM 사용 */
    /* 소문자 별칭으로 프론트엔드 타입과 일치시킴 */
    const sql = `
      SELECT CVCOD AS "cvcod", CVNAS AS "cvnas", SANO AS "sano"
      FROM (
        SELECT CVCOD, CVNAS, SANO
        FROM VNDMST
        WHERE UPPER(CVCOD) LIKE :searchTerm
           OR UPPER(CVNAS) LIKE :searchTerm
        ORDER BY CVCOD
      )
      WHERE ROWNUM <= :limitVal
    `;

    const result = await query<Vendor>(sql, {
      searchTerm,
      limitVal: limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /common/vendor-lookup] 오류:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
