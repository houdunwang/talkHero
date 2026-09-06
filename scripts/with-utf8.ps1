$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if ($args.Length -eq 0) {
  throw 'Missing command.'
}

$command = $args[0]
$commandArgs = @()

if ($args.Length -gt 1) {
  $commandArgs = $args[1..($args.Length - 1)]
}

& $command @commandArgs
exit $LASTEXITCODE
