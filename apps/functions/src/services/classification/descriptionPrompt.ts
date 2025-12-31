/**
 * Description Prompt Builder
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3
 * Story 28.2: Description Quality Standards - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Builds prompts for generating accessibility descriptions of screenshots.
 * Descriptions help blind or visually impaired parents understand screenshot content.
 */

import { DESCRIPTION_CONFIG } from '@fledgely/shared'

/**
 * Quality guidelines for accessibility descriptions.
 *
 * Story 28.2: Description Quality Standards - AC1, AC2, AC3
 */
export const QUALITY_GUIDELINES = `
**Accessibility Best Practices (WCAG Compliance):**
- Use clear, simple sentence structure for text-to-speech
- NEVER use visual-only references (avoid "the red button", "as shown above", "the highlighted text")
- Describe actions and meaning, not just colors or positions
- Use factual, objective language throughout
- Write in present tense to describe what is currently visible

**Factual Description Standards:**
- Describe what IS visible, not what you think it means
- Use objective terms: "shows a chat conversation" NOT "appears to be arguing"
- Avoid speculation: "video game" NOT "violent game" (unless violence is objectively visible)
- Let the parent decide the significance of content
- Avoid judgmental language: describe objectively

**Sensitive Content Guidelines:**
- Describe sensitive content objectively without graphic detail
- Use clinical, age-appropriate language
- For explicit content: state "Contains adult/mature content" without reproducing it
- For concerning content: describe factually what is visible
- Flag sensitive content in the response for parent awareness

**Text Extraction (OCR) Guidelines:**
- Quote visible text exactly in double quotes with context
- For partial/unclear text: "Text reads 'Hel...' (partially visible)"
- Include: headings, menu items, chat messages, labels
- Note if text is too small or blurry to read

**App and Context Identification:**
- Identify apps by name when recognizable (YouTube, Chrome, Discord, etc.)
- Include website domains when visible in address bar
- Describe the activity: watching, browsing, chatting, gaming, reading
- Note if multiple apps or tabs are visible
`

/**
 * Examples of good vs bad descriptions for quality guidance.
 *
 * Story 28.2: Description Quality Standards - AC1
 */
export const QUALITY_EXAMPLES = `
**Good Description Examples:**
- "The YouTube app shows a paused video titled 'Minecraft Tutorial'"
- "A chat conversation is visible with messages between two users"
- "The browser shows a social media feed with several posts visible"

**Bad Description Examples (AVOID):**
- "The red play button is in the center" (visual-only reference)
- "The child appears to be wasting time on games" (judgmental)
- "This looks like a violent game" (speculation)
- "As you can see in the image..." (assumes sight)
`

/**
 * Build the prompt for generating an accessibility description.
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3
 * Story 28.2: Description Quality Standards - AC1-AC6
 *
 * The prompt instructs the AI to:
 * - Describe visible applications and their state (28.1 AC2)
 * - Extract and include visible text via OCR-like analysis (28.1 AC2, 28.2 AC4)
 * - Describe images and visual elements (28.1 AC2)
 * - Provide context about the activity (28.1 AC2, 28.2 AC5)
 * - Keep description between 100-300 words (28.1 AC3)
 * - Use clear, screen-reader-friendly language (28.1 AC1, 28.2 AC1)
 * - Handle sensitive content appropriately (28.2 AC3)
 * - Provide quality assessment for unclear images (28.2 AC6)
 *
 * @param url - Optional page URL for context
 * @param title - Optional page title for context
 * @returns Formatted prompt string for Gemini
 */
export function buildDescriptionPrompt(url?: string, title?: string): string {
  const contextHints = buildContextHints(url, title)

  return `You are generating an accessibility description for a screenshot to help a blind or visually impaired parent understand what their child was viewing on their device.

Your description will be read aloud by a screen reader, so use clear, descriptive language.

${contextHints}

${QUALITY_GUIDELINES}

${QUALITY_EXAMPLES}

**Instructions:**
1. Assess image quality first - if blurry, dark, or unclear, note this in imageQuality field
2. Identify what applications or websites are visible (by name when possible)
3. Read and extract any visible text (menus, messages, labels, headings) - quote exactly
4. Describe images, icons, or visual elements that convey meaning
5. Explain the overall activity or context (watching, browsing, chatting, gaming, etc.)
6. Note any sensitive or concerning content objectively (flag in isSensitiveContent)

**Requirements:**
- Write ${DESCRIPTION_CONFIG.MIN_WORDS}-${DESCRIPTION_CONFIG.MAX_WORDS} words
- Use clear, simple language suitable for screen readers
- Prioritize factual description over interpretation
- NEVER use visual-only references (colors, positions without context)
- If text is visible, include the actual text in double quotes
- If image is unclear, provide partial description with quality assessment

**Response Format:**
Return a JSON object with this structure:
{
  "description": "Your accessibility description here...",
  "wordCount": <number of words in description>,
  "appsIdentified": ["list", "of", "apps"],
  "hasText": true/false,
  "textExcerpt": "Brief excerpt of visible text if any",
  "imageQuality": "clear" | "partial" | "unclear",
  "confidenceScore": <0-100 confidence in description accuracy>,
  "isSensitiveContent": true/false
}

If the image is too unclear to describe meaningfully, set imageQuality to "unclear" and begin description with "Unable to fully describe: " followed by the reason and any partial information available.

Generate the description now.`
}

/**
 * Build context hints from URL and title.
 *
 * @param url - Optional page URL
 * @param title - Optional page title
 * @returns Context hints string or empty string
 */
function buildContextHints(url?: string, title?: string): string {
  const hints: string[] = []

  if (url) {
    try {
      const urlObj = new URL(url)
      hints.push(`**Website:** ${urlObj.hostname}`)
    } catch {
      // Invalid URL, skip
    }
  }

  if (title) {
    hints.push(`**Page Title:** ${title}`)
  }

  if (hints.length === 0) {
    return '**Context:** No URL or title available. Describe what you see in the screenshot.'
  }

  return hints.join('\n')
}

/**
 * Example description format for reference.
 *
 * This shows what a good accessibility description looks like.
 */
export const DESCRIPTION_EXAMPLE = `The screenshot shows a YouTube video page on the Chrome browser. The video player takes up most of the screen, displaying a paused gaming video with the title "Minecraft Building Tutorial - Medieval Castle" visible in large white text. The video thumbnail shows a detailed castle structure made of stone blocks.

Below the video player, there are standard YouTube controls including a play button, volume slider, and full-screen button. The video progress bar shows the video is about 5 minutes into an 18-minute video.

To the right of the video, there is a sidebar showing recommended videos, all appearing to be related to Minecraft content. The channel name "BuildMaster" is visible with a subscribe button next to it.

The browser's address bar at the top shows "youtube.com" and there are several browser tabs open, though their titles are not fully visible.`
