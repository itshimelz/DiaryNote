#!/usr/bin/env bash
set -e

# --- Color Definitions ---
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}==> Installing DiaryNote...${NC}"

# Detect Operating System & Architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64|amd64)
    ARCH_NAME="x86_64"
    DEB_ARCH="amd64"
    MAC_ARCH="x64"
    ;;
  aarch64|arm64)
    ARCH_NAME="aarch64"
    DEB_ARCH="arm64"
    MAC_ARCH="aarch64"
    ;;
  *)
    echo -e "${RED}Unsupported architecture: $ARCH${NC}"
    exit 1
    ;;
esac

# Create temporary directory
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Fetch latest release metadata from GitHub
REPO="itshimelz/DiaryNote"
RELEASE_JSON="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
TAG_NAME="$(echo "$RELEASE_JSON" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4)"

if [ -z "$TAG_NAME" ]; then
  echo -e "${RED}Failed to fetch latest release from GitHub.${NC}"
  exit 1
fi

echo -e "${BLUE}Found latest version: ${BOLD}${TAG_NAME}${NC}"

# --- macOS Installation ---
if [ "$OS" = "Darwin" ]; then
  DMG_URL="$(echo "$RELEASE_JSON" | grep -o "https://[^\"]*${MAC_ARCH}\.dmg" | head -n1 || true)"
  if [ -z "$DMG_URL" ]; then
    DMG_URL="$(echo "$RELEASE_JSON" | grep -o 'https://[^\"]*\.dmg' | head -n1)"
  fi

  if [ -z "$DMG_URL" ]; then
    echo -e "${RED}Could not find macOS installer (.dmg) in release ${TAG_NAME}.${NC}"
    exit 1
  fi

  echo -e "${BLUE}Downloading macOS installer (.dmg)...${NC}"
  curl -fsSL "$DMG_URL" -o "$TMP_DIR/DiaryNote.dmg"

  echo -e "${BLUE}Mounting DMG and installing to /Applications...${NC}"
  mkdir -p "$TMP_DIR/mnt"
  hdiutil attach "$TMP_DIR/DiaryNote.dmg" -nobrowse -mountpoint "$TMP_DIR/mnt"
  cp -R "$TMP_DIR/mnt/"*.app /Applications/ 2>/dev/null || cp -R "$TMP_DIR/mnt/DiaryNote.app" /Applications/
  hdiutil detach "$TMP_DIR/mnt"

  echo -e "${GREEN}${BOLD}Successfully installed DiaryNote ${TAG_NAME} to /Applications!${NC}"
  exit 0
fi

# --- Linux Installation ---
if [ "$OS" = "Linux" ]; then
  IS_DEBIAN=false
  if [ -f /etc/os-release ]; then
    if grep -qE "ubuntu|debian|mint|pop" /etc/os-release; then
      IS_DEBIAN=true
    fi
  fi

  # Debian / Ubuntu / Mint / Pop!_OS .deb installer
  if [ "$IS_DEBIAN" = true ]; then
    DEB_URL="$(echo "$RELEASE_JSON" | grep -o "https://[^\"]*${DEB_ARCH}\.deb" | head -n1 || true)"
    if [ -n "$DEB_URL" ]; then
      echo -e "${BLUE}Debian/Ubuntu system detected. Downloading .deb package...${NC}"
      curl -fsSL "$DEB_URL" -o "$TMP_DIR/DiaryNote.deb"
      if command -v sudo >/dev/null 2>&1; then
        sudo dpkg -i "$TMP_DIR/DiaryNote.deb" || sudo apt-get install -f -y
      else
        dpkg -i "$TMP_DIR/DiaryNote.deb"
      fi
      echo -e "${GREEN}${BOLD}Successfully installed DiaryNote ${TAG_NAME}!${NC}"
      exit 0
    fi
  fi

  # Arch Linux / Manjaro / Fedora / Standalone Linux package
  TAR_URL="$(echo "$RELEASE_JSON" | grep -o 'https://[^\"]*linux-x86_64\.tar\.gz' | head -n1 || true)"
  if [ -z "$TAR_URL" ]; then
    TAR_URL="$(echo "$RELEASE_JSON" | grep -o 'https://[^\"]*linux[^\"]*\.tar\.gz' | head -n1 || true)"
  fi

  if [ -z "$TAR_URL" ]; then
    echo -e "${RED}Could not find Linux package in release ${TAG_NAME}.${NC}"
    exit 1
  fi

  echo -e "${BLUE}Downloading DiaryNote standalone Linux package...${NC}"
  curl -fsSL "$TAR_URL" -o "$TMP_DIR/package.tar.gz"
  tar -xzf "$TMP_DIR/package.tar.gz" -C "$TMP_DIR"

  mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/128x128/apps

  if [ -f "$TMP_DIR/DiaryNote" ]; then
    cp "$TMP_DIR/DiaryNote" ~/.local/bin/DiaryNote
    chmod +x ~/.local/bin/DiaryNote
  fi

  if [ -f "$TMP_DIR/DiaryNote.desktop" ]; then
    cp "$TMP_DIR/DiaryNote.desktop" ~/.local/share/applications/DiaryNote.desktop
  fi

  if [ -f "$TMP_DIR/DiaryNote.png" ]; then
    cp "$TMP_DIR/DiaryNote.png" ~/.local/share/icons/hicolor/128x128/apps/DiaryNote.png
  fi

  echo -e "${GREEN}${BOLD}Successfully installed DiaryNote ${TAG_NAME}!${NC}"
  echo -e "${BLUE}Run 'DiaryNote' from terminal or launch it from your application menu.${NC}"
  exit 0
fi

echo -e "${RED}Unsupported OS: $OS${NC}"
exit 1
