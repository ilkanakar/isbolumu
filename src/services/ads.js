import { Platform } from 'react-native';
import Constants from 'expo-constants';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';
import { productionUnit } from '../constants/ads.js';

let interstitial = null;
let interstitialReady = false;
let started = false;

export function canUseAds() {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === 'storeClient') return false;
  if (__DEV__ && process.env.EXPO_PUBLIC_ADS !== '1') return false;
  if (!__DEV__ && !productionUnit('banner', Platform.OS) && !productionUnit('interstitial', Platform.OS)) return false;
  return true;
}

function requestOptions() {
  return { requestNonPersonalizedAdsOnly: true };
}

function unitId(kind, testId) {
  if (__DEV__) return testId;
  return productionUnit(kind, Platform.OS);
}

export async function initAds() {
  if (!canUseAds() || started) return false;
  started = true;
  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    const interstitialId = unitId('interstitial', TestIds.INTERSTITIAL);
    if (interstitialId) {
      interstitial = InterstitialAd.createForAdRequest(interstitialId, requestOptions());
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitialReady = true;
      });
      interstitial.addAdEventListener(AdEventType.ERROR, () => {
        interstitialReady = false;
      });
      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        interstitialReady = false;
        interstitial.load();
      });
      interstitial.load();
    }
    return true;
  } catch {
    return false;
  }
}

export function showInterstitial() {
  if (!canUseAds() || !interstitial || !interstitialReady) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    const unsubClose = interstitial.addAdEventListener(AdEventType.CLOSED, finish);
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, fail);
    function cleanup() {
      unsubClose();
      unsubError();
    }
    function finish() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    }
    function fail() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    }
    interstitial.show().catch(fail);
  });
}

export function bannerProps() {
  if (!canUseAds()) return null;
  const unit = unitId('banner', TestIds.BANNER);
  if (!unit) return null;
  return {
    BannerAd,
    size: BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
    unitId: unit,
    requestOptions: requestOptions(),
  };
}
