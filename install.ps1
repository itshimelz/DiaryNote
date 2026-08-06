$ErrorActionPreference = 'Stop'

Write-Host "==> Installing DiaryNote for Windows..." -ForegroundColor Cyan

# Fetch latest release metadata from GitHub API
$repo = "itshimelz/DiaryNote"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $release = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "DiaryNote-Installer" }
    $tagName = $release.tag_name
} catch {
    Write-Error "Failed to fetch latest release metadata from GitHub."
    exit 1
}

Write-Host "Found latest version: $tagName" -ForegroundColor Green

# Find Windows installer asset (.exe or .msi)
$asset = $release.assets | Where-Object { $_.name -like "*setup.exe" -or $_.name -like "*.exe" -or $_.name -like "*.msi" } | Select-Object -First 1

if (-not $asset) {
    Write-Error "No Windows installer (.exe or .msi) found in release $tagName."
    exit 1
}

$downloadUrl = $asset.browser_download_url
$fileName = $asset.name
$tempPath = Join-Path $env:TEMP $fileName

Write-Host "Downloading $fileName..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath

Write-Host "Launching installer..." -ForegroundColor Green
Start-Process -FilePath $tempPath -Wait

Write-Host "Successfully completed installation for DiaryNote $tagName!" -ForegroundColor Green
