import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme.js';
import { Button } from './ui.js';
import T from './Type.js';

export default function AdBreak({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fill}>
        <T weight="semi" style={styles.kicker}>Reklam</T>
        <T weight="display" style={styles.title}>Kısa ara</T>
        <T weight="medium" style={styles.body}>
          Mağaza sürümünde burada kısa bir video reklam oynar. Üç iş bitince bir kez açılır.
        </T>
        <Pressable />
        <View style={styles.button}>
          <Button label="Devam et" tone="quiet" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  kicker: { color: '#E7C3B6', letterSpacing: 1.4, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.paper, fontSize: 48, marginTop: 10 },
  body: { color: '#E7DFD2', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 12 },
  button: { alignSelf: 'stretch', marginTop: 28 },
});
