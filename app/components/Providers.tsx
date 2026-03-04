/**
 * 클라이언트 사이드 Provider 래퍼
 *
 * TanStack Query와 Toast Provider를 앱 전체에 적용합니다.
 */
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from './Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  /* QueryClient를 컴포넌트 레벨에서 생성하여 서버/클라이언트 공유 방지 */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /* 윈도우 포커스 시 자동 재조회 비활성화 */
            refetchOnWindowFocus: false,
            /* 재시도 1회 */
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
