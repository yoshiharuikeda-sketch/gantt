'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, GridReadyEvent, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import type { Task, Phase } from '@/types'
import { Plus } from 'lucide-react'
import AddTaskModal from '@/components/gantt/AddTaskModal'

// Flat row type for the grid
type TaskRow = Task & { phaseName: string; phaseColor: string }

const STATUS_LABELS: Record<string, string> = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  blocked: 'ブロック中',
}

const STATUS_VALUES = ['not_started', 'in_progress', 'completed', 'blocked']

export default function TaskSheet() {
  const { tasks, phases, upsertTask } = useTaskStore()
  const { currentUserRole, members } = useProjectStore()
  const gridRef = useRef<AgGridReact>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor'

  const phaseMap = useMemo(
    () => Object.fromEntries(phases.map((p) => [p.id, p])),
    [phases]
  )

  const memberMap = useMemo(
    () => Object.fromEntries(
      members.map((m) => [m.user_id, m.profiles?.display_name ?? m.profiles?.email ?? m.user_id])
    ),
    [members]
  )

  const rowData: TaskRow[] = useMemo(
    () =>
      tasks.map((t) => {
        const phase = t.phase_id ? phaseMap[t.phase_id] : null
        return {
          ...t,
          phaseName: phase?.name ?? 'フェーズなし',
          phaseColor: phase?.color ?? '#94a3b8',
        }
      }),
    [tasks, phaseMap]
  )

  const patchTask = useCallback(
    async (taskId: string, field: string, value: unknown, currentVersion: number) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      // Optimistic update
      upsertTask({ ...task, [field]: value })

      try {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskId, [field]: value, version: currentVersion }),
        })

        if (!res.ok) {
          upsertTask(task) // rollback
          const data = await res.json()
          console.error('更新エラー:', data.error)
        } else {
          const updated = await res.json()
          upsertTask(updated)
        }
      } catch {
        upsertTask(task)
      }
    },
    [tasks, upsertTask]
  )

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<TaskRow>) => {
      if (!event.data) return
      const field = event.colDef.field as string
      patchTask(event.data.id, field, event.newValue, event.data.version)
    },
    [patchTask]
  )

  const colDefs: ColDef<TaskRow>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'タスク名',
        editable: canEdit,
        flex: 2,
        minWidth: 160,
        cellStyle: { fontWeight: 500 },
      },
      {
        field: 'phaseName',
        headerName: 'フェーズ',
        editable: false,
        width: 120,
        cellRenderer: (params: { data: TaskRow }) => {
          if (!params.data) return null
          return (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: params.data.phaseColor }}
              />
              <span className="text-xs">{params.data.phaseName}</span>
            </div>
          )
        },
      },
      {
        field: 'status',
        headerName: 'ステータス',
        editable: canEdit,
        width: 120,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: STATUS_VALUES },
        valueFormatter: (params: ValueFormatterParams) =>
          STATUS_LABELS[params.value] ?? params.value,
        cellStyle: (params) => {
          const colors: Record<string, string> = {
            not_started: '#94a3b8',
            in_progress: '#3b82f6',
            completed: '#22c55e',
            blocked: '#ef4444',
          }
          return { color: colors[params.value] ?? '#666', fontWeight: 500 }
        },
      },
      {
        field: 'progress',
        headerName: '進捗 (%)',
        editable: canEdit,
        width: 100,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100, step: 5 },
        valueParser: (params) => Math.min(100, Math.max(0, Number(params.newValue))),
        cellRenderer: (params: { value: number }) => (
          <div className="flex items-center gap-2 h-full">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${params.value ?? 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 w-8 text-right">{params.value ?? 0}%</span>
          </div>
        ),
      },
      {
        field: 'start_date',
        headerName: '開始日',
        editable: canEdit,
        width: 110,
        cellEditor: 'agDateStringCellEditor',
      },
      {
        field: 'end_date',
        headerName: '終了日',
        editable: canEdit,
        width: 110,
        cellEditor: 'agDateStringCellEditor',
      },
      {
        field: 'assignee_id',
        headerName: '担当者',
        editable: false,
        width: 120,
        valueGetter: (params: ValueGetterParams<TaskRow>) =>
          params.data?.assignee_id ? memberMap[params.data.assignee_id] ?? '不明' : '未割り当て',
      },
    ],
    [canEdit, memberMap]
  )

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <span className="text-xs text-gray-500">{tasks.length} タスク</span>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            タスク追加
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 ag-theme-alpine">
        <AgGridReact<TaskRow>
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          onCellValueChanged={onCellValueChanged}
          rowHeight={36}
          headerHeight={40}
          suppressMovableColumns
          enableCellTextSelection
          stopEditingWhenCellsLoseFocus
          defaultColDef={{
            sortable: true,
            resizable: true,
          }}
        />
      </div>

      {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
