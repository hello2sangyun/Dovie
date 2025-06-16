import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxWidth: 400,
    maxHeight: 400,
    quality: 80,
    format: 'jpeg'
  };

  /**
   * 이미지를 최적화하고 압축합니다
   */
  static async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<{ 
    originalSize: number; 
    optimizedSize: number; 
    compressionRatio: number;
  }> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // 원본 파일 크기 확인
      const originalStats = await fs.stat(inputPath);
      const originalSize = originalStats.size;

      // Sharp로 이미지 최적화
      let pipeline = sharp(inputPath)
        .resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });

      // 포맷에 따른 압축 설정
      switch (config.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: config.quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: config.quality });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: config.quality });
          break;
      }

      await pipeline.toFile(outputPath);

      // 최적화된 파일 크기 확인
      const optimizedStats = await fs.stat(outputPath);
      const optimizedSize = optimizedStats.size;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      console.log(`🖼️ Image optimized: ${originalSize} bytes → ${optimizedSize} bytes (${compressionRatio.toFixed(1)}% reduction)`);

      return {
        originalSize,
        optimizedSize,
        compressionRatio
      };
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw error;
    }
  }

  /**
   * 프로필 이미지 전용 최적화 (작은 크기, 높은 압축)
   */
  static async optimizeProfileImage(inputPath: string, outputPath: string): Promise<{
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  }> {
    return this.optimizeImage(inputPath, outputPath, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 75,
      format: 'jpeg'
    });
  }

  /**
   * 이미지가 최적화가 필요한지 확인
   */
  static async needsOptimization(filePath: string, maxSizeKB: number = 100): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const sizeKB = stats.size / 1024;
      return sizeKB > maxSizeKB;
    } catch {
      return false;
    }
  }

  /**
   * 이미지 메타데이터 가져오기
   */
  static async getImageMetadata(filePath: string): Promise<{
    width?: number;
    height?: number;
    format?: string;
    size: number;
  }> {
    try {
      const metadata = await sharp(filePath).metadata();
      const stats = await fs.stat(filePath);
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: stats.size
      };
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      throw error;
    }
  }
}