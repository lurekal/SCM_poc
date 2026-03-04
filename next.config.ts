/**
 * Next.js 설정
 *
 * oracledb Thick 모드 네이티브 바이너리를 위해
 * serverExternalPackages에 oracledb를 추가합니다.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Docker/Railway 배포를 위한 standalone 출력 모드 */
  output: 'standalone',
  /* oracledb 네이티브 모듈을 번들링하지 않고 Node.js에서 직접 로드 */
  serverExternalPackages: ['oracledb'],
};

export default nextConfig;
