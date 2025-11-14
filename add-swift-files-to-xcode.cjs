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

  // Files to add
  const filesToAdd = [
    {
      path: 'CallKitVoipPlugin.swift',
      group: 'App'
    },
    {
      path: 'CapacitorPlugins.swift',
      group: 'App'
    }
  ];

  filesToAdd.forEach(file => {
    // Add file to project with compile flag
    const fileOptions = {
      target: project.getFirstTarget().uuid
    };

    // Check if file already exists
    const existingFile = project.pbxFileReferenceSection()[
      Object.keys(project.pbxFileReferenceSection()).find(key => {
        const ref = project.pbxFileReferenceSection()[key];
        return ref && ref.path === file.path;
      })
    ];

    if (existingFile) {
      console.log(`✓ ${file.path} already in project`);
    } else {
      // Add the file to the project
      const fileRef = project.addSourceFile(file.path, fileOptions, file.group);
      console.log(`✓ Added ${file.path} to project`);
      console.log(`  - Added to group: ${file.group}`);
      console.log(`  - Added to Sources build phase`);
    }
  });

  // Write the modified project back to disk
  fs.writeFileSync(projectPath, project.writeSync());
  console.log('\n✅ Successfully updated project.pbxproj');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: npx cap sync ios');
  console.log('   2. Clean build in Xcode (⌘+Shift+K)');
  console.log('   3. Build & Run (⌘+R)');
});
