#!/bin/bash

# Script to fix BuildConfig references in Kotlin files

echo "Fixing BuildConfig references in MainActivity.kt and MainApplication.kt..."

# Backup the original files
cp android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt.bak
cp android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt.bak

# Add import for BuildConfig
echo "Adding import for BuildConfig..."
sed -i '' '1s/^/package com.medicalapp.patienttracker\n\nimport com.medicalapp.patienttracker.BuildConfig\n/' android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt.new
sed -i '' '1s/^/package com.medicalapp.patienttracker\n\nimport com.medicalapp.patienttracker.BuildConfig\n/' android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt.new

# Get content after package declaration
tail -n +2 android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt >> android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt.new
tail -n +2 android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt >> android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt.new

# Replace original files with fixed versions
mv android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt.new android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt
mv android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt.new android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt

echo "BuildConfig references fixed"
echo "Now run ./build-with-java17-and-sdk.sh again to build the APK" 