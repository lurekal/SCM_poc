/**
 * 편집 가능 데이터 그리드 컴포넌트
 *
 * TanStack Table 기반으로 체크박스 선택, 셀 편집, 행 상태 추적을 지원합니다.
 * PB의 dw_list (편집 가능 DataWindow)를 대체합니다.
 */
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  Row,
} from '@tanstack/react-table';

/* ========================================
 * 타입 정의
 * ======================================== */

/** 셀 편집 유형 */
export type CellEditType = 'text' | 'number' | 'readonly';

/** 컬럼 정의 확장 (편집 설정 포함) */
export interface GridColumnDef<T> {
  /** 컬럼 접근 키 */
  accessorKey: string;
  /** 컬럼 헤더 텍스트 */
  header: string;
  /** 셀 편집 유형 (기본: readonly) */
  editType?: CellEditType;
  /** 컬럼 너비 (px) */
  size?: number;
  /** 최소 너비 (px) */
  minSize?: number;
  /** 셀 포맷터 (표시용 변환) */
  formatter?: (value: unknown, row: T) => string;
  /** 셀 정렬 */
  align?: 'left' | 'center' | 'right';
}

/** DataGrid 속성 */
interface DataGridProps<T extends object> {
  /** 그리드 데이터 */
  data: T[];
  /** 컬럼 정의 목록 */
  columns: GridColumnDef<T>[];
  /** 체크박스 컬럼 사용 여부 */
  showCheckbox?: boolean;
  /** 체크 필드 키 (기본: 'checks') */
  checkField?: string;
  /** 체크 값: 체크됨 (기본: 'T') */
  checkedValue?: string;
  /** 체크 값: 해제됨 (기본: 'F') */
  uncheckedValue?: string;
  /** 데이터 변경 콜백 */
  onDataChange?: (data: T[]) => void;
  /** 행 체크 변경 콜백 */
  onCheckChange?: (rowIndex: number, checked: boolean) => void;
  /** 전체 선택/해제 콜백 */
  onCheckAll?: (checked: boolean) => void;
  /** 그리드 높이 (기본: '400px') */
  height?: string;
  /** 행 번호 표시 여부 */
  showRowNumber?: boolean;
  /** 그룹 체크 모드: 같은 그룹키를 가진 행들을 함께 체크 */
  groupCheckField?: string;
}

/* ========================================
 * 컴포넌트 본체
 * ======================================== */

export default function DataGrid<T extends object>({
  data,
  columns,
  showCheckbox = true,
  checkField = 'checks',
  checkedValue = 'T',
  uncheckedValue = 'F',
  onDataChange,
  onCheckChange,
  onCheckAll,
  height = '400px',
  showRowNumber = true,
  groupCheckField,
}: DataGridProps<T>) {
  /* 편집 중인 셀 정보 */
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    columnKey: string;
  } | null>(null);

  /* 행 데이터를 Record로 캐스팅하여 동적 키 접근을 허용하는 헬퍼 */
  const getField = (row: T, key: string): unknown =>
    (row as Record<string, unknown>)[key];

  /** 전체 선택 상태 계산 */
  const allChecked = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) => getField(row, checkField) === checkedValue);
  }, [data, checkField, checkedValue]);

  /** 체크된 행 수 */
  const checkedCount = useMemo(() => {
    return data.filter((row) => getField(row, checkField) === checkedValue).length;
  }, [data, checkField, checkedValue]);

  /** 전체 선택/해제 토글 */
  const handleCheckAll = useCallback(() => {
    const newChecked = !allChecked;
    const newData = data.map((row) => ({
      ...row,
      [checkField]: newChecked ? checkedValue : uncheckedValue,
    }));
    onDataChange?.(newData);
    onCheckAll?.(newChecked);
  }, [allChecked, data, checkField, checkedValue, uncheckedValue, onDataChange, onCheckAll]);

  /** 개별 행 체크 토글 */
  const handleCheckRow = useCallback(
    (rowIndex: number) => {
      const currentRow = data[rowIndex];
      const isChecked = getField(currentRow, checkField) === checkedValue;
      const newValue = isChecked ? uncheckedValue : checkedValue;

      let newData: T[];

      /* 그룹 체크 모드: 같은 그룹키의 행들을 함께 체크/해제 */
      if (groupCheckField && getField(currentRow, groupCheckField)) {
        const groupKey = getField(currentRow, groupCheckField);
        newData = data.map((row) =>
          getField(row, groupCheckField) === groupKey
            ? { ...row, [checkField]: newValue }
            : row
        );
      } else {
        newData = data.map((row, i) =>
          i === rowIndex ? { ...row, [checkField]: newValue } : row
        );
      }

      onDataChange?.(newData);
      onCheckChange?.(rowIndex, !isChecked);
    },
    [data, checkField, checkedValue, uncheckedValue, groupCheckField, onDataChange, onCheckChange]
  );

  /** 셀 값 변경 핸들러 */
  const handleCellChange = useCallback(
    (rowIndex: number, columnKey: string, value: unknown) => {
      const newData = data.map((row, i) =>
        i === rowIndex ? { ...row, [columnKey]: value } : row
      );
      onDataChange?.(newData);
    },
    [data, onDataChange]
  );

  /** TanStack Table 컬럼 정의 변환 */
  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    /* 행 번호 컬럼 */
    if (showRowNumber) {
      cols.push({
        id: '_rowNum',
        header: 'No',
        size: 50,
        cell: ({ row }) => (
          <span className="text-gray-500 text-xs">{row.index + 1}</span>
        ),
      });
    }

    /* 체크박스 컬럼 */
    if (showCheckbox) {
      cols.push({
        id: '_checkbox',
        header: () => (
          <input
            type="checkbox"
            checked={allChecked}
            onChange={handleCheckAll}
            className="w-4 h-4 cursor-pointer"
            title="전체 선택/해제"
          />
        ),
        size: 40,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={getField(row.original, checkField) === checkedValue}
            onChange={() => handleCheckRow(row.index)}
            className="w-4 h-4 cursor-pointer"
          />
        ),
      });
    }

    /* 사용자 정의 컬럼 */
    columns.forEach((col) => {
      cols.push({
        id: col.accessorKey,
        accessorKey: col.accessorKey,
        header: col.header,
        size: col.size || 120,
        minSize: col.minSize || 50,
        cell: ({ row, getValue }) => {
          const value = getValue();
          const isEditing =
            editingCell?.rowIndex === row.index &&
            editingCell?.columnKey === col.accessorKey;

          /* 편집 모드 */
          if (isEditing && col.editType && col.editType !== 'readonly') {
            return (
              <EditableCell
                value={value}
                type={col.editType}
                onSave={(newValue) => {
                  handleCellChange(row.index, col.accessorKey, newValue);
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          /* 표시 모드 */
          const displayValue = col.formatter
            ? col.formatter(value, row.original)
            : String(value ?? '');

          /* 편집 가능한 셀은 더블클릭으로 편집 모드 진입 */
          if (col.editType && col.editType !== 'readonly') {
            return (
              <span
                className="cursor-pointer hover:bg-blue-50 block w-full px-1"
                onDoubleClick={() =>
                  setEditingCell({ rowIndex: row.index, columnKey: col.accessorKey })
                }
                title="더블클릭하여 편집"
              >
                {displayValue}
              </span>
            );
          }

          return <span className="px-1">{displayValue}</span>;
        },
      });
    });

    return cols;
  }, [
    columns, showCheckbox, showRowNumber, allChecked, checkField,
    checkedValue, editingCell, handleCheckAll, handleCheckRow, handleCellChange,
  ]);

  /* TanStack Table 인스턴스 */
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      {/* 그리드 정보 바 */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-50 text-xs text-gray-600 border-b">
        <span>
          전체: {data.length}건
          {showCheckbox && ` | 선택: ${checkedCount}건`}
        </span>
        <span className="text-gray-400">더블클릭으로 셀 편집</span>
      </div>

      {/* 테이블 스크롤 컨테이너 */}
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <table className="w-full border-collapse text-sm">
          {/* 테이블 헤더 */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-700
                      border-b border-r border-gray-200 whitespace-nowrap"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* 테이블 본문 */}
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="text-center py-8 text-gray-400"
                >
                  조회된 데이터가 없습니다
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-50 border-b border-gray-100
                    ${getField(row.original, checkField) === checkedValue ? 'bg-blue-50/50' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========================================
 * 편집 셀 하위 컴포넌트
 * ======================================== */

/**
 * 인라인 편집 셀 컴포넌트
 *
 * 셀을 더블클릭하면 표시되는 입력 필드입니다.
 * Enter로 저장, Escape로 취소합니다.
 */
function EditableCell({
  value,
  type,
  onSave,
  onCancel,
}: {
  value: unknown;
  type: CellEditType;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}) {
  const [editValue, setEditValue] = useState(String(value ?? ''));

  /** 키보드 이벤트 핸들러 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      /* Enter: 저장 */
      const finalValue = type === 'number' ? Number(editValue) || 0 : editValue;
      onSave(finalValue);
    } else if (e.key === 'Escape') {
      /* Escape: 취소 */
      onCancel();
    }
  };

  return (
    <input
      type={type === 'number' ? 'number' : 'text'}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        /* 포커스 해제 시 저장 */
        const finalValue = type === 'number' ? Number(editValue) || 0 : editValue;
        onSave(finalValue);
      }}
      autoFocus
      className="w-full px-1 py-0.5 text-sm border border-blue-500 rounded
        focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
    />
  );
}
