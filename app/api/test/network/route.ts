/**
 * 네트워크 진단 API
 *
 * GET /api/test/network
 * Railway 서버에서 Oracle DB 서버로의 TCP 연결 가능 여부를 확인합니다.
 */
import { NextResponse } from 'next/server';
import net from 'net';

export async function GET() {
  const host = '125.141.30.236';
  const port = 1521;
  const timeout = 10000; /* 10초 타임아웃 */

  /* TCP 소켓으로 직접 연결 테스트 */
  const result = await new Promise<{ connected: boolean; error?: string; elapsed: number }>((resolve) => {
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
      resolve({ connected: false, error: 'Connection timed out', elapsed: Date.now() - start });
    });

    socket.on('error', (err) => {
      resolve({ connected: false, error: err.message, elapsed: Date.now() - start });
    });

    socket.connect(port, host);
  });

  return NextResponse.json({
    host,
    port,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
