import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { bannerProps, canUseAds, initAds } from '../services/ads.js';
import { colors } from '../theme.js';
import T from './Type.js';

export default function AdBanner() {
  const [props, setProps] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!canUseAds()) return undefined;
    initAds().then(() => {
      if (alive) setProps(bannerProps());
    });
    return () => {
      alive = false;
    };
  }, []);

  if (props && !failed) {
    const { BannerAd, size, unitId, requestOptions } = props;
    return (
      <View style={styles.live}>
        <T weight="medium" style={styles.liveLabel}>Reklam</T>
        <BannerAd unitId={unitId} size={size} requestOptions={requestOptions} onAdFailedToLoad={() => setFailed(true)} />
      </View>
    );
  }

  if (canUseAds()) return null;

  return (
    <View style={styles.slot}>
      <T weight="semi" style={styles.kicker}>Reklam</T>
    </View>
  );
}

const styles = StyleSheet.create({
  live: { alignItems: 'center', paddingTop: 4 },
  liveLabel: { fontSize: 10, color: colors.faint, marginBottom: 2 },
  slot: {
    minHeight: 50,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 10, letterSpacing: 1.2, color: colors.faint, textTransform: 'uppercase' },
});
