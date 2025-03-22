#!/bin/bash

# Script to help with installing the APK on a connected Android device

echo "APK Installation Helper"
echo "======================="
echo

# Check if ADB is installed
if ! command -v adb &> /dev/null; then
  echo "Error: ADB (Android Debug Bridge) is not installed or not in the PATH."
  echo "Please install Android Studio or the Android SDK Platform Tools."
  echo "Download from: https://developer.android.com/studio/releases/platform-tools"
  exit 1
fi

# Check if Android device is connected
echo "Checking for connected Android devices..."
devices=$(adb devices | grep -v "List" | grep "device" | wc -l)

if [ "$devices" -eq 0 ]; then
  echo "No Android devices found. Please connect your device and enable USB debugging."
  echo "Instructions:"
  echo "1. On your Android device, go to Settings > About phone"
  echo "2. Tap Build number 7 times to enable Developer options"
  echo "3. Go back to Settings > System > Developer options"
  echo "4. Enable USB debugging"
  echo "5. Connect your device via USB and allow USB debugging when prompted"
  exit 1
fi

echo "Found $devices connected device(s)."
echo

# Find the most recent APK build
latest_dir=$(find builds -type d -name "android_*" | sort -r | head -n 1)

if [ -z "$latest_dir" ]; then
  echo "No APK builds found. Please run ./build-with-java11.sh first."
  exit 1
fi

apk_path="$latest_dir/medical-app-patient-tracker.apk"

if [ ! -f "$apk_path" ]; then
  echo "APK file not found at $apk_path"
  exit 1
fi

echo "Found APK at: $apk_path"
echo

# Ask user if they want to install
read -p "Do you want to install this APK on your connected device? (y/n): " choice

if [[ $choice == "y" || $choice == "Y" ]]; then
  echo "Installing APK on device..."
  adb install -r "$apk_path"
  
  if [ $? -eq 0 ]; then
    echo "Installation successful!"
    echo "You can find the app in your app drawer as 'ReactNativeDemoApp'"
  else
    echo "Installation failed. Please check the logs above for errors."
  fi
else
  echo "Installation cancelled."
fi

echo
echo "To manually install the APK, follow these steps:"
echo "1. Enable 'Install from Unknown Sources' in your device settings"
echo "2. Transfer the APK to your device (via USB, email, or cloud storage)"
echo "3. On your device, navigate to the APK and tap to install"
echo
echo "APK location: $(pwd)/$apk_path" 