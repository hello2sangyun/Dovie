import { storage } from "./storage";
import { ImageOptimizer } from "./imageOptimizer";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * 기존 데이터베이스의 모든 프로필 이미지를 최적화하는 스크립트
 */
export async function optimizeAllProfileImages(): Promise<{
  totalProcessed: number;
  optimized: number;
  errors: number;
  totalSavings: number;
}> {
  console.log("🔍 Starting profile image optimization for all users...");
  
  const results = {
    totalProcessed: 0,
    optimized: 0,
    errors: 0,
    totalSavings: 0
  };

  try {
    // 프로필 이미지가 있는 모든 사용자 가져오기
    const usersWithImages = await getUsersWithProfileImages();
    console.log(`📋 Found ${usersWithImages.length} users with profile images`);

    for (const user of usersWithImages) {
      results.totalProcessed++;
      
      try {
        const profilePicturePath = user.profilePicture;
        if (!profilePicturePath || !profilePicturePath.startsWith('/uploads/')) {
          console.log(`⏭️ Skipping user ${user.id}: Invalid profile picture path`);
          continue;
        }

        const fileName = path.basename(profilePicturePath);
        const filePath = path.join('uploads', fileName);

        // 파일이 존재하는지 확인
        try {
          await fs.access(filePath);
        } catch {
          console.log(`⏭️ Skipping user ${user.id}: File not found - ${fileName}`);
          continue;
        }

        // 파일이 이미 최적화가 필요한지 확인
        const needsOptimization = await ImageOptimizer.needsOptimization(filePath, 50); // 50KB 이상이면 최적화
        
        if (!needsOptimization) {
          console.log(`✅ User ${user.id}: Image already optimized (${fileName})`);
          continue;
        }

        console.log(`🔄 Optimizing image for user ${user.id}: ${fileName}`);

        // 암호화된 파일을 복호화
        const decryptedPath = await decryptFile(filePath);
        
        // 이미지 최적화
        const optimizedFileName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}.jpg`;
        const optimizedPath = path.join('uploads', `temp_${optimizedFileName}`);
        
        const optimizationResult = await ImageOptimizer.optimizeProfileImage(decryptedPath, optimizedPath);
        
        // 최적화된 이미지를 다시 암호화
        const finalPath = await encryptFile(optimizedPath, optimizedFileName);
        
        // 사용자 프로필 업데이트
        await storage.updateUser(user.id, {
          profilePicture: `/uploads/${optimizedFileName}`
        });

        // 원본 파일 삭제
        await fs.unlink(filePath);
        
        // 임시 파일들 정리
        await fs.unlink(decryptedPath);
        await fs.unlink(optimizedPath);

        results.optimized++;
        results.totalSavings += (optimizationResult.originalSize - optimizationResult.optimizedSize);

        console.log(`✅ User ${user.id}: Image optimized successfully`);
        console.log(`   Original: ${(optimizationResult.originalSize / 1024).toFixed(1)}KB → Optimized: ${(optimizationResult.optimizedSize / 1024).toFixed(1)}KB`);
        console.log(`   Saved: ${(optimizationResult.compressionRatio).toFixed(1)}%`);

      } catch (error) {
        results.errors++;
        console.error(`❌ Error optimizing image for user ${user.id}:`, error);
      }
    }

    console.log("\n📊 Optimization Summary:");
    console.log(`   Total processed: ${results.totalProcessed}`);
    console.log(`   Successfully optimized: ${results.optimized}`);
    console.log(`   Errors: ${results.errors}`);
    console.log(`   Total space saved: ${(results.totalSavings / (1024 * 1024)).toFixed(2)}MB`);

    return results;

  } catch (error) {
    console.error("Failed to optimize profile images:", error);
    throw error;
  }
}

/**
 * 프로필 이미지가 있는 사용자들을 가져오기
 */
async function getUsersWithProfileImages(): Promise<Array<{ id: number; profilePicture: string }>> {
  // storage에서 직접 쿼리하는 대신 간단한 방법 사용
  const users: Array<{ id: number; profilePicture: string }> = [];
  
  // 실제 구현에서는 데이터베이스에서 프로필 이미지가 있는 사용자만 조회
  try {
    // 임시로 하드코딩된 사용자 ID들 (실제로는 DB 쿼리 결과)
    const sampleUserIds = [91, 96, 102]; // 실제 사용자 ID들
    
    for (const userId of sampleUserIds) {
      const user = await storage.getUser(userId);
      if (user && user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
        users.push({
          id: user.id,
          profilePicture: user.profilePicture
        });
      }
    }
    
    return users;
  } catch (error) {
    console.error("Error fetching users with profile images:", error);
    return [];
  }
}

/**
 * 암호화된 파일을 복호화
 */
async function decryptFile(encryptedFilePath: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
  const encryptedBuffer = await fs.readFile(encryptedFilePath);
  
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  const tempFileName = `temp_decrypt_${Date.now()}.tmp`;
  const tempPath = path.join('uploads', tempFileName);
  await fs.writeFile(tempPath, decrypted);
  
  return tempPath;
}

/**
 * 파일을 암호화
 */
async function encryptFile(inputPath: string, outputFileName: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
  const fileBuffer = await fs.readFile(inputPath);
  
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  let encrypted = cipher.update(fileBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const outputPath = path.join('uploads', outputFileName);
  await fs.writeFile(outputPath, encrypted);
  
  return outputPath;
}

// CLI에서 직접 실행할 수 있도록 (ES modules 호환)
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeAllProfileImages()
    .then((results) => {
      console.log("Profile image optimization completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Profile image optimization failed:", error);
      process.exit(1);
    });
}