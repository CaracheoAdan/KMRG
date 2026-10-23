import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import {
  KmrgWidgetData,
  computeTimeTogether,
  getWidgetPalette,
  getFlameSvg,
  getPochitoPeekingSvg,
  isMilestone,
} from './types';

export const KmrgMiniWidget: React.FC<KmrgWidgetData> = ({
  daysTogether,
  anniversaryDate,
  accentColor,
  streakActive,
  hasNewHeart,
  heartSender,
}) => {
  const { totalDays, breakdown } = computeTimeTogether(anniversaryDate, daysTogether);
  const palette = getWidgetPalette(accentColor);
  const milestone = isMilestone(totalDays);
  // Si no se especifica streakActive, se asume activo si hay días acumulados
  const isFlameActive = streakActive !== false;
  const flameSvg = getFlameSvg(isFlameActive, milestone ? 28 : 24);
  const flameTextColor = isFlameActive ? palette.flameActive : palette.flameInactive;
  const pochitoSvg = getPochitoPeekingSvg(palette.accentHex, milestone, 120, 38);

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
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 0,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* 1. Marca KMRG sutil arriba */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="KMRG"
          style={{
            fontSize: 9.5,
            fontWeight: '700',
            color: palette.textSecondary,
            letterSpacing: 2,
          }}
        />
      </FlexWidget>

      {/* 2. Protagonista: Racha tipo Duolingo (Llama + Días juntos) */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgWidget
            svg={flameSvg}
            style={{
              width: milestone ? 28 : 24,
              height: milestone ? 28 : 24,
              marginRight: 4,
            }}
          />
          <TextWidget
            text={`${totalDays}`}
            style={{
              fontSize: milestone ? 35 : 32,
              fontWeight: '900',
              color: flameTextColor,
              textAlign: 'center',
            }}
          />
        </FlexWidget>

        <TextWidget
          text="días juntos"
          style={{
            fontSize: 9.5,
            fontWeight: '600',
            color: palette.textSecondary,
            textAlign: 'center',
            marginTop: 1,
          }}
        />

        {/* Chip discreto: Hito o desglose */}
        <FlexWidget
          style={{
            backgroundColor: milestone ? 'rgba(245, 158, 11, 0.25)' : palette.chipBg,
            borderColor: milestone ? '#F59E0B' : palette.chipBorder,
            borderWidth: 0.8,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 2,
            marginTop: 4,
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={milestone ? `¡${totalDays} días juntos!` : breakdown}
            style={{
              fontSize: 8.5,
              fontWeight: '700',
              color: milestone ? '#FDE047' : palette.accentLight,
              textAlign: 'center',
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>

        {hasNewHeart && (
          <FlexWidget
            style={{
              backgroundColor: palette.flameActive,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 1.5,
              marginTop: 3,
            }}
          >
            <TextWidget
              text={`¡Latido de ${heartSender || 'amor'}!`}
              style={{
                fontSize: 8,
                fontWeight: '800',
                color: '#ffffff',
              }}
              maxLines={1}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* 3. Base: Pochito asomándose desde el borde inferior con destellos */}
      <FlexWidget
        style={{
          width: 'match_parent',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <SvgWidget
          svg={pochitoSvg}
          style={{
            width: 120,
            height: 38,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
};
