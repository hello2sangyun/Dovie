import fs from "fs";
import path from "path";
import { db } from "./db.js";
import { users } from "../shared/schema.js";
import { decryptFileData } from "./crypto.js";
import { eq, sql } from "drizzle-orm";

const uploadDir = "./uploads";

async function migrateProfileImages() {
  console.log("🔄 Starting profile image migration...");
  
  try {
    // 프로필 이미지가 있는 모든 사용자 조회
    const usersWithProfiles = await db
      .select()
      .from(users);
    
    console.log(`Found ${usersWithProfiles.length} users with profile images`);
    
    for (const user of usersWithProfiles) {
      if (!user.profilePicture) continue;
      
      try {
        // 기존 암호화된 파일명 추출
        const oldFileName = user.profilePicture.split('/').pop();
        if (!oldFileName || oldFileName.startsWith('profile_')) {
          console.log(`Skipping ${user.displayName} - already migrated`);
          continue;
        }
        
        const oldFilePath = path.join(uploadDir, oldFileName);
        
        // 파일이 존재하는지 확인
        if (!fs.existsSync(oldFilePath)) {
          console.log(`File not found for ${user.displayName}: ${oldFileName}`);
          continue;
        }
        
        // 암호화된 파일 복호화
        const encryptedData = fs.readFileSync(oldFilePath, 'utf8');
        const decryptedBuffer = decryptFileData(encryptedData);
        
        // 새로운 프로필 이미지 파일명 생성
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = path.extname(oldFileName) || '.jpg';
        const newFileName = `profile_${timestamp}_${randomString}${fileExtension}`;
        const newFilePath = path.join(uploadDir, newFileName);
        
        // 새로운 파일로 저장 (암호화 없음)
        fs.writeFileSync(newFilePath, decryptedBuffer);
        
        // 데이터베이스 업데이트
        const newFileUrl = `/uploads/${newFileName}`;
        await db
          .update(users)
          .set({ profilePicture: newFileUrl })
          .where(eq(users.id, user.id));
        
        // 기존 암호화된 파일 삭제
        fs.unlinkSync(oldFilePath);
        
        console.log(`✅ Migrated ${user.displayName}: ${oldFileName} -> ${newFileName}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${user.displayName}:`, error);
      }
    }
    
    console.log("🎉 Profile image migration completed!");
    
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateProfileImages();
}

export { migrateProfileImages };