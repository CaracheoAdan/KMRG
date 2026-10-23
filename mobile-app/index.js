import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// Registra la aplicación principal de Expo
registerRootComponent(App);

// Registra el manejador en segundo plano para los Widgets de Android
registerWidgetTaskHandler(widgetTaskHandler);
