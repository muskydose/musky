/**
 * MUSKY DOSE — NAVIGATION & TRANSITION UTILITIES
 */

/**
 * Manually starts the global page transition progress bar.
 * Useful before programmatic router.push() calls.
 */
export function startPageTransition() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('page-transition:start'));
  }
}

/**
 * Manually completes the global page transition progress bar.
 */
export function completePageTransition() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('page-transition:complete'));
  }
}

