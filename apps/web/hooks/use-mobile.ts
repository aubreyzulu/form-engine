import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(getIsMobile());
    };
    const updateAfterMount = window.setTimeout(onChange, 0);
    mql.addEventListener('change', onChange);
    return () => {
      window.clearTimeout(updateAfterMount);
      mql.removeEventListener('change', onChange);
    };
  }, []);

  return isMobile;
}
