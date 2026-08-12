Param(
    [string]$Version = "",
    [switch]$Prerelease = $false
)

Write-Host "==> Installing DiaryNote for Windows..." -ForegroundColor Cyan

$repo = "itshimelz/DiaryNote"
$tagName = ""

if ($Version) {
    $tagName = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
    Write-Host "Using specified version: $tagName" -ForegroundColor Cyan
} else {
    try {
        $apiUrl = "https://api.github.com/repos/$repo/releases?per_page=10"
        $releases = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "DiaryNote-Installer" }
        
        if ($Prerelease) {
            $tagName = $releases[0].tag_name
        } elseif ([Environment]::UserInteractive) {
            Write-Host "==> Available DiaryNote Versions:" -ForegroundColor Yellow
            $count = [Math]::Min(5, $releases.Count)
            for ($i = 0; $i -lt $count; $i++) {
                $rel = $releases[$i]
                $type = if ($rel.prerelease) { "Pre-Release" } else { "Stable Release" }
                $defaultTag = if ($i -eq 0) { " [default]" } else { "" }
                Write-Host "  ($($i + 1)) $($rel.tag_name) ($type)$defaultTag" -ForegroundColor Cyan
            }
            $selection = Read-Host "Select a version to install [1-$count] (default 1)"
            if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $count) {
                $tagName = $releases[[int]$selection - 1].tag_name
            } else {
                $tagName = $releases[0].tag_name
            }
        } else {
            $stable = $releases | Where-Object { -not $_.prerelease } | Select-Object -First 1
            if ($stable) { $tagName = $stable.tag_name } else { $tagName = $releases[0].tag_name }
        }
    } catch {
        $webUrl = "https://github.com/$repo/releases/latest"
        $request = [System.Net.WebRequest]::Create($webUrl)
        $request.AllowAutoRedirect = $false
        $response = $request.GetResponse()
        $location = $response.Headers["Location"]
        $tagName = Split-Path $location -Leaf
    }
}

if (-not $tagName) {
    Write-Host "Failed to resolve release tag." -ForegroundColor Red
    exit 1
}

Write-Host "Selected version: $tagName" -ForegroundColor Green

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
