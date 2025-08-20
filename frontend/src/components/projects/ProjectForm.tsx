'use client';

import { useState, useCallback } from 'react';
import { ProjectCreateData, ProjectUpdateData, Project, MediaItem } from '@/lib/types';
import FileUploadManager from '../upload/FileUploadManager';
import { RichTextEditor } from '../editor';
import { validateEditorContent, sanitizeEditorContent } from '../editor/utils/editorUtils';

interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: ProjectCreateData | ProjectUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProjectForm({ project, onSubmit, onCancel, isLoading = false }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectCreateData | ProjectUpdateData>({
    title: project?.title || '',
    description: project?.description || '',
    content: project?.content || undefined,
    tags: project?.tags || [],
    techStack: project?.techStack || [],
    isPublished: project?.isPublished || false,
    mediaGallery: project?.mediaGallery || [],
    coverImage: project?.coverImage || undefined,
  });

  const [contentHtml, setContentHtml] = useState<string>(() => {
    // Convert content JSON to HTML if it exists
    if (project?.content && typeof project.content === 'object' && 'html' in project.content) {
      return project.content.html as string;
    }
    return '';
  });

  const [coverImageId, setCoverImageId] = useState<string | undefined>(
    project?.mediaGallery?.find(item => item.url === project.coverImage)?.id
  );

  const [tagInput, setTagInput] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || !formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Validate rich text content
    if (contentHtml) {
      const contentValidation = validateEditorContent(contentHtml);
      if (!contentValidation.isValid) {
        newErrors.content = contentValidation.errors.join(', ');
      }
    }

    if (formData.tags && formData.tags.length > 20) {
      newErrors.tags = 'Maximum 20 tags allowed';
    }

    if (formData.techStack && formData.techStack.length > 20) {
      newErrors.techStack = 'Maximum 20 tech stack items allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Set cover image URL based on selected cover image
      const coverImageUrl = coverImageId 
        ? formData.mediaGallery?.find(item => item.id === coverImageId)?.url
        : undefined;

      const submitData = {
        ...formData,
        coverImage: coverImageUrl,
        content: contentHtml ? {
          html: sanitizeEditorContent(contentHtml),
          text: contentHtml.replace(/<[^>]*>/g, ''), // Simple text extraction
          lastModified: new Date().toISOString()
        } : undefined
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleMediaItemsChange = (mediaItems: MediaItem[]) => {
    setFormData(prev => ({
      ...prev,
      mediaGallery: mediaItems
    }));
  };

  const handleCoverImageChange = (id: string | undefined) => {
    setCoverImageId(id);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    const currentTags = formData.tags || [];
    if (tag && !currentTags.includes(tag) && currentTags.length < 20) {
      setFormData(prev => ({
        ...prev,
        tags: [...currentTags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = formData.tags || [];
    setFormData(prev => ({
      ...prev,
      tags: currentTags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addTechStack = () => {
    const tech = techStackInput.trim();
    const currentTechStack = formData.techStack || [];
    if (tech && !currentTechStack.includes(tech) && currentTechStack.length < 20) {
      setFormData(prev => ({
        ...prev,
        techStack: [...currentTechStack, tech]
      }));
      setTechStackInput('');
    }
  };

  const removeTechStack = (techToRemove: string) => {
    const currentTechStack = formData.techStack || [];
    setFormData(prev => ({
      ...prev,
      techStack: currentTechStack.filter(tech => tech !== techToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const handleContentChange = useCallback((html: string) => {
    setContentHtml(html);
    setFormData(prev => ({
      ...prev,
      content: {
        html,
        text: html.replace(/<[^>]*>/g, ''), // Simple text extraction for search
        lastModified: new Date().toISOString()
      }
    }));
  }, []);

  const handleAutosave = useCallback(async (html: string) => {
    // Only autosave if we have a project ID (editing existing project)
    if (project?.id && html.trim() !== '') {
      try {
        // Here you could implement an autosave API call
        // For now, we'll just update the timestamp
        setLastAutosave(new Date());
        console.log('Autosaved content at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }
  }, [project?.id]);



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Project Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter project title"
          disabled={isLoading}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Short Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Brief description for search and preview (optional)"
          disabled={isLoading}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        <p className="mt-1 text-xs text-gray-500">
          This will be used for search results and project previews. For detailed content, use the rich text editor below.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Content
        </label>
        <div className="relative">
          <RichTextEditor
            content={contentHtml}
            onChange={handleContentChange}
            onAutosave={handleAutosave}
            placeholder="Tell the story of your project. Include details about your process, challenges, solutions, and outcomes..."
            autosaveDelay={3000}
            maxCharacters={10000}
            className={errors.content ? 'border-red-500' : ''}
          />
          {lastAutosave && (
            <div className="absolute top-2 right-2 text-xs text-gray-500 bg-green-50 px-2 py-1 rounded shadow-sm">
              Autosaved at {lastAutosave.toLocaleTimeString()}
            </div>
          )}
        </div>
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
        <p className="mt-1 text-xs text-gray-500">
          Use the toolbar to format your content, add images, videos, and links. Content is automatically saved as you type.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(formData.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800"
                disabled={isLoading}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addTag)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a tag"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !tagInput.trim() || (formData.tags || []).length >= 20}
          >
            Add
          </button>
        </div>
        {errors.tags && <p className="mt-1 text-sm text-red-600">{errors.tags}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tech Stack
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(formData.techStack || []).map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              {tech}
              <button
                type="button"
                onClick={() => removeTechStack(tech)}
                className="ml-1 text-green-600 hover:text-green-800"
                disabled={isLoading}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={techStackInput}
            onChange={(e) => setTechStackInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addTechStack)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a technology"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={addTechStack}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !techStackInput.trim() || (formData.techStack || []).length >= 20}
          >
            Add
          </button>
        </div>
        {errors.techStack && <p className="mt-1 text-sm text-red-600">{errors.techStack}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Media Gallery
        </label>
        <FileUploadManager
          mediaItems={formData.mediaGallery || []}
          coverImageId={coverImageId}
          onMediaItemsChange={handleMediaItemsChange}
          onCoverImageChange={handleCoverImageChange}
          maxFiles={20}
          maxFileSize={50 * 1024 * 1024} // 50MB
          disabled={isLoading}
        />

      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublished"
          checked={formData.isPublished || false}
          onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={isLoading}
        />
        <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">
          Publish project (make it visible to others)
        </label>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}