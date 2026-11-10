import React from 'react';
import { WebView } from 'react-native-webview';

export default function HtmlPreview({ html, style }) {
  return <WebView originWhitelist={['*']} source={{ html }} style={style} javaScriptEnabled={false} />;
}
