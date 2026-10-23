import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { KmrgWidgetData, computeTimeTogether, formatNextEvent } from './types';

// Iconos vectoriales de línea fina en rosa (#e11d48) y blanco (#ffffff)
const HEART_PINK_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

const HEART_WHITE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

const INFINITY_MUTED_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9f7e86" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c-2-2.5-4-4-6.5-4A4.5 4.5 0 0 0 1 12.5a4.5 4.5 0 0 0 4.5 4.5c2.5 0 4.5-1.5 6.5-4zm0 0c2 2.5 4 4 6.5 4a4.5 4.5 0 0 0 4.5-4.5 4.5 4.5 0 0 0-4.5-4.5c-2.5 0-4.5 1.5-6.5 4z"/></svg>`;

const CALENDAR_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;

export const KmrgMiniWidget: React.FC<KmrgWidgetData> = ({
  daysTogether,
  anniversaryDate,
  nextEventTitle,
  nextEventDate,
  hasNewHeart,
  heartSender,
}) => {
  const { totalDays, breakdown } = computeTimeTogether(anniversaryDate, daysTogether);
  const nextEventInfo = formatNextEvent(nextEventTitle, nextEventDate);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFF1F2E6',
        borderRadius: 18,
        padding: 9,
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor: '#FECDD380',
        borderWidth: 1,
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Encabezado sutil: Logo KMRG a la izquierda y Símbolo infinito a la derecha */}
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
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <SvgWidget svg={HEART_PINK_SVG} style={{ width: 10, height: 10 }} />
          <TextWidget
            text=" KMRG"
            style={{
              fontSize: 10,
              fontWeight: '700',
              fontFamily: 'serif',
              color: '#e11d48',
              letterSpacing: 1.2,
            }}
          />
        </FlexWidget>

        <SvgWidget svg={INFINITY_MUTED_SVG} style={{ width: 11, height: 11 }} />
      </FlexWidget>

      {/* 2. Centro: CONTADOR DE DÍAS (PROTAGONISTA) - Idéntico a la tarjeta de la app */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: 14,
          paddingVertical: 6,
          paddingHorizontal: 6,
          marginVertical: 3,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: '#F1F5F9',
          borderWidth: 1,
        }}
      >
        {/* Número grande en tipografía serif rosa fuerte */}
        <TextWidget
          text={`${totalDays}`}
          style={{
            fontSize: 32,
            fontFamily: 'serif',
            fontWeight: '800',
            color: '#e11d48',
            textAlign: 'center',
          }}
        />

        {/* Etiqueta "días juntos" en gris rosado */}
        <TextWidget
          text="días juntos"
          style={{
            fontSize: 9.5,
            fontWeight: '600',
            color: '#9f7e86',
            textAlign: 'center',
            marginTop: 1,
          }}
        />

        {/* Desglose en chip discreto: ej. "4 meses · 11 días" */}
        <FlexWidget
          style={{
            backgroundColor: '#FFF1F2',
            borderRadius: 7,
            paddingHorizontal: 7,
            paddingVertical: 2,
            marginTop: 3,
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={breakdown}
            style={{
              fontSize: 8.5,
              fontWeight: '700',
              color: '#be123c',
              textAlign: 'center',
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
      </FlexWidget>

      {/* 3. Pie: Próxima cita (o aviso de latido si hay uno nuevo) - NO repite la notita */}
      {hasNewHeart ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: '#e11d48',
            borderRadius: 10,
            paddingVertical: 3.5,
            paddingHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgWidget svg={HEART_WHITE_SVG} style={{ width: 10, height: 10 }} />
          <TextWidget
            text={` ¡Latido de ${heartSender || 'tu amor'}!`}
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: '#ffffff',
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 3.5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: '#FCE7EC',
            borderWidth: 0.8,
          }}
        >
          <SvgWidget svg={CALENDAR_SVG} style={{ width: 10, height: 10 }} />
          <TextWidget
            text={` ${nextEventInfo.text}`}
            style={{
              fontSize: 8.5,
              fontWeight: '600',
              color: nextEventInfo.hasEvent ? '#0f172a' : '#64748b',
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
};
