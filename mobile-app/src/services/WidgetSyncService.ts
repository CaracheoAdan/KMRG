import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { KmrgWidgetData, DEFAULT_WIDGET_DATA } from '../widgets/types';
import { KmrgCoupleWidget } from '../widgets/KmrgCoupleWidget';
import { KmrgMiniWidget } from '../widgets/KmrgMiniWidget';

const STORAGE_KEY = '@kmrg_widget_data';

export async function getStoredWidgetData(): Promise<KmrgWidgetData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_DATA;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_WIDGET_DATA, ...parsed };
  } catch {
    return DEFAULT_WIDGET_DATA;
  }
}

export async function syncWidgetData(
  partial: Partial<KmrgWidgetData>
): Promise<KmrgWidgetData> {
  const current = await getStoredWidgetData();
  const next: KmrgWidgetData = {
    ...current,
    ...partial,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Continuar si falla almacenamiento
  }

  // Solo Android soporta widgets nativos a través de esta librería
  if (Platform.OS === 'android') {
    try {
      await requestWidgetUpdate({
        widgetName: 'KmrgCoupleWidget',
        renderWidget: () => React.createElement(KmrgCoupleWidget, next),
      });
    } catch {
      // Ignorar si el widget no está colocado en pantalla
    }

    try {
      await requestWidgetUpdate({
        widgetName: 'KmrgMiniWidget',
        renderWidget: () => React.createElement(KmrgMiniWidget, next),
      });
    } catch {
      // Ignorar si el widget no está colocado en pantalla
    }
  }

  return next;
}

export async function notifyHeartbeatInWidget(sender: string): Promise<void> {
  await syncWidgetData({
    hasNewHeart: true,
    heartSender: sender,
    heartTimestamp: Date.now(),
  });
}

export async function clearHeartbeatInWidget(): Promise<void> {
  await syncWidgetData({
    hasNewHeart: false,
  });
}
