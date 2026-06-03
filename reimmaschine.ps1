# Reimmaschine launcher — sets UTF-8 console encoding for correct IPA/Unicode display
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
python "$PSScriptRoot\cli.py" @args
