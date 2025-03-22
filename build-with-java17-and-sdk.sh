#!/bin/bash

# Exit on error
set -e

echo "Building Android APK using Java 17 with Android SDK configuration..."

# Set JAVA_HOME to Java 17
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

# Verify Java version
echo "Using Java version:"
java -version

# Set up Android SDK environment variables
ANDROID_SDK_DIR="$HOME/Library/Android/sdk"
export ANDROID_HOME="$ANDROID_SDK_DIR"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Check if local.properties exists
if [ ! -f "android/local.properties" ]; then
  echo "Creating local.properties file..."
  echo "sdk.dir=$ANDROID_SDK_DIR" > android/local.properties
fi

# Create builds directory
mkdir -p builds

# Navigate to android directory
cd android

# Clean any previous build
echo "Cleaning previous builds..."
./gradlew clean

# Build the release APK with specific Android SDK location
echo "Building release APK..."
./gradlew -Pandroid.sdk.dir="$ANDROID_SDK_DIR" assembleRelease

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