"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, AlertCircle, CheckCircle, Bold, Italic, Link as LinkIcon, List, Heart, Users, Shield, Award, Eye, Target } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useAboutContent } from '@/lib/firebase/hooks';
import type { AboutContent } from '@/lib/firebase/collections';
import { renderIconSelect } from '@/helper';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

export default function AboutManagement() {
  const { content, loading, error, updateAboutContent } = useAboutContent();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [aboutContent, setAboutContent] = useState<Omit<AboutContent, 'updatedAt'>>({
    vision: { icon: 'Eye', content: '' },
    mission: { icon: 'Target', content: '' },
    story: { content: '' },
    values: [],
    whyChooseUs: [],
    additionalContent: ''
  });

  // Initialize editors
  const visionEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:text-primary-dark underline',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setAboutContent(prev => ({
        ...prev,
        vision: { ...prev.vision, content: editor.getHTML() }
      }));
    },
  });

  const missionEditor = useEditor({
    extensions: [StarterKit, Link],
    content: '',
    onUpdate: ({ editor }) => {
      setAboutContent(prev => ({
        ...prev,
        mission: { ...prev.mission, content: editor.getHTML() }
      }));
    },
  });

  const storyEditor = useEditor({
    extensions: [StarterKit, Link],
    content: '',
    onUpdate: ({ editor }) => {
      setAboutContent(prev => ({
        ...prev,
        story: { content: editor.getHTML() }
      }));
    },
  });

  const additionalContentEditor = useEditor({
    extensions: [StarterKit, Link],
    content: '',
    onUpdate: ({ editor }) => {
      setAboutContent(prev => ({
        ...prev,
        additionalContent: editor.getHTML()
      }));
    },
  });

  // Load existing content when available
  useEffect(() => {
    if (content) {
      setAboutContent({
        vision: content.vision,
        mission: content.mission,
        story: content.story,
        values: content.values,
        whyChooseUs: content.whyChooseUs,
        additionalContent: content.additionalContent
      });

      // Update editors with content
      visionEditor?.commands.setContent(content.vision.content);
      missionEditor?.commands.setContent(content.mission.content);
      storyEditor?.commands.setContent(content.story.content);
      additionalContentEditor?.commands.setContent(content.additionalContent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await updateAboutContent(aboutContent);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving about content:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const renderEditorToolbar = (editor: any) => {
    if (!editor) return null;
  
    return (
      <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded-md">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-300 text-primary font-semibold' : 'text-gray-800'
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-300 text-primary font-semibold' : 'text-gray-800'
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-300 text-primary font-semibold' : 'text-gray-800'
          }`}
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-gray-300 text-primary font-semibold' : 'text-gray-800'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  };



  if (loading) {
    return (
      <ContentPreloader text="Loading Settings..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading Settings' message={error.message} />
    );
  }

  return (
    <div className="space-y-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-gray-800">

      {/* Section - Vision */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Vision</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            {renderIconSelect(aboutContent.vision.icon, (icon) =>
              setAboutContent((prev) => ({
                ...prev,
                vision: { ...prev.vision, icon }
              }))
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg">
              {renderEditorToolbar(visionEditor)}
              <EditorContent editor={visionEditor} className="p-4 min-h-[200px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Section - Mission */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Mission</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            {renderIconSelect(aboutContent.mission.icon, (icon) =>
              setAboutContent((prev) => ({
                ...prev,
                mission: { ...prev.mission, icon }
              }))
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg">
              {renderEditorToolbar(missionEditor)}
              <EditorContent editor={missionEditor} className="p-4 min-h-[200px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Section - Story */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Our Story</h2>
        <div className="bg-gray-50 border border-gray-300 rounded-lg">
          {renderEditorToolbar(storyEditor)}
          <EditorContent editor={storyEditor} className="p-4 min-h-[200px]" />
        </div>
      </section>

      {/* Section - Values */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Our Values</h2>
          <button
            onClick={() =>
              setAboutContent((prev) => ({
                ...prev,
                values: [...prev.values, { icon: 'Heart', title: '', description: '' }]
              }))
            }
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
          >
            <Plus className="h-4 w-4" />
            Add Value
          </button>
        </div>

        <div className="space-y-4">
          {aboutContent.values.map((value, index) => (
            <div key={index} className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  {renderIconSelect(value.icon, (icon) => {
                    const newValues = [...aboutContent.values];
                    newValues[index] = { ...value, icon };
                    setAboutContent((prev) => ({ ...prev, values: newValues }));
                  })}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={value.title}
                      onChange={(e) => {
                        const newValues = [...aboutContent.values];
                        newValues[index] = { ...value, title: e.target.value };
                        setAboutContent((prev) => ({ ...prev, values: newValues }));
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={value.description}
                      onChange={(e) => {
                        const newValues = [...aboutContent.values];
                        newValues[index] = { ...value, description: e.target.value };
                        setAboutContent((prev) => ({ ...prev, values: newValues }));
                      }}
                      rows={3}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newValues = aboutContent.values.filter((_, i) => i !== index);
                    setAboutContent((prev) => ({ ...prev, values: newValues }));
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section - Why Choose Us */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Why Choose Us</h2>
          <button
            onClick={() =>
              setAboutContent((prev) => ({
                ...prev,
                whyChooseUs: [...prev.whyChooseUs, { icon: 'CheckCircle', title: '', description: '' }]
              }))
            }
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
          >
            <Plus className="h-4 w-4" />
            Add Reason
          </button>
        </div>

        <div className="space-y-4">
          {aboutContent.whyChooseUs.map((reason, index) => (
            <div key={index} className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  {renderIconSelect(reason.icon, (icon) => {
                    const newReasons = [...aboutContent.whyChooseUs];
                    newReasons[index] = { ...reason, icon };
                    setAboutContent((prev) => ({ ...prev, whyChooseUs: newReasons }));
                  })}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={reason.title}
                      onChange={(e) => {
                        const newReasons = [...aboutContent.whyChooseUs];
                        newReasons[index] = { ...reason, title: e.target.value };
                        setAboutContent((prev) => ({ ...prev, whyChooseUs: newReasons }));
                      }}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={reason.description}
                      onChange={(e) => {
                        const newReasons = [...aboutContent.whyChooseUs];
                        newReasons[index] = { ...reason, description: e.target.value };
                        setAboutContent((prev) => ({ ...prev, whyChooseUs: newReasons }));
                      }}
                      rows={3}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newReasons = aboutContent.whyChooseUs.filter((_, i) => i !== index);
                    setAboutContent((prev) => ({ ...prev, whyChooseUs: newReasons }));
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section - Additional Content */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Additional Content</h2>
        <div className="bg-gray-50 border border-gray-300 rounded-lg">
          {renderEditorToolbar(additionalContentEditor)}
          <EditorContent editor={additionalContentEditor} className="p-4 min-h-[200px]" />
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-300 text-white ${
            saveStatus === 'saving'
              ? 'bg-gray-400 cursor-not-allowed'
              : saveStatus === 'success'
              ? 'bg-green-500'
              : saveStatus === 'error'
              ? 'bg-red-500'
              : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {saveStatus === 'saving' && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          )}
          {saveStatus === 'success' && <CheckCircle className="h-5 w-5" />}
          {saveStatus === 'error' && <AlertCircle className="h-5 w-5" />}
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

    </div>
  );

}
