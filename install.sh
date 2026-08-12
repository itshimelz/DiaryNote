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

# --- Version Resolution & Options ---
TARGET_VERSION=""
USE_PRERELEASE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version|-v)
      TARGET_VERSION="$2"
      shift 2
      ;;
    --prerelease|--pre)
      USE_PRERELEASE=true
      shift
      ;;
    --latest)
      USE_PRERELEASE=false
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ -n "$VERSION" ]; then
  TARGET_VERSION="$VERSION"
fi

REPO="itshimelz/DiaryNote"
TAG_NAME=""

if [ -n "$TARGET_VERSION" ]; then
  TAG_NAME="$TARGET_VERSION"
  [[ "$TAG_NAME" != v* ]] && TAG_NAME="v${TAG_NAME}"
  echo -e "${BLUE}Using specified version: ${BOLD}${TAG_NAME}${NC}"
else
  # Fetch recent releases via GitHub API
  RELEASES_JSON="$(curl -fsSL -H "User-Agent: DiaryNote-Installer" "https://api.github.com/repos/${REPO}/releases?per_page=10" 2>/dev/null || true)"

  parsed_releases=()
  if command -v python3 >/dev/null 2>&1; then
    while IFS= read -r line; do
      [ -n "$line" ] && parsed_releases+=("$line")
    done < <(echo "$RELEASES_JSON" | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    for r in data:
        tag = r.get("tag_name", "")
        is_pre = r.get("prerelease", False)
        print(f"{tag}|{is_pre}")
except Exception:
    pass
' 2>/dev/null)
  fi

  if [ ${#parsed_releases[@]} -eq 0 ]; then
    # Fallback to redirect API if API query fails
    REDIRECT_URL="$(curl -sIL "https://github.com/${REPO}/releases/latest" | grep -i "^location:" | head -n1 | tr -d '\r\n' || true)"
    TAG_NAME="$(basename "$REDIRECT_URL")"
    if [ -z "$TAG_NAME" ] || [ "$TAG_NAME" = "latest" ]; then
      TAG_NAME="$(curl -fsSL -H "User-Agent: DiaryNote-Installer" "https://api.github.com/repos/${REPO}/releases/latest" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4 || true)"
    fi
  else
    if [ "$USE_PRERELEASE" = true ]; then
      TAG_NAME="${parsed_releases[0]%%|*}"
    elif [ -c /dev/tty ] || [ -t 0 ]; then
      echo -e "${BOLD}${BLUE}==> Available DiaryNote Versions:${NC}"
      idx=1
      tag_options=()
      for rel in "${parsed_releases[@]}"; do
        tag="${rel%%|*}"
        is_pre="${rel#*|}"
        label="Stable Release"
        [ "$is_pre" = "True" ] || [ "$is_pre" = "true" ] && label="Pre-Release"
        
        if [ $idx -eq 1 ]; then
          echo -e "  ${BOLD}${GREEN}${idx}) ${tag} (${label}) [default]${NC}"
        else
          echo -e "  ${idx}) ${tag} (${label})"
        fi
        tag_options+=("$tag")
        ((idx++))
        [ $idx -gt 5 ] && break
      done

      TTY_DEV="/dev/tty"
      [ ! -c "$TTY_DEV" ] && TTY_DEV="/dev/stdin"

      echo -ne "${BLUE}Select a version to install [1-${#tag_options[@]}] (default 1): ${NC}"
      read -r CHOICE < "$TTY_DEV" 2>/dev/null || CHOICE=""
      
      if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "${#tag_options[@]}" ]; then
        TAG_NAME="${tag_options[$((CHOICE-1))]}"
      else
        TAG_NAME="${tag_options[0]}"
      fi
    else
      # Non-interactive mode: find first stable release
      for rel in "${parsed_releases[@]}"; do
        tag="${rel%%|*}"
        is_pre="${rel#*|}"
        if [ "$is_pre" != "True" ] && [ "$is_pre" != "true" ]; then
          TAG_NAME="$tag"
          break
        fi
      done
      [ -z "$TAG_NAME" ] && TAG_NAME="${parsed_releases[0]%%|*}"
    fi
  fi
fi

if [ -z "$TAG_NAME" ]; then
  echo -e "${RED}Failed to resolve release tag.${NC}"
  exit 1
fi

VERSION_NUM="${TAG_NAME#v}"
echo -e "${BLUE}Selected version: ${BOLD}${TAG_NAME}${NC}"

# --- macOS Installation ---
if [ "$OS" = "Darwin" ]; then
  DMG_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/DiaryNote_${VERSION_NUM}_${MAC_ARCH}.dmg"

  echo -e "${BLUE}Downloading macOS installer (.dmg)...${NC}"
  if ! curl -fsSL "$DMG_URL" -o "$TMP_DIR/DiaryNote.dmg"; then
    DMG_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/DiaryNote_${VERSION_NUM}_x64.dmg"
    curl -fsSL "$DMG_URL" -o "$TMP_DIR/DiaryNote.dmg"
  fi

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
    DEB_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/DiaryNote_${VERSION_NUM}_${DEB_ARCH}.deb"
    echo -e "${BLUE}Debian/Ubuntu system detected. Downloading .deb package...${NC}"
    if curl -fsSL "$DEB_URL" -o "$TMP_DIR/DiaryNote.deb"; then
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
  TAR_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/DiaryNote-linux-x86_64.tar.gz"
  ICON_URL="https://raw.githubusercontent.com/${REPO}/main/assets/logo.png"

  echo -e "${BLUE}Downloading DiaryNote standalone Linux package...${NC}"
  if ! curl -fsSL "$TAR_URL" -o "$TMP_DIR/package.tar.gz"; then
    echo -e "${RED}Could not download package from ${TAR_URL}${NC}"
    exit 1
  fi

  tar -xzf "$TMP_DIR/package.tar.gz" -C "$TMP_DIR"

  mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/128x128/apps ~/.local/share/icons ~/.local/share/pixmaps

  if [ -f "$TMP_DIR/DiaryNote" ]; then
    rm -f ~/.local/bin/DiaryNote 2>/dev/null || true
    cp "$TMP_DIR/DiaryNote" ~/.local/bin/DiaryNote
    chmod +x ~/.local/bin/DiaryNote
  fi

  if [ -f "$TMP_DIR/DiaryNote.desktop" ]; then
    cp "$TMP_DIR/DiaryNote.desktop" ~/.local/share/applications/DiaryNote.desktop
  fi

  if [ -f "$TMP_DIR/DiaryNote.png" ]; then
    cp "$TMP_DIR/DiaryNote.png" ~/.local/share/icons/hicolor/128x128/apps/DiaryNote.png
    cp "$TMP_DIR/DiaryNote.png" ~/.local/share/icons/DiaryNote.png
    cp "$TMP_DIR/DiaryNote.png" ~/.local/share/pixmaps/DiaryNote.png
  else
    echo -e "${BLUE}Fetching application icon...${NC}"
    curl -fsSL "$ICON_URL" -o ~/.local/share/icons/hicolor/128x128/apps/DiaryNote.png 2>/dev/null || true
    cp ~/.local/share/icons/hicolor/128x128/apps/DiaryNote.png ~/.local/share/icons/DiaryNote.png 2>/dev/null || true
    cp ~/.local/share/icons/hicolor/128x128/apps/DiaryNote.png ~/.local/share/pixmaps/DiaryNote.png 2>/dev/null || true
  fi

  # Refresh desktop database & icon caches
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database ~/.local/share/applications 2>/dev/null || true
  fi
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor 2>/dev/null || true
  fi

  echo -e "${GREEN}${BOLD}Successfully installed DiaryNote ${TAG_NAME}!${NC}"
  echo -e "${BLUE}Run 'DiaryNote' from terminal or launch it from your application menu.${NC}"
  exit 0
fi

echo -e "${RED}Unsupported OS: $OS${NC}"
exit 1
