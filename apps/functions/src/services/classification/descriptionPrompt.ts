/**
 * Description Prompt Builder
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3
 *
 * Builds prompts for generating accessibility descriptions of screenshots.
 * Descriptions help blind or visually impaired parents understand screenshot content.
 */

import { DESCRIPTION_CONFIG } from '@fledgely/shared'

/**
 * Build the prompt for generating an accessibility description.
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3
 *
 * The prompt instructs the AI to:
 * - Describe visible applications and their state (AC2)
 * - Extract and include visible text via OCR-like analysis (AC2)
 * - Describe images and visual elements (AC2)
 * - Provide context about the activity (AC2)
 * - Keep description between 100-300 words (AC3)
 * - Use clear, screen-reader-friendly language (AC1)
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

**Instructions:**
1. Describe what applications or websites are visible on screen
2. Read and include any visible text (menus, messages, labels, headings)
3. Describe images, icons, or visual elements that convey meaning
4. Explain the overall activity or context (what the user appears to be doing)
5. Note any concerning or notable content objectively

**Requirements:**
- Write ${DESCRIPTION_CONFIG.MIN_WORDS}-${DESCRIPTION_CONFIG.MAX_WORDS} words
- Use clear, simple language suitable for screen readers
- Prioritize factual description over interpretation
- Describe visual elements for someone who cannot see them
- If text is visible, include the actual text in quotes

**Response Format:**
Return a JSON object with this structure:
{
  "description": "Your accessibility description here...",
  "wordCount": <number of words in description>,
  "appsIdentified": ["list", "of", "apps"],
  "hasText": true/false,
  "textExcerpt": "Brief excerpt of visible text if any"
}

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
