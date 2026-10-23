import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import {
  KmrgWidgetData,
  computeTimeTogether,
  getWidgetPalette,
  getFlameSvg,
  getPochitoPeekingSvg,
  isMilestone,
  ENVELOPE_WHITE_SVG,
  HEART_WHITE_SVG,
} from './types';

export const KmrgCoupleWidget: React.FC<KmrgWidgetData> = ({
  daysTogether,
  anniversaryDate,
  noteText,
  noteSender,
  accentColor,
  streakActive,
  hasNewHeart,
  heartSender,
}) => {
  const { totalDays } = computeTimeTogether(anniversaryDate, daysTogether);
  const palette = getWidgetPalette(accentColor);
  const milestone = isMilestone(totalDays);
  const isFlameActive = streakActive !== false;
  const flameSvg = getFlameSvg(isFlameActive, 20);
  const flameTextColor = isFlameActive ? palette.flameActive : palette.flameInactive;
  const cleanNote = noteText?.trim() || '';
  const displaySender = noteSender?.trim() || 'Tu amor';
  const hasNote = cleanNote.length > 0;
  // Pochito asomándose discretamente en la esquina inferior izquierda
  const pochitoSvg = getPochitoPeekingSvg(palette.accentHex, milestone, 80, 28);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: {
          from: palette.beamFrom,
          to: palette.beamTo,
          orientation: 'TOP_BOTTOM',
        },
        borderRadius: 26,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Fila superior: Llama + días a la izquierda, KMRG sutil a la derecha */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Llama + Días juntos */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <SvgWidget svg={flameSvg} style={{ width: 20, height: 20, marginRight: 4 }} />
          <TextWidget
            text={`${totalDays}`}
            style={{
              fontSize: 15,
              fontWeight: '900',
              color: flameTextColor,
            }}
          />
          <TextWidget
            text=" días juntos"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: palette.textSecondary,
            }}
          />
          {milestone && (
            <FlexWidget
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.25)',
                borderColor: '#F59E0B',
                borderWidth: 0.8,
                borderRadius: 8,
                paddingHorizontal: 5,
                paddingVertical: 1,
                marginLeft: 6,
              }}
            >
              <TextWidget
                text="¡Hito!"
                style={{
                  fontSize: 8.5,
                  fontWeight: '800',
                  color: '#FDE047',
                }}
              />
            </FlexWidget>
          )}
        </FlexWidget>

        {/* Logo KMRG sutil en blanco al 70% */}
        <TextWidget
          text="KMRG"
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: palette.textSecondary,
            letterSpacing: 2,
          }}
        />
      </FlexWidget>

      {/* 2. Centro: Tarjeta de la notita (PROTAGONISTA) */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginVertical: 4,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Encabezado interno con icono de sobre */}
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <SvgWidget svg={ENVELOPE_WHITE_SVG} style={{ width: 12, height: 12, marginRight: 4 }} />
          <TextWidget
            text="Notita de hoy"
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: palette.accentLight,
              letterSpacing: 0.5,
            }}
          />
        </FlexWidget>

        {/* Frase en serif itálica destacada */}
        <TextWidget
          text={hasNote ? `“${cleanNote}”` : '“Aún no hay notita de hoy. Escríbele una”'}
          style={{
            fontSize: 14,
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontWeight: hasNote ? '500' : '400',
            color: hasNote ? palette.textPrimary : palette.textSecondary,
            lineHeight: 18,
          }}
          maxLines={3}
          truncate="END"
        />

        {/* Autor abajo a la derecha */}
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
              color: hasNote ? palette.textSecondary : palette.accentLight,
              textAlign: 'right',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 3. Pie: Pochito asomándose a la izquierda y 'Toca para abrir' a la derecha */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: 28,
        }}
      >
        {/* Pochito asomándose discretamente en la esquina sin tapar la notita */}
        <FlexWidget
          style={{
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
          }}
        >
          <SvgWidget
            svg={pochitoSvg}
            style={{
              width: 80,
              height: 28,
            }}
          />
        </FlexWidget>

        {/* Si hay latido nuevo, aviso destacado; si no, pie discreto 'Toca para abrir' */}
        {hasNewHeart ? (
          <FlexWidget
            style={{
              backgroundColor: palette.flameActive,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <SvgWidget svg={HEART_WHITE_SVG} style={{ width: 10, height: 10, marginRight: 3 }} />
            <TextWidget
              text={`¡Latido de ${heartSender || 'tu amor'}!`}
              style={{
                fontSize: 9,
                fontWeight: '800',
                color: '#ffffff',
              }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget
            style={{
              paddingBottom: 2,
              paddingRight: 2,
            }}
          >
            <TextWidget
              text="Toca para abrir"
              style={{
                fontSize: 9.5,
                fontWeight: '700',
                color: palette.accentLight,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
};
