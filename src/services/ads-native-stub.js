export function BannerAd() {
  return null;
}

export const BannerAdSize = {
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
};

export const TestIds = {
  BANNER: 'test-banner',
  INTERSTITIAL: 'test-interstitial',
};

export const AdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  CLOSED: 'closed',
};

export const MaxAdContentRating = { T: 'T', G: 'G' };

export const InterstitialAd = {
  createForAdRequest() {
    return {
      addAdEventListener() {
        return () => {};
      },
      load() {},
      show() {
        return Promise.resolve();
      },
    };
  },
};

export default function mobileAds() {
  return {
    setRequestConfiguration() {
      return Promise.resolve();
    },
    initialize() {
      return Promise.resolve();
    },
  };
}
