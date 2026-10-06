param([string]$DependencyRoot = 'D:\codex-project-deps\project-management')
$ErrorActionPreference = 'Stop'
$SourceRoot = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Path $DependencyRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $SourceRoot 'package.json') -Destination (Join-Path $DependencyRoot 'package.json')
foreach ($name in @('apps','packages')) {
  $link = Join-Path $DependencyRoot $name
  if (-not (Test-Path -LiteralPath $link)) {New-Item -ItemType Junction -Path $link -Target (Join-Path $SourceRoot $name) | Out-Null}
}
& npm.cmd install --prefix $DependencyRoot --cache (Join-Path $DependencyRoot 'npm-cache')
if ($LASTEXITCODE -ne 0) {throw 'Dependency installation failed'}
$ModulesLink = Join-Path $SourceRoot 'node_modules'
if (-not (Test-Path -LiteralPath $ModulesLink)) {New-Item -ItemType Junction -Path $ModulesLink -Target (Join-Path $DependencyRoot 'node_modules') | Out-Null}
Copy-Item -LiteralPath (Join-Path $DependencyRoot 'package-lock.json') -Destination (Join-Path $SourceRoot 'package-lock.json')
& node (Join-Path $PSScriptRoot 'normalize-lockfile.cjs')
