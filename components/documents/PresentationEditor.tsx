import { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Slide, SlideElement, PresentationContent } from '@/lib/documents/schemas';

interface PresentationEditorProps {
  content: PresentationContent;
  onChange: (content: PresentationContent) => void;
  isReadOnly?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_ASPECT = 16 / 9;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function PresentationEditor({ content, onChange, isReadOnly = false }: PresentationEditorProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPresentingMode, setIsPresentingMode] = useState(false);

  const { slides } = content;
  const currentSlide: Slide | undefined = slides[currentSlideIndex];

  // Canvas dimensions
  const canvasWidth = SCREEN_WIDTH - 90; // account for thumbnail panel
  const canvasHeight = canvasWidth / CANVAS_ASPECT;

  function updateSlides(newSlides: Slide[]) {
    onChange({ ...content, slides: newSlides });
  }

  function addSlide() {
    const newSlide: Slide = {
      id: generateId(),
      background: '#1E293B',
      elements: [
        {
          id: generateId(),
          type: 'text',
          x: 10, y: 35, width: 80, height: 20,
          content: 'New Slide Title',
          style: { fontSize: 28, bold: true, color: '#FFFFFF' },
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
      x: 20, y: 40, width: 60, height: 20,
      content: 'Double tap to edit',
      style: { fontSize: 18, color: '#FFFFFF' },
    };
    const updated = slides.map((s, i) =>
      i === currentSlideIndex
        ? { ...s, elements: [...s.elements, newEl] }
        : s
    );
    updateSlides(updated);
    setSelectedElementId(newEl.id);
  }

  function updateElement(elementId: string, updates: Partial<SlideElement>) {
    const updated = slides.map((s, i) =>
      i === currentSlideIndex
        ? {
            ...s,
            elements: s.elements.map((el) =>
              el.id === elementId ? { ...el, ...updates } : el
            ),
          }
        : s
    );
    updateSlides(updated);
  }

  function deleteElement(elementId: string) {
    const updated = slides.map((s, i) =>
      i === currentSlideIndex
        ? { ...s, elements: s.elements.filter((el) => el.id !== elementId) }
        : s
    );
    updateSlides(updated);
    setSelectedElementId(null);
  }

  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementId);

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      {!isReadOnly && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={addTextElement} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>+ Text</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addSlide} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>+ Slide</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsPresentingMode(true)} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>▷ Present</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.editorArea}>
        {/* Slide thumbnails */}
        <ScrollView style={styles.thumbnailPanel} showsVerticalScrollIndicator={false}>
          {slides.map((slide, index) => (
            <TouchableOpacity
              key={slide.id}
              onPress={() => { setCurrentSlideIndex(index); setSelectedElementId(null); }}
              style={[
                styles.thumbnail,
                index === currentSlideIndex && styles.thumbnailActive,
              ]}
            >
              <View style={[styles.thumbnailCanvas, { backgroundColor: slide.background }]}>
                {slide.elements.slice(0, 2).map((el) => (
                  <Text key={el.id} style={styles.thumbnailText} numberOfLines={1}>
                    {el.content}
                  </Text>
                ))}
              </View>
              <Text style={styles.slideNumber}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Main canvas */}
        <View style={styles.canvasWrapper}>
          {currentSlide && (
            <View
              style={[
                styles.canvas,
                {
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundColor: currentSlide.background,
                },
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
                        width: w, minHeight: h,
                        borderColor: isSelectedEl ? Colors.primary : 'transparent',
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {element.type === 'text' ? (
                      isSelectedEl && !isReadOnly ? (
                        <TextInput
                          style={[
                            styles.elementInput,
                            {
                              fontSize: element.style?.fontSize ?? 16,
                              fontWeight: element.style?.bold ? '700' : '400',
                              color: element.style?.color ?? Colors.white,
                            },
                          ]}
                          value={element.content}
                          onChangeText={(t) => updateElement(element.id, { content: t })}
                          multiline
                          autoFocus
                        />
                      ) : (
                        <Text
                          style={{
                            fontSize: element.style?.fontSize ?? 16,
                            fontWeight: element.style?.bold ? '700' : '400',
                            color: element.style?.color ?? Colors.white,
                          }}
                        >
                          {element.content}
                        </Text>
                      )
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Element actions bar */}
          {selectedElement && !isReadOnly && (
            <View style={styles.elementActions}>
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
                <View
                  key={el.id}
                  style={{
                    position: 'absolute',
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: (el.style?.fontSize ?? 16) * 1.5,
                      fontWeight: el.style?.bold ? '700' : '400',
                      color: el.style?.color ?? Colors.white,
                    }}
                  >
                    {el.content}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Navigation */}
          <View style={styles.presentNav}>
            <TouchableOpacity
              onPress={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
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
                  setCurrentSlideIndex((i) => i + 1);
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
  toolbar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  toolbarBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
  },
  toolbarBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  editorArea: { flex: 1, flexDirection: 'row' },
  thumbnailPanel: {
    width: 80,
    backgroundColor: Colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
  },
  thumbnail: {
    padding: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  thumbnailActive: { backgroundColor: `${Colors.primary}22` },
  thumbnailCanvas: {
    width: 64,
    height: 36,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    padding: 2,
  },
  thumbnailText: { color: Colors.white, fontSize: 5 },
  slideNumber: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },
  canvasWrapper: { flex: 1, alignItems: 'center', paddingTop: Spacing.md },
  canvas: { borderRadius: Radius.sm, overflow: 'hidden', position: 'relative' },
  element: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  elementInput: { color: Colors.white },
  elementActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
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
  presentModal: { flex: 1, backgroundColor: '#000' },
  presentCanvas: { flex: 1, position: 'relative' },
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
