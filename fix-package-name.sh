#!/bin/bash

# Script to ensure the package name is consistent across the app

echo "Fixing package name inconsistencies..."

# Update build.gradle
echo "Updating package name in build.gradle..."
sed -i '' 's/namespace "com.reactnativedemoapp"/namespace "com.medicalapp.patienttracker"/g' android/app/build.gradle
sed -i '' 's/applicationId "com.reactnativedemoapp"/applicationId "com.medicalapp.patienttracker"/g' android/app/build.gradle

# Create AndroidManifest.xml backup
cp android/app/src/main/AndroidManifest.xml android/app/src/main/AndroidManifest.xml.bak

# Update AndroidManifest.xml
echo "Updating package name in AndroidManifest.xml..."
sed -i '' 's/package="com.reactnativedemoapp"/package="com.medicalapp.patienttracker"/g' android/app/src/main/AndroidManifest.xml

echo "Package name has been consistently set to com.medicalapp.patienttracker"
echo "Now run ./build-with-java17-and-sdk.sh again to build the APK" 