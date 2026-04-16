import { create } from 'zustand'
import type { Task, Phase } from '@/types'

interface TaskStore {
  tasks: Task[]
  phases: Phase[]
  setTasks: (tasks: Task[]) => void
  setPhases: (phases: Phase[]) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  addTask: (task: Task) => void
  removeTask: (id: string) => void
  upsertTask: (task: Task) => void
  addPhase: (phase: Phase) => void
  upsertPhase: (phase: Phase) => void
  removePhase: (id: string) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  phases: [],
  setTasks: (tasks) => set({ tasks }),
  setPhases: (phases) => set({ phases }),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  upsertTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((t) => t.id === task.id)
      if (exists) {
        return { tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) }
      }
      return { tasks: [...state.tasks, task] }
    }),
  addPhase: (phase) => set((state) => ({ phases: [...state.phases, phase] })),
  upsertPhase: (phase) =>
    set((state) => {
      const exists = state.phases.some((p) => p.id === phase.id)
      if (exists) {
        return { phases: state.phases.map((p) => (p.id === phase.id ? phase : p)) }
      }
      return { phases: [...state.phases, phase] }
    }),
  removePhase: (id) =>
    set((state) => ({ phases: state.phases.filter((p) => p.id !== id) })),
}))
