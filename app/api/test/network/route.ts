/**
 * 네트워크 진단 API
 *
 * GET /api/test/network
 * Railway 서버에서 Oracle DB 서버로의 TCP 연결 가능 여부를 확인합니다.
 * 환경변수 설정 상태도 함께 반환합니다.
 */
import { NextResponse } from 'next/server';
import net from 'net';

export async function GET() {
  /* 환경변수에서 호스트/포트 추출 */
  const connStr = process.env.ORACLE_CONNECTION_STRING || '';
  const hostMatch = connStr.match(/HOST\s*=\s*([^)]+)/i);
  const portMatch = connStr.match(/PORT\s*=\s*(\d+)/i);
  const host = hostMatch ? hostMatch[1].trim() : 'NOT_SET';
  const port = portMatch ? parseInt(portMatch[1]) : 1521;
  const timeout = 10000; /* 10초 타임아웃 */

  /* 환경변수 설정 상태 (값은 마스킹) */
  const envStatus = {
    ORACLE_USER: process.env.ORACLE_USER ? 'SET' : 'NOT_SET',
    ORACLE_PASSWORD: process.env.ORACLE_PASSWORD ? 'SET' : 'NOT_SET',
    ORACLE_CONNECTION_STRING: connStr ? connStr : 'NOT_SET',
    ORACLE_CLIENT_PATH: process.env.ORACLE_CLIENT_PATH || '(default: /opt/oracle/instantclient_21_16)',
  };

  /* 호스트가 설정되지 않은 경우 */
  if (host === 'NOT_SET') {
    return NextResponse.json({
      envStatus,
      tcp: { error: 'ORACLE_CONNECTION_STRING에서 HOST를 추출할 수 없습니다' },
      timestamp: new Date().toISOString(),
    });
  }

  /* TCP 소켓으로 직접 연결 테스트 */
  const tcpResult = await new Promise<{ connected: boolean; error?: string; elapsed: number }>((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const elapsed = Date.now() - start;
      socket.destroy();
      resolve({ connected: true, elapsed });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ connected: false, error: 'Connection timed out (10s)', elapsed: Date.now() - start });
    });

    socket.on('error', (err) => {
      resolve({ connected: false, error: err.message, elapsed: Date.now() - start });
    });

    socket.connect(port, host);
  });

  return NextResponse.json({
    envStatus,
    tcp: { host, port, ...tcpResult },
    timestamp: new Date().toISOString(),
  });
}
