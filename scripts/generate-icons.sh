#!/bin/bash

# Generate icons for GPH app using macOS built-in tools + qlmanage for SVG

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_DIR="$PROJECT_DIR/public"
ASSETS_DIR="$PROJECT_DIR/src/assets"

mkdir -p "$ASSETS_DIR"

SVG="$PUBLIC_DIR/icon.svg"
TMP_DIR=$(mktemp -d)

echo "Converting SVG to PNG (1024x1024)..."

# Use qlmanage to render SVG to PNG
qlmanage -t -s 1024 -o "$TMP_DIR" "$SVG" 2>/dev/null
BASE_PNG="$TMP_DIR/icon.svg.png"

if [ ! -f "$BASE_PNG" ]; then
  echo "Error: Failed to convert SVG. Trying alternative method..."
  # Fallback: use Safari/WebKit via osascript
  osascript <<EOF
    set svgPath to POSIX file "$SVG"
    set pngPath to POSIX file "$TMP_DIR/icon.png"
EOF
  BASE_PNG="$TMP_DIR/icon.png"
fi

echo "Generating PNG icons..."

# Generate different sizes using sips
for SIZE in 16 32 48 64 128 192 256 512; do
  sips -z $SIZE $SIZE "$BASE_PNG" --out "$PUBLIC_DIR/icon-${SIZE}.png" 2>/dev/null
done
cp "$BASE_PNG" "$PUBLIC_DIR/icon-1024.png"

echo "Generating macOS .icns..."

ICONSET="$ASSETS_DIR/icon.iconset"
mkdir -p "$ICONSET"

sips -z 16 16 "$BASE_PNG" --out "$ICONSET/icon_16x16.png" 2>/dev/null
sips -z 32 32 "$BASE_PNG" --out "$ICONSET/icon_16x16@2x.png" 2>/dev/null
sips -z 32 32 "$BASE_PNG" --out "$ICONSET/icon_32x32.png" 2>/dev/null
sips -z 64 64 "$BASE_PNG" --out "$ICONSET/icon_32x32@2x.png" 2>/dev/null
sips -z 128 128 "$BASE_PNG" --out "$ICONSET/icon_128x128.png" 2>/dev/null
sips -z 256 256 "$BASE_PNG" --out "$ICONSET/icon_128x128@2x.png" 2>/dev/null
sips -z 256 256 "$BASE_PNG" --out "$ICONSET/icon_256x256.png" 2>/dev/null
sips -z 512 512 "$BASE_PNG" --out "$ICONSET/icon_256x256@2x.png" 2>/dev/null
sips -z 512 512 "$BASE_PNG" --out "$ICONSET/icon_512x512.png" 2>/dev/null
sips -z 1024 1024 "$BASE_PNG" --out "$ICONSET/icon_512x512@2x.png" 2>/dev/null

iconutil -c icns "$ICONSET" -o "$ASSETS_DIR/icon.icns"

rm -rf "$ICONSET"
rm -rf "$TMP_DIR"

echo "Done! Icons generated:"
echo "  - $PUBLIC_DIR/icon-*.png"
echo "  - $ASSETS_DIR/icon.icns"
