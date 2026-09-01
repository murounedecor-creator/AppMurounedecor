import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function Watermark() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require('../assets/images/1000973444.png')}
        resizeMode="contain"
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  logo: {
    width: 220,
    height: 220,
    opacity: 0.06,
    transform: [{ rotate: '-45deg' }],
  },
});
