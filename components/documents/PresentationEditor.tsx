import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { uploadImageBase64, mimeToExt } from '@/lib/firebase/storage';
import { useAuthStore } from '@/store/authStore';
import type { Slide, SlideElement, PresentationContent } from '@/lib/documents/schemas';

interface PresentationEditorProps {
  content: PresentationContent;
  onChange: (content: PresentationContent) => void;
  isReadOnly?: boolean;
}

const CANVAS_ASPECT = 16 / 9;
const THUMB_CANVAS_W = 74;
const THUMB_CANVAS_H = 42;  // 16:9 ratio
const MIN_PANEL_WIDTH = THUMB_CANVAS_W; // panel shrinks to exactly thumbnail width
const INITIAL_PANEL_WIDTH = MIN_PANEL_WIDTH; // default: furthest left
const MAX_PANEL_WIDTH = 220;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function PresentationEditor({ content, onChange, isReadOnly = false }: PresentationEditorProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPresentingMode, setIsPresentingMode] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showElementColors, setShowElementColors] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAnimPicker, setShowAnimPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const user = useAuthStore((s) => s.user);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { slides } = content;
  const currentSlide: Slide | undefined = slides[currentSlideIndex];

  // ── Resizable thumbnail panel ─────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(INITIAL_PANEL_WIDTH);
  const dividerDrag = useRef({ startX: 0, startWidth: INITIAL_PANEL_WIDTH });
  const panelWidthRef = useRef(INITIAL_PANEL_WIDTH);
  panelWidthRef.current = panelWidth;

  // Measure the rightPanel (canvas area) directly so the canvas fits in both portrait and landscape.
  // Initial estimate: subtract panel and divider widths.
  const [editorLayout, setEditorLayout] = useState({
    width: screenWidth - INITIAL_PANEL_WIDTH - 8,
    height: screenHeight,
  });
  // availableWidth: rightPanel measured width minus a small margin
  // availableHeight: rightPanel measured height minus canvasWrapper paddingTop (Spacing.md) and margin
  const availableWidth = editorLayout.width - 8;
  const availableHeight = editorLayout.height - Spacing.md - 8;
  const heightFromWidth = availableWidth / CANVAS_ASPECT;
  const canvasWidth = heightFromWidth > availableHeight
    ? availableHeight * CANVAS_ASPECT
    : availableWidth;
  const canvasHeight = canvasWidth / CANVAS_ASPECT;

  // ── Slide transition animation shared values ──────────────────────────────
  const slideOpacity = useSharedValue(1);
  const slideTranslateX = useSharedValue(0);
  const slideScale = useSharedValue(1);

  const slideAnimStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ translateX: slideTranslateX.value }, { scale: slideScale.value }],
  }));

  function animateTransitionTo(newIdx: number) {
    const t = slides[currentSlideIndex]?.transition ?? { type: 'none', duration: 300 };
    if (t.type === 'fade') {
      slideOpacity.value = 0;
      setCurrentSlideIndex(newIdx);
      slideOpacity.value = withTiming(1, { duration: t.duration ?? 300 });
    } else if (t.type === 'slide') {
      slideTranslateX.value = canvasWidth;
      setCurrentSlideIndex(newIdx);
      slideTranslateX.value = withTiming(0, { duration: t.duration ?? 300 });
    } else if (t.type === 'zoom') {
      slideScale.value = 0.8;
      slideOpacity.value = 0;
      setCurrentSlideIndex(newIdx);
      slideScale.value = withSpring(1);
      slideOpacity.value = withTiming(1, { duration: t.duration ?? 300 });
    } else {
      setCurrentSlideIndex(newIdx);
    }
    setSelectedElementId(null);
  }

  function updateSlideTransition(type: 'none' | 'fade' | 'slide' | 'zoom') {
    updateCurrentSlide({ transition: { type, duration: 300 } });
  }

  function updateSlides(newSlides: Slide[]) {
    onChange({ ...content, slides: newSlides });
  }

  function updateCurrentSlide(updates: Partial<Slide>) {
    updateSlides(slides.map((s, i) => (i === currentSlideIndex ? { ...s, ...updates } : s)));
  }

  // ── Slide drag-reorder ────────────────────────────────────────────────────
  // Approximate height of one thumbnail item (canvas 25 + padding 4*2 + label ~10)
  const THUMB_ITEM_HEIGHT = 43;
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function reorderSlide(from: number, to: number) {
    const updated = [...slides];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    updateSlides(updated);
    setCurrentSlideIndex(to);
  }

  function addSlide() {
    const newSlide: Slide = {
      id: generateId(),
      background: '#1E293B',
      elements: [
        {
          id: generateId(),
          type: 'text',
          x: 10, y: 10, width: 80, height: 25,
          content: 'New Slide Title',
          style: { fontSize: 28, bold: true, color: '#FFFFFF', align: 'center' },
        },
        {
          id: generateId(),
          type: 'text',
          x: 10, y: 42, width: 80, height: 48,
          content: '',
          style: { fontSize: 16, color: '#CBD5E1', align: 'left' },
        },
      ],
    };
    const newSlides = [...slides, newSlide];
    updateSlides(newSlides);
    setCurrentSlideIndex(newSlides.length - 1);
  }

  function deleteSlide(index: number) {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    updateSlides(newSlides);
    setCurrentSlideIndex(Math.max(0, Math.min(index, newSlides.length - 1)));
  }

  function addTextElement() {
    if (!currentSlide) return;
    const newEl: SlideElement = {
      id: generateId(),
      type: 'text',
      x: 10, y: 68, width: 80, height: 22,
      content: 'Text',
      style: { fontSize: 18, color: '#FFFFFF', align: 'center' },
    };
    updateCurrentSlide({ elements: [...currentSlide.elements, newEl] });
    setSelectedElementId(newEl.id);
  }

  function toggleBullets() {
    if (!selectedElement || selectedElement.type !== 'text') {
      // No text element selected — add a new one pre-loaded with a bullet
      if (!currentSlide) return;
      const newEl: SlideElement = {
        id: generateId(),
        type: 'text',
        x: 10, y: 68, width: 80, height: 22,
        content: '• ',
        style: { fontSize: 18, color: '#FFFFFF', align: 'left' },
      };
      updateCurrentSlide({ elements: [...currentSlide.elements, newEl] });
      setSelectedElementId(newEl.id);
      return;
    }
    const lines = selectedElement.content.split('\n');
    const allHaveBullets = lines.length > 0 && lines.every((l) => l.startsWith('• '));
    const newContent = allHaveBullets
      ? lines.map((l) => l.slice(2)).join('\n')
      : lines.map((l) => (l.startsWith('• ') ? l : '• ' + l)).join('\n');
    updateElement(selectedElement.id, { content: newContent });
  }

  function handleTextChange(elementId: string, newText: string, prevText: string) {
    // When Enter is pressed on a bullet line, auto-start the next line with a bullet
    if (newText.length === prevText.length + 1 && newText.endsWith('\n')) {
      const lines = newText.split('\n');
      const prevLine = lines[lines.length - 2] ?? '';
      if (prevLine.startsWith('• ')) {
        updateElement(elementId, { content: newText + '• ' });
        return;
      }
    }
    updateElement(elementId, { content: newText });
  }

  function addShapeElement(shapeType: SlideElement['shapeType'] = 'rect') {
    if (!currentSlide) return;
    const newEl: SlideElement = {
      id: generateId(),
      type: 'shape',
      x: 25, y: 30, width: 50, height: 40,
      content: '',
      shapeType,
      fill: { type: 'solid', color: '#3B82F6' },
      stroke: { color: '#1E293B', width: 2 },
    };
    updateCurrentSlide({ elements: [...currentSlide.elements, newEl] });
    setSelectedElementId(newEl.id);
    setShowShapePicker(false);
  }

  async function addImageElement() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to insert images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'Could not read image data.'); return; }

    setUploadingImage(true);
    try {
      const ext = mimeToExt(asset.mimeType ?? 'image/jpeg');
      const path = `presentations/${user?.id ?? 'unknown'}/slides/${generateId()}.${ext}`;
      const downloadUrl = await uploadImageBase64(asset.base64, path);
      const newEl: SlideElement = {
        id: generateId(),
        type: 'image',
        x: 10, y: 20, width: 80, height: 50,
        content: '',
        src: downloadUrl,
        objectFit: 'contain',
      };
      if (currentSlide) updateCurrentSlide({ elements: [...currentSlide.elements, newEl] });
      setSelectedElementId(newEl.id);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  }

  function updateElement(elementId: string, updates: Partial<SlideElement>) {
    if (!currentSlide) return;
    updateCurrentSlide({
      elements: currentSlide.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    });
  }

  function deleteElement(elementId: string) {
    if (!currentSlide) return;
    updateCurrentSlide({
      elements: currentSlide.elements.filter((el) => el.id !== elementId),
    });
    setSelectedElementId(null);
  }

  function duplicateSlide() {
    if (!currentSlide) return;
    const dupe: Slide = {
      ...currentSlide,
      id: generateId(),
      elements: currentSlide.elements.map((el) => ({ ...el, id: generateId() })),
    };
    const newSlides = [...slides];
    newSlides.splice(currentSlideIndex + 1, 0, dupe);
    updateSlides(newSlides);
    setCurrentSlideIndex(currentSlideIndex + 1);
  }

  // Format toolbar for the selected text element
  function applyElementStyle(updates: Partial<NonNullable<SlideElement['style']>>) {
    if (!selectedElementId) return;
    const el = currentSlide?.elements.find((e) => e.id === selectedElementId);
    if (!el) return;
    updateElement(selectedElementId, { style: { ...el.style, ...updates } });
  }

  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementId);

  const SLIDE_BG_COLORS = [
    '#1E293B', '#0F172A', '#FFFFFF', '#F1F5F9', '#1E3A5F',
    '#14532D', '#7C1D1D', '#312E81', '#374151', '#78350F',
  ];

  const ELEMENT_COLORS = [
    '#FFFFFF', '#000000', '#EF4444', '#F97316', '#EAB308',
    '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
  ];

  const THEMES: Array<{ name: string; bg: string; textColor: string; accent: string }> = [
    { name: 'Dark Navy',   bg: '#1E293B', textColor: '#FFFFFF', accent: '#3B82F6' },
    { name: 'Midnight',    bg: '#0F172A', textColor: '#E2E8F0', accent: '#8B5CF6' },
    { name: 'Forest',      bg: '#14532D', textColor: '#D1FAE5', accent: '#22C55E' },
    { name: 'Crimson',     bg: '#7C1D1D', textColor: '#FEE2E2', accent: '#EF4444' },
    { name: 'Indigo',      bg: '#312E81', textColor: '#E0E7FF', accent: '#6366F1' },
    { name: 'Clean White', bg: '#FFFFFF', textColor: '#1E293B', accent: '#3B82F6' },
    { name: 'Slate',       bg: '#F1F5F9', textColor: '#334155', accent: '#0EA5E9' },
    { name: 'Amber',       bg: '#78350F', textColor: '#FEF3C7', accent: '#F59E0B' },
  ];

  const ANIM_TYPES: Array<{ type: SlideElement['animation'] extends { type: infer T } | undefined ? T : never; label: string }> = [
    { type: 'fade', label: 'Fade' },
    { type: 'slide', label: 'Slide In' },
    { type: 'zoom', label: 'Zoom' },
    { type: 'bounce', label: 'Bounce' },
  ];

  const ANIM_DIRS: Array<{ dir: 'left' | 'right' | 'up' | 'down'; label: string }> = [
    { dir: 'up', label: '↑' },
    { dir: 'down', label: '↓' },
    { dir: 'left', label: '←' },
    { dir: 'right', label: '→' },
  ];

  function applyTheme(theme: typeof THEMES[number]) {
    const newSlides = slides.map((slide) => ({
      ...slide,
      background: theme.bg,
      elements: slide.elements.map((el) =>
        el.type === 'text' ? { ...el, style: { ...el.style, color: theme.textColor } } : el
      ),
    }));
    updateSlides(newSlides);
    setShowThemePicker(false);
  }

  const selectedElFontSize = selectedElement?.style?.fontSize ?? 16;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      {!isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbarScroll}
          contentContainerStyle={styles.toolbar}
        >
          <TouchableOpacity onPress={addTextElement} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>+ Text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleBullets}
            style={[styles.toolbarBtn, selectedElement?.type === 'text' && selectedElement.content.split('\n').every((l) => l.startsWith('• ')) && styles.toolbarBtnActive]}
          >
            <Text style={[styles.toolbarBtnText, selectedElement?.type === 'text' && selectedElement.content.split('\n').every((l) => l.startsWith('• ')) && styles.toolbarBtnTextActive]}>•≡ Bullets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowShapePicker((v) => !v)}
            style={[styles.toolbarBtn, showShapePicker && styles.toolbarBtnActive]}
          >
            <Text style={[styles.toolbarBtnText, showShapePicker && styles.toolbarBtnTextActive]}>🔷 Shape</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={addImageElement}
            style={styles.toolbarBtn}
            disabled={uploadingImage}
          >
            <Text style={styles.toolbarBtnText}>{uploadingImage ? '⏳' : '🖼 Image'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addSlide} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>+ Slide</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={duplicateSlide} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>⧉ Dupe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowBgPicker((v) => !v); setShowElementColors(false); }}
            style={[styles.toolbarBtn, showBgPicker && styles.toolbarBtnActive]}
          >
            <Text style={[styles.toolbarBtnText, showBgPicker && styles.toolbarBtnTextActive]}>BG</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsPresentingMode(true)} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>▷ Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNotes((v) => !v)}
            style={[styles.toolbarBtn, showNotes && styles.toolbarBtnActive]}
          >
            <Text style={[styles.toolbarBtnText, showNotes && styles.toolbarBtnTextActive]}>
              Notes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowThemePicker((v) => !v); setShowBgPicker(false); setShowElementColors(false); }}
            style={[styles.toolbarBtn, showThemePicker && styles.toolbarBtnActive]}
          >
            <Text style={[styles.toolbarBtnText, showThemePicker && styles.toolbarBtnTextActive]}>🎨 Theme</Text>
          </TouchableOpacity>

          {/* Slide transition picker */}
          {!isReadOnly && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Slide Transition', `Current: ${currentSlide?.transition?.type ?? 'none'}`, [
                  { text: 'None', onPress: () => updateSlideTransition('none') },
                  { text: 'Fade', onPress: () => updateSlideTransition('fade') },
                  { text: 'Slide', onPress: () => updateSlideTransition('slide') },
                  { text: 'Zoom', onPress: () => updateSlideTransition('zoom') },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
              style={[styles.toolbarBtn, !!currentSlide?.transition && currentSlide.transition.type !== 'none' && styles.toolbarBtnActive]}
            >
              <Text style={[styles.toolbarBtnText, !!currentSlide?.transition && currentSlide.transition.type !== 'none' && styles.toolbarBtnTextActive]}>
                🎬 {currentSlide?.transition?.type ?? 'none'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Element style controls (visible when a text element is selected) */}
          {selectedElement?.type === 'text' && (
            <>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity
                style={[styles.fmtBtn, selectedElement.style?.bold && styles.fmtBtnActive]}
                onPress={() => applyElementStyle({ bold: !selectedElement.style?.bold })}
              >
                <Text style={[styles.fmtBtnText, selectedElement.style?.bold && styles.fmtBtnTextActive, { fontWeight: '700' }]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fmtBtn, selectedElement.style?.italic && styles.fmtBtnActive]}
                onPress={() => applyElementStyle({ italic: !selectedElement.style?.italic })}
              >
                <Text style={[styles.fmtBtnText, selectedElement.style?.italic && styles.fmtBtnTextActive, { fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fmtBtn, selectedElement.content.split('\n').every((l) => l.startsWith('• ')) && styles.fmtBtnActive]}
                onPress={toggleBullets}
              >
                <Text style={[styles.fmtBtnText, selectedElement.content.split('\n').every((l) => l.startsWith('• ')) && styles.fmtBtnTextActive]}>•≡</Text>
              </TouchableOpacity>
              {(['left', 'center', 'right'] as const).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.fmtBtn, (selectedElement.style?.align ?? 'left') === a && styles.fmtBtnActive]}
                  onPress={() => applyElementStyle({ align: a })}
                >
                  <Text style={[styles.fmtBtnText, (selectedElement.style?.align ?? 'left') === a && styles.fmtBtnTextActive]}>
                    {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.toolbarDivider} />

              {/* Font size */}
              <TouchableOpacity
                style={styles.fmtBtn}
                onPress={() => applyElementStyle({ fontSize: Math.max(8, selectedElFontSize - 2) })}
              >
                <Text style={styles.fmtBtnText}>A-</Text>
              </TouchableOpacity>
              <Text style={[styles.fmtBtnText, { minWidth: 24, textAlign: 'center' }]}>
                {selectedElFontSize}
              </Text>
              <TouchableOpacity
                style={styles.fmtBtn}
                onPress={() => applyElementStyle({ fontSize: Math.min(96, selectedElFontSize + 2) })}
              >
                <Text style={styles.fmtBtnText}>A+</Text>
              </TouchableOpacity>

              {/* Color picker toggle */}
              <TouchableOpacity
                style={[styles.fmtBtn, showElementColors && styles.fmtBtnActive]}
                onPress={() => { setShowElementColors((v) => !v); setShowBgPicker(false); }}
              >
                <Text style={[styles.fmtBtnText, showElementColors && styles.fmtBtnTextActive]}>A●</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Background color picker row */}
      {showBgPicker && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorBar}
          contentContainerStyle={styles.colorBarContent}
        >
          {SLIDE_BG_COLORS.map((hex) => (
            <TouchableOpacity
              key={hex}
              onPress={() => { updateCurrentSlide({ background: hex }); setShowBgPicker(false); }}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex },
                currentSlide?.background === hex && styles.colorSwatchActive,
              ]}
            />
          ))}
        </ScrollView>
      )}

      {/* Shape picker row */}
      {showShapePicker && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.animPickerBar}
          contentContainerStyle={{ gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }}
        >
          {([
            { type: 'rect',     label: '▭ Rect' },
            { type: 'ellipse',  label: '⬭ Ellipse' },
            { type: 'triangle', label: '△ Triangle' },
            { type: 'arrow',    label: '→ Arrow' },
            { type: 'star',     label: '★ Star' },
            { type: 'line',     label: '— Line' },
          ] as const).map(({ type, label }) => (
            <TouchableOpacity
              key={type}
              style={styles.animChip}
              onPress={() => addShapeElement(type)}
            >
              <Text style={styles.animChipText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Element color picker row */}
      {showElementColors && selectedElement?.type === 'text' && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorBar}
          contentContainerStyle={styles.colorBarContent}
        >
          {ELEMENT_COLORS.map((hex) => (
            <TouchableOpacity
              key={hex}
              onPress={() => { applyElementStyle({ color: hex }); setShowElementColors(false); }}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex },
                (selectedElement.style?.color ?? '#FFFFFF') === hex && styles.colorSwatchActive,
              ]}
            />
          ))}
        </ScrollView>
      )}

      {/* Theme picker */}
      {showThemePicker && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorBar}
          contentContainerStyle={[styles.colorBarContent, { gap: Spacing.sm }]}
        >
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.name}
              onPress={() => applyTheme(theme)}
              style={[styles.themeChip, { backgroundColor: theme.bg, borderColor: theme.accent }]}
            >
              <Text style={[styles.themeChipText, { color: theme.textColor }]}>{theme.name}</Text>
              <View style={[styles.themeAccentDot, { backgroundColor: theme.accent }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.editorArea}>
        {/* Slide thumbnails */}
        <ScrollView style={[styles.thumbnailPanel, { width: panelWidth }]} showsVerticalScrollIndicator={false}>
          {slides.map((slide, index) => {
            const panGesture = Gesture.Pan()
              .runOnJS(true)
              .onBegin(() => setDragIndex(index))
              .onEnd(({ translationY }) => {
                const delta = Math.round(translationY / THUMB_ITEM_HEIGHT);
                const target = Math.max(0, Math.min(slides.length - 1, index + delta));
                if (target !== index) reorderSlide(index, target);
                setDragIndex(null);
              });
            const tapGesture = Gesture.Tap()
              .runOnJS(true)
              .onEnd(() => animateTransitionTo(index));
            const combined = Gesture.Exclusive(panGesture, tapGesture);
            return (
              <GestureDetector key={slide.id} gesture={combined}>
                <Animated.View
                  style={[
                    styles.thumbnail,
                    index === currentSlideIndex && styles.thumbnailActive,
                    dragIndex === index && styles.thumbnailDragging,
                  ]}
                >
                  <View style={[styles.thumbnailCanvas, { width: THUMB_CANVAS_W, height: THUMB_CANVAS_H, backgroundColor: slide.background }]}>
                    {slide.elements.slice(0, 2).map((el) => (
                      <Text key={el.id} style={styles.thumbnailText} numberOfLines={1}>
                        {el.content}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.slideNumber}>{index + 1}</Text>
                </Animated.View>
              </GestureDetector>
            );
          })}
        </ScrollView>

        {/* Draggable divider */}
        <View
          style={styles.divider}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            dividerDrag.current.startX = e.nativeEvent.pageX;
            dividerDrag.current.startWidth = panelWidthRef.current;
          }}
          onResponderMove={(e) => {
            const dx = e.nativeEvent.pageX - dividerDrag.current.startX;
            const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, dividerDrag.current.startWidth + dx));
            setPanelWidth(next);
          }}
        >
          <View style={styles.dividerHandle} />
        </View>

        {/* Main canvas + notes */}
        <View
          style={styles.rightPanel}
          onLayout={({ nativeEvent: { layout } }) =>
            setEditorLayout({ width: layout.width, height: layout.height })
          }
        >
          <View style={styles.canvasWrapper}>
            {currentSlide && (
              <Animated.View
                style={[
                  styles.canvas,
                  {
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundColor: currentSlide.background,
                  },
                  slideAnimStyle,
                ]}
              >
                {currentSlide.elements.map((element) => {
                  const isSelectedEl = element.id === selectedElementId;
                  const x = (element.x / 100) * canvasWidth;
                  const y = (element.y / 100) * canvasHeight;
                  const w = (element.width / 100) * canvasWidth;
                  const h = (element.height / 100) * canvasHeight;

                  return (
                    <TouchableOpacity
                      key={element.id}
                      onPress={() => setSelectedElementId(isSelectedEl ? null : element.id)}
                      style={[
                        styles.element,
                        {
                          left: x, top: y,
                          width: w, height: h,
                          borderColor: isSelectedEl
                            ? Colors.primary
                            : element.type === 'text'
                              ? 'rgba(255,255,255,0.25)'
                              : 'transparent',
                          borderStyle: isSelectedEl ? 'solid' : 'dashed',
                          backgroundColor: element.type === 'text' && !isSelectedEl
                            ? 'rgba(255,255,255,0.04)'
                            : undefined,
                          opacity: element.opacity ?? 1,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      {element.type === 'image' ? (
                        element.src ? (
                          <Image
                            source={{ uri: element.src }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode={(element.objectFit === 'fill' ? 'stretch' : element.objectFit) ?? 'contain'}
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Text style={styles.imagePlaceholderText}>🖼</Text>
                          </View>
                        )
                      ) : element.type === 'text' ? (
                        isSelectedEl && !isReadOnly ? (
                          <TextInput
                            style={[
                              styles.elementInput,
                              {
                                fontSize: element.style?.fontSize ?? 16,
                                fontWeight: element.style?.bold ? '700' : '400',
                                fontStyle: element.style?.italic ? 'italic' : 'normal',
                                color: element.style?.color ?? Colors.white,
                                textAlign: element.style?.align ?? 'left',
                                maxHeight: h - Spacing.xs * 2,
                              },
                            ]}
                            value={element.content}
                            onChangeText={(t) => handleTextChange(element.id, t, element.content)}
                            multiline
                            autoFocus
                            scrollEnabled
                          />
                        ) : (
                          <View style={{ flex: 1, overflow: 'hidden' }}>
                            <Text
                              numberOfLines={Math.max(1, Math.floor((h - Spacing.xs * 2) / ((element.style?.fontSize ?? 16) * 1.3)))}
                              ellipsizeMode="tail"
                              style={{
                                fontSize: element.style?.fontSize ?? 16,
                                fontWeight: element.style?.bold ? '700' : '400',
                                fontStyle: element.style?.italic ? 'italic' : 'normal',
                                color: element.style?.color ?? Colors.white,
                                textAlign: element.style?.align ?? 'left',
                              }}
                            >
                              {element.content}
                            </Text>
                          </View>
                        )
                      ) : element.type === 'shape' ? (
                        <Svg width="100%" height="100%" viewBox="0 0 100 100" style={{ flex: 1 }}>
                          {element.shapeType === 'rect' && (
                            <Rect x="2" y="2" width="96" height="96" rx="4"
                              fill={element.fill?.color ?? 'transparent'}
                              stroke={element.stroke?.color ?? '#000'}
                              strokeWidth={element.stroke?.width ?? 2} />
                          )}
                          {element.shapeType === 'ellipse' && (
                            <Ellipse cx="50" cy="50" rx="48" ry="48"
                              fill={element.fill?.color ?? 'transparent'}
                              stroke={element.stroke?.color ?? '#000'}
                              strokeWidth={element.stroke?.width ?? 2} />
                          )}
                          {element.shapeType === 'triangle' && (
                            <Polygon points="50,4 96,96 4,96"
                              fill={element.fill?.color ?? 'transparent'}
                              stroke={element.stroke?.color ?? '#000'}
                              strokeWidth={element.stroke?.width ?? 2} />
                          )}
                          {element.shapeType === 'arrow' && (
                            <Path d="M10,50 L80,50 M65,35 L80,50 L65,65"
                              fill="none"
                              stroke={element.stroke?.color ?? '#000'}
                              strokeWidth={element.stroke?.width ?? 2}
                              strokeLinecap="round" strokeLinejoin="round" />
                          )}
                          {element.shapeType === 'star' && (
                            <Polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
                              fill={element.fill?.color ?? 'transparent'}
                              stroke={element.stroke?.color ?? '#000'}
                              strokeWidth={element.stroke?.width ?? 2} />
                          )}
                          {element.shapeType === 'line' && (
                            <Line x1="4" y1="50" x2="96" y2="50"
                              stroke={element.stroke?.color ?? '#000'}
                              strokeWidth={element.stroke?.width ?? 2} />
                          )}
                        </Svg>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}

            {/* Element actions bar */}
            {selectedElement && !isReadOnly && (
              <View style={{ gap: 0 }}>
                <View style={styles.elementActions}>
                  <TouchableOpacity
                    style={[styles.deleteBtn, showAnimPicker && styles.animBtnActive]}
                    onPress={() => setShowAnimPicker((v) => !v)}
                  >
                    <Text style={[styles.deleteBtnText, showAnimPicker && { color: Colors.primary }]}>
                      {selectedElement.animation ? `✨ ${selectedElement.animation.type}` : '✨ Anim'}
                    </Text>
                  </TouchableOpacity>
                  {selectedElement.animation && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => updateElement(selectedElement.id, { animation: undefined })}
                    >
                      <Text style={styles.deleteBtnText}>✕ Anim</Text>
                    </TouchableOpacity>
                  )}
                  {/* Shape fill color chips (shown when a shape is selected) */}
                  {selectedElement.type === 'shape' && (
                    ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#FFFFFF','#000000','transparent'].map((hex) => (
                      <TouchableOpacity
                        key={hex}
                        onPress={() => updateElement(selectedElement.id, { fill: { type: 'solid', color: hex } })}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: hex === 'transparent' ? Colors.surface : hex, width: 22, height: 22, borderRadius: 11 },
                          selectedElement.fill?.color === hex && styles.colorSwatchActive,
                        ]}
                      >
                        {hex === 'transparent' && <Text style={{ fontSize: 8, textAlign: 'center' }}>✕</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                  <TouchableOpacity
                    onPress={() => deleteElement(selectedElement.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete Element</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => slides.length > 1 && deleteSlide(currentSlideIndex)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete Slide</Text>
                  </TouchableOpacity>
                </View>
                {showAnimPicker && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.animPickerBar}
                    contentContainerStyle={{ gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }}
                  >
                    {ANIM_TYPES.map(({ type, label }) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.animChip, selectedElement.animation?.type === type && styles.animChipActive]}
                        onPress={() => {
                          updateElement(selectedElement.id, {
                            animation: { type, direction: selectedElement.animation?.direction ?? 'up', duration: 400, delay: 0 },
                          });
                        }}
                      >
                        <Text style={[styles.animChipText, selectedElement.animation?.type === type && styles.animChipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.animDivider} />
                    {ANIM_DIRS.map(({ dir, label }) => (
                      <TouchableOpacity
                        key={dir}
                        style={[styles.animChip, selectedElement.animation?.direction === dir && styles.animChipActive]}
                        onPress={() => {
                          if (!selectedElement.animation) return;
                          updateElement(selectedElement.id, { animation: { ...selectedElement.animation, direction: dir } });
                        }}
                      >
                        <Text style={[styles.animChipText, selectedElement.animation?.direction === dir && styles.animChipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Speaker notes panel */}
          {showNotes && (
            <View style={styles.notesPanel}>
              <Text style={styles.notesLabel}>Speaker Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={currentSlide?.notes ?? ''}
                onChangeText={(t) => updateCurrentSlide({ notes: t })}
                multiline
                placeholder="Add speaker notes for this slide..."
                placeholderTextColor={Colors.textDim}
                editable={!isReadOnly}
              />
            </View>
          )}
        </View>
      </View>

      {/* Presentation mode (full screen) */}
      <Modal
        visible={isPresentingMode}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsPresentingMode(false)}
      >
        <View style={styles.presentModal}>
          {slides[currentSlideIndex] && (
            <View
              style={[
                styles.presentCanvas,
                { backgroundColor: slides[currentSlideIndex].background },
              ]}
            >
              {slides[currentSlideIndex].elements.map((el) => (
                <AnimatedSlideElement key={`${currentSlideIndex}-${el.id}`} el={el} />
              ))}
            </View>
          )}

          {/* Speaker notes overlay in present mode */}
          {slides[currentSlideIndex]?.notes ? (
            <View style={styles.presentNotes}>
              <Text style={styles.presentNotesText} numberOfLines={3}>
                {slides[currentSlideIndex].notes}
              </Text>
            </View>
          ) : null}

          {/* Navigation */}
          <View style={styles.presentNav}>
            <TouchableOpacity
              onPress={() => animateTransitionTo(Math.max(0, currentSlideIndex - 1))}
              style={styles.presentNavBtn}
            >
              <Text style={styles.presentNavText}>← Prev</Text>
            </TouchableOpacity>
            <Text style={styles.presentSlideNum}>
              {currentSlideIndex + 1} / {slides.length}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (currentSlideIndex < slides.length - 1) {
                  animateTransitionTo(currentSlideIndex + 1);
                } else {
                  setIsPresentingMode(false);
                }
              }}
              style={styles.presentNavBtn}
            >
              <Text style={styles.presentNavText}>
                {currentSlideIndex < slides.length - 1 ? 'Next →' : 'End'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setIsPresentingMode(false)}
            style={styles.presentClose}
          >
            <Text style={styles.presentCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  toolbarScroll: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 44,
    flexShrink: 0,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  toolbarBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
  },
  toolbarBtnActive: { backgroundColor: Colors.primary },
  toolbarBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  toolbarBtnTextActive: { color: Colors.white },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  fmtBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  fmtBtnActive: { backgroundColor: Colors.primary },
  fmtBtnText: { color: Colors.textMuted, fontSize: FontSize.sm },
  fmtBtnTextActive: { color: Colors.white },
  // Color pickers
  colorBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 40,
  },
  colorBarContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  colorSwatchActive: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },

  editorArea: { flex: 1, flexDirection: 'row' },
  thumbnailPanel: {
    backgroundColor: Colors.surface,
    flexShrink: 0,
    flexGrow: 0,
  },
  divider: {
    width: 16,
    flexShrink: 0,
    flexGrow: 0,
    backgroundColor: Colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  dividerHandle: {
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  thumbnail: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnailActive: { backgroundColor: `${Colors.primary}22` },
  thumbnailDragging: { opacity: 0.5, transform: [{ scale: 1.05 }], elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
  thumbnailCanvas: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  thumbnailText: { color: Colors.white, fontSize: 5 },
  slideNumber: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },
  rightPanel: { flex: 1, flexDirection: 'column' },
  canvasWrapper: { alignItems: 'center', paddingTop: Spacing.md },
  canvas: { borderRadius: Radius.sm, overflow: 'hidden', position: 'relative' },
  element: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    overflow: 'hidden',
  },
  elementInput: { color: Colors.white, flex: 1 },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.sm,
  },
  imagePlaceholderText: { fontSize: 24 },
  elementActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  deleteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: `${Colors.danger}22`,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  deleteBtnText: { color: Colors.danger, fontSize: FontSize.sm },
  animBtnActive: { backgroundColor: `${Colors.primary}22`, borderColor: Colors.primary },
  animPickerBar: { backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  animChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.surfaceHigh, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  animChipActive: { backgroundColor: `${Colors.primary}22`, borderColor: Colors.primary },
  animChipText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '600' },
  animChipTextActive: { color: Colors.primary },
  animDivider: { width: 1, backgroundColor: Colors.border, alignSelf: 'stretch' },
  themeChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  themeChipText: { fontSize: FontSize.xs, fontWeight: '700' },
  themeAccentDot: { width: 8, height: 8, borderRadius: 4 },
  // Notes panel
  notesPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    minHeight: 100,
  },
  notesLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  notesInput: {
    color: Colors.text,
    fontSize: FontSize.sm,
    lineHeight: 20,
    minHeight: 60,
  },
  // Present mode
  presentModal: { flex: 1, backgroundColor: '#000' },
  presentCanvas: { flex: 1, position: 'relative' },
  presentNotes: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  presentNotesText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  presentNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  presentNavBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  presentNavText: { color: Colors.text, fontWeight: '600' },
  presentSlideNum: { color: Colors.textMuted },
  presentClose: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentCloseText: { color: Colors.white, fontSize: FontSize.md },
});

// ── Animated element for present mode ────────────────────────────────────────
function AnimatedSlideElement({ el }: { el: SlideElement }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const anim = el.animation;
    const dur = anim?.duration ?? 400;
    const delay = anim?.delay ?? 0;

    if (!anim) {
      opacity.value = withTiming(1, { duration: 200 });
      return;
    }

    // Initial state
    if (anim.type === 'fade') {
      opacity.value = 0;
    } else if (anim.type === 'slide') {
      opacity.value = 0;
      const dist = 60;
      if (anim.direction === 'left')  translateX.value = -dist;
      else if (anim.direction === 'right') translateX.value = dist;
      else if (anim.direction === 'down') translateY.value = dist;
      else translateY.value = -dist;
    } else if (anim.type === 'zoom') {
      opacity.value = 0;
      scale.value = 0.5;
    } else if (anim.type === 'bounce') {
      opacity.value = 0;
      translateY.value = -40;
    }

    // Animate in after delay
    const timer = setTimeout(() => {
      if (anim.type === 'bounce') {
        opacity.value = withTiming(1, { duration: 150 });
        translateY.value = withSpring(0, { damping: 8, stiffness: 120 });
      } else {
        opacity.value = withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) });
        translateX.value = withTiming(0, { duration: dur, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(0, { duration: dur, easing: Easing.out(Easing.cubic) });
        scale.value = withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${el.x}%` as any,
          top: `${el.y}%` as any,
          width: `${el.width}%` as any,
          height: el.type === 'image' ? (`${el.height}%` as any) : undefined,
        },
        animStyle,
      ]}
    >
      {el.type === 'image' && el.src ? (
        <Image
          source={{ uri: el.src }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={(el.objectFit === 'fill' ? 'stretch' : el.objectFit) ?? 'contain'}
        />
      ) : (
        <Text
          style={{
            fontSize: (el.style?.fontSize ?? 16) * 1.5,
            fontWeight: el.style?.bold ? '700' : '400',
            fontStyle: el.style?.italic ? 'italic' : 'normal',
            color: el.style?.color ?? Colors.white,
            textAlign: el.style?.align ?? 'left',
          }}
        >
          {el.content}
        </Text>
      )}
    </Animated.View>
  );
}
