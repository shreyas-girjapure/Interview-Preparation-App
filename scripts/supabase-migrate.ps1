param(
  [ValidateSet("local", "dev", "prod")]
  [string]$Target = "local",
  [switch]$DryRun,
  [switch]$ListOnly,
  [switch]$ResetLocal,
  [switch]$ConfirmProd
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DevProjectRef = "stxikhpofortkerjeuhf"
$ProdProjectRef = "xglbjcouoyjegryxorqo"

function Invoke-Supabase {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  Write-Host ">> npx supabase $($Args -join ' ')" -ForegroundColor Cyan
  & npx.cmd supabase @Args

  if ($LASTEXITCODE -ne 0) {
    throw "Supabase command failed: npx supabase $($Args -join ' ')"
  }
}

Write-Host "Target: $Target" -ForegroundColor Yellow

if ($Target -eq "local") {
  if ($ListOnly) {
    Invoke-Supabase -Args @("migration", "list", "--local")
    exit 0
  }

  if ($ResetLocal) {
    Invoke-Supabase -Args @("db", "reset", "--local", "--yes")
  } else {
    Invoke-Supabase -Args @("migration", "up", "--local")
  }

  Invoke-Supabase -Args @("migration", "list", "--local")
  exit 0
}

$ProjectRef = if ($Target -eq "dev") { $DevProjectRef } else { $ProdProjectRef }

if ($Target -eq "prod" -and -not $DryRun -and -not $ConfirmProd) {
  throw "Refusing prod push without -ConfirmProd. Run with -DryRun first, then rerun with -ConfirmProd."
}

Invoke-Supabase -Args @("link", "--project-ref", $ProjectRef, "--yes")

if ($ListOnly) {
  Invoke-Supabase -Args @("migration", "list", "--linked")
  exit 0
}

Invoke-Supabase -Args @("db", "push", "--linked", "--dry-run")

if ($DryRun) {
  Write-Host "Dry run complete. No remote changes applied." -ForegroundColor Green
  exit 0
}

Invoke-Supabase -Args @("db", "push", "--linked", "--yes")
Invoke-Supabase -Args @("migration", "list", "--linked")

Write-Host "Migration flow completed for target '$Target'." -ForegroundColor Green
