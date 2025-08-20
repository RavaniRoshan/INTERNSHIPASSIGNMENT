import { Node, mergeAttributes } from '@tiptap/core';

export interface MediaEmbedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaEmbed: {
      setMediaEmbed: (options: { src: string; type: 'image' | 'video'; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

export const MediaEmbedExtension = Node.create<MediaEmbedOptions>({
  name: 'mediaEmbed',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      src: {
        default: null,
      },
      type: {
        default: 'image',
      },
      alt: {
        default: null,
      },
      caption: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-media-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, type, alt, caption, width, height } = HTMLAttributes;

    if (type === 'image') {
      return [
        'div',
        mergeAttributes(this.options.HTMLAttributes, {
          'data-media-embed': '',
          class: 'media-embed image-embed',
        }),
        [
          'img',
          {
            src,
            alt,
            width,
            height,
            class: 'max-w-full h-auto rounded-lg',
          },
        ],
        caption ? ['p', { class: 'text-sm text-gray-600 mt-2 italic' }, caption] : '',
      ];
    }

    if (type === 'video') {
      return [
        'div',
        mergeAttributes(this.options.HTMLAttributes, {
          'data-media-embed': '',
          class: 'media-embed video-embed',
        }),
        [
          'video',
          {
            src,
            controls: true,
            width,
            height,
            class: 'max-w-full h-auto rounded-lg',
          },
        ],
        caption ? ['p', { class: 'text-sm text-gray-600 mt-2 italic' }, caption] : '',
      ];
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-media-embed': '',
        class: 'media-embed',
      }),
      `Unsupported media type: ${type}`,
    ];
  },

  addCommands() {
    return {
      setMediaEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});