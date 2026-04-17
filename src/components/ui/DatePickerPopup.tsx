'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
  isToday as isTodayFn,
} from 'date-fns'
import { ja } from 'date-fns/locale'

interface DatePickerPopupProps {
  value: string | null
  anchorRect: DOMRect
  onChange: (date: string | null) => void
  onClose: () => void
}

const DAY_HEADERS = ['月', '火', '水', '木', '金', '土', '日']

export default function DatePickerPopup({
  value,
  anchorRect,
  onChange,
  onClose,
}: DatePickerPopupProps) {
  const initialDate = value ? new Date(value) : new Date()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate))
  const popupRef = useRef<HTMLDivElement>(null)

  // Position below anchor, adjust if near screen edge
  const POPUP_WIDTH = 240
  const left = Math.min(
    anchorRect.left,
    window.innerWidth - POPUP_WIDTH - 8
  )
  const top = anchorRect.bottom + 4

  // Close on outside mousedown (50ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
          onClose()
        }
      }
      window.addEventListener('mousedown', handler)
      return () => window.removeEventListener('mousedown', handler)
    }, 50)
    return () => clearTimeout(timer)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const selectedDate = value ? new Date(value) : null
  const today = new Date()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Monday-based week offset for first day: (getDay(day) + 6) % 7
  const firstDayOffset = (getDay(monthStart) + 6) % 7

  const handleDayClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'))
    onClose()
  }

  const handleTodayClick = () => {
    onChange(format(today, 'yyyy-MM-dd'))
    onClose()
  }

  const handleClearClick = () => {
    onChange(null)
    onClose()
  }

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl"
      style={{ top, left, width: POPUP_WIDTH }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="p-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[10px] font-medium py-0.5 ${
                i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day) => {
            const dayOfWeek = (getDay(day) + 6) % 7 // Mon=0..Sun=6
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const isDayToday = isTodayFn(day)

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  w-full aspect-square flex items-center justify-center text-[11px] rounded transition-colors
                  ${isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : isDayToday
                    ? 'bg-blue-50 ring-1 ring-blue-400 text-blue-700 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                  ${!isSelected && dayOfWeek === 5 ? 'text-blue-500' : ''}
                  ${!isSelected && dayOfWeek === 6 ? 'text-red-500' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-1.5 px-2 pb-2">
        <button
          type="button"
          onClick={handleTodayClick}
          className="flex-1 py-1 text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors font-medium"
        >
          今日
        </button>
        <button
          type="button"
          onClick={handleClearClick}
          className="flex-1 py-1 text-[11px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
        >
          クリア
        </button>
      </div>
    </div>,
    document.body
  )
}
