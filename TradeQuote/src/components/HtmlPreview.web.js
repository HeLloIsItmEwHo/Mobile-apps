import React from 'react';
import { View } from 'react-native';

export default function HtmlPreview({ html, style }) {
  return (
    <View style={style}>
      <iframe title="Quote preview" srcDoc={html} sandbox="" style={{ border: 0, width: '100%', height: '100%', background: '#fff' }} />
    </View>
  );
}
