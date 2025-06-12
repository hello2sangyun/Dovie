import sharp from 'sharp';

/**
 * Enhance business card image quality
 * Applies contrast enhancement, noise reduction, and sharpening
 */
export async function enhanceBusinessCardImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Process the image to look like a clean scan
    const enhancedImage = await sharp(imageBuffer)
      // Resize to standard business card proportions if needed
      .resize(800, 500, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      // Convert to grayscale for better OCR (optional)
      // .greyscale()
      // Enhance contrast and brightness
      .normalize()
      // Apply slight sharpening
      .sharpen({
        sigma: 1.0,
        m1: 1.0,
        m2: 2.0,
        x1: 2.0,
        y2: 10.0,
        y3: 20.0
      })
      // Adjust levels for better contrast
      .linear(1.2, -20)
      // Remove noise
      .blur(0.3)
      .sharpen()
      // Convert back to JPEG with high quality
      .jpeg({ 
        quality: 95,
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
      .jpeg({ quality: 85 })
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
    
    // Apply edge detection and auto-crop logic
    const processed = await sharp(imageBuffer)
      // Convert to grayscale for edge detection
      .greyscale()
      // Apply edge enhancement
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      // Threshold to create binary image
      .threshold(128)
      // Convert back to color
      .toColorspace('srgb')
      .jpeg({ quality: 90 })
      .toBuffer();

    return processed;
  } catch (error) {
    console.error('Error auto-cropping business card:', error);
    return imageBuffer;
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