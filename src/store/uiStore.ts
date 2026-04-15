import { create } from 'zustand'

type ViewMode = 'gantt' | 'sheet'
type ZoomLevel = 'day' | 'week' | 'month'

interface UIStore {
  viewMode: ViewMode
  zoomLevel: ZoomLevel
  setViewMode: (mode: ViewMode) => void
  setZoomLevel: (level: ZoomLevel) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'gantt',
  zoomLevel: 'week',
  setViewMode: (viewMode) => set({ viewMode }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
}))
