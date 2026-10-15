import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import T from '../components/Type.js';
import { Button } from '../components/ui.js';
import { colors } from '../theme.js';

export default function NotFound() {
  return (
    <View style={styles.fill}>
      <T weight="serif" style={styles.title}>Bu sayfa yok</T>
      <Button label="Bugüne dön" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 32, color: colors.ink },
});
