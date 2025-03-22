#!/bin/bash

# Script to fix missing iconBackground color resource

echo "Fixing missing iconBackground color resource..."

# Create values directory if it doesn't exist
mkdir -p android/app/src/main/res/values

# Check if colors.xml exists
if [ ! -f "android/app/src/main/res/values/colors.xml" ]; then
  # Create colors.xml file with iconBackground color
  echo '<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="iconBackground">#FFFFFF</color>
</resources>' > android/app/src/main/res/values/colors.xml
  echo "Created colors.xml with iconBackground color"
else
  # Check if iconBackground color is already defined
  if ! grep -q "name=\"iconBackground\"" "android/app/src/main/res/values/colors.xml"; then
    # Add iconBackground color to existing colors.xml
    sed -i '' 's/<\/resources>/    <color name="iconBackground">#FFFFFF<\/color>\n<\/resources>/' "android/app/src/main/res/values/colors.xml"
    echo "Added iconBackground color to existing colors.xml"
  else
    echo "iconBackground color already exists in colors.xml"
  fi
fi

echo "Fixed missing iconBackground color resource"
echo "Now run ./build-with-java17-and-sdk.sh again to build the APK" 