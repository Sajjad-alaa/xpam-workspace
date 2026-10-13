; Use the standard install-mode logic, including existing paths and /D overrides.
!undef APP_FILENAME
!define APP_FILENAME "XPAM\Client"
; Keep explicit app-data removal tied to the product rather than its install directory.
!define /ifndef APP_PRODUCT_FILENAME "${PRODUCT_FILENAME}"

; Windows remembers icons by path. A shortcut that takes its icon from the program keeps showing
; the icon of an older version that was installed in the same place. Point the shortcuts at the
; icon file shipped with this version instead, then ask Windows to refresh what it remembers.
!macro customInstall
  ${If} ${FileExists} "$newDesktopLink"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\resources\icons\icon.ico" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${EndIf}
  ${If} ${FileExists} "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\resources\icons\icon.ico" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${EndIf}
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0x1000, i 0, i 0)'
  ${If} ${FileExists} "$SYSDIR\ie4uinit.exe"
    Push $0
    nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
    Pop $0
    Pop $0
  ${EndIf}
!macroend
