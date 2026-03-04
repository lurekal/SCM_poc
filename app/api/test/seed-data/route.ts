/**
 * 4개 사업장 샘플 데이터 투입 API
 *
 * POST /api/test/seed-data
 * POMAST(발주마스터) + POBLKT(발주잔량) 샘플 데이터를 INSERT합니다.
 * 출발처리 → 납입카드발행 → 출발취소 전체 흐름 테스트용.
 *
 * DELETE /api/test/seed-data
 * 투입한 샘플 데이터를 삭제합니다.
 */
import { NextResponse } from 'next/server';
import { query, execute, withTransaction } from '@/app/lib/db';
import type oracledb from 'oracledb';

/* 샘플 발주전표번호 접두사 (나중에 삭제 시 식별용) */
const BALJPNO_PREFIX = 'TST260304';

/* 4개 사업장 설정 */
const SITES = [
  { saupj: '10', jcvcod: '10001', ipdpt: 'Z1S4', label: '본사' },
  { saupj: '20', jcvcod: '10002', ipdpt: 'Z1S2', label: '당진' },
  { saupj: '30', jcvcod: '10003', ipdpt: 'Z1S3', label: '군산' },
  { saupj: '40', jcvcod: '10004', ipdpt: 'Z1S4', label: '송도' },
] as const;

/* 협력업체 */
const VENDOR_CVCOD = '10012';

export async function POST() {
  try {
    /* 1. 기존 테스트 데이터 존재 확인 */
    const existing = await query<{ CNT: number }>(`
      SELECT COUNT(*) AS CNT FROM POMAST WHERE BALJPNO LIKE '${BALJPNO_PREFIX}%'
    `);
    if (existing[0]?.CNT > 0) {
      return NextResponse.json({
        success: false,
        error: `이미 테스트 데이터가 존재합니다 (${existing[0].CNT}건). 먼저 DELETE 요청으로 삭제하세요.`,
      }, { status: 409 });
    }

    /* 2. ITEMAS에서 품목 12개 선택 (사업장별 3개씩) */
    const items = await query<{
      ITNBR: string; ITDSC: string; ISPEC: string; UNMSR: string; ITTYP: string;
    }>(`
      SELECT * FROM (
        SELECT ITNBR, ITDSC, ISPEC, UNMSR, ITTYP
        FROM ITEMAS
        WHERE ITTYP = '2'
          AND ITNBR NOT LIKE 'Z%'
          AND ITDSC IS NOT NULL
        ORDER BY ITNBR
      ) WHERE ROWNUM <= 12
    `);

    if (items.length < 12) {
      return NextResponse.json({
        success: false,
        error: `품목이 부족합니다. ${items.length}건만 조회됨 (최소 12건 필요)`,
      }, { status: 500 });
    }

    /* 3. 트랜잭션으로 POMAST + POBLKT 일괄 투입 */
    const insertedData: Record<string, unknown>[] = [];

    await withTransaction(async (conn: oracledb.Connection) => {
      for (let siteIdx = 0; siteIdx < SITES.length; siteIdx++) {
        const site = SITES[siteIdx];
        /* 발주전표번호: TST26030401 ~ TST26030404 */
        const baljpno = `${BALJPNO_PREFIX}0${siteIdx + 1}`;

        /* POMAST 헤더 INSERT */
        await conn.execute(`
          INSERT INTO POMAST (
            BALJPNO, CVCOD, BALDATE, BAL_SUIP, BGUBUN,
            CRT_USER, CRT_DATE, CRT_TIME
          ) VALUES (
            :baljpno, :cvcod, :baldate, '1', '1',
            'TEST', '20260304', '120000'
          )
        `, {
          baljpno,
          cvcod: VENDOR_CVCOD,
          baldate: '20260301',
        });

        /* 해당 사업장에 배정할 품목 3개 (siteIdx*3 ~ siteIdx*3+2) */
        const siteItems = items.slice(siteIdx * 3, siteIdx * 3 + 3);

        for (let seq = 0; seq < siteItems.length; seq++) {
          const item = siteItems[seq];
          /* 발주수량: 100, 200, 500 중 하나 */
          const balqty = [100, 200, 500][seq];

          /* POBLKT 상세 INSERT */
          await conn.execute(`
            INSERT INTO POBLKT (
              BALJPNO, BALSEQ, ITNBR, PSPEC,
              GUDAT, NADAT, BALQTY, RCQTY, BLQTY,
              BALSTS, SAUPJ, IPDPT, JCVCOD,
              VNDINQTY, WBALQTY, UNPRC, UNAMT,
              CRT_USER, CRT_DATE, CRT_TIME
            ) VALUES (
              :baljpno, :balseq, :itnbr, :pspec,
              :gudat, :nadat, :balqty, 0, :blqty,
              '1', :saupj, :ipdpt, :jcvcod,
              0, :wbalqty, :unprc, :unamt,
              'TEST', '20260304', '120000'
            )
          `, {
            baljpno,
            balseq: seq + 1,
            itnbr: item.ITNBR,
            pspec: site.jcvcod,
            gudat: '20260228',
            nadat: '20260304',
            balqty,
            blqty: balqty,
            wbalqty: balqty,
            saupj: site.saupj,
            ipdpt: site.ipdpt,
            jcvcod: site.jcvcod,
            unprc: 1500,
            unamt: balqty * 1500,
          });

          insertedData.push({
            baljpno,
            balseq: seq + 1,
            itnbr: item.ITNBR,
            itdsc: item.ITDSC,
            balqty,
            saupj: site.saupj,
            saupjLabel: site.label,
            ipdpt: site.ipdpt,
            jcvcod: site.jcvcod,
          });
        }
      }

      /* 커밋은 withTransaction이 자동 수행 */
    });

    return NextResponse.json({
      success: true,
      message: `4개 사업장 × 3품목 = 총 ${insertedData.length}건 투입 완료`,
      summary: {
        vendor: `${VENDOR_CVCOD} (한국프랜지)`,
        pomastCount: SITES.length,
        poblktCount: insertedData.length,
        baljpnoList: SITES.map((_, i) => `${BALJPNO_PREFIX}0${i + 1}`),
      },
      data: insertedData,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[seed-data] INSERT 오류:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * 테스트 데이터 삭제
 */
export async function DELETE() {
  try {
    /* POBLKT_HIST 먼저 삭제 (출발처리로 생성된 이력) */
    const histDel = await execute(`
      DELETE FROM POBLKT_HIST WHERE BALJPNO LIKE '${BALJPNO_PREFIX}%'
    `);

    /* POBLKT 삭제 */
    const poblktDel = await execute(`
      DELETE FROM POBLKT WHERE BALJPNO LIKE '${BALJPNO_PREFIX}%'
    `);

    /* POMAST 삭제 */
    const pomastDel = await execute(`
      DELETE FROM POMAST WHERE BALJPNO LIKE '${BALJPNO_PREFIX}%'
    `);

    return NextResponse.json({
      success: true,
      message: '테스트 데이터 삭제 완료',
      deleted: {
        poblkt_hist: histDel,
        poblkt: poblktDel,
        pomast: pomastDel,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[seed-data] DELETE 오류:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
