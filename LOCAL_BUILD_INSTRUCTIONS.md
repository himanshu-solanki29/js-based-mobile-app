# Local Build Instructions for Android APK

This guide explains how to build and install the Android APK for the Medical App Patient Tracker using the local build scripts.

## Prerequisites

- **Java 11**: The build process requires Java 11 (not newer versions like Java 24)
- **Android SDK**: For installation using ADB (optional)

## Building the APK

### Step 1: Build the APK with Java 11

We've created a script that automatically sets the Java environment to Java 11 and builds the APK:

```bash
./build-with-java11.sh
```

This script will:
- Set JAVA_HOME to your Java 11 installation
- Clean any previous builds
- Build a release APK
- Copy the APK to a timestamped directory in the `builds` folder

The build process may take 5-10 minutes to complete, depending on your system's performance.

### Step 2: Install the APK

#### Option 1: Using the Helper Script (if you have Android SDK/ADB installed)

If you have ADB (Android Debug Bridge) installed, you can use our helper script to install the APK directly:

```bash
./install-helper.sh
```

This script will:
- Check for connected Android devices
- Find the most recently built APK
- Offer to install it directly to your device

#### Option 2: Manual Installation

1. Find the APK file in the `builds/android_TIMESTAMP` directory
2. Transfer it to your Android device using:
   - USB cable transfer
   - Email attachment
   - Cloud storage (Google Drive, Dropbox, etc.)
3. On your Android device:
   - Enable installation from unknown sources in Settings
   - Navigate to the APK file and tap to install

## Troubleshooting

### Java Version Issues

If you see "Unsupported class file major version" errors:
- Make sure you're using Java 11, not a newer version
- Check that the build script correctly sets JAVA_HOME
- You can manually set Java 11 before building: 
  ```bash
  export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
  ```

### Build Failures

If the build fails:
- Check the error messages in the terminal output
- Make sure all Android SDK licenses are accepted
- Try running with more detailed logs: 
  ```bash
  cd android && JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home" ./gradlew assembleRelease --info
  ```

### Installation Issues

If installation fails:
- Make sure "Install from Unknown Sources" is enabled
- Check that you have enough storage space on your device
- For ADB installation issues, make sure USB debugging is enabled on your device

## Testing the App

After installation:
- Open the app from your device's app drawer
- Test main functionality:
  - Adding a patient
  - Scheduling an appointment
  - Navigating between tabs
- Check that all features work as expected 