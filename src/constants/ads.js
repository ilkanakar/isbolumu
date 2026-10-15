export const AD_EVERY = 3;

// Mağaza derlemesinde __DEV__ kapalıdır. Kendi AdMob birimlerini buraya yaz.
// Boş birim reklam göstermez. app.json içindeki test uygulama kimliklerini de
// yayınlamadan önce kendi AdMob uygulama kimliklerinle değiştir.
export const PRODUCTION_UNITS = {
  banner: { ios: 'ca-app-pub-3706056819475760/3217411965', android: 'ca-app-pub-3706056819475760/5094520280' },
  interstitial: { ios: 'ca-app-pub-3706056819475760/3440773240', android: 'ca-app-pub-3706056819475760/1618309708' },
};

export function productionUnit(kind, platform) {
  if (platform !== 'ios' && platform !== 'android') return '';
  return PRODUCTION_UNITS[kind]?.[platform] || '';
}
