#!/bin/bash
set -e

echo "Downloading Volt (macOS Apple Silicon)..."

# Fetch latest release URL
LATEST_RELEASE_URL=$(curl -s https://api.github.com/repos/LeulAria/VOLT/releases/latest | grep "browser_download_url.*-arm64.dmg" | cut -d : -f 2,3 | tr -d \")

if [ -z "$LATEST_RELEASE_URL" ]; then
  echo "Error: Could not find latest release for macOS arm64. Falling back to universal fallback if applicable, or please download manually from https://github.com/LeulAria/VOLT/releases/latest"
  exit 1
fi

TEMP_DIR=$(mktemp -d)
echo "Downloading $LATEST_RELEASE_URL"
curl -L "$LATEST_RELEASE_URL" -o "$TEMP_DIR/Volt.dmg"

echo "Mounting disk image..."
hdiutil attach "$TEMP_DIR/Volt.dmg" -nobrowse -mountpoint "$TEMP_DIR/mount"

echo "Installing to /Applications..."
cp -R "$TEMP_DIR/mount/volt.app" /Applications/ || cp -R "$TEMP_DIR/mount/Volt.app" /Applications/

echo "Unmounting and cleaning up..."
hdiutil detach "$TEMP_DIR/mount"
rm -rf "$TEMP_DIR"

echo "Volt installed successfully!"
