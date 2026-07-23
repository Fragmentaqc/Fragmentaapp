param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,

  [ValidateSet('development', 'staging', 'production')]
  [string]$Environment = 'production',

  [string]$Commit = 'manual'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw 'pg_dump est introuvable. Installe les outils PostgreSQL avant de créer une sauvegarde.'
}

if (-not $DatabaseUrl.StartsWith('postgresql://') -and -not $DatabaseUrl.StartsWith('postgres://')) {
  throw 'DatabaseUrl doit être une chaîne de connexion PostgreSQL.'
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$resolvedOutput = (Resolve-Path -LiteralPath $OutputDirectory).Path
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$safeCommit = ($Commit -replace '[^a-zA-Z0-9._-]', '').Substring(0, [Math]::Min(12, ($Commit -replace '[^a-zA-Z0-9._-]', '').Length))
if (-not $safeCommit) { $safeCommit = 'manual' }

$dumpPath = Join-Path $resolvedOutput "fragmenta-$Environment-$timestamp-$safeCommit.dump"
$hashPath = "$dumpPath.sha256"
$metadataPath = "$dumpPath.json"

& pg_dump --format=custom --no-owner --no-privileges --file=$dumpPath $DatabaseUrl
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $dumpPath)) {
  throw 'La sauvegarde PostgreSQL a échoué.'
}

$hash = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([IO.Path]::GetFileName($dumpPath))" | Set-Content -LiteralPath $hashPath -Encoding ascii

[ordered]@{
  created_at = (Get-Date).ToUniversalTime().ToString('o')
  environment = $Environment
  commit = $Commit
  file = [IO.Path]::GetFileName($dumpPath)
  sha256 = $hash
  size_bytes = (Get-Item -LiteralPath $dumpPath).Length
  contains_storage_objects = $false
} | ConvertTo-Json | Set-Content -LiteralPath $metadataPath -Encoding utf8

Write-Host "Sauvegarde créée : $dumpPath"
Write-Host "Intégrité SHA-256 : $hash"
Write-Warning 'Ce fichier contient des données sensibles. Chiffre-le, garde-le hors de Git et sauvegarde séparément les fichiers Storage.'
