import { create } from 'zustand'

type ViewMode = 'gantt' | 'sheet'
type ZoomLevel = 'day' | 'week' | 'month'
export type GanttColKey = 'name' | 'start_date' | 'end_date' | 'progress' | 'updated_at'

interface UIStore {
  viewMode: ViewMode
  zoomLevel: ZoomLevel
  ganttColumns: GanttColKey[]
  setViewMode: (mode: ViewMode) => void
  setZoomLevel: (level: ZoomLevel) => void
  setGanttColumns: (cols: GanttColKey[]) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'gantt',
  zoomLevel: 'week',
  ganttColumns: ['name', 'start_date', 'end_date', 'progress', 'updated_at'],
  setViewMode: (viewMode) => set({ viewMode }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  setGanttColumns: (ganttColumns) => set({ ganttColumns }),
}))
