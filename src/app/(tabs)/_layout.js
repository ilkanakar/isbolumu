import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdBanner from '../../components/AdBanner.js';
import { Icon } from '../../components/Icons.js';
import T from '../../components/Type.js';
import { colors } from '../../theme.js';

const labels = {
  index: 'Bugün',
  takvim: 'Takvim',
  ev: 'İşler',
  defter: 'Defter',
  ayarlar: 'Ayarlar',
};

function Bar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <AdBanner />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const active = state.index === index;
          const color = active ? colors.ink : colors.faint;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <Icon name={route.name} color={color} />
              <T weight="semi" style={[styles.label, { color }]}>{labels[route.name] || route.name}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <Bar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün' }} />
      <Tabs.Screen name="takvim" options={{ title: 'Takvim' }} />
      <Tabs.Screen name="ev" options={{ title: 'İşler' }} />
      <Tabs.Screen name="defter" options={{ title: 'Defter' }} />
      <Tabs.Screen name="ayarlar" options={{ title: 'Ayarlar' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line },
  row: { flexDirection: 'row', paddingTop: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: 11, marginTop: 2 },
});
