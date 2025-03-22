#!/bin/bash

# Script to verify package names in Android files

echo "Verifying package names in Android files..."

# Check package name in AndroidManifest.xml
echo "Checking AndroidManifest.xml..."
grep -q 'package="com.medicalapp.patienttracker"' android/app/src/main/AndroidManifest.xml
if [ $? -eq 0 ]; then
  echo "✅ AndroidManifest.xml has correct package name"
else
  echo "❌ AndroidManifest.xml is missing correct package name"
fi

# Check package declaration in MainActivity.kt
echo "Checking MainActivity.kt..."
grep -q 'package com.medicalapp.patienttracker' android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt
if [ $? -eq 0 ]; then
  echo "✅ MainActivity.kt has correct package declaration"
else
  echo "❌ MainActivity.kt is missing correct package declaration"
fi

# Check BuildConfig import in MainActivity.kt
grep -q 'import com.medicalapp.patienttracker.BuildConfig' android/app/src/main/java/com/medicalapp/patienttracker/MainActivity.kt
if [ $? -eq 0 ]; then
  echo "✅ MainActivity.kt has correct BuildConfig import"
else
  echo "❌ MainActivity.kt is missing BuildConfig import"
fi

# Check package declaration in MainApplication.kt
echo "Checking MainApplication.kt..."
grep -q 'package com.medicalapp.patienttracker' android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt
if [ $? -eq 0 ]; then
  echo "✅ MainApplication.kt has correct package declaration"
else
  echo "❌ MainApplication.kt is missing correct package declaration"
fi

# Check BuildConfig reference in MainApplication.kt
grep -q 'BuildConfig.DEBUG' android/app/src/main/java/com/medicalapp/patienttracker/MainApplication.kt
if [ $? -eq 0 ]; then
  echo "✅ MainApplication.kt has correct BuildConfig reference"
else
  echo "❌ MainApplication.kt is missing BuildConfig reference"
fi

# Check app name in app.json
echo "Checking app.json..."
grep -q '"package": "com.medicalapp.patienttracker"' app.json
if [ $? -eq 0 ]; then
  echo "✅ app.json has correct package name"
else
  echo "❌ app.json is missing correct package name or may use a different format"
fi

# Check package name in build.gradle
echo "Checking build.gradle..."
grep -q 'namespace "com.medicalapp.patienttracker"' android/app/build.gradle
if [ $? -eq 0 ]; then
  echo "✅ build.gradle has correct namespace"
else
  echo "❌ build.gradle is missing correct namespace"
fi

echo "Verification complete" 