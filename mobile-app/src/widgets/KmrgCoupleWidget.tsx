import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { KmrgWidgetData } from './types';

export const KmrgCoupleWidget: React.FC<KmrgWidgetData> = ({
  daysTogether,
  noteText,
  noteSender,
  hasNewHeart,
  heartSender,
}) => {
  const displayDays = daysTogether > 0 ? `${daysTogether} días juntos` : 'Siempre juntos';
  const displaySender = noteSender || 'Tu amor';
  const displayNote = noteText?.trim() || 'Pensando en ti en cada instante...';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#fff1f2',
        borderRadius: 22,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor: '#fecdd3',
        borderWidth: 1.5,
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Fila Superior: Badge KMRG y Contador de Días de Relación */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FlexWidget
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            paddingHorizontal: 9,
            paddingVertical: 3.5,
            flexDirection: 'row',
            alignItems: 'center',
            borderColor: '#fda4af',
            borderWidth: 1,
          }}
        >
          <TextWidget
            text="💕 KMRG"
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: '#e11d48',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#ffe4e6',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderColor: '#f43f5e',
            borderWidth: 1,
          }}
        >
          <TextWidget
            text={displayDays}
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: '#9f1239',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 2. Tarjeta Central: La Notita que se dejan el uno al otro */}
      <FlexWidget
        style={{
          width: 'match_parent',
          backgroundColor: '#ffffff',
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginVertical: 4,
          flexDirection: 'column',
          borderColor: '#ffe4e6',
          borderWidth: 1,
        }}
      >
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
          }}
        >
          <TextWidget
            text="💌 Notita de hoy"
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#be123c',
            }}
          />
          <TextWidget
            text={`De: ${displaySender}`}
            style={{
              fontSize: 9.5,
              fontWeight: '700',
              color: '#fb7185',
            }}
          />
        </FlexWidget>

        <TextWidget
          text={`“${displayNote}”`}
          style={{
            fontSize: 11.5,
            fontWeight: '600',
            color: '#1e293b',
            fontStyle: 'italic',
          }}
          maxLines={2}
          truncate="END"
        />
      </FlexWidget>

      {/* 3. Fila Inferior: Notificación de Corazón (Latido) o Estado de Conexión */}
      {hasNewHeart ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: '#e11d48',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={`❤️ ¡${heartSender || 'Tu amor'} te mandó un latido!`}
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: '#ffffff',
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: '#fecdd3',
            borderWidth: 0.8,
          }}
        >
          <TextWidget
            text="💓 Conectados de corazón"
            style={{
              fontSize: 9.5,
              fontWeight: '700',
              color: '#881337',
            }}
          />
          <TextWidget
            text="Toca para abrir ✨"
            style={{
              fontSize: 9.5,
              fontWeight: '700',
              color: '#e11d48',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
};
