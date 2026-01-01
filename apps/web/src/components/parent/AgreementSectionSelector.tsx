/**
 * AgreementSectionSelector Component - Story 34.1 (AC1)
 *
 * Allows parent to select which agreement sections to modify.
 * Supports multi-select with checkboxes.
 */

export interface AgreementSection {
  id: string
  name: string
  description: string
}

interface AgreementSectionSelectorProps {
  sections: AgreementSection[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
}

export function AgreementSectionSelector({
  sections,
  selectedIds,
  onSelectionChange,
}: AgreementSectionSelectorProps) {
  if (sections.length === 0) {
    return (
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        No sections available to modify.
      </div>
    )
  }

  const handleToggle = (sectionId: string) => {
    if (selectedIds.includes(sectionId)) {
      onSelectionChange(selectedIds.filter((id) => id !== sectionId))
    } else {
      onSelectionChange([...selectedIds, sectionId])
    }
  }

  return (
    <div role="group" aria-label="Agreement sections">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map((section) => (
          <label
            key={section.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 16,
              background: selectedIds.includes(section.id) ? '#f0fdf4' : '#fff',
              border: `1px solid ${selectedIds.includes(section.id) ? '#86efac' : '#e2e8f0'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(section.id)}
              onChange={() => handleToggle(section.id)}
              aria-label={section.name}
              style={{
                width: 20,
                height: 20,
                marginTop: 2,
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: 4,
                }}
              >
                {section.name}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                {section.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
