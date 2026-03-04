/**
 * DB 오퍼레이션 래퍼 모듈
 *
 * Oracle 커넥션 풀에서 커넥션을 가져와 쿼리를 실행하고,
 * 사용 후 자동으로 커넥션을 반환하는 유틸리티 함수들을 제공합니다.
 */
import oracledb from 'oracledb';
import { getConnection } from './oracle';

/** 쿼리 실행 결과 타입 */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowsAffected?: number;
}

/**
 * SELECT 쿼리를 실행하고 결과를 반환합니다.
 * 커넥션은 자동으로 반환됩니다.
 *
 * @param sql - 실행할 SQL 문
 * @param params - 바인드 파라미터 (이름 기반 또는 위치 기반)
 * @returns 조회 결과 행 배열
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: oracledb.BindParameters = {}
): Promise<T[]> {
  let conn: oracledb.Connection | null = null;

  try {
    conn = await getConnection();
    const result = await conn.execute<T>(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchArraySize: 200, /* 한 번에 가져올 행 수 */
    });

    return (result.rows as T[]) || [];
  } finally {
    /* 커넥션 반환 (풀로 돌려보냄) */
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * INSERT/UPDATE/DELETE 등 DML 문을 실행합니다.
 * autoCommit을 지정하지 않으면 수동 커밋이 필요합니다.
 *
 * @param sql - 실행할 SQL 문
 * @param params - 바인드 파라미터
 * @param autoCommit - 자동 커밋 여부 (기본: true)
 * @returns 영향받은 행 수
 */
export async function execute(
  sql: string,
  params: oracledb.BindParameters = {},
  autoCommit: boolean = true
): Promise<number> {
  let conn: oracledb.Connection | null = null;

  try {
    conn = await getConnection();
    const result = await conn.execute(sql, params, { autoCommit });
    return result.rowsAffected || 0;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Oracle 함수를 호출하고 반환값을 가져옵니다.
 *
 * @param functionName - 호출할 함수 이름 (예: 'FUN_JUNPYO')
 * @param params - 입력 파라미터 배열
 * @param returnType - 반환 타입 (기본: oracledb.STRING)
 * @returns 함수 반환값
 */
export async function callFunction<T = string>(
  functionName: string,
  params: unknown[],
  returnType: oracledb.DbType = oracledb.STRING
): Promise<T> {
  let conn: oracledb.Connection | null = null;

  try {
    conn = await getConnection();

    /* 파라미터 바인드 변수 생성 (:0, :1, :2, ...) */
    const paramPlaceholders = params.map((_, i) => `:${i}`).join(', ');
    const sql = `BEGIN :result := ${functionName}(${paramPlaceholders}); END;`;

    /* 바인드 객체 구성 */
    const binds: Record<string, oracledb.BindParameter> = {
      result: { dir: oracledb.BIND_OUT, type: returnType },
    };
    params.forEach((val, i) => {
      binds[String(i)] = { val: val as oracledb.BindParameter['val'], dir: oracledb.BIND_IN };
    });

    const result = await conn.execute(sql, binds);
    return result.outBinds!['result' as keyof typeof result.outBinds] as T;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * Oracle 저장 프로시저를 호출합니다.
 *
 * @param procedureName - 호출할 프로시저 이름
 * @param params - 바인드 파라미터 (IN/OUT 포함)
 * @returns OUT 파라미터 결과
 */
export async function callProcedure(
  procedureName: string,
  params: Record<string, oracledb.BindParameter>
): Promise<Record<string, unknown>> {
  let conn: oracledb.Connection | null = null;

  try {
    conn = await getConnection();

    /* 파라미터 이름 목록으로 CALL 문 생성 */
    const paramNames = Object.keys(params).map((k) => `:${k}`).join(', ');
    const sql = `BEGIN ${procedureName}(${paramNames}); END;`;

    const result = await conn.execute(sql, params);
    return (result.outBinds as Record<string, unknown>) || {};
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

/**
 * 트랜잭션을 수동으로 관리할 수 있는 커넥션을 제공합니다.
 * 콜백 함수 내에서 여러 DML을 실행한 후 COMMIT/ROLLBACK을 결정합니다.
 *
 * @param callback - 커넥션을 받아 작업을 수행하는 콜백 함수
 * @returns 콜백 함수의 반환값
 */
export async function withTransaction<T>(
  callback: (conn: oracledb.Connection) => Promise<T>
): Promise<T> {
  let conn: oracledb.Connection | null = null;

  try {
    conn = await getConnection();
    const result = await callback(conn);
    /* 콜백 성공 시 커밋 */
    await conn.commit();
    return result;
  } catch (error) {
    /* 오류 발생 시 롤백 */
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error('[DB] 롤백 실패:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}
