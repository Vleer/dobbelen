import { useState, useEffect } from 'react';

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

export interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True when viewport width > height (tablet landscape, phone landscape) */
  isLandscape: boolean;
}

const getWindowSize = (): WindowSize => {
  const width = typeof window !== 'undefined' ? window.innerWidth : TABLET_BREAKPOINT;
  const height = typeof window !== 'undefined' ? window.innerHeight : 768;
  return {
    width,
    height,
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
    isLandscape: width > height,
  };
};

const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>(getWindowSize);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setWindowSize(getWindowSize());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    // Sync state with the actual window size on mount
    setWindowSize(getWindowSize());
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, []);

  return windowSize;
};

export default useWindowSize;
