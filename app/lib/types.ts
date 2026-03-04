/**
 * 공통 타입 정의 모듈
 *
 * SCM POC 프로젝트에서 사용하는 모든 인터페이스와 타입을 정의합니다.
 */

/* ========================================
 * API 응답 공통 타입
 * ======================================== */

/** API 성공 응답 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/* ========================================
 * 거래처 (VNDMST) 관련 타입
 * ======================================== */

/** 거래처 정보 */
export interface Vendor {
  cvcod: string;   /* 거래처코드 */
  cvnas: string;   /* 거래처명 */
  sano?: string;   /* 사업자번호 */
}

/* ========================================
 * 출발처리 (화면1: w_scm_030_q) 관련 타입
 * ======================================== */

/** 출발처리 조회조건 */
export interface DepartureSearchParams {
  cvcod: string;    /* 거래처코드 */
  saupj: string;    /* 사업장 */
  sdate: string;    /* 시작일 (YYYYMMDD) */
  edate: string;    /* 종료일 (YYYYMMDD) */
  iodate: string;   /* 출발일자 (YYYYMMDD) */
  depot: string;    /* 납품창고 */
  desc: string;     /* 품명검색 */
}

/** 출발처리 그리드 행 데이터 */
export interface DepartureRow {
  baljpno: string;    /* 발주번호 */
  balseq: number;     /* 발주순번 */
  itnbr: string;      /* 품번 */
  itdsc: string;      /* 품명 */
  baldate: string;    /* 발주일자 */
  balqty: number;     /* 발주수량 */
  gudat: string;      /* 납기일 */
  nadat: string;      /* 납품일 */
  young: number;      /* 출발수량 (편집 가능) */
  cvcod: string;      /* 거래처코드 */
  checks: string;     /* 체크 여부 ('T'/'F') */
  ispec: string;      /* 규격 */
  saupj: string;      /* 사업장 */
  unprc: number;      /* 단가 */
  vndinqty: number;   /* 기납품수량 */
  ipdpt: string;      /* 납품창고(코드) */
  depot_nm: string;   /* 창고명 */
  lotno: string;      /* LOT번호 (편집 가능) */
  pspec: string;      /* 포장사양 */
  kcp_qty: number;    /* KCP수량 (편집 가능) */
  ittyp: string;      /* 품목유형 */
  balrate: number;    /* 허용율 */
  bigo: string;       /* 비고 */
  box_qty: number;    /* BOX수량 (편집 가능) */
  boxsize: string;    /* BOX규격 */
  janru: number;      /* 잔량 (발주수량 - 기납품수량) */
  janrate: number;    /* 허용 잔량 (잔량 * 허용율) */
}

/** 출발처리 저장 요청 */
export interface DepartureSaveRequest {
  iodate: string;           /* 출발일자 */
  cvcod: string;            /* 거래처코드 */
  saupj: string;            /* 사업장 */
  depot: string;            /* 납품창고 */
  rows: DepartureSaveRow[]; /* 저장할 행 목록 */
}

/** 출발처리 저장 행 데이터 */
export interface DepartureSaveRow {
  baljpno: string;  /* 발주번호 */
  balseq: number;   /* 발주순번 */
  itnbr: string;    /* 품번 */
  young: number;    /* 출발수량 */
  lotno: string;    /* LOT번호 */
  kcp_qty: number;  /* KCP수량 */
  box_qty: number;  /* BOX수량 */
  boxsize: string;  /* BOX규격 */
  pspec: string;    /* 포장사양 */
  saupj: string;    /* 사업장 */
  ipdpt: string;    /* 납품창고 */
  cvcod: string;    /* 거래처코드 */
  temp_no?: string; /* 임시번호 (파일링크용) */
}

/* ========================================
 * 납입카드발행 (화면2: w_scm_040_q) 관련 타입
 * ======================================== */

/** 납입카드 조회조건 */
export interface PaymentCardSearchParams {
  cvcod: string;   /* 거래처코드 */
  saupj: string;   /* 사업장 */
  sdate: string;   /* 시작일 (YYYYMMDD) */
  edate: string;   /* 종료일 (YYYYMMDD) */
  mode: string;    /* 모드: 'N'=미발행(신규), 'Y'=발행(재발행) */
}

/** 납입카드 그리드 행 데이터 */
export interface PaymentCardRow {
  jpno: string;       /* 전표번호 */
  crt_dt: string;     /* 생성일시 */
  nadate: string;     /* 납품일 */
  baljpno: string;    /* 발주번호 */
  balseq: number;     /* 발주순번 */
  itnbr: string;      /* 품번 */
  itdsc: string;      /* 품명 */
  ispec: string;      /* 규격 */
  unmsr: string;      /* 단위 */
  naqty: number;      /* 납품수량 */
  is_chek: number;    /* 체크 여부 (0/1) */
  ipsaupj: string;    /* 사업장 */
  unprc: number;      /* 단가 */
  unamt: number;      /* 금액 */
  print_yn: string;   /* 출력여부 ('Y'/'N') */
  print_txt: string;  /* 출력상태 텍스트 */
  prt_jpno: string;   /* 출력전표번호 */
  prt_cnt: number;    /* 출력횟수 */
  qcgub: string;      /* QC구분 */
  balqty: number;     /* 발주수량 */
  jjanru: number;     /* 잔잔량 */
  cvcod: string;      /* 거래처코드 */
  lotno: string;      /* LOT번호 */
}

/* ========================================
 * 출발취소 (화면3: w_scm_050_q) 관련 타입
 * ======================================== */

/** 출발취소 조회조건 */
export interface CancellationSearchParams {
  cvcod: string;   /* 거래처코드 */
  saupj: string;   /* 사업장 */
  sdate: string;   /* 시작일 (YYYYMMDD) */
  edate: string;   /* 종료일 (YYYYMMDD) */
  desc: string;    /* 품명검색 */
}

/** 출발취소 그리드 행 데이터 */
export interface CancellationRow {
  chuldat: string;    /* 출발일자 */
  jpno: string;       /* 전표번호 */
  jpno_seq: string;   /* 전표순번 (SUBSTR 3자리) */
  baljpno: string;    /* 발주번호 */
  balseq: number;     /* 발주순번 */
  pspec: string;      /* 포장사양 */
  pspnm: string;      /* 포장사양명 */
  checks: string;     /* 체크 여부 ('T'/'F') */
  itnbr: string;      /* 품번 */
  itdsc: string;      /* 품명 */
  naqty: number;      /* 납품수량 */
  unprc: number;      /* 단가 */
  nadate: string;     /* 납품일 */
  ispec: string;      /* 규격 */
  prt_jpno: string;   /* 출력전표번호 */
  nadat: string;      /* 납품일(POBLKT) */
  vndinqty: number;   /* 기납품수량 */
  lotno: string;      /* LOT번호 */
  qafile: string;     /* QA파일 */
  f_groupcd: string;  /* 그룹코드 */
  ittyp: string;      /* 품목유형 */
}

/* ========================================
 * 툴바 관련 타입
 * ======================================== */

/** 툴바 버튼 활성화 설정 */
export interface ToolbarConfig {
  search: boolean;    /* 조회 */
  save: boolean;      /* 저장 */
  delete: boolean;    /* 삭제 */
  print: boolean;     /* 출력 */
  close: boolean;     /* 닫기 */
  excel: boolean;     /* 엑셀 */
  confirm: boolean;   /* 확정 */
  attach: boolean;    /* 첨부파일 */
}

/** 화면별 툴바 설정 프리셋 */
export const TOOLBAR_PRESETS: Record<string, ToolbarConfig> = {
  /* 출발처리 (030) */
  departure: {
    search: true, save: true, delete: false, print: true,
    close: true, excel: true, confirm: false, attach: true,
  },
  /* 납입카드발행 (040) */
  paymentCard: {
    search: true, save: false, delete: false, print: true,
    close: true, excel: true, confirm: true, attach: true,
  },
  /* 출발취소 (050) */
  cancellation: {
    search: true, save: false, delete: true, print: true,
    close: true, excel: false, confirm: true, attach: true,
  },
};
