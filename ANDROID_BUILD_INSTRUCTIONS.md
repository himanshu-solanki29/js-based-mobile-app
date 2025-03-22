# Building an Android APK for Medical App Patient Tracker

This document provides instructions on how to build an Android APK for the Medical App Patient Tracker.

## Prerequisites

1. **Java Development Kit (JDK)**
   - Install JDK 11 or 17 (recommended for Android development)
   - [Download from Adoptium](https://adoptium.net/)
   - Newer versions like JDK 24 may cause compatibility issues with Gradle

2. **Android SDK**
   - Install Android Studio: [https://developer.android.com/studio](https://developer.android.com/studio)
   - During installation, make sure Android SDK is installed
   - Set the `ANDROID_HOME` environment variable to your Android SDK location

3. **Node.js and npm**
   - Ensure you have Node.js installed (version 16+)

## Environment Setup

1. Set up environment variables:

   **macOS/Linux:**
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools
   ```

   **Windows:**
   ```cmd
   set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
   set PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\tools\bin;%ANDROID_HOME%\platform-tools
   ```

   Add these to your `.bash_profile`, `.zshrc` (macOS/Linux), or system environment variables (Windows) for persistence.

## Building the APK

### Option 1: Using the Build Script

We've created a build script to simplify the process:

1. Open a terminal in the project root
2. Make the script executable (if not already):
   ```bash
   chmod +x build-android-apk.sh
   ```
3. Run the script:
   ```bash
   ./build-android-apk.sh
   ```

The script will:
- Check for required dependencies
- Build the release APK
- Copy the APK to a timestamped directory in `builds/`

### Option 2: Manual Build

If the script doesn't work for you, follow these steps:

1. Navigate to the android directory:
   ```bash
   cd android
   ```

2. Clean any previous builds:
   ```bash
   ./gradlew clean
   ```

3. Build the release APK:
   ```bash
   ./gradlew assembleRelease
   ```

4. Find the APK at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

## Troubleshooting

### Java Version Issues

If you see an error like "Unsupported class file major version 68":
- You're using a Java version that's too new for your Gradle version
- Switch to Java 17 or 11 using SDKMAN or your preferred Java version manager

### Gradle Build Failures

If the Gradle build fails:
1. Check detailed logs:
   ```bash
   ./gradlew assembleRelease --info
   ```

2. Make sure you have accepted all SDK licenses:
   ```bash
   $ANDROID_HOME/tools/bin/sdkmanager --licenses
   ```

### Missing Android SDK

If you see "Failed to resolve the Android SDK path":
- Make sure Android Studio is installed
- Set the `ANDROID_HOME` environment variable correctly
- Install required SDK components through Android Studio's SDK Manager

## Installing the APK

To install the APK on your device:

1. Enable "Install from unknown sources" in your device settings
2. Transfer the APK to your device
3. Tap on the APK file to install it 