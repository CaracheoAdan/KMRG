import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { KmrgCoupleWidget } from './KmrgCoupleWidget';
import { KmrgMiniWidget } from './KmrgMiniWidget';
import { getStoredWidgetData, syncWidgetData } from '../services/WidgetSyncService';
import {
  checkMissedPartnerNotifications,
  sendPartnerPushNotification,
} from '../services/NotificationService';
import { sendSupabaseInteraction } from '../services/SupabaseService';
import { getCurrentProfile, toLocalDateString } from '../services/StorageService';
import { computeTimeTogether } from './types';
import type { UserProfile } from '../types';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction } = props;
  void checkMissedPartnerNotifications();
  const data = await getStoredWidgetData();

  // Sincronizar fecha de aniversario y estado de racha del día desde el caché local de HomeState
  // para que a medianoche el widget actualice días y racha autónomamente sin abrir la app
  try {
    const rawHome = await AsyncStorage.getItem('@kmrg_couple_home_state_v2');
    if (rawHome) {
      const parsedHome = JSON.parse(rawHome);
      if (parsedHome?.anniversaryDate) {
        data.anniversaryDate = parsedHome.anniversaryDate;
      }
      if (parsedHome?.lastInteractionDate) {
        const todayStr = toLocalDateString(new Date());
        data.streakActive = parsedHome.lastInteractionDate === todayStr;
      }
    }
  } catch {
    // Continuar con datos actuales del widget
  }

  // Recalcular días de relación dinámicamente con la fecha actual del dispositivo
  const { totalDays } = computeTimeTogether(data.anniversaryDate, data.daysTogether);
  if (data.daysTogether !== totalDays) {
    data.daysTogether = totalDays;
    try {
      await AsyncStorage.setItem('@kmrg_widget_data', JSON.stringify(data));
    } catch {}
  }

  const renderComponent = (overrideData = data) => {
    switch (widgetInfo.widgetName) {
      case 'KmrgMiniWidget':
        return <KmrgMiniWidget {...overrideData} />;
      case 'KmrgCoupleWidget':
      default:
        return <KmrgCoupleWidget {...overrideData} />;
    }
  };

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(renderComponent());
      break;

    case 'WIDGET_CLICK': {
      const clickAction = props.clickAction;
      const actionData = (props.clickActionData || {}) as Record<string, unknown>;

      if (clickAction === 'SEND_HEART' || actionData.action === 'SEND_HEART') {
        try {
          const profile: UserProfile = (await getCurrentProfile()) || 'Karla';
          const partner: UserProfile = profile === 'Karla' ? 'Javier' : 'Karla';
          const senderName = profile === 'Karla' ? 'Karlita' : 'Javier';

          await sendSupabaseInteraction(profile, 'thinking_of_you', {
            fromWidget: true,
            sentAt: new Date().toISOString(),
          });

          void sendPartnerPushNotification(
            partner,
            `💓 ¡Latido de ${senderName}!`,
            `${senderName} está pensando en ti en este momento ❤️`,
            { type: 'THINKING_OF_YOU', sender: profile }
          );

          const updated = await syncWidgetData({
            daysTogether: totalDays,
            streakActive: true,
            hasNewHeart: false,
          });
          props.renderWidget(renderComponent(updated));
        } catch {
          props.renderWidget(renderComponent());
        }
        break;
      }

      if (actionData.feature) {
        try {
          await AsyncStorage.setItem(
            '@kmrg_pending_widget_feature',
            String(actionData.feature)
          );
        } catch {}
      }
      break;
    }

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
