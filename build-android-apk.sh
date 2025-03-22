#!/bin/bash

# Exit on error
set -e

echo "Building Android APK for Medical App Patient Tracker..."

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ]; then
  echo "ANDROID_HOME is not set. Please install Android Studio and set ANDROID_HOME."
  echo "Typical locations:"
  echo "  - macOS: ~/Library/Android/sdk"
  echo "  - Windows: C:\\Users\\Username\\AppData\\Local\\Android\\Sdk"
  echo "  - Linux: ~/Android/Sdk"
  exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
  echo "Java is not installed. Please install Java 17 or 11."
  exit 1
fi

# Check Java version
java_version=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
echo "Java version: $java_version"

if [ "$java_version" -gt "17" ]; then
  echo "Warning: You are using Java $java_version which may not be compatible with Gradle."
  echo "It's recommended to use Java 17 or 11 for Android development."
  echo "Attempting to build anyway..."
fi

# Clean previous builds
echo "Cleaning previous builds..."
cd android
./gradlew clean

# Build the APK
echo "Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
  echo "Build successful!"
  echo "APK location: $(pwd)/app/build/outputs/apk/release/app-release.apk"
  
  # Create a directory for the app with a timestamp
  timestamp=$(date +"%Y%m%d_%H%M%S")
  app_dir="../builds/android_$timestamp"
  mkdir -p "$app_dir"
  
  # Copy the APK to the builds directory
  cp app/build/outputs/apk/release/app-release.apk "$app_dir/medical-app-patient-tracker.apk"
  echo "APK copied to: $app_dir/medical-app-patient-tracker.apk"
else
  echo "Build failed. Check the logs for errors."
  exit 1
fi 