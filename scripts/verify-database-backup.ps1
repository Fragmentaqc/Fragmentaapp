param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw 'pg_restore est introuvable. Installe les outils PostgreSQL avant la vérification.'
}

$resolvedDump = (Resolve-Path -LiteralPath $DumpPath).Path
$hashPath = "$resolvedDump.sha256"
if (-not (Test-Path -LiteralPath $hashPath)) {
  throw "Le fichier d'intégrité est absent : $hashPath"
}

$expectedHash = ((Get-Content -LiteralPath $hashPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualHash = (Get-FileHash -LiteralPath $resolvedDump -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedHash -ne $actualHash) {
  throw 'Échec SHA-256 : le fichier est incomplet ou a été modifié.'
}

$catalog = & pg_restore --list $resolvedDump
if ($LASTEXITCODE -ne 0 -or -not $catalog) {
  throw "pg_restore ne peut pas lire le catalogue de la sauvegarde."
}

$requiredSections = @('TABLE', 'TABLE DATA', 'ACL')
$presentSections = $requiredSections | Where-Object { $catalog -match [regex]::Escape($_) }

Write-Host 'Intégrité SHA-256 : OK'
Write-Host 'Catalogue pg_restore : OK'
Write-Host "Entrées du catalogue : $($catalog.Count)"
Write-Host "Sections détectées : $($presentSections -join ', ')"
