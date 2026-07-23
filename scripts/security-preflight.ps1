param(
  [switch]$SkipApplicationChecks
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $projectRoot

try {
  $requiredFiles = @(
    'supabase/tests/security_assertions.sql',
    'supabase/migrations/20260722050000_move_profile_security_private.sql',
    'supabase/migrations/20260722053000_harden_content_rls.sql',
    'supabase/migrations/20260722060000_harden_messages_realtime.sql',
    'supabase/migrations/20260722063000_make_content_buckets_private.sql',
    'supabase/migrations/20260722070000_harden_moderation.sql',
    'supabase/migrations/20260722073000_harden_account_lifecycle.sql'
  )

  foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file)) { throw "Fichier de sécurité absent : $file" }
  }

  $trackedFiles = & git ls-files --cached --others --exclude-standard
  if ($LASTEXITCODE -ne 0) { throw 'Impossible de lire les fichiers suivis par Git.' }

  $secretPatterns = @(
    'SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s<]+',
    'sb_secret_[A-Za-z0-9_-]+',
    'postgres(?:ql)?://[^\s]+:[^\s]+@',
    'sk_live_[A-Za-z0-9]+'
  )
  $allowedSecretReferences = @('.env.example', 'docs/SUPABASE_OPERATIONS.md')
  $textExtensions = @('.ts', '.tsx', '.js', '.cjs', '.json', '.md', '.sql', '.yml', '.yaml', '.toml', '.ps1')

  foreach ($file in $trackedFiles) {
    if ($file -like '.expo/*' -or $file -like '.expo-diagnostic/*' -or $file -like 'node_modules/*') { continue }
    if (-not (Test-Path -LiteralPath $file) -or $allowedSecretReferences -contains $file) { continue }
    if ($textExtensions -notcontains [IO.Path]::GetExtension($file).ToLowerInvariant()) { continue }
    $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }
    foreach ($pattern in $secretPatterns) {
      if ($content -match $pattern) { throw "Secret potentiel détecté dans un fichier Git : $file" }
    }
  }

  if (-not $SkipApplicationChecks) {
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Les tests ont échoué.' }
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript a échoué.' }
    & npm.cmd run lint
    if ($LASTEXITCODE -ne 0) { throw 'Le lint a échoué.' }
  }

  Write-Host 'Préparation sécurité locale : OK'
  Write-Host 'Les réglages manuels du tableau de bord doivent encore être cochés dans docs/SUPABASE_PRODUCTION_CHECKLIST.md.'
}
finally {
  Pop-Location
}
