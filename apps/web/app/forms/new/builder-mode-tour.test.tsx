import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BuilderModeTour, BUILDER_MODE_TOUR_STORAGE_KEY } from '@/app/forms/new/builder-mode-tour';

const driverMock = vi.hoisted(() => vi.fn());
const driveMock = vi.hoisted(() => vi.fn());
const destroyMock = vi.hoisted(() => vi.fn());
const isActiveMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('driver.js', () => ({
  driver: driverMock,
}));

describe('BuilderModeTour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    driverMock.mockImplementation((config) => ({
      destroy: destroyMock,
      drive: driveMock,
      isActive: isActiveMock,
      getConfig: () => config,
    }));
    driverMock.mockClear();
    driveMock.mockClear();
    destroyMock.mockClear();
    isActiveMock.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('starts the tour once and marks it as seen when destroyed', () => {
    render(
      <>
        <div data-builder-mode-tour="tabs" />
        <button data-builder-mode-tour="builder">Builder</button>
        <button data-builder-mode-tour="json">JSON</button>
        <BuilderModeTour />
      </>,
    );

    vi.advanceTimersByTime(500);

    expect(driverMock).toHaveBeenCalledTimes(1);
    expect(driveMock).toHaveBeenCalledTimes(1);
    const config = driverMock.mock.calls[0]?.[0];
    expect(config.steps).toHaveLength(3);

    config.onDestroyed();

    expect(window.localStorage.getItem(BUILDER_MODE_TOUR_STORAGE_KEY)).toBe('seen');
  });

  it('does not start after the tour has already been seen', () => {
    window.localStorage.setItem(BUILDER_MODE_TOUR_STORAGE_KEY, 'seen');

    render(
      <>
        <div data-builder-mode-tour="tabs" />
        <BuilderModeTour />
      </>,
    );

    vi.advanceTimersByTime(500);

    expect(driverMock).not.toHaveBeenCalled();
  });
});
