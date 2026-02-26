/**
 * File upload service - handles image and video uploads
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_FILE_TYPES,
} from '@shared/schemas';
import type { UploadResponse, ContentType } from '@shared/types';

const UPLOAD_DIR = './data/uploads';

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const ext = extname(originalName) || '.bin';
  return `${randomUUID()}${ext}`;
}

/**
 * Check if file extension is allowed for general files
 */
function isAllowedFileExtension(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  const allowedExtensions = [
    '.csv', '.zip', '.ipa', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.apk', '.dmg'
  ];
  return allowedExtensions.includes(ext);
}

/**
 * Detect content type from mime type and filename
 */
function detectContentType(mimeType: string, filename?: string): ContentType | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'image';
  }
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    return 'video';
  }
  // Check for general file types
  if (ALLOWED_FILE_TYPES.includes(mimeType) || mimeType === 'application/octet-stream') {
    // Additional check for IPA files which often have application/octet-stream
    if (filename && isAllowedFileExtension(filename)) {
      return 'file';
    }
    // Allow known MIME types even without extension check
    if (ALLOWED_FILE_TYPES.includes(mimeType)) {
      return 'file';
    }
  }
  return null;
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: { type: string; size: number; name: string },
  contentType?: 'image' | 'video' | 'file'
): { valid: boolean; error?: string; detectedType?: ContentType } {
  // Auto-detect content type if not specified
  const detectedType = detectContentType(file.type, file.name);

  if (!detectedType) {
    return { valid: false, error: 'Unsupported file type. Allowed: images, videos, CSV, ZIP, IPA, PDF, DOC, XLS' };
  }

  // Validate based on detected type
  if (detectedType === 'image') {
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image too large. Max size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` };
    }
    return { valid: true, detectedType: 'image' };
  }

  if (detectedType === 'video') {
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: `Video too large. Max size: ${MAX_VIDEO_SIZE / 1024 / 1024}MB` };
    }
    return { valid: true, detectedType: 'video' };
  }

  if (detectedType === 'file') {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }
    return { valid: true, detectedType: 'file' };
  }

  return { valid: true, detectedType };
}

/**
 * Save file to disk (used in route handler)
 * Note: In Hono, we handle the file buffer directly
 */
export async function saveFileBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResponse> {
  const filename = generateFilename(originalName);
  const filepath = join(UPLOAD_DIR, filename);

  writeFileSync(filepath, buffer);

  const contentType = detectContentType(mimeType, originalName);

  return {
    url: `/uploads/${filename}`,
    fileName: originalName,
    fileSize: buffer.length,
    // Thumbnail generation would require additional processing
    // For now, we skip thumbnail generation
    thumbnailUrl: contentType === 'video' ? undefined : undefined,
  };
}

/**
 * Delete a file
 */
export function deleteFile(filename: string): boolean {
  const filepath = join(UPLOAD_DIR, filename);
  if (existsSync(filepath)) {
    unlinkSync(filepath);
    return true;
  }
  return false;
}

/**
 * Get file path
 */
export function getFilePath(filename: string): string {
  return join(UPLOAD_DIR, filename);
}

/**
 * Get file URL
 */
export function getFileUrl(filename: string): string {
  return `/uploads/${filename}`;
}
