/**
 * SCM POC 메인 페이지
 *
 * 3개 핵심 화면으로 이동할 수 있는 대시보드입니다.
 */
import Link from 'next/link';

/** 화면 목록 정의 */
const SCREENS = [
  {
    href: '/screens/departure',
    title: '출발처리',
    code: 'w_scm_030_q',
    description: '발주 잔량에서 출발할 품목을 선택하고 출발수량을 입력하여 납품이력을 생성합니다.',
    color: 'bg-blue-600',
  },
  {
    href: '/screens/payment-card',
    title: '납입카드발행',
    code: 'w_scm_040_q',
    description: '출발처리된 납품이력을 조회하여 납입카드를 발행(인쇄)합니다.',
    color: 'bg-green-600',
  },
  {
    href: '/screens/cancellation',
    title: '출발취소',
    code: 'w_scm_050_q',
    description: '출발처리된 내역을 선택하여 삭제(취소)합니다.',
    color: 'bg-red-600',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 영역 */}
      <header className="bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">SCM POC</h1>
          <p className="mt-2 text-gray-300">
            PowerBuilder SCM 시스템 → Next.js + Oracle 전환 POC
          </p>
        </div>
      </header>

      {/* 화면 카드 목록 */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SCREENS.map((screen) => (
            <Link
              key={screen.href}
              href={screen.href}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg
                transition-shadow overflow-hidden"
            >
              {/* 카드 상단 색상 바 */}
              <div className={`${screen.color} h-2`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {screen.title}
                  </h2>
                  <span className="text-xs text-gray-400 font-mono">
                    {screen.code}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {screen.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* DB 연결 테스트 링크 */}
        <div className="mt-8 text-center">
          <a
            href="/api/test"
            target="_blank"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Oracle DB 연결 테스트 (GET /api/test)
          </a>
        </div>
      </main>
    </div>
  );
}
