import { z } from 'zod';

// Common validation helpers
const sanitizedString = (maxLength?: number) => {
  let schema = z.string().trim();
  if (maxLength) {
    schema = schema.max(maxLength);
  }
  return schema.transform((val) => {
    // Remove potentially dangerous characters
    return val
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  });
};

const urlSchema = z.string().url().refine((url) => {
  // Only allow https and http protocols
  return url.startsWith('https://') || url.startsWith('http://');
}, 'Only HTTP and HTTPS URLs are allowed');

const emailSchema = z.string().email().toLowerCase().refine((email) => {
  // Basic email format validation and length check
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}, 'Invalid email format');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
  .refine((password) => {
    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
    return !weakPasswords.includes(password.toLowerCase());
  }, 'Password is too weak');

const cuidSchema = z.string().cuid('Invalid ID format');

const tagSchema = z.string().trim().min(1, 'Tag cannot be empty').max(50, 'Tag too long').refine((tag) => {
  // Only allow alphanumeric characters, spaces, hyphens, and underscores
  return /^[a-zA-Z0-9\s\-_]+$/.test(tag);
}, 'Tag contains invalid characters').transform((val) => {
  // Remove potentially dangerous characters
  return val
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
});

// User validation schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['CREATOR', 'VIEWER']),
  profile: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name too long').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
    bio: sanitizedString(500).optional(),
    website: urlSchema.optional(),
    avatar: urlSchema.optional()
  }).optional()
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password too long')
});

export const userUpdateSchema = z.object({
  profile: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name too long').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
    bio: sanitizedString(500).optional(),
    website: urlSchema.optional(),
    avatar: urlSchema.optional()
  }).optional()
});

// MediaItem validation schema
export const mediaItemSchema = z.object({
  id: cuidSchema,
  type: z.enum(['image', 'video']),
  url: urlSchema,
  thumbnailUrl: urlSchema.optional(),
  alt: sanitizedString(200).optional(),
  caption: sanitizedString(500).optional()
});

// Project validation schemas
export const projectCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title too long'),
  description: sanitizedString(1000).optional(),
  content: z.any().optional(), // Rich text JSON content - validated separately
  coverImage: urlSchema.optional(),
  mediaGallery: z.array(mediaItemSchema).max(50, 'Maximum 50 media items allowed').optional(),
  tags: z.array(tagSchema).max(20, 'Maximum 20 tags allowed').optional(),
  techStack: z.array(tagSchema).max(20, 'Maximum 20 tech stack items allowed').optional(),
  isPublished: z.boolean().optional()
});

export const projectUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: sanitizedString(1000).optional(),
  content: z.any().optional(), // Rich text JSON content - validated separately
  coverImage: urlSchema.optional(),
  mediaGallery: z.array(mediaItemSchema).max(50, 'Maximum 50 media items allowed').optional(),
  tags: z.array(tagSchema).max(20, 'Maximum 20 tags allowed').optional(),
  techStack: z.array(tagSchema).max(20, 'Maximum 20 tech stack items allowed').optional(),
  isPublished: z.boolean().optional()
});

// Search validation schemas
export const searchQuerySchema = z.object({
  query: sanitizedString(200).optional(),
  tags: z.array(tagSchema).max(10, 'Maximum 10 tag filters allowed').optional(),
  techStack: z.array(tagSchema).max(10, 'Maximum 10 tech stack filters allowed').optional(),
  sortBy: z.enum(['relevance', 'date', 'popularity']).optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').max(1000, 'Page too high').optional(),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(50, 'Limit cannot exceed 50').optional()
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  filename: z.string().trim().min(1, 'Filename is required').max(255, 'Filename too long'),
  contentType: z.string().refine((type) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    return allowedTypes.includes(type);
  }, 'File type not allowed'),
  size: z.number().int().min(1, 'File size must be greater than 0').max(100 * 1024 * 1024, 'File size cannot exceed 100MB')
});

// Analytics validation schemas
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: cuidSchema.optional(),
  granularity: z.enum(['day', 'week', 'month']).optional()
});

// Follow validation schema
export const followSchema = z.object({
  followingId: cuidSchema
});

// Engagement tracking schema
export const engagementSchema = z.object({
  projectId: cuidSchema,
  action: z.enum(['VIEW', 'LIKE', 'FOLLOW', 'SHARE']),
  sessionId: z.string().optional()
});

// ID parameter validation
export const idParamSchema = z.object({
  id: cuidSchema
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').max(1000, 'Page too high').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(50, 'Limit cannot exceed 50').default(10)
});

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else req.params = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          },
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Validation error'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Type exports
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type MediaItemInput = z.infer<typeof mediaItemSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type FollowInput = z.infer<typeof followSchema>;
export type EngagementInput = z.infer<typeof engagementSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;