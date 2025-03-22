#!/bin/bash

# Exit on error
set -e

echo "Building Android APK using Java 11..."

# Set JAVA_HOME to Java 11
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

# Verify Java version
echo "Using Java version:"
java -version

# Create builds directory
mkdir -p builds

# Navigate to android directory
cd android

# Clean any previous build
echo "Cleaning previous builds..."
./gradlew clean

# Build the release APK
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