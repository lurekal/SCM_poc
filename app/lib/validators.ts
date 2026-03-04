/**
 * Zod 유효성 검증 스키마 모듈
 *
 * 클라이언트/서버 공용으로 사용하는 입력값 검증 스키마를 정의합니다.
 */
import { z } from 'zod';

/* ========================================
 * 공통 검증 스키마
 * ======================================== */

/** 날짜 문자열 검증 (YYYYMMDD 형식) */
export const dateStringSchema = z.string()
  .length(8, '날짜는 8자리여야 합니다')
  .regex(/^\d{8}$/, '날짜는 숫자 8자리(YYYYMMDD)여야 합니다');

/** 거래처코드 검증 */
export const cvcodSchema = z.string()
  .min(1, '거래처코드를 입력하세요')
  .max(13, '거래처코드는 13자 이내여야 합니다');

/** 사업장코드 검증 */
export const saupjSchema = z.string()
  .min(1, '사업장을 선택하세요')
  .max(6, '사업장코드는 6자 이내여야 합니다');

/* ========================================
 * 출발처리 검증 스키마
 * ======================================== */

/** 출발처리 조회조건 검증 */
export const departureSearchSchema = z.object({
  cvcod: cvcodSchema,
  saupj: saupjSchema,
  sdate: dateStringSchema,
  edate: dateStringSchema,
  iodate: dateStringSchema,
  depot: z.string().default('%'),
  desc: z.string().default('%'),
});

/** 출발처리 저장 행 검증 */
export const departureSaveRowSchema = z.object({
  baljpno: z.string().min(1, '발주번호가 필요합니다'),
  balseq: z.number().int().min(0),
  itnbr: z.string().min(1, '품번이 필요합니다'),
  young: z.number().positive('출발수량은 0보다 커야 합니다'),
  lotno: z.string(),
  kcp_qty: z.number().min(0),
  box_qty: z.number().min(0),
  boxsize: z.string(),
  pspec: z.string(),
  saupj: z.string(),
  ipdpt: z.string(),
  cvcod: z.string(),
});

/** 출발처리 저장 요청 검증 */
export const departureSaveSchema = z.object({
  iodate: dateStringSchema,
  cvcod: cvcodSchema,
  saupj: saupjSchema,
  depot: z.string(),
  rows: z.array(departureSaveRowSchema).min(1, '저장할 데이터가 없습니다'),
});

/* ========================================
 * 납입카드발행 검증 스키마
 * ======================================== */

/** 납입카드 조회조건 검증 */
export const paymentCardSearchSchema = z.object({
  cvcod: cvcodSchema,
  saupj: z.string().default('%'),
  sdate: dateStringSchema,
  edate: dateStringSchema,
  mode: z.enum(['N', 'Y'], { message: '모드는 N(미발행) 또는 Y(발행)이어야 합니다' }),
});

/** 납입카드 출력 요청 검증 */
export const paymentCardPrintSchema = z.object({
  mode: z.enum(['N', 'Y']),
  saupj: z.string(),
  jpnos: z.array(z.string()).min(1, '출력할 항목을 선택하세요'),
  prt_jpno: z.string().optional(), /* 재발행 시 출력전표번호 */
});

/* ========================================
 * 출발취소 검증 스키마
 * ======================================== */

/** 출발취소 조회조건 검증 */
export const cancellationSearchSchema = z.object({
  cvcod: cvcodSchema,
  saupj: z.string().default('%'),
  sdate: dateStringSchema,
  edate: dateStringSchema,
  desc: z.string().default('%'),
});

/** 출발취소 삭제 요청 검증 */
export const cancellationDeleteSchema = z.object({
  items: z.array(z.object({
    jpno: z.string().min(1),
    baljpno: z.string().min(1),
    balseq: z.number().int(),
  })).min(1, '삭제할 항목을 선택하세요'),
});

/* ========================================
 * 거래처 검색 검증 스키마
 * ======================================== */

/** 거래처 검색 파라미터 검증 */
export const vendorLookupSchema = z.object({
  q: z.string().min(1, '검색어를 입력하세요'),
  limit: z.number().int().min(1).max(100).default(10),
});
