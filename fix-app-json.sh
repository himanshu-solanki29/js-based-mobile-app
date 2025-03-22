#!/bin/bash

# Script to ensure app.json has the correct configuration for Android APK building

echo "Checking and fixing app.json configuration..."

# Create a backup of the current app.json
cp app.json app.json.bak

# Define the correct Android package name and version code
PACKAGE_NAME="com.medicalapp.patienttracker"
VERSION_CODE=1

# Update app.json
cat app.json | 
  jq '.expo.android.package = "'$PACKAGE_NAME'" | 
      .expo.android.versionCode = '$VERSION_CODE'' > app.json.new

# Check if jq command succeeded
if [ $? -eq 0 ]; then
  mv app.json.new app.json
  echo "app.json updated successfully."
  echo "Package name set to: $PACKAGE_NAME"
  echo "Version code set to: $VERSION_CODE"
else
  echo "Error: Failed to update app.json with jq."
  echo "Manual update required."
  echo "Please ensure app.json contains the following in the 'android' section:"
  echo ""
  echo '  "android": {'
  echo '    "package": "'$PACKAGE_NAME'",'
  echo '    "versionCode": '$VERSION_CODE','
  echo '    ... other settings ...'
  echo '  }'
  
  # Restore backup
  mv app.json.bak app.json
  exit 1
fi

echo ""
echo "You can now build the APK with: ./build-with-java17.sh" 