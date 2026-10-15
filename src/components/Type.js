import { createContext, useContext } from 'react';
import { Text } from 'react-native';
import { fonts } from '../theme.js';

export const FontContext = createContext(true);

const family = {
  regular: fonts.regular,
  medium: fonts.medium,
  semi: fonts.semi,
  bold: fonts.bold,
  serif: fonts.serif,
  display: fonts.display,
};

export default function T({ weight = 'regular', style, ...props }) {
  const custom = useContext(FontContext);
  return (
    <Text
      {...props}
      style={[custom && family[weight] ? { fontFamily: family[weight] } : null, style]}
    />
  );
}
