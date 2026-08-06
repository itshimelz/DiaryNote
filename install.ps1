$ErrorActionPreference = 'Stop'

Write-Host "==> Installing DiaryNote for Windows..." -ForegroundColor Cyan

# Resolve latest release tag via web redirect (bypasses GitHub API rate limits)
$repo = "itshimelz/DiaryNote"
$webUrl = "https://github.com/$repo/releases/latest"

try {
    $request = [System.Net.WebRequest]::Create($webUrl)
    $request.AllowAutoRedirect = $false
    $response = $request.GetResponse()
    $location = $response.Headers["Location"]
    $tagName = Split-Path $location -Leaf
} catch {
    $tagName = "v0.1.1"
}

Write-Host "Found latest version: $tagName" -ForegroundColor Green

$versionNum = $tagName.TrimStart('v')
$fileName = "DiaryNote_${versionNum}_x64-setup.exe"
$downloadUrl = "https://github.com/$repo/releases/download/$tagName/$fileName"
$tempPath = Join-Path $env:TEMP $fileName

Write-Host "Downloading $fileName..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath
} catch {
    $fileName = "DiaryNote_${versionNum}_x64_en-US.msi"
    $downloadUrl = "https://github.com/$repo/releases/download/$tagName/$fileName"
    $tempPath = Join-Path $env:TEMP $fileName
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath
}

Write-Host "Launching installer..." -ForegroundColor Green
Start-Process -FilePath $tempPath -Wait

Write-Host "Successfully completed installation for DiaryNote $tagName!" -ForegroundColor Green
