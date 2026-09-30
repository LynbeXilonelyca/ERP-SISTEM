Set WshShell = CreateObject("WScript.Shell")
Set oShortcut = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\ERP Admin.lnk")

oShortcut.TargetPath = "D:\1-Assest Website\Ini SWD Sistem\Ini SWD Sistem\erp-admin\start-dev.bat"
oShortcut.WorkingDirectory = "D:\1-Assest Website\Ini SWD Sistem\Ini SWD Sistem\erp-admin"
oShortcut.Description = "Start ERP Admin Dev Server"
oShortcut.WindowStyle = 1

' Try to set a nice icon (uses CMD icon as fallback)
Dim iconPath
iconPath = "D:\1-Assest Website\Ini SWD Sistem\Ini SWD Sistem\erp-admin\node_modules\.bin\next"
' Use shell32 star icon (index 43 = yellow star-like icon)
oShortcut.IconLocation = "%SystemRoot%\system32\shell32.dll, 43"

oShortcut.Save

WScript.Echo "Shortcut created on Desktop: ERP Admin.lnk"
