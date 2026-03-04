/**
 * DB 연결 테스트 API
 *
 * GET /api/test
 * Oracle DB에 SELECT 'X' FROM DUAL 쿼리를 실행하여 연결 상태를 확인합니다.
 */
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    /* Oracle DUAL 테이블로 연결 테스트 */
    const result = await query<{ X: string }>("SELECT 'X' AS X FROM DUAL");

    if (result.length > 0 && result[0].X === 'X') {
      return NextResponse.json({
        success: true,
        message: 'Oracle DB 연결 성공',
        data: result[0],
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: false,
      message: '쿼리 결과가 예상과 다릅니다',
      data: result,
    }, { status: 500 });
  } catch (error) {
    /* 연결 실패 시 에러 정보 반환 */
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API /test] Oracle 연결 실패:', errorMessage);

    return NextResponse.json({
      success: false,
      message: 'Oracle DB 연결 실패',
      error: errorMessage,
    }, { status: 500 });
  }
}
