/**
 * 날짜/숫자 포매터 모듈
 *
 * SCM 시스템에서 사용하는 날짜 및 숫자 형식 변환 함수를 제공합니다.
 */

/* ========================================
 * 날짜 관련 포매터
 * ======================================== */

/**
 * 오늘 날짜를 YYYYMMDD 형식 문자열로 반환합니다.
 */
export function getToday(): string {
  const now = new Date();
  return formatDateToString(now);
}

/**
 * 현재 시간을 HHMMSS 형식 문자열로 반환합니다.
 */
export function getTimeNow(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}${mm}${ss}`;
}

/**
 * Date 객체를 YYYYMMDD 형식 문자열로 변환합니다.
 */
export function formatDateToString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * YYYYMMDD 문자열을 YYYY-MM-DD 형식으로 변환합니다.
 * (화면 표시용)
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * YYYY-MM-DD 형식을 YYYYMMDD로 변환합니다.
 * (DB 저장용)
 */
export function parseDateInput(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/**
 * 이번 달 1일을 YYYYMMDD 형식으로 반환합니다.
 */
export function getFirstDayOfMonth(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return formatDateToString(first);
}

/**
 * 이번 달 마지막 날을 YYYYMMDD 형식으로 반환합니다.
 */
export function getLastDayOfMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return formatDateToString(last);
}

/**
 * 오늘로부터 n일 후의 날짜를 YYYYMMDD 형식으로 반환합니다.
 *
 * @param days - 더할 일 수 (음수면 이전 날짜)
 */
export function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateToString(date);
}

/**
 * 주어진 날짜가 오늘 기준 ±범위일 이내인지 확인합니다.
 *
 * @param dateStr - 확인할 날짜 (YYYYMMDD)
 * @param rangeDays - 허용 범위 일 수 (기본: 30)
 */
export function isWithinDateRange(dateStr: string, rangeDays: number = 30): boolean {
  const target = new Date(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(4, 6)) - 1,
    parseInt(dateStr.slice(6, 8))
  );
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffMs = Math.abs(target.getTime() - now.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= rangeDays;
}

/* ========================================
 * 숫자 관련 포매터
 * ======================================== */

/**
 * 숫자에 천 단위 콤마를 추가합니다.
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('ko-KR');
}

/**
 * 금액 표시 (원 단위, 천 단위 콤마)
 */
export function formatCurrency(value: number): string {
  return `${formatNumber(value)}원`;
}

/**
 * 행 순번을 3자리 문자열로 변환합니다.
 * (전표번호 생성용: napjpno + '001', '002', ...)
 *
 * @param seq - 순번 (1부터)
 */
export function formatSeq(seq: number): string {
  return String(seq).padStart(3, '0');
}

/**
 * 소수점 검증: Z로 시작하는 품번은 소수 1자리, 나머지는 정수만 허용
 *
 * @param itnbr - 품번
 * @param value - 검증할 수량
 * @returns 유효하면 true
 */
export function validateDecimal(itnbr: string, value: number): boolean {
  if (itnbr.startsWith('Z')) {
    /* Z 품번: 소수 1자리까지 허용 */
    const str = String(value);
    const dotIdx = str.indexOf('.');
    if (dotIdx === -1) return true; /* 정수는 OK */
    return str.length - dotIdx - 1 <= 1;
  } else {
    /* 일반 품번: 정수만 허용 */
    return Number.isInteger(value);
  }
}
