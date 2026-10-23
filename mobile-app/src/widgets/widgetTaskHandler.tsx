import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { KmrgCoupleWidget } from './KmrgCoupleWidget';
import { KmrgMiniWidget } from './KmrgMiniWidget';
import { getStoredWidgetData } from '../services/WidgetSyncService';
import { computeTimeTogether } from './types';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction } = props;
  const data = await getStoredWidgetData();

  // Recalcular días de relación dinámicamente con la fecha actual del dispositivo
  const { totalDays } = computeTimeTogether(data.anniversaryDate, data.daysTogether);
  data.daysTogether = totalDays;

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
      // clickAction 'OPEN_APP' abre la app automáticamente
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
