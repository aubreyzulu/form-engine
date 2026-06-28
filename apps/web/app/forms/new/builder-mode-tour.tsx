'use client';

import { useEffect } from 'react';
import { driver, type Driver } from 'driver.js';

export const BUILDER_MODE_TOUR_STORAGE_KEY = 'form-engine.builder-mode-tour.v1';

export function BuilderModeTour() {
  useEffect(() => {
    if (hasSeenTour()) return;

    let tour: Driver | null = null;
    const timeout = window.setTimeout(() => {
      const tabs = document.querySelector('[data-builder-mode-tour="tabs"]');
      if (!tabs || hasSeenTour()) return;

      tour = driver({
        allowClose: true,
        doneBtnText: 'Got it',
        nextBtnText: 'Next',
        overlayClickBehavior: 'close',
        prevBtnText: 'Back',
        showProgress: true,
        stagePadding: 8,
        stageRadius: 8,
        onDestroyed: markTourSeen,
        steps: [
          {
            element: tabs,
            popover: {
              title: 'Builder and JSON modes',
              description:
                'Use Builder for everyday form editing. JSON shows the exact schema and uiSchema sent to the API.',
              side: 'bottom',
              align: 'center',
            },
          },
          {
            element: '[data-builder-mode-tour="builder"]',
            popover: {
              title: 'Builder',
              description:
                'Add fields, reorder them, and edit labels, option values, and validation without touching schema JSON.',
              side: 'bottom',
              align: 'center',
            },
          },
          {
            element: '[data-builder-mode-tour="json"]',
            popover: {
              title: 'JSON',
              description:
                'Inspect or paste the generated configuration when you need exact control. Applying valid JSON keeps the Builder in sync.',
              side: 'bottom',
              align: 'center',
            },
          },
        ],
      });
      tour.drive();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      if (tour?.isActive()) tour.destroy();
    };
  }, []);

  return null;
}

function hasSeenTour() {
  try {
    return window.localStorage.getItem(BUILDER_MODE_TOUR_STORAGE_KEY) === 'seen';
  } catch {
    return true;
  }
}

function markTourSeen() {
  try {
    window.localStorage.setItem(BUILDER_MODE_TOUR_STORAGE_KEY, 'seen');
  } catch {
    // Ignore private browsing or disabled storage; the tour remains non-critical.
  }
}
