/**
 * 네트워크 진단 API
 *
 * GET /api/test/network
 * Railway 서버에서 Oracle DB 서버로의 TCP 연결 가능 여부를 확인합니다.
 * 민감 정보는 노출하지 않습니다.
 */
import { NextResponse } from 'next/server';
import net from 'net';

export async function GET() {
  /* 환경변수에서 호스트/포트 추출 */
  const connStr = process.env.ORACLE_CONNECTION_STRING || '';
  const hostMatch = connStr.match(/HOST\s*=\s*([^)]+)/i);
  const portMatch = connStr.match(/PORT\s*=\s*(\d+)/i);
  const host = hostMatch ? hostMatch[1].trim() : '';
  const port = portMatch ? parseInt(portMatch[1]) : 1521;
  const timeout = 10000;

  if (!host) {
    return NextResponse.json({
      status: 'error',
      message: 'CONNECTION_STRING이 설정되지 않았습니다',
    });
  }

  /* TCP 소켓으로 직접 연결 테스트 */
  const tcpResult = await new Promise<{ connected: boolean; error?: string; elapsed: number }>((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ connected: true, elapsed: Date.now() - start });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ connected: false, error: 'Connection timed out', elapsed: Date.now() - start });
    });

    socket.on('error', (err) => {
      resolve({ connected: false, error: err.message, elapsed: Date.now() - start });
    });

    socket.connect(port, host);
  });

  return NextResponse.json({
    tcp: { connected: tcpResult.connected, elapsed: tcpResult.elapsed, error: tcpResult.error },
    timestamp: new Date().toISOString(),
  });
}
