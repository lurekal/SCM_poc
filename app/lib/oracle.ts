/**
 * Oracle 커넥션 풀 싱글턴 모듈
 *
 * Thick 모드(Oracle Instant Client 사용)로 Oracle DB에 접속합니다.
 * 대상 DB가 Oracle 12.1 미만이므로 Thin 모드는 사용 불가합니다.
 * 서버 시작 시 한 번만 풀을 생성하고, 이후 재사용합니다.
 */
import oracledb from 'oracledb';

/** 커넥션 풀 싱글턴 인스턴스 */
let pool: oracledb.Pool | null = null;

/** Thick 모드 초기화 여부 */
let thickInitialized = false;

/**
 * Oracle Instant Client를 사용하여 Thick 모드를 초기화합니다.
 * 한 번만 실행되며, 이미 초기화된 경우 건너뜁니다.
 */
function initThickMode(): void {
  if (thickInitialized) return;

  try {
    /* Oracle Instant Client 경로 설정 */
    /* 기본값: Linux(Docker/Railway) 환경 경로, 로컬 Windows는 환경변수로 오버라이드 */
    const clientPath = process.env.ORACLE_CLIENT_PATH || '/usr/lib/oracle/21/client64/lib';
    oracledb.initOracleClient({ libDir: clientPath });
    thickInitialized = true;
    console.log(`[Oracle] Thick 모드 초기화 완료 (${clientPath})`);
  } catch (error: unknown) {
    /* 이미 초기화된 경우 무시 (DPI-1047 제외) */
    if (error instanceof Error && error.message.includes('already initialized')) {
      thickInitialized = true;
      return;
    }
    console.error('[Oracle] Thick 모드 초기화 실패:', error);
    throw error;
  }
}

/**
 * Oracle 커넥션 풀을 초기화하고 반환합니다.
 * 이미 생성된 풀이 있으면 기존 풀을 반환합니다 (싱글턴 패턴).
 */
export async function getPool(): Promise<oracledb.Pool> {
  if (pool) {
    return pool;
  }

  try {
    /* Thick 모드 초기화 (Oracle Instant Client 필요) */
    initThickMode();

    /* 결과를 객체(Object) 형태로 반환하도록 설정 */
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    /* 자동 커밋 비활성화 (트랜잭션 수동 관리) */
    oracledb.autoCommit = false;

    /* 커넥션 풀 생성 */
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
      poolMin: Number(process.env.ORACLE_POOL_MIN) || 2,
      poolMax: Number(process.env.ORACLE_POOL_MAX) || 10,
      poolIncrement: 1,
      poolTimeout: 60,         /* 유휴 커넥션 타임아웃 (초) */
      queueTimeout: 60000,     /* 풀 대기 타임아웃 (밀리초) */
      enableStatistics: false,
    });

    console.log('[Oracle] 커넥션 풀 생성 완료 (Thick 모드)');
    return pool;
  } catch (error) {
    console.error('[Oracle] 커넥션 풀 생성 실패:', error);
    pool = null;
    throw error;
  }
}

/**
 * 커넥션 풀에서 단일 커넥션을 가져옵니다.
 * 사용 후 반드시 connection.close()를 호출해야 합니다.
 */
export async function getConnection(): Promise<oracledb.Connection> {
  const p = await getPool();
  return p.getConnection();
}

/**
 * 커넥션 풀을 종료합니다.
 * 서버 종료 시 호출하여 리소스를 정리합니다.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(10); /* 10초 대기 후 강제 종료 */
    pool = null;
    console.log('[Oracle] 커넥션 풀 종료 완료');
  }
}
