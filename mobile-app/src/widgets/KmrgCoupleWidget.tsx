import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { KmrgWidgetData, computeTimeTogether } from './types';

// Iconos vectoriales de línea fina (SVG) en rosa (#e11d48) y blanco (#ffffff) - Cero emojis
const HEART_PINK_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

const HEART_WHITE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

const ENVELOPE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

const INFINITY_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9f7e86" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c-2-2.5-4-4-6.5-4A4.5 4.5 0 0 0 1 12.5a4.5 4.5 0 0 0 4.5 4.5c2.5 0 4.5-1.5 6.5-4zm0 0c2 2.5 4 4 6.5 4a4.5 4.5 0 0 0 4.5-4.5 4.5 4.5 0 0 0-4.5-4.5c-2.5 0-4.5 1.5-6.5 4z"/></svg>`;

export const KmrgCoupleWidget: React.FC<KmrgWidgetData> = ({
  daysTogether,
  anniversaryDate,
  noteText,
  noteSender,
  hasNewHeart,
  heartSender,
}) => {
  const { totalDays } = computeTimeTogether(anniversaryDate, daysTogether);
  const cleanNote = noteText?.trim() || '';
  const displaySender = noteSender?.trim() || 'Tu amor';
  const hasNote = cleanNote.length > 0;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFF1F2E6',
        borderRadius: 18,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor: '#FECDD380',
        borderWidth: 1,
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Encabezado: Logo KMRG sutil a la izquierda y Pill de Días Juntos a la derecha */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo KMRG sutil con corazón de línea fina */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 2,
          }}
        >
          <SvgWidget svg={HEART_PINK_SVG} style={{ width: 12, height: 12 }} />
          <TextWidget
            text=" KMRG"
            style={{
              fontSize: 11.5,
              fontWeight: '700',
              fontFamily: 'serif',
              color: '#e11d48',
              letterSpacing: 1.5,
            }}
          />
        </FlexWidget>

        {/* Contador de días como pill destacada arriba a la derecha */}
        <FlexWidget
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            paddingHorizontal: 9,
            paddingVertical: 3.5,
            flexDirection: 'row',
            alignItems: 'center',
            borderColor: '#FCE7EC',
            borderWidth: 1,
          }}
        >
          <TextWidget
            text={`${totalDays} `}
            style={{
              fontSize: 11.5,
              fontWeight: '800',
              color: '#e11d48',
              fontFamily: 'serif',
            }}
          />
          <TextWidget
            text="días juntos"
            style={{
              fontSize: 10,
              fontWeight: '500',
              color: '#9f7e86',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 2. Tarjeta Central Blanca: NOTITA DE HOY (PROTAGONISTA) */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 9,
          marginVertical: 4,
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderColor: '#F1F5F9',
          borderWidth: 1,
        }}
      >
        {/* Encabezado interno con icono vectorial de sobre en rosa */}
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <SvgWidget svg={ENVELOPE_SVG} style={{ width: 12, height: 12 }} />
          <TextWidget
            text=" Notita de hoy"
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#e11d48',
              letterSpacing: 0.4,
            }}
          />
        </FlexWidget>

        {/* Frase en serif cursiva con buen interlineado y comillas tipográficas */}
        {hasNote ? (
          <TextWidget
            text={`“${cleanNote}”`}
            style={{
              fontSize: 12.5,
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontWeight: '500',
              color: '#0f172a',
              lineHeight: 17,
            }}
            maxLines={3}
            truncate="END"
          />
        ) : (
          <TextWidget
            text="“Aún no hay notita de hoy. Escríbele una para alegrarle el día.”"
            style={{
              fontSize: 11.5,
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontWeight: '400',
              color: '#64748b',
              lineHeight: 16,
            }}
            maxLines={3}
            truncate="END"
          />
        )}

        {/* Remitente alineado abajo a la derecha */}
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={hasNote ? `De: ${displaySender}` : 'Escribir notita →'}
            style={{
              fontSize: 9.5,
              fontWeight: '600',
              color: hasNote ? '#64748b' : '#e11d48',
              textAlign: 'right',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 3. Fila Inferior: Notificación de latido o pie discreto */}
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
          <SvgWidget svg={HEART_WHITE_SVG} style={{ width: 12, height: 12 }} />
          <TextWidget
            text={` ¡${heartSender || 'Tu amor'} te envió un latido!`}
            style={{
              fontSize: 10.5,
              fontWeight: '700',
              color: '#ffffff',
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 2,
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <SvgWidget svg={INFINITY_SVG} style={{ width: 11, height: 11 }} />
            <TextWidget
              text=" Conectados de corazón"
              style={{
                fontSize: 9.5,
                fontWeight: '600',
                color: '#9f7e86',
              }}
            />
          </FlexWidget>

          <TextWidget
            text="Toca para abrir"
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
