#!/usr/bin/env ruby
#
# Script to add CallKitVoipPlugin.swift and CapacitorPlugins.swift to Xcode project
# Uses xcodeproj gem for safe project.pbxproj manipulation
#

require 'xcodeproj'

# Open the Xcode project
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the App target
target = project.targets.first

# Get the App group (where source files live)
app_group = project.main_group['App']

# Files to add
files_to_add = [
  {
    path: 'App/CallKitVoipPlugin.swift',
    name: 'CallKitVoipPlugin.swift'
  },
  {
    path: 'App/CapacitorPlugins.swift',
    name: 'CapacitorPlugins.swift'
  }
]

files_to_add.each do |file_info|
  file_path = file_info[:path]
  file_name = file_info[:name]
  
  # Check if file already exists in project
  existing_file = app_group.files.find { |f| f.path == file_name }
  
  if existing_file
    puts "✓ #{file_name} already exists in project"
  else
    # Add file reference to the App group
    file_ref = app_group.new_reference(file_name)
    file_ref.last_known_file_type = 'sourcecode.swift'
    file_ref.source_tree = '<group>'
    
    # Add to Sources build phase
    target.source_build_phase.add_file_reference(file_ref)
    
    puts "✓ Added #{file_name} to project"
  end
end

# Save the project
project.save

puts "\n✅ Successfully updated #{project_path}"
puts "📋 Next steps:"
puts "   1. Run: npx cap sync ios"
puts "   2. Clean build in Xcode (⌘+Shift+K)"
puts "   3. Build & Run (⌘+R)"
