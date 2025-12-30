/**
 * Safety Document Viewer Component.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * Displays safety documents inline for admin review.
 * Supports PDFs, images, and provides download for other formats.
 *
 * SECURITY NOTE:
 * Documents are accessed via short-lived signed URLs generated
 * by the getSafetyDocument callable function. Access is logged.
 */

'use client'

import React, { useState } from 'react'

export interface SafetyDocumentViewerProps {
  /** Signed URL for the document */
  url: string
  /** MIME type of the document */
  mimeType: string
  /** Original filename */
  filename: string
  /** Callback when viewer is closed */
  onClose: () => void
}

/**
 * Check if MIME type is an image.
 */
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Check if MIME type is a PDF.
 */
function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Safety Document Viewer Component.
 */
export function SafetyDocumentViewer({
  url,
  mimeType,
  filename,
  onClose,
}: SafetyDocumentViewerProps) {
  const [imageZoom, setImageZoom] = useState(1)
  const [loadError, setLoadError] = useState(false)

  /**
   * Handle zoom in.
   */
  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.25, 3))
  }

  /**
   * Handle zoom out.
   */
  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  /**
   * Handle reset zoom.
   */
  const handleResetZoom = () => {
    setImageZoom(1)
  }

  /**
   * Handle download.
   */
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === '+' || e.key === '=') {
      handleZoomIn()
    } else if (e.key === '-') {
      handleZoomOut()
    } else if (e.key === '0') {
      handleResetZoom()
    }
  }

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`Document viewer: ${filename}`}
      tabIndex={0}
    >
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <h2 style={styles.filename}>{filename}</h2>
            <span style={styles.mimeType}>{mimeType}</span>
          </div>
          <div style={styles.headerActions}>
            {isImage(mimeType) && (
              <>
                <button onClick={handleZoomOut} style={styles.iconButton} title="Zoom out (-)">
                  −
                </button>
                <span style={styles.zoomLevel}>{Math.round(imageZoom * 100)}%</span>
                <button onClick={handleZoomIn} style={styles.iconButton} title="Zoom in (+)">
                  +
                </button>
                <button onClick={handleResetZoom} style={styles.iconButton} title="Reset zoom (0)">
                  ⟲
                </button>
              </>
            )}
            <button onClick={handleDownload} style={styles.downloadButton}>
              Download
            </button>
            <button onClick={onClose} style={styles.closeButton} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loadError ? (
            <div style={styles.errorState}>
              <p>Unable to display this document.</p>
              <button onClick={handleDownload} style={styles.downloadButton}>
                Download Instead
              </button>
            </div>
          ) : isPdf(mimeType) ? (
            <iframe
              src={url}
              style={styles.pdfViewer}
              title={filename}
              onError={() => setLoadError(true)}
            />
          ) : isImage(mimeType) ? (
            <div style={styles.imageContainer}>
              <img
                src={url}
                alt={filename}
                style={{
                  ...styles.image,
                  transform: `scale(${imageZoom})`,
                }}
                onError={() => setLoadError(true)}
              />
            </div>
          ) : (
            <div style={styles.unsupportedType}>
              <p style={styles.unsupportedText}>
                This file type ({mimeType}) cannot be previewed inline.
              </p>
              <button onClick={handleDownload} style={styles.downloadButton}>
                Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90vw',
    height: '90vh',
    maxWidth: '1200px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filename: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  mimeType: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#374151',
  },
  zoomLevel: {
    fontSize: '12px',
    color: '#6b7280',
    minWidth: '48px',
    textAlign: 'center',
  },
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#374151',
    marginLeft: '8px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#f3f4f6',
  },
  pdfViewer: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    transition: 'transform 0.2s ease',
  },
  unsupportedType: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
  },
  unsupportedText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    color: '#6b7280',
  },
}

export default SafetyDocumentViewer
