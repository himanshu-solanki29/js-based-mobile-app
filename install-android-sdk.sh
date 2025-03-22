#!/bin/bash

# Script to download and install a minimal Android SDK for building APKs

echo "Installing minimal Android SDK for building APKs..."

# Create Android SDK directory
ANDROID_SDK_DIR="$HOME/Library/Android/sdk"
mkdir -p "$ANDROID_SDK_DIR"

# Create local.properties file
echo "Creating local.properties file..."
echo "sdk.dir=$ANDROID_SDK_DIR" > android/local.properties

# Define the SDK command-line tools URL
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-mac-10406996_latest.zip"
TOOLS_ZIP="commandlinetools.zip"

echo "Downloading Android SDK command-line tools..."
curl -L $CMDLINE_TOOLS_URL -o $TOOLS_ZIP

echo "Extracting command-line tools..."
mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
unzip -q $TOOLS_ZIP -d "$ANDROID_SDK_DIR/cmdline-tools"
mv "$ANDROID_SDK_DIR/cmdline-tools/cmdline-tools" "$ANDROID_SDK_DIR/cmdline-tools/latest"
rm $TOOLS_ZIP

# Add SDK tools to PATH
export PATH="$ANDROID_SDK_DIR/cmdline-tools/latest/bin:$PATH"

echo "Accepting Android SDK licenses..."
yes | sdkmanager --licenses

echo "Installing required SDK packages..."
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.2" "ndk;25.2.9519653"

echo "Android SDK installation complete at: $ANDROID_SDK_DIR"
echo "Set the following environment variables in your shell profile (~/.bash_profile, ~/.zshrc, etc.):"
echo ""
echo "export ANDROID_HOME=\"$ANDROID_SDK_DIR\""
echo "export PATH=\"\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH\""
echo ""
echo "Now run: ./build-with-java17.sh" 