"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, ChevronDown,
  AlertCircle, CheckCircle, Bold, Italic, Link as LinkIcon,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useCategories, useContent } from '@/lib/firebase/hooks';
import { ContentContent, iconComponents, SaveStatus, type ContentSection } from '@/lib/firebase/collections';
import { generateSlug } from '@/lib/utils/sanitize';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';



export default function ContentManagement() {
  const { content, loading, error, updateContent, addContent, deleteContent } = useContent();
  const [editingContent, setEditingContent] = useState<ContentSection | null>(null);
  const [expandedContent, setExpandedContent] = useState<string | null | undefined>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ type: 'idle', message: null });
  const [activeEditor, setActiveEditor] = useState<number | null>(null);

  const handleSave = async () => {
    if (!editingContent) return;

    setSaveStatus({type: 'saving', message: null});

    try {

      // Check if title is empty
      if (!editingContent.title.trim()) {
        setSaveStatus({type: 'error', message: 'Title cannot be empty'});
        setTimeout(() => setSaveStatus({type: 'idle', message: null}), 2000);
        return;
      }

      // Check for duplicate titles
      const isDuplicate = content.some(item => 
        item.title.toLowerCase() === editingContent.title.toLowerCase() &&
        item.id !== editingContent.id // Exclude current item when editing
      );

      if (isDuplicate) {
        setSaveStatus({type: 'error', message: 'A page with this title already exists'});
        setTimeout(() => setSaveStatus({type: 'idle', message: null}), 2000);
        return;
      }

      if (editingContent.id) {
        await updateContent(editingContent.id, {
          ...editingContent,
          lastModified: new Date().toISOString()
        });
      } else {
        delete editingContent.id;
        await addContent({
          ...editingContent,
          lastModified: new Date().toISOString()
        });
      }
      setTimeout(() => {
        setSaveStatus({type: 'success', message: 'Successful'});
        setTimeout(() => setSaveStatus({type: 'idle', message: null}), 2000);
        setEditingContent(null);
      }, 2000);
    } catch (error) {
      setSaveStatus({type: 'error', message: 'Failed to save content. Please try again.'});
      setTimeout(() => setSaveStatus({type: 'idle', message: null}), 2000);
    }
  };

  const editor = useEditor({
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
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (!editingContent) return;

      if (activeEditor !== null) {
        // Update specific section content
        const updatedContent = [...(editingContent.content as any[])];
        updatedContent[activeEditor] = {
          ...updatedContent[activeEditor],
          content: editor.getHTML()
        };
        setEditingContent({
          ...editingContent,
          content: updatedContent
        });
      }
    }
  });

  // Update editor content when active editor changes
  useEffect(() => {
    if (!editor || !editingContent || activeEditor === null) return;

    const content = editingContent.content as any[];
    if (!Array.isArray(content) || !content[activeEditor]) return;

    const sectionContent = content[activeEditor].content;

    editor.commands.setContent(sectionContent || '');
  }, [activeEditor, editingContent, editor]);

  const handleEdit = (content: ContentSection) => {
    setEditingContent(content);
    editor?.commands.setContent(content.content);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await deleteContent(id);
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  const renderContentCard = (item: ContentSection) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-500">{item.slug}</p>
        </div>
        <button
          onClick={() =>
            setExpandedContent(expandedContent === item.id ? null : item.id)
          }
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expandedContent === item.id ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            item.status === 'published'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {item.status}
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
          {item.type}
        </span>
      </div>

      <AnimatePresence>
        {expandedContent === item.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="text-sm text-gray-700">
              <p>Last Modified: {new Date(item.lastModified).toLocaleString()}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleEdit(item)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-300 shadow-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(item?.id as string)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 transition-colors border border-red-200 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const handleTitleChange = (title: string) => {
    if (!editingContent) return;
    
    const slug = generateSlug(title);
    setEditingContent({
      ...editingContent,
      title,
      slug
    });
  };

  const renderContentEditor = () => {
    if (!editingContent) return null;

    // Initialize as empty array if content is not yet an array
    const theContent = Array.isArray(editingContent.content) 
      ? editingContent.content as ContentContent[]
      : [];
    return (
      <div className="space-y-6 bg-white p-4 rounded">

        {/* Save Status Alert */}
        <AnimatePresence mode="wait">
          {saveStatus.type && saveStatus.type !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Alert variant={saveStatus.type === 'error' ? 'destructive' : 'default'}>
                {saveStatus.type === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {saveStatus.type === 'error' ? 'Error' : 'Success'}
                </AlertTitle>
                <AlertDescription>{saveStatus.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Page Title</label>
          <input
            type="text"
            value={editingContent.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 shadow-sm"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL Slug</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingContent.slug}
              readOnly
              className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
            />
            <span className="text-sm text-gray-500 uppercase">Auto-generated</span>
          </div>
        </div>

        {/* Type Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            value={editingContent.type}
            onChange={(e) => setEditingContent({ ...editingContent, type: e.target.value } as any)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 shadow-sm focus:ring-primary/50"
          >
            <option value="legal">Legal</option>
            <option value="help">Help</option>
          </select>
        </div>

        {/* Status Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={editingContent.status}
            onChange={(e) => setEditingContent({ ...editingContent, status: e.target.value } as any)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 shadow-sm focus:ring-primary/50"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {theContent.map((section, index) => (
            <div key={index} className="p-6 bg-gray-50 rounded-xl space-y-4 border border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Section {index + 1}</h3>
                <button
                  onClick={() => {
                    const newContent = [...theContent];
                    newContent.splice(index, 1);
                    setEditingContent({ ...editingContent, content: newContent });
                  }}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Section Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => {
                    const newContent = [...theContent];
                    newContent[index].title = e.target.value;
                    setEditingContent({ ...editingContent, content: newContent });
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 shadow-sm"
                />
              </div>

              {/* Section Content (Editor) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <div
                  className="bg-white border border-gray-300 rounded-lg p-4"
                  onClick={() => {
                    setActiveEditor(index);
                    editor?.commands.setContent(section.content);
                  }}
                >
                  {activeEditor === index ? (
                    <>
                      <EditorContent editor={editor} className="prose max-w-none bg-primary p-4 rounded" />
                      <div className="flex flex-wrap gap-2 mt-2 border-t border-gray-200 pt-2">
                        <button
                          onClick={() => editor?.chain().focus().toggleBold().run()}
                          className={`p-2 rounded ${
                            editor?.isActive('bold') ? 'bg-gray-200' : 'bg-gray-100'
                          }`}
                        >
                          <Bold className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => editor?.chain().focus().toggleItalic().run()}
                          className={`p-2 rounded ${
                            editor?.isActive('italic') ? 'bg-gray-200' : 'bg-gray-100'
                          }`}
                        >
                          <Italic className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => {
                            const url = window.prompt('Enter URL');
                            if (url) {
                              editor?.chain().focus().setLink({ href: url }).run();
                            }
                          }}
                          className={`p-2 rounded ${
                            editor?.isActive('link') ? 'bg-gray-200' : 'bg-gray-100'
                          }`}
                        >
                          <LinkIcon className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      className="text-gray-600 text-sm"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Section Button */}
          <button
            onClick={() => {
              const newContent = [...theContent];
              newContent.push({ icon: 'none', title: '', content: '' });
              setEditingContent({ ...editingContent, content: newContent });
            }}
            className="w-full px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
          >
            Add Section
          </button>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditingContent(null)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus.type === 'saving'}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium
              transition-all duration-300 text-white
              ${
                saveStatus.type === 'saving'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : saveStatus.type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : saveStatus.type === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary hover:bg-primary-dark'
              }
            `}
          >
            {saveStatus.type === 'saving' && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            )}
            {saveStatus.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {saveStatus.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {saveStatus.type === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );

  };

  if (loading) {
    return (
      <ContentPreloader text="Loading content..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading content' message={error.message} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const title = '';
            setEditingContent({
              id: undefined,
              title,
              slug: generateSlug(title),
              type: 'help',
              order: content.length,
              lastModified: new Date().toISOString(),
              status: 'draft',
              content: []
            });
          }}
          className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2 shadow"
        >
          <Plus className="h-5 w-5" />
          Add Content
        </button>
      </div>


      {/* Content List or Editor */}
      {editingContent ? (
        renderContentEditor()
      ) : (
        <div className="space-y-4">
          {content.map(item => renderContentCard(item as any))}
        </div>
      )}
    </div>
  );
}