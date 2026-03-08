import { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Svg, Path } from 'react-native-svg';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Annotation } from '@/lib/documents/schemas';

interface DrawingCanvasProps {
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
  onClose: () => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DRAW_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#FFFFFF', '#000000'];
const STROKE_WIDTHS = [2, 4, 6];

export function DrawingCanvas({ annotations, onChange, onClose }: DrawingCanvasProps) {
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [livePath, setLivePath] = useState('');

  const currentPathRef = useRef('');
  const isDrawingRef = useRef(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  function commitPath() {
    const pathData = currentPathRef.current;
    if (!pathData) return;
    const newAnn: Annotation = { id: generateId(), path: pathData, color, strokeWidth };
    onChange([...annotations, newAnn]);
    currentPathRef.current = '';
    setLivePath('');
  }

  function updateLivePath(path: string) {
    setLivePath(path);
  }

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      isDrawingRef.current = true;
      currentPathRef.current = `M ${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      runOnJS(updateLivePath)(currentPathRef.current);
    })
    .onUpdate((e) => {
      if (!isDrawingRef.current) return;
      currentPathRef.current += ` L ${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      runOnJS(updateLivePath)(currentPathRef.current);
    })
    .onEnd(() => {
      isDrawingRef.current = false;
      runOnJS(commitPath)();
    });

  function handleUndo() {
    if (annotations.length === 0) return;
    onChange(annotations.slice(0, -1));
  }

  function handleClear() {
    onChange([]);
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <Svg
          width={screenWidth}
          height={screenHeight}
          style={StyleSheet.absoluteFill}
        >
          {annotations.map((ann) => (
            <Path
              key={ann.id}
              d={ann.path}
              stroke={ann.color}
              strokeWidth={ann.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {livePath ? (
            <Path
              d={livePath}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </GestureDetector>

      {/* Floating toolbar */}
      <View style={styles.toolbar} pointerEvents="box-none">
        <TouchableOpacity style={styles.toolBtn} onPress={handleUndo}>
          <Text style={styles.toolBtnText}>⌫</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={handleClear}>
          <Text style={styles.toolBtnText}>🗑</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {DRAW_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorSwatch,
              { backgroundColor: c, borderColor: c === color ? Colors.white : Colors.border },
              c === color && styles.colorSwatchActive,
            ]}
            onPress={() => setColor(c)}
          />
        ))}

        <View style={styles.divider} />

        {STROKE_WIDTHS.map((w) => (
          <TouchableOpacity
            key={w}
            style={[styles.strokeBtn, strokeWidth === w && styles.strokeBtnActive]}
            onPress={() => setStrokeWidth(w)}
          >
            <View style={[styles.strokeLine, { height: w, backgroundColor: color }]} />
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    top: 80,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 100,
  },
  toolBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  toolBtnText: { fontSize: 18 },
  divider: { width: 24, height: 1, backgroundColor: Colors.border, marginVertical: 2 },
  colorSwatch: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 1,
  },
  colorSwatchActive: { borderWidth: 2.5 },
  strokeBtn: {
    width: 36, height: 22,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  strokeBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}22` },
  strokeLine: { width: 22, borderRadius: 2 },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    marginTop: 2,
  },
  doneBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
});
