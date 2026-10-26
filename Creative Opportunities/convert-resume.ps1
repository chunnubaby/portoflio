$ErrorActionPreference = 'Stop'
$source = 'C:\Users\coolf\Desktop\Chunnu\Acting Resume - Farhan.odt'
$destination = 'C:\Users\coolf\OneDrive\Documents\claude\portoflio\Creative Opportunities\Application Materials\Farhan Naushad Acting Resume.pdf'
$folder = Split-Path -Parent $destination
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
  $doc = $word.Documents.Open($source, $false, $true)
  $doc.ExportAsFixedFormat($destination, 17)
} finally {
  if ($null -ne $doc) { $doc.Close(0) }
  $word.Quit()
}
Get-Item -LiteralPath $destination | Select-Object FullName, Length
