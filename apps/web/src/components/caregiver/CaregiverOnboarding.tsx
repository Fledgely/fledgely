'use client'

/**
 * CaregiverOnboarding - Story 19D.1
 *
 * Simple onboarding flow shown after a caregiver accepts an invitation.
 * Explains their limited "Status Viewer" access in clear, simple terms.
 *
 * Implements:
 * - AC4: Caregiver sees simple onboarding explaining their limited access
 * - NFR49: Uses large, clear UI suitable for older adults
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback } from 'react'

interface CaregiverOnboardingProps {
  familyName: string
  childNames: string[]
  onComplete: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px 40px',
    maxWidth: '560px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    transition: 'background-color 0.2s ease',
  },
  stepDotActive: {
    backgroundColor: '#7c3aed',
  },
  content: {
    textAlign: 'center' as const,
  },
  icon: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    margin: '0 auto 28px auto',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 16px 0',
    lineHeight: 1.3,
  },
  description: {
    fontSize: '1.125rem',
    color: '#6b7280',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
  },
  highlight: {
    color: '#7c3aed',
    fontWeight: 600,
  },
  featureList: {
    textAlign: 'left' as const,
    marginBottom: '32px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  featureItemLast: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px 0',
  },
  featureIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  featureIconCaution: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  featureDesc: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  childList: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    textAlign: 'left' as const,
  },
  childListTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  childName: {
    display: 'inline-block',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    fontSize: '15px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    margin: '4px 8px 4px 0',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '56px',
    padding: '16px 40px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    flex: 1,
    maxWidth: '240px',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '56px',
    padding: '16px 32px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '16px',
    fontWeight: 500,
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  successIcon: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    margin: '0 auto 28px auto',
  },
}

interface OnboardingStep {
  icon: string
  iconStyle: React.CSSProperties
  title: string
  description: React.ReactNode
  features?: Array<{
    icon: string
    iconStyle: React.CSSProperties
    title: string
    description: string
  }>
  showChildren?: boolean
}

export default function CaregiverOnboarding({
  familyName,
  childNames,
  onComplete,
}: CaregiverOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: OnboardingStep[] = [
    {
      icon: '🎉',
      iconStyle: styles.successIcon,
      title: `Welcome to ${familyName}!`,
      description: (
        <>
          You are now connected as a <span style={styles.highlight}>Status Viewer</span>. This means
          you can check in on how the children are doing with their screen time.
        </>
      ),
      showChildren: true,
    },
    {
      icon: '👀',
      iconStyle: styles.icon,
      title: 'What You Can See',
      description: 'Here is what you can do as a Status Viewer:',
      features: [
        {
          icon: '✓',
          iconStyle: styles.featureIcon,
          title: 'View status updates',
          description: 'See if children are on track or need attention with screen time',
        },
        {
          icon: '✓',
          iconStyle: styles.featureIcon,
          title: 'Check in anytime',
          description: 'Quick and easy way to see how things are going',
        },
        {
          icon: '📞',
          iconStyle: styles.featureIcon,
          title: 'Contact parents',
          description: 'Easily reach out if you have questions or concerns',
        },
      ],
    },
    {
      icon: '🔒',
      iconStyle: styles.icon,
      title: 'What You Cannot Do',
      description: "For the family's privacy and safety, some things are off-limits:",
      features: [
        {
          icon: '✗',
          iconStyle: styles.featureIconCaution,
          title: 'No detailed activity',
          description: 'You cannot see what apps or websites children use',
        },
        {
          icon: '✗',
          iconStyle: styles.featureIconCaution,
          title: 'No settings changes',
          description: 'You cannot change any family or child settings',
        },
        {
          icon: '✗',
          iconStyle: styles.featureIconCaution,
          title: 'No screenshots',
          description: 'You cannot view any screen captures',
        },
      ],
    },
  ]

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }, [isLastStep, onComplete])

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  return (
    <div style={styles.container} data-testid="caregiver-onboarding">
      <style>
        {`
          .onboarding-button:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .onboarding-button:hover:not(:disabled) {
            background-color: #6d28d9;
          }
          .onboarding-secondary:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
        `}
      </style>
      <div style={styles.card}>
        {/* Step indicator */}
        <div style={styles.stepIndicator} aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.stepDot,
                ...(index <= currentStep ? styles.stepDotActive : {}),
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div style={styles.content}>
          {/* Icon */}
          <div style={currentStepData.iconStyle} aria-hidden="true">
            {currentStepData.icon}
          </div>

          {/* Title and description */}
          <h1 style={styles.title} data-testid="onboarding-title">
            {currentStepData.title}
          </h1>
          <p style={styles.description}>{currentStepData.description}</p>

          {/* Children list (shown on first step) */}
          {currentStepData.showChildren && childNames.length > 0 && (
            <div style={styles.childList} data-testid="children-list">
              <p style={styles.childListTitle}>You can view updates for:</p>
              <div>
                {childNames.map((name, index) => (
                  <span key={index} style={styles.childName} data-testid={`child-name-${index}`}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Features list */}
          {currentStepData.features && (
            <div style={styles.featureList}>
              {currentStepData.features.map((feature, index) => (
                <div
                  key={index}
                  style={
                    index === currentStepData.features!.length - 1
                      ? styles.featureItemLast
                      : styles.featureItem
                  }
                  data-testid={`feature-${index}`}
                >
                  <div style={feature.iconStyle} aria-hidden="true">
                    {feature.icon}
                  </div>
                  <div style={styles.featureText}>
                    <p style={styles.featureTitle}>{feature.title}</p>
                    <p style={styles.featureDesc}>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={styles.buttonGroup}>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={styles.secondaryButton}
                className="onboarding-secondary"
                data-testid="back-button"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              style={styles.primaryButton}
              className="onboarding-button"
              data-testid={isLastStep ? 'complete-button' : 'next-button'}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
