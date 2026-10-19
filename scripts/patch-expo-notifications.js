const fs = require('fs');
const path = require('path');

const targetPaths = [
  path.resolve(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js'),
  path.resolve(__dirname, '..', 'mobile-app', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js'),
];

const safeCode = `import { requireNativeModule, requireOptionalNativeModule } from 'expo-modules-core';

let nativeModule = null;

try {
  if (typeof requireOptionalNativeModule === 'function') {
    nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
  }
} catch (e) {
  nativeModule = null;
}

if (!nativeModule) {
  try {
    nativeModule = requireNativeModule('ExpoTopicSubscriptionModule');
  } catch (e) {
    nativeModule = {
      addListener: () => {},
      removeListeners: () => {},
      subscribeToTopicAsync: () => Promise.resolve(null),
      unsubscribeFromTopicAsync: () => Promise.resolve(null),
    };
  }
}

export default nativeModule;
`;

targetPaths.forEach((filePath) => {
  if (fs.existsSync(path.dirname(filePath))) {
    fs.writeFileSync(filePath, safeCode, 'utf8');
    console.log(`[patch] Patched ${filePath} successfully.`);
  }
});
