#!/usr/bin/env python3
"""
Generate iOS app icons and splash screens from source images
"""
from PIL import Image
import os
import json

# Source images
ICON_SOURCE = "client/public/dovie-icon.png"
SPLASH_SOURCE = "client/public/dovie-splash.png"

# iOS App Icon sizes (all required sizes for iOS)
ICON_SIZES = [
    ("20x20", 20),
    ("20x20@2x", 40),
    ("20x20@3x", 60),
    ("29x29", 29),
    ("29x29@2x", 58),
    ("29x29@3x", 87),
    ("40x40", 40),
    ("40x40@2x", 80),
    ("40x40@3x", 120),
    ("60x60@2x", 120),
    ("60x60@3x", 180),
    ("76x76", 76),
    ("76x76@2x", 152),
    ("83.5x83.5@2x", 167),
    ("1024x1024", 1024),
]

# Splash screen sizes (for different screen densities)
SPLASH_SIZES = [
    ("splash", 2732),  # Universal size
    ("splash@2x", 2732),
    ("splash@3x", 2732),
]

def ensure_dir(path):
    """Create directory if it doesn't exist"""
    os.makedirs(path, exist_ok=True)

def resize_icon(source_path, output_path, size, name):
    """Resize icon to specific size"""
    print(f"Creating {name} ({size}x{size})...")
    img = Image.open(source_path)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(output_path, "PNG", optimize=True)

def resize_splash(source_path, output_path, size, name):
    """Resize and center splash image"""
    print(f"Creating {name} ({size}x{size})...")
    # Create white background
    background = Image.new('RGB', (size, size), (255, 255, 255))
    
    # Open and resize source image (keep aspect ratio, fit within 70% of canvas)
    img = Image.open(source_path)
    max_size = int(size * 0.7)
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    
    # Center the image
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    
    # Paste image onto background
    if img.mode == 'RGBA':
        background.paste(img, (x, y), img)
    else:
        background.paste(img, (x, y))
    
    background.save(output_path, "PNG", optimize=True)

def generate_app_icons():
    """Generate all iOS app icon sizes"""
    output_dir = "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    ensure_dir(output_dir)
    
    print("\n📱 Generating iOS App Icons...")
    
    for name, size in ICON_SIZES:
        output_file = os.path.join(output_dir, f"AppIcon-{name}.png")
        resize_icon(ICON_SOURCE, output_file, size, name)
    
    # Generate Contents.json
    contents = {
        "images": [
            {"size": "20x20", "idiom": "iphone", "filename": "AppIcon-20x20@2x.png", "scale": "2x"},
            {"size": "20x20", "idiom": "iphone", "filename": "AppIcon-20x20@3x.png", "scale": "3x"},
            {"size": "29x29", "idiom": "iphone", "filename": "AppIcon-29x29@2x.png", "scale": "2x"},
            {"size": "29x29", "idiom": "iphone", "filename": "AppIcon-29x29@3x.png", "scale": "3x"},
            {"size": "40x40", "idiom": "iphone", "filename": "AppIcon-40x40@2x.png", "scale": "2x"},
            {"size": "40x40", "idiom": "iphone", "filename": "AppIcon-40x40@3x.png", "scale": "3x"},
            {"size": "60x60", "idiom": "iphone", "filename": "AppIcon-60x60@2x.png", "scale": "2x"},
            {"size": "60x60", "idiom": "iphone", "filename": "AppIcon-60x60@3x.png", "scale": "3x"},
            {"size": "20x20", "idiom": "ipad", "filename": "AppIcon-20x20.png", "scale": "1x"},
            {"size": "20x20", "idiom": "ipad", "filename": "AppIcon-20x20@2x.png", "scale": "2x"},
            {"size": "29x29", "idiom": "ipad", "filename": "AppIcon-29x29.png", "scale": "1x"},
            {"size": "29x29", "idiom": "ipad", "filename": "AppIcon-29x29@2x.png", "scale": "2x"},
            {"size": "40x40", "idiom": "ipad", "filename": "AppIcon-40x40.png", "scale": "1x"},
            {"size": "40x40", "idiom": "ipad", "filename": "AppIcon-40x40@2x.png", "scale": "2x"},
            {"size": "76x76", "idiom": "ipad", "filename": "AppIcon-76x76.png", "scale": "1x"},
            {"size": "76x76", "idiom": "ipad", "filename": "AppIcon-76x76@2x.png", "scale": "2x"},
            {"size": "83.5x83.5", "idiom": "ipad", "filename": "AppIcon-83.5x83.5@2x.png", "scale": "2x"},
            {"size": "1024x1024", "idiom": "ios-marketing", "filename": "AppIcon-1024x1024.png", "scale": "1x"}
        ],
        "info": {
            "version": 1,
            "author": "xcode"
        }
    }
    
    with open(os.path.join(output_dir, "Contents.json"), 'w') as f:
        json.dump(contents, f, indent=2)
    
    print(f"✅ Generated {len(ICON_SIZES)} app icons")

def generate_splash_screens():
    """Generate splash screen images"""
    output_dir = "ios/App/App/Assets.xcassets/Splash.imageset"
    ensure_dir(output_dir)
    
    print("\n🖼️  Generating Splash Screens...")
    
    for name, size in SPLASH_SIZES:
        output_file = os.path.join(output_dir, f"{name}.png")
        resize_splash(SPLASH_SOURCE, output_file, size, name)
    
    # Generate Contents.json
    contents = {
        "images": [
            {"idiom": "universal", "filename": "splash.png", "scale": "1x"},
            {"idiom": "universal", "filename": "splash@2x.png", "scale": "2x"},
            {"idiom": "universal", "filename": "splash@3x.png", "scale": "3x"}
        ],
        "info": {
            "version": 1,
            "author": "xcode"
        }
    }
    
    with open(os.path.join(output_dir, "Contents.json"), 'w') as f:
        json.dump(contents, f, indent=2)
    
    print(f"✅ Generated {len(SPLASH_SIZES)} splash screens")

def main():
    print("🚀 Dovie iOS Asset Generator")
    print("=" * 50)
    
    if not os.path.exists(ICON_SOURCE):
        print(f"❌ Icon source not found: {ICON_SOURCE}")
        return
    
    if not os.path.exists(SPLASH_SOURCE):
        print(f"❌ Splash source not found: {SPLASH_SOURCE}")
        return
    
    generate_app_icons()
    generate_splash_screens()
    
    print("\n" + "=" * 50)
    print("✅ All iOS assets generated successfully!")
    print("\nNext steps:")
    print("1. Run: npx cap sync ios")
    print("2. Open Xcode and verify assets")
    print("3. Build and test on simulator/device")

if __name__ == "__main__":
    main()
