#!/bin/bash
set -e
echo "Installing DiaryNote for Arch Linux..."
mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/128x128/apps
cp DiaryNote ~/.local/bin/DiaryNote
cp DiaryNote.desktop ~/.local/share/applications/DiaryNote.desktop
cp DiaryNote.png ~/.local/share/icons/hicolor/128x128/apps/DiaryNote.png
chmod +x ~/.local/bin/DiaryNote
echo "Successfully installed DiaryNote! You can run 'DiaryNote' or launch it from your app menu."
