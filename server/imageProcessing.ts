import sharp from 'sharp';

/**
 * Enhance business card image quality
 * Applies contrast enhancement, noise reduction, and sharpening
 */
export async function enhanceBusinessCardImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Advanced image enhancement for maximum text clarity and professional appearance
    const enhancedImage = await sharp(imageBuffer)
      // Resize to high-resolution business card proportions
      .resize(1200, 756, { 
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3  // High-quality resampling
      })
      // Auto white balance correction
      .normalize({
        lower: 2,   // Remove dark noise
        upper: 98   // Prevent overexposure
      })
      // Advanced color correction for professional scan appearance
      .modulate({
        brightness: 1.25,  // Significantly brighter for better visibility
        saturation: 1.1,   // Enhanced color vibrancy
        hue: 0
      })
      // Gamma correction to lift shadows and improve text contrast
      .gamma(1.4)
      // Advanced sharpening for crystal-clear text
      .sharpen({
        sigma: 1.5,     // Stronger sharpening
        m1: 1.0,
        m2: 3.0,        // More aggressive text enhancement
        x1: 2.0,
        y2: 8.0,
        y3: 15.0
      })
      // Additional contrast enhancement
      .linear(1.15, 8)  // Stronger contrast with brightness offset
      // Remove any remaining noise
      .median(1)
      // Final sharpening pass for text clarity
      .sharpen({
        sigma: 0.5,
        m1: 1.0,
        m2: 1.8
      })
      // Convert to highest quality JPEG with optimized settings
      .jpeg({ 
        quality: 98,
        progressive: true,
        mozjpeg: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true
      })
      .toBuffer();

    return enhancedImage;
  } catch (error) {
    console.error('Error enhancing business card image:', error);
    // Return original image if processing fails
    return imageBuffer;
  }
}

/**
 * Create a thumbnail version of the business card for UI display
 */
export async function createBusinessCardThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(120, 80, { 
        fit: 'cover',
        position: 'center'
      })
      // Keep thumbnail bright and clear
      .modulate({
        brightness: 1.05,
        saturation: 1.02
      })
      .sharpen({
        sigma: 0.5,
        m1: 1.0,
        m2: 1.2
      })
      .jpeg({ quality: 88 })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    return imageBuffer;
  }
}

/**
 * Auto-crop business card from larger image
 * Attempts to detect and crop the business card area
 */
export async function autoCropBusinessCard(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      return imageBuffer;
    }

    // Step 1: Intelligent background removal and cropping
    const processed = await sharp(imageBuffer)
      // Remove noise first
      .median(2)
      // Auto-trim background (removes pure black/white borders)
      .trim({
        background: '#000000',
        threshold: 30
      })
      .trim({
        background: '#ffffff', 
        threshold: 30
      })
      .toBuffer();

    // Step 2: Advanced shadow removal and white balance correction
    const shadowRemoved = await sharp(processed)
      // Auto white balance correction first
      .normalize({
        lower: 3,   // Remove dark shadows
        upper: 97   // Prevent overexposure
      })
      // Advanced brightness and color correction
      .modulate({
        brightness: 1.3,    // 30% brighter for better visibility
        saturation: 1.2,    // Enhanced color vibrancy
        hue: 0
      })
      // Strong gamma correction to lift shadows
      .gamma(1.5)
      // Additional white balance adjustment
      .linear(1.2, 10)  // Stronger contrast with brightness offset
      // Advanced sharpening for maximum text clarity
      .sharpen({
        sigma: 1.8,     // Stronger sharpening
        m1: 1.0,
        m2: 3.5,        // More aggressive enhancement
        x1: 2.0,
        y2: 6.0,
        y3: 12.0
      })
      .toBuffer();

    // Step 3: Final optimization for maximum quality
    const final = await sharp(shadowRemoved)
      // Resize to high-resolution business card dimensions
      .resize(1200, 756, {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3
      })
      // Final white balance and contrast adjustment
      .linear(1.25, 12)  // Strong contrast with brightness
      // Remove any remaining noise while preserving text sharpness
      .median(1)
      // Final aggressive sharpening for crystal-clear text
      .sharpen({
        sigma: 1.0,
        m1: 1.0,
        m2: 2.5
      })
      // Maximum quality output
      .jpeg({
        quality: 98,
        progressive: true,
        mozjpeg: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true
      })
      .toBuffer();

    return final;
  } catch (error) {
    console.error('Error auto-cropping business card:', error);
    
    // Fallback: basic shadow removal without cropping
    try {
      const basicCleanup = await sharp(imageBuffer)
        .modulate({
          brightness: 1.15,
          saturation: 1.1
        })
        .gamma(1.2)
        .normalize()
        .sharpen()
        .jpeg({ quality: 92 })
        .toBuffer();
      return basicCleanup;
    } catch (fallbackError) {
      console.error('Fallback processing failed:', fallbackError);
      return imageBuffer;
    }
  }
}

/**
 * Complete business card processing pipeline
 */
export async function processBusinessCardImage(imageBuffer: Buffer): Promise<{
  enhanced: Buffer;
  thumbnail: Buffer;
  original: Buffer;
}> {
  try {
    // Auto-crop the business card area
    const cropped = await autoCropBusinessCard(imageBuffer);
    
    // Enhance the image quality
    const enhanced = await enhanceBusinessCardImage(cropped);
    
    // Create thumbnail for UI
    const thumbnail = await createBusinessCardThumbnail(enhanced);

    return {
      enhanced,
      thumbnail,
      original: imageBuffer
    };
  } catch (error) {
    console.error('Error in business card processing pipeline:', error);
    return {
      enhanced: imageBuffer,
      thumbnail: imageBuffer,
      original: imageBuffer
    };
  }
}