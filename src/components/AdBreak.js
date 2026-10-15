import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme.js';
import { Button } from './ui.js';
import T from './Type.js';

export default function AdBreak({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat">
        <Pressable style={styles.card} onPress={() => {}}>
          <T weight="semi" style={styles.kicker}>Reklam</T>
          <T weight="display" style={styles.title}>Kısa ara</T>
          <T weight="medium" style={styles.body}>
            Mağaza sürümünde burada kısa bir video reklam oynar. Üç iş bitince bir kez açılır.
          </T>
          <View style={styles.button}>
            <Button label="Devam et" tone="quiet" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(30,26,22,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  kicker: { color: '#E7C3B6', letterSpacing: 1.4, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.paper, fontSize: 48, marginTop: 10 },
  body: { color: '#E7DFD2', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 12 },
  button: { alignSelf: 'stretch', marginTop: 28 },
});
