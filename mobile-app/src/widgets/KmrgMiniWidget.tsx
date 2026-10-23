import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { KmrgWidgetData } from './types';

export const KmrgMiniWidget: React.FC<KmrgWidgetData> = ({
  daysTogether,
  noteText,
  noteSender,
  hasNewHeart,
  heartSender,
}) => {
  const displayDays = daysTogether > 0 ? `${daysTogether} días` : 'Juntos';
  const displayNote = noteText?.trim() || 'Te amo ❤️';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#fff1f2',
        borderRadius: 22,
        padding: 10,
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor: '#fecdd3',
        borderWidth: 1.5,
      }}
      clickAction="OPEN_APP"
    >
      {/* Encabezado: KMRG y días */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget
          text="💕 KMRG"
          style={{
            fontSize: 10.5,
            fontWeight: '800',
            color: '#e11d48',
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: '#ffe4e6',
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text={displayDays}
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: '#9f1239',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Centro: Notificación de latido o amor */}
      <FlexWidget
        style={{
          width: 'match_parent',
          backgroundColor: hasNewHeart ? '#e11d48' : '#ffffff',
          borderRadius: 12,
          padding: 6,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: '#ffe4e6',
          borderWidth: 1,
        }}
      >
        <TextWidget
          text={hasNewHeart ? '❤️ ¡Latido nuevo!' : '❤️ Nuestro amor'}
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: hasNewHeart ? '#ffffff' : '#e11d48',
          }}
        />
        {hasNewHeart && heartSender ? (
          <TextWidget
            text={`De ${heartSender}`}
            style={{
              fontSize: 9.5,
              fontWeight: '700',
              color: '#ffe4e6',
            }}
          />
        ) : null}
      </FlexWidget>

      {/* Pie: Notita breve */}
      <FlexWidget
        style={{
          width: 'match_parent',
          backgroundColor: '#ffffff',
          borderRadius: 10,
          paddingHorizontal: 7,
          paddingVertical: 4,
          flexDirection: 'column',
        }}
      >
        <TextWidget
          text={`“${displayNote}”`}
          style={{
            fontSize: 10,
            fontWeight: '600',
            color: '#334155',
            fontStyle: 'italic',
          }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
    </FlexWidget>
  );
};
