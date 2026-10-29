import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, Pattern } from 'react-native-svg';

export interface DrawPoint {
  x: number; // Normalizado 0 a 1
  y: number; // Normalizado 0 a 1
}

export interface DrawStroke {
  id: string;
  color: string;
  strokeWidth: number;
  points: DrawPoint[];
  isEraser?: boolean;
  isFill?: boolean;
}

export const CANVAS_COLORS = [
  '#0f172a', // 1. Carbón oscuro
  '#ef4444', // 2. Rojo carmín
  '#f97316', // 3. Naranja
  '#eab308', // 4. Amarillo sol
  '#10b981', // 5. Verde esmeralda (Acento)
  '#06b6d4', // 6. Cian
  '#3b82f6', // 7. Azul real
  '#ec4899', // 8. Rosa coral
];

export const CANVAS_STROKE_WIDTHS = [
  { id: 'thin', label: 'Fino', width: 3, dotSize: 5 },
  { id: 'medium', label: 'Medio', width: 7, dotSize: 9 },
  { id: 'thick', label: 'Grueso', width: 14, dotSize: 15 },
];

export const CANVAS_BG = '#fcf8f2'; // Textura papel crema suave de dibujo

/**
 * Convierte un arreglo de puntos normalizados en un path SVG suave con curvas Bézier cuadráticas.
 */
export function pointsToSvgPath(points: DrawPoint[], width: number, height: number): string {
  if (!points || points.length === 0) return '';
  const firstX = points[0].x * width;
  const firstY = points[0].y * height;

  if (points.length === 1) {
    return `M ${firstX.toFixed(1)} ${firstY.toFixed(1)} L ${(firstX + 0.1).toFixed(1)} ${(firstY + 0.1).toFixed(1)}`;
  }

  let d = `M ${firstX.toFixed(1)} ${firstY.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const prevX = prev.x * width;
    const prevY = prev.y * height;
    const currX = curr.x * width;
    const currY = curr.y * height;
    const midX = (prevX + currX) / 2;
    const midY = (prevY + currY) / 2;
    d += ` Q ${prevX.toFixed(1)} ${prevY.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${(last.x * width).toFixed(1)} ${(last.y * height).toFixed(1)}`;
  return d;
}

interface DrawGuessCanvasProps {
  strokes: DrawStroke[];
  onStrokesChange?: (strokes: DrawStroke[]) => void;
  onStrokeBatch?: (strokeId: string, color: string, strokeWidth: number, points: DrawPoint[], isEraser?: boolean) => void;
  onStrokeEnd?: (stroke: DrawStroke) => void;
  readOnly?: boolean;
  currentColor?: string;
  currentWidth?: number;
  isEraserActive?: boolean;
  isBucketActive?: boolean;
  onBucketFill?: (color: string) => void;
}

export const DrawGuessCanvas: React.FC<DrawGuessCanvasProps> = ({
  strokes,
  onStrokesChange,
  onStrokeBatch,
  onStrokeEnd,
  readOnly = false,
  currentColor = '#0f172a',
  currentWidth = 7,
  isEraserActive = false,
  isBucketActive = false,
  onBucketFill,
}) => {
  const [canvasDim, setCanvasDim] = useState<{ width: number; height: number }>({ width: 320, height: 320 });
  const [livePoints, setLivePoints] = useState<DrawPoint[]>([]);

  const currentPointsRef = useRef<DrawPoint[]>([]);
  const currentStrokeIdRef = useRef<string>('');
  const lastEmitTimeRef = useRef<number>(0);
  const layoutRef = useRef<{ width: number; height: number }>({ width: 320, height: 320 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      layoutRef.current = { width, height };
      setCanvasDim({ width, height });
    }
  };

  const panResponder = useMemo(() => {
    if (readOnly) {
      return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => false,
      });
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // Modo Cubeta de relleno: rellena el fondo con un tap
        if (isBucketActive) {
          onBucketFill?.(currentColor);
          return;
        }

        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = layoutRef.current;
        if (width <= 0 || height <= 0) return;

        const normalizedX = Math.max(0, Math.min(1, locationX / width));
        const normalizedY = Math.max(0, Math.min(1, locationY / height));
        const initialPoint: DrawPoint = {
          x: Number(normalizedX.toFixed(4)),
          y: Number(normalizedY.toFixed(4)),
        };

        const strokeId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        currentStrokeIdRef.current = strokeId;
        currentPointsRef.current = [initialPoint];
        lastEmitTimeRef.current = Date.now();
        setLivePoints([initialPoint]);

        onStrokeBatch?.(strokeId, isEraserActive ? CANVAS_BG : currentColor, currentWidth, [initialPoint], isEraserActive);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
        if (isBucketActive) return;

        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = layoutRef.current;
        if (width <= 0 || height <= 0) return;

        const normalizedX = Math.max(0, Math.min(1, locationX / width));
        const normalizedY = Math.max(0, Math.min(1, locationY / height));
        const newPt: DrawPoint = {
          x: Number(normalizedX.toFixed(4)),
          y: Number(normalizedY.toFixed(4)),
        };

        const pts = currentPointsRef.current;
        const lastPt = pts[pts.length - 1];

        if (lastPt) {
          const dx = (newPt.x - lastPt.x) * width;
          const dy = (newPt.y - lastPt.y) * height;
          if (dx * dx + dy * dy < 4) return;
        }

        pts.push(newPt);
        setLivePoints([...pts]);

        const now = Date.now();
        if (now - lastEmitTimeRef.current >= 65) {
          lastEmitTimeRef.current = now;
          onStrokeBatch?.(
            currentStrokeIdRef.current,
            isEraserActive ? CANVAS_BG : currentColor,
            currentWidth,
            [...pts],
            isEraserActive
          );
        }
      },
      onPanResponderRelease: () => {
        if (isBucketActive) return;

        const pts = [...currentPointsRef.current];
        if (pts.length > 0) {
          const finishedStroke: DrawStroke = {
            id: currentStrokeIdRef.current || `s_${Date.now()}`,
            color: isEraserActive ? CANVAS_BG : currentColor,
            strokeWidth: currentWidth,
            points: pts,
            isEraser: isEraserActive,
          };

          const nextStrokes = [...strokes, finishedStroke];
          onStrokesChange?.(nextStrokes);
          onStrokeEnd?.(finishedStroke);
        }

        currentPointsRef.current = [];
        currentStrokeIdRef.current = '';
        setLivePoints([]);
      },
      onPanResponderTerminate: () => {
        currentPointsRef.current = [];
        currentStrokeIdRef.current = '';
        setLivePoints([]);
      },
    });
  }, [readOnly, currentColor, currentWidth, isEraserActive, isBucketActive, strokes, onStrokesChange, onStrokeBatch, onStrokeEnd, onBucketFill]);

  const liveSvgPath = useMemo(() => {
    if (livePoints.length === 0) return '';
    return pointsToSvgPath(livePoints, canvasDim.width, canvasDim.height);
  }, [livePoints, canvasDim.width, canvasDim.height]);

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      <Svg width="100%" height="100%" style={styles.svgCanvas}>
        <Defs>
          {/* Patrón de puntos de papel artístico tenue */}
          <Pattern id="canvasDotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <Circle cx="10" cy="10" r="0.75" fill="#d9d0c3" opacity="0.45" />
          </Pattern>
        </Defs>

        {/* Fondo del lienzo */}
        <Rect width="100%" height="100%" fill={CANVAS_BG} />
        {/* Capa de cuadrícula de puntos tenue */}
        <Rect width="100%" height="100%" fill="url(#canvasDotGrid)" />

        {/* Trazos ya guardados */}
        {strokes.map((st) => {
          if (st.isFill) {
            return (
              <Rect
                key={st.id}
                width="100%"
                height="100%"
                fill={st.color}
                opacity="0.9"
              />
            );
          }
          const pathD = pointsToSvgPath(st.points, canvasDim.width, canvasDim.height);
          if (!pathD) return null;
          return (
            <Path
              key={st.id}
              d={pathD}
              stroke={st.color}
              strokeWidth={st.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        })}

        {/* Trazo activo en vivo del dedo */}
        {liveSvgPath ? (
          <Path
            d={liveSvgPath}
            stroke={isEraserActive ? CANVAS_BG : currentColor}
            strokeWidth={currentWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: CANVAS_BG,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e8e2d8',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  svgCanvas: {
    flex: 1,
  },
});
