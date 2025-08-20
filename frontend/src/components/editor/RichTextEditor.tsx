'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useCallback, useEffect } from 'react';
import { MediaEmbedExtension } from './extensions/MediaEmbedExtension';
import { EditorToolbar } from './EditorToolbar';

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onAutosave?: (content: string) => void;
  placeholder?: string;
  autosaveDelay?: number;
  maxCharacters?: number;
  className?: string;
}

export function RichTextEditor({
  content = '',
  onChange,
  onAutosave,
  placeholder = 'Start writing your project description...',
  autosaveDelay = 2000,
  maxCharacters = 10000,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 480,
        HTMLAttributes: {
          class: 'rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxCharacters,
      }),
      MediaEmbedExtension,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Autosave functionality
  useEffect(() => {
    if (!editor || !onAutosave) return;

    const autosaveTimer = setTimeout(() => {
      const content = editor.getHTML();
      if (content !== '<p></p>' && content.trim() !== '') {
        onAutosave(content);
      }
    }, autosaveDelay);

    return () => clearTimeout(autosaveTimer);
  }, [editor?.getHTML(), onAutosave, autosaveDelay]);

  const insertImage = useCallback((url: string, alt?: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt }).run();
    }
  }, [editor]);

  const insertVideo = useCallback((url: string) => {
    if (editor) {
      // Check if it's a YouTube URL
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
      const match = url.match(youtubeRegex);
      
      if (match) {
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      } else {
        // For other video URLs, we'll use a custom media embed
        editor.chain().focus().insertContent(`<div class="video-embed" data-url="${url}">Video: ${url}</div>`).run();
      }
    }
  }, [editor]);

  const getCharacterCount = useCallback(() => {
    return editor?.storage.characterCount.characters() || 0;
  }, [editor]);

  const getWordCount = useCallback(() => {
    return editor?.storage.characterCount.words() || 0;
  }, [editor]);

  if (!editor) {
    return <div data-testid="editor-loading" className="animate-pulse bg-gray-200 h-64 rounded-lg" />;
  }

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <EditorToolbar 
        editor={editor} 
        onInsertImage={insertImage}
        onInsertVideo={insertVideo}
      />
      <div className="relative">
        <EditorContent editor={editor} />
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
          {getCharacterCount()}/{maxCharacters} characters • {getWordCount()} words
        </div>
      </div>
    </div>
  );
}