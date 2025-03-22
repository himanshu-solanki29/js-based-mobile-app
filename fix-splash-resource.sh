#!/bin/bash

# Script to fix missing splash screen resource

echo "Fixing missing splashscreen_logo resource..."

# Create drawable directory if it doesn't exist
mkdir -p android/app/src/main/res/drawable

# Copy the splash icon to the drawable directory with the correct name
cp assets/images/splash-icon.png android/app/src/main/res/drawable/splashscreen_logo.png

echo "Copied splash icon to drawable/splashscreen_logo.png"
echo "Now run ./build-with-java17-and-sdk.sh again to build the APK" 