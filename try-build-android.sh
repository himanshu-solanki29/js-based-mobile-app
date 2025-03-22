#!/bin/bash

# This script tries different approaches to build the Android APK

echo "Attempting to build Android APK using different methods..."

# Create builds directory
mkdir -p builds

# Approach 1: Try using EAS build with local profile
echo "============================================="
echo "Approach 1: Using EAS build with local profile"
echo "============================================="
npx eas-cli build --platform android --profile preview --local

# Approach 2: Try building with expo
echo "============================================="
echo "Approach 2: Building with expo"
echo "============================================="
npx expo export --platform android

# Approach 3: Try direct build with Gradle
echo "============================================="
echo "Approach 3: Direct build with Gradle"
echo "============================================="
cd android
./gradlew -version
./gradlew tasks
./gradlew assembleRelease --stacktrace

# Approach 4: Try to export with custom dev client
echo "============================================="
echo "Approach 4: Export with custom dev client"
echo "============================================="
cd ..
npx expo export:embed

echo "============================================="
echo "All build approaches attempted"
echo "============================================="
echo ""
echo "APK may be found in one of these locations:"
echo "- android/app/build/outputs/apk/release/app-release.apk"
echo "- builds/"
echo "- dist/"
echo ""
echo "If all approaches failed, please install Android Studio and try building from there." 