'use client'

/**
 * DeviceTypeSelector Component - Story 12.1
 *
 * Allows parent to select device type for enrollment.
 * Currently only supports Chromebook (AC2).
 *
 * Requirements:
 * - AC2: Device Type Selection
 */

import { useState } from 'react'

export type DeviceType = 'chromebook'

interface DeviceTypeSelectorProps {
  onSelect: (deviceType: DeviceType) => void
  disabled?: boolean
}

interface DeviceOption {
  id: DeviceType
  name: string
  description: string
  icon: string
  available: boolean
}

const DEVICE_OPTIONS: DeviceOption[] = [
  {
    id: 'chromebook',
    name: 'Chromebook',
    description: 'Chrome OS laptop or tablet',
    icon: '💻',
    available: true,
  },
  // Future device types can be added here
  // {
  //   id: 'android',
  //   name: 'Android',
  //   description: 'Android phone or tablet',
  //   icon: '📱',
  //   available: false,
  // },
]

export function DeviceTypeSelector({ onSelect, disabled = false }: DeviceTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null)

  const handleSelect = (deviceType: DeviceType) => {
    if (disabled) return
    setSelectedType(deviceType)
  }

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {DEVICE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={!option.available || disabled}
            className={`
              p-4 border rounded-lg text-left transition-all
              ${selectedType === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
              ${!option.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{option.icon}</span>
              <div>
                <div className="font-medium text-gray-900">
                  {option.name}
                  {!option.available && (
                    <span className="ml-2 text-xs text-gray-500">(Coming soon)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedType || disabled}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  )
}
