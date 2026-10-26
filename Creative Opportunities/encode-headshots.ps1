$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = 'C:\Users\coolf\OneDrive\Documents\claude\portoflio\Creative Opportunities\Application Materials'
$items = @(
  @('Farhan Naushad - Current Look.png','Farhan Naushad - Current Look.jpg'),
  @('Farhan Naushad - Stache Goatee Headshot.png','Farhan Naushad - Stache Goatee Headshot.jpg')
)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]88)
foreach ($item in $items) {
  $source = Join-Path $dir $item[0]
  $target = Join-Path $dir $item[1]
  $bitmap = [System.Drawing.Bitmap]::new($source)
  try { $bitmap.Save($target, $codec, $params) }
  finally { $bitmap.Dispose() }
  Get-Item -LiteralPath $target | Select-Object Name, Length
}
