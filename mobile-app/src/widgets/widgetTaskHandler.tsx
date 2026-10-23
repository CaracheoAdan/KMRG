import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { KmrgCoupleWidget } from './KmrgCoupleWidget';
import { KmrgMiniWidget } from './KmrgMiniWidget';
import { getStoredWidgetData } from '../services/WidgetSyncService';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction } = props;
  const data = await getStoredWidgetData();

  // Recalcular días de relación dinámicamente con la fecha actual del dispositivo
  if (data.anniversaryDate) {
    try {
      const [y, m, d] = data.anniversaryDate.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0);
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - start.getTime());
      data.daysTogether = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      // Usar valor almacenado
    }
  }

  const renderComponent = () => {
    switch (widgetInfo.widgetName) {
      case 'KmrgMiniWidget':
        return <KmrgMiniWidget {...data} />;
      case 'KmrgCoupleWidget':
      default:
        return <KmrgCoupleWidget {...data} />;
    }
  };

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(renderComponent());
      break;

    case 'WIDGET_CLICK':
      // El clickAction 'OPEN_APP' ya abre la aplicación automáticamente
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
