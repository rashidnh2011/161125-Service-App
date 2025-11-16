/**
 * Device detection utilities
 */

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') return {};
  
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(userAgent);
  const isMobileDevice = isMobile();
  
  return {
    userAgent,
    isMobile: isMobileDevice,
    isIOS,
    isAndroid,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
    },
    platform: navigator.platform,
    vendor: navigator.vendor,
  };
};

// Log device info for debugging
export const logDeviceInfo = () => {
  if (typeof window === 'undefined') return;
  
  const deviceInfo = getDeviceInfo();
  console.group('Device Information');
  console.log('User Agent:', deviceInfo.userAgent);
  console.log('Platform:', deviceInfo.platform);
  console.log('Vendor:', deviceInfo.vendor);
  console.log('Is Mobile:', deviceInfo.isMobile);
  console.log('Is iOS:', deviceInfo.isIOS);
  console.log('Is Android:', deviceInfo.isAndroid);
  console.log('Screen:', deviceInfo.screen);
  console.groupEnd();
  
  return deviceInfo;
};
