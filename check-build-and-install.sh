#!/bin/bash

# Script to check the status of the APK build and help install it

echo "Checking build status and preparing for installation..."

# Check if builds directory exists
if [ ! -d "builds" ]; then
  echo "Error: 'builds' directory not found. The build may not have started yet."
  exit 1
fi

# Find the latest build directory
latest_dir=$(find builds -type d -name "android_*" | sort -r | head -n 1)

if [ -z "$latest_dir" ]; then
  echo "No build directories found. The build may not have completed yet."
  
  # Check if a build is in progress
  if ps aux | grep "./gradlew assembleRelease" | grep -v grep > /dev/null; then
    echo "A build appears to be in progress. Please wait for it to complete."
  else
    echo "No build appears to be in progress. You may need to run the build script."
    echo "Run: ./build-with-java17.sh"
  fi
  
  exit 1
fi

echo "Latest build directory: $latest_dir"

# Check if APK exists in the latest build directory
apk_path="$latest_dir/medical-app-patient-tracker.apk"

if [ ! -f "$apk_path" ]; then
  echo "APK not found in the latest build directory. The build may not have completed successfully."
  
  # Check if a build is in progress
  if ps aux | grep "./gradlew assembleRelease" | grep -v grep > /dev/null; then
    echo "A build appears to be in progress. Please wait for it to complete."
  else
    echo "No build appears to be in progress. The build may have failed."
    echo "Check the build logs for errors, or run the build script again."
    echo "Run: ./build-with-java17.sh"
  fi
  
  exit 1
fi

echo "APK found at: $apk_path"
echo ""
echo "Installation options:"
echo ""
echo "1. Install via ADB (if Android device is connected and ADB is installed)"
echo "   Run: adb install -r \"$apk_path\""
echo ""
echo "2. Transfer to Android device via email or cloud storage"
echo "   APK location: $(pwd)/$apk_path"
echo ""
echo "3. Transfer to Android device via USB"
echo "   1. Connect your Android device to your computer"
echo "   2. Enable file transfer mode on your device"
echo "   3. Copy the APK to your device"
echo "   4. On your device, use a file manager to navigate to the APK and tap to install"
echo ""
echo "Remember to enable 'Install from Unknown Sources' on your Android device before installation." 