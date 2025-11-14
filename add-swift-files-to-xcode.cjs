const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

console.log('🔧 Adding Swift files to Xcode project...\n');

// Load the project
const projectPath = 'ios/App/App.xcodeproj/project.pbxproj';
const project = xcode.project(projectPath);

project.parse(function (err) {
  if (err) {
    console.error('❌ Error parsing project:', err);
    process.exit(1);
  }

  // Find the App group key (the one containing AppDelegate.swift)
  const appGroupKey = project.findPBXGroupKey({ path: 'App' });
  if (!appGroupKey) {
    console.error('❌ Could not find App group in project');
    process.exit(1);
  }
  console.log(`✓ Found App group: ${appGroupKey}\n`);

  // Files to add with correct path
  const filesToAdd = [
    'CallKitVoipPlugin.swift',
    'CapacitorPlugins.swift'
  ];

  // Manual cleanup: remove ALL existing references (both with and without App/ prefix)
  console.log('🧹 Cleaning up old references...\n');
  
  filesToAdd.forEach(filename => {
    // Try removing without prefix
    try {
      project.removeSourceFile(filename);
      console.log(`✓ Removed old reference: ${filename}`);
    } catch (e) {
      // Silent fail
    }
    
    // Try removing with App/ prefix
    try {
      project.removeSourceFile(`App/${filename}`);
      console.log(`✓ Removed old reference: App/${filename}`);
    } catch (e) {
      // Silent fail
    }
  });

  // Additional cleanup: manually purge specific UUIDs from previous runs
  const stalePBXFileRefs = [
    'B715E9FA3C7942C897E58103', // Old CallKitVoipPlugin.swift
    'DDB16ACDD1BB42C5A6883E22'  // Old CapacitorPlugins.swift
  ];
  
  const stalePBXBuildFiles = [
    '4CC5DD5D48994A628DF9E66D', // Old CallKitVoipPlugin build file
    '9EE6687136F44ABCA0548A38'  // Old CapacitorPlugins build file
  ];
  
  // Remove from PBXFileReference section
  const pbxFileRefSection = project.pbxFileReferenceSection();
  stalePBXFileRefs.forEach(uuid => {
    if (pbxFileRefSection[uuid]) {
      delete pbxFileRefSection[uuid];
      console.log(`✓ Purged stale PBXFileReference: ${uuid}`);
    }
  });
  
  // Remove from PBXBuildFile section
  const pbxBuildFileSection = project.pbxBuildFileSection();
  stalePBXBuildFiles.forEach(uuid => {
    if (pbxBuildFileSection[uuid]) {
      delete pbxBuildFileSection[uuid];
      console.log(`✓ Purged stale PBXBuildFile: ${uuid}`);
    }
  });
  
  // Remove from PBXSourcesBuildPhase files array
  const target = project.getFirstTarget();
  const sourcesBuildPhase = project.pbxSourcesBuildPhaseObj(target.uuid);
  if (sourcesBuildPhase && sourcesBuildPhase.files) {
    const originalLength = sourcesBuildPhase.files.length;
    sourcesBuildPhase.files = sourcesBuildPhase.files.filter(file => {
      const fileValue = file.value;
      const isStale = stalePBXBuildFiles.includes(fileValue);
      if (isStale) {
        console.log(`✓ Removed ${fileValue} from Sources build phase`);
      }
      return !isStale;
    });
    const removed = originalLength - sourcesBuildPhase.files.length;
    if (removed > 0) {
      console.log(`✓ Cleaned ${removed} stale entries from Sources build phase`);
    }
  }

  console.log('');

  // Add files with correct App/ prefix
  filesToAdd.forEach(filename => {
    const fileOptions = {
      target: project.getFirstTarget().uuid
    };

    // Add with App/ prefix so Xcode looks in ios/App/App/
    const filePath = `App/${filename}`;
    const fileRef = project.addSourceFile(filePath, fileOptions, appGroupKey);
    console.log(`✓ Added ${filename}`);
    console.log(`  - Path: ${filePath}`);
    console.log(`  - Group: App (${appGroupKey})`);
    console.log(`  - Added to Sources build phase\n`);
  });

  // Write the modified project back to disk
  fs.writeFileSync(projectPath, project.writeSync());
  console.log('✅ Successfully updated project.pbxproj');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: npx cap sync ios');
  console.log('   2. Clean build in Xcode (⌘+Shift+K)');
  console.log('   3. Build & Run (⌘+R)');
});
