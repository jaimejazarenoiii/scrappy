import { supabase } from '../database/supabaseService';

export interface ImageUploadResult {
  url: string;
  path: string;
  publicUrl: string;
}

export class ImageUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Upload a base64 image to Supabase Storage
   */
  static async uploadBase64Image(
    base64Data: string, 
    bucket: 'transaction-images' | 'item-images',
    fileName?: string
  ): Promise<ImageUploadResult> {
    try {
      // Parse base64 data
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 format');
      }

      const mimeType = matches[1];
      const base64String = matches[2];

      // Validate file type
      if (!this.ALLOWED_TYPES.includes(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Convert base64 to Uint8Array (browser-compatible)
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Validate file size
      if (bytes.length > this.MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Generate unique filename if not provided
      const extension = mimeType.split('/')[1];
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
      const filePath = `${Date.now()}/${finalFileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, bytes, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        path: data.path,
        publicUrl: publicUrlData.publicUrl
      };

    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple base64 images
   */
  static async uploadMultipleImages(
    base64Images: string[],
    bucket: 'transaction-images' | 'item-images'
  ): Promise<ImageUploadResult[]> {
    const uploadPromises = base64Images.map((base64, index) => 
      this.uploadBase64Image(base64, bucket, `image-${index + 1}`)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete an image from Supabase Storage
   */
  static async deleteImage(
    filePath: string,
    bucket: 'transaction-images' | 'item-images'
  ): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Image delete error:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images
   */
  static async deleteMultipleImages(
    filePaths: string[],
    bucket: 'transaction-images' | 'item-images'
  ): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Multiple image delete error:', error);
      throw error;
    }
  }

  /**
   * Get a unique filename for an image
   */
  static generateUniqueFileName(originalName?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName ? originalName.split('.').pop() : 'jpg';
    return `${timestamp}-${random}.${extension}`;
  }
}
