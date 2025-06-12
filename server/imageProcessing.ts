import sharp from 'sharp';

/**
 * Enhance business card image quality
 * Applies contrast enhancement, noise reduction, and sharpening
 */
export async function enhanceBusinessCardImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Process the image to look like a clean paper scan
    const enhancedImage = await sharp(imageBuffer)
      // Resize to standard business card proportions if needed
      .resize(1000, 630, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      // Brighten the image slightly for better visibility
      .modulate({
        brightness: 1.1,  // 10% brighter
        saturation: 1.05, // Slightly more saturated
        hue: 0
      })
      // Enhance contrast gently without darkening
      .normalize({
        lower: 1,  // Keep lower bound light
        upper: 99  // Prevent over-brightening
      })
      // Apply gentle sharpening for text clarity
      .sharpen({
        sigma: 0.8,
        m1: 1.0,
        m2: 1.5,
        x1: 2.0,
        y2: 10.0,
        y3: 20.0
      })
      // Add subtle paper-like texture effect
      .linear(1.05, 5)  // Gentle contrast boost with brightness offset
      // Convert to high-quality JPEG
      .jpeg({ 
        quality: 92,
        progressive: true
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

    // Step 2: Shadow removal and color restoration
    const shadowRemoved = await sharp(processed)
      // Brighten dark areas (removes shadows)
      .modulate({
        brightness: 1.2,    // 20% brighter
        saturation: 1.15,   // More vibrant colors
        hue: 0
      })
      // Gamma correction to lift shadows without affecting highlights
      .gamma(1.3)
      // Normalize to improve contrast while preserving colors
      .normalize({
        lower: 1,   // Keep some dark areas
        upper: 99   // Prevent overexposure
      })
      // Apply unsharp mask for text clarity
      .sharpen({
        sigma: 1.2,
        m1: 1.0,
        m2: 2.5,
        x1: 2.0,
        y2: 10.0,
        y3: 20.0
      })
      .toBuffer();

    // Step 3: Final cleanup and optimization
    const final = await sharp(shadowRemoved)
      // Resize to optimal business card dimensions if too large
      .resize(1000, 630, {
        fit: 'inside',
        withoutEnlargement: true
      })
      // Final color adjustment to restore natural tones
      .linear(1.05, 3)  // Gentle contrast with slight brightness
      // Remove any remaining artifacts
      .blur(0.3)
      .sharpen({
        sigma: 0.8,
        m1: 1.0,
        m2: 1.8
      })
      // High quality output
      .jpeg({
        quality: 95,
        progressive: true,
        mozjpeg: true
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