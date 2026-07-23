param(
  [Parameter(Mandatory = $true)] [string]$DumpPath,
  [Parameter(Mandatory = $true)] [string]$TargetDatabaseUrl,
  [Parameter(Mandatory = $true)]
  [ValidateSet('RESTORE-ISOLATED-DATABASE')] [string]$Confirmation
)

$ErrorActionPreference = 'Stop'

if ($TargetDatabaseUrl -notmatch 'postgres(?:ql)?://') { throw 'TargetDatabaseUrl doit être une chaîne PostgreSQL.' }
if ($TargetDatabaseUrl -match '(prod|production)') { throw 'La cible ressemble à la production. Test refusé.' }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw 'pg_restore est introuvable.' }

$resolvedDump = (Resolve-Path -LiteralPath $DumpPath).Path
& "$PSScriptRoot\verify-database-backup.ps1" -DumpPath $resolvedDump

Write-Warning 'La base isolée ciblée sera remplacée par le contenu de la sauvegarde.'
& pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$TargetDatabaseUrl $resolvedDump
if ($LASTEXITCODE -ne 0) { throw 'Le test de restauration a échoué.' }

Write-Host 'Restauration dans la base isolée : OK'
Write-Host 'Exécute maintenant supabase/tests/security_assertions.sql sur cette base.'
