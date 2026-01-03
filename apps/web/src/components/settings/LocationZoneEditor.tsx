'use client'

/**
 * LocationZoneEditor Component - Story 40.2
 *
 * UI for managing location zones.
 *
 * Acceptance Criteria:
 * - AC1: Location Definitions (Home 1, Home 2, School, Other)
 * - AC4: Geofence Configuration (100-2000m radius, default 500m)
 * - AC6: Location Rule Preview
 *
 * UI/UX Requirements:
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 contrast ratio (NFR45)
 * - Keyboard accessible (NFR43)
 */

import { useState, useCallback } from 'react'
import type { LocationZone, LocationZoneType } from '@fledgely/shared'

export interface LocationZoneEditorProps {
  /** List of existing zones */
  zones: LocationZone[]
  /** Callback when zone is created */
  onCreateZone: (zone: Omit<LocationZone, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>) => void
  /** Callback when zone is updated */
  onUpdateZone: (zoneId: string, updates: Partial<LocationZone>) => void
  /** Callback when zone is deleted */
  onDeleteZone: (zoneId: string) => void
  /** Whether any action is in progress */
  loading?: boolean
  /** Error message to display */
  error?: string | null
}

const ZONE_TYPES: { value: LocationZoneType; label: string }[] = [
  { value: 'home_1', label: 'Home 1' },
  { value: 'home_2', label: 'Home 2' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
]

const MIN_RADIUS = 100
const MAX_RADIUS = 2000
const DEFAULT_RADIUS = 500

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  addButton: {
    minHeight: '44px',
    minWidth: '44px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  zoneList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '20px',
  },
  zoneCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  zoneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  zoneName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  zoneType: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  zoneDetails: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  zoneActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    minHeight: '36px',
    minWidth: '44px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButton: {
    minHeight: '36px',
    minWidth: '44px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#dc2626',
    backgroundColor: '#ffffff',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#6b7280',
    fontSize: '14px',
  },
  form: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
  },
  coordinateRow: {
    display: 'flex',
    gap: '12px',
  },
  coordinateInput: {
    flex: 1,
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  slider: {
    flex: 1,
    minHeight: '44px',
  },
  sliderValue: {
    fontSize: '14px',
    color: '#374151',
    minWidth: '60px',
    textAlign: 'right' as const,
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelButton: {
    flex: 1,
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveButton: {
    flex: 1,
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#dc2626',
  },
  preview: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '16px',
    fontSize: '13px',
    color: '#1e40af',
  },
}

interface ZoneFormData {
  name: string
  type: LocationZoneType
  latitude: string
  longitude: string
  radiusMeters: number
  address: string
}

const initialFormData: ZoneFormData = {
  name: '',
  type: 'home_1',
  latitude: '',
  longitude: '',
  radiusMeters: DEFAULT_RADIUS,
  address: '',
}

export function LocationZoneEditor({
  zones,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  loading = false,
  error = null,
}: LocationZoneEditorProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ZoneFormData>(initialFormData)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleAddClick = useCallback(() => {
    setEditingZoneId(null)
    setFormData(initialFormData)
    setShowForm(true)
  }, [])

  const handleEditClick = useCallback((zone: LocationZone) => {
    setEditingZoneId(zone.id)
    setFormData({
      name: zone.name,
      type: zone.type,
      latitude: zone.latitude.toString(),
      longitude: zone.longitude.toString(),
      radiusMeters: zone.radiusMeters,
      address: zone.address || '',
    })
    setShowForm(true)
  }, [])

  const handleDeleteClick = useCallback(
    (zoneId: string) => {
      if (confirmDelete === zoneId) {
        onDeleteZone(zoneId)
        setConfirmDelete(null)
      } else {
        setConfirmDelete(zoneId)
      }
    },
    [confirmDelete, onDeleteZone]
  )

  const handleCancel = useCallback(() => {
    setShowForm(false)
    setEditingZoneId(null)
    setFormData(initialFormData)
  }, [])

  const handleSave = useCallback(() => {
    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)

    if (isNaN(lat) || isNaN(lng)) {
      return // Validation handled by form
    }

    const zoneData = {
      name: formData.name,
      type: formData.type,
      latitude: lat,
      longitude: lng,
      radiusMeters: formData.radiusMeters,
      address: formData.address || null,
    }

    if (editingZoneId) {
      onUpdateZone(editingZoneId, zoneData)
    } else {
      onCreateZone(zoneData)
    }

    handleCancel()
  }, [formData, editingZoneId, onCreateZone, onUpdateZone, handleCancel])

  const isFormValid =
    formData.name.trim() &&
    formData.latitude &&
    formData.longitude &&
    !isNaN(parseFloat(formData.latitude)) &&
    !isNaN(parseFloat(formData.longitude)) &&
    parseFloat(formData.latitude) >= -90 &&
    parseFloat(formData.latitude) <= 90 &&
    parseFloat(formData.longitude) >= -180 &&
    parseFloat(formData.longitude) <= 180

  const getZoneTypeLabel = (type: LocationZoneType) => {
    return ZONE_TYPES.find((t) => t.value === type)?.label || type
  }

  return (
    <div style={styles.container} data-testid="location-zone-editor">
      <div style={styles.header}>
        <h2 style={styles.title}>Location Zones</h2>
        {!showForm && (
          <button
            style={{ ...styles.addButton, ...(loading ? styles.buttonDisabled : {}) }}
            onClick={handleAddClick}
            disabled={loading}
            data-testid="add-zone-button"
            aria-label="Add new location zone"
          >
            + Add Zone
          </button>
        )}
      </div>

      {error && (
        <div style={styles.error} role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Zone Form */}
      {showForm && (
        <div style={styles.form} data-testid="zone-form">
          <h3 style={styles.formTitle}>{editingZoneId ? 'Edit Zone' : 'Add New Zone'}</h3>

          <div style={styles.formGroup}>
            <label htmlFor="zone-name" style={styles.label}>
              Zone Name
            </label>
            <input
              id="zone-name"
              type="text"
              style={styles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mom's House, Lincoln Elementary"
              data-testid="zone-name-input"
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="zone-type" style={styles.label}>
              Zone Type
            </label>
            <select
              id="zone-type"
              style={styles.select}
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as LocationZoneType })
              }
              data-testid="zone-type-select"
            >
              {ZONE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Coordinates</label>
            <div style={styles.coordinateRow}>
              <div style={styles.coordinateInput}>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="Latitude (-90 to 90)"
                  min={-90}
                  max={90}
                  step="any"
                  data-testid="latitude-input"
                  aria-label="Latitude"
                />
              </div>
              <div style={styles.coordinateInput}>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="Longitude (-180 to 180)"
                  min={-180}
                  max={180}
                  step="any"
                  data-testid="longitude-input"
                  aria-label="Longitude"
                />
              </div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="zone-radius" style={styles.label}>
              Geofence Radius
            </label>
            <div style={styles.sliderContainer}>
              <input
                id="zone-radius"
                type="range"
                style={styles.slider}
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                step={50}
                value={formData.radiusMeters}
                onChange={(e) =>
                  setFormData({ ...formData, radiusMeters: parseInt(e.target.value, 10) })
                }
                data-testid="radius-slider"
              />
              <span style={styles.sliderValue} data-testid="radius-value">
                {formData.radiusMeters}m
              </span>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="zone-address" style={styles.label}>
              Address (Optional)
            </label>
            <input
              id="zone-address"
              type="text"
              style={styles.input}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State"
              data-testid="address-input"
            />
          </div>

          {/* Preview */}
          {isFormValid && (
            <div style={styles.preview} data-testid="zone-preview">
              <strong>Preview:</strong> {formData.name} ({getZoneTypeLabel(formData.type)}) -{' '}
              {formData.radiusMeters}m radius at ({parseFloat(formData.latitude).toFixed(4)},{' '}
              {parseFloat(formData.longitude).toFixed(4)})
            </div>
          )}

          <div style={styles.formActions}>
            <button style={styles.cancelButton} onClick={handleCancel} data-testid="cancel-button">
              Cancel
            </button>
            <button
              style={{
                ...styles.saveButton,
                ...(!isFormValid || loading ? styles.buttonDisabled : {}),
              }}
              onClick={handleSave}
              disabled={!isFormValid || loading}
              data-testid="save-button"
            >
              {loading ? 'Saving...' : editingZoneId ? 'Update Zone' : 'Create Zone'}
            </button>
          </div>
        </div>
      )}

      {/* Zone List */}
      {!showForm && (
        <div style={styles.zoneList} data-testid="zone-list">
          {zones.length === 0 ? (
            <div style={styles.emptyState} data-testid="empty-state">
              No location zones configured. Add a zone to set location-specific rules.
            </div>
          ) : (
            zones.map((zone) => (
              <div key={zone.id} style={styles.zoneCard} data-testid={`zone-card-${zone.id}`}>
                <div style={styles.zoneHeader}>
                  <h3 style={styles.zoneName}>{zone.name}</h3>
                  <span style={styles.zoneType}>{getZoneTypeLabel(zone.type)}</span>
                </div>
                <div style={styles.zoneDetails}>
                  {zone.radiusMeters}m radius
                  {zone.address && <> • {zone.address}</>}
                </div>
                <div style={styles.zoneActions}>
                  <button
                    style={{ ...styles.editButton, ...(loading ? styles.buttonDisabled : {}) }}
                    onClick={() => handleEditClick(zone)}
                    disabled={loading}
                    data-testid={`edit-zone-${zone.id}`}
                    aria-label={`Edit ${zone.name}`}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.deleteButton, ...(loading ? styles.buttonDisabled : {}) }}
                    onClick={() => handleDeleteClick(zone.id)}
                    disabled={loading}
                    data-testid={`delete-zone-${zone.id}`}
                    aria-label={
                      confirmDelete === zone.id
                        ? `Confirm delete ${zone.name}`
                        : `Delete ${zone.name}`
                    }
                  >
                    {confirmDelete === zone.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default LocationZoneEditor
