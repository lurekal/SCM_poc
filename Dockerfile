# ============================================================
# SCM POC Docker 빌드 (Next.js + Oracle Thick 모드)
#
# 멀티스테이지 빌드로 이미지 크기를 최소화합니다.
# Oracle Instant Client Basic Lite 21.16을 포함합니다.
# ============================================================

# ----------------------------------------------------------
# 1단계: 의존성 설치 (deps)
# ----------------------------------------------------------
FROM node:20-slim AS deps

WORKDIR /app

# package.json과 lock 파일 복사 후 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ----------------------------------------------------------
# 2단계: 빌드 (builder)
# ----------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js 빌드 (standalone 모드)
RUN npm run build

# ----------------------------------------------------------
# 3단계: 실행 (runner)
# ----------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

# 프로덕션 환경 설정
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Oracle Instant Client에 필요한 시스템 라이브러리 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1 \
    ca-certificates \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client Basic Lite 21.16 (Linux x64) 설치
# ZIP 패키지를 다운로드하여 /opt/oracle에 직접 설치
RUN curl -fsSL -o /tmp/instantclient.zip \
    https://download.oracle.com/otn_software/linux/instantclient/2116000/instantclient-basiclite-linux.x64-21.16.0.0.0dbru.zip \
    && mkdir -p /opt/oracle \
    && unzip /tmp/instantclient.zip -d /opt/oracle \
    && rm /tmp/instantclient.zip \
    && apt-get purge -y curl unzip && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client 라이브러리 경로를 시스템에 등록
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_16:${LD_LIBRARY_PATH}

# 비루트 사용자로 실행 (보안)
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next.js standalone 출력 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone 서버 실행
CMD ["node", "server.js"]
