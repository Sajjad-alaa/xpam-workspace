; Use the standard install-mode logic, including existing paths and /D overrides.
!undef APP_FILENAME
!define APP_FILENAME "XPAM\Client"
; Keep explicit app-data removal tied to the product rather than its install directory.
!define /ifndef APP_PRODUCT_FILENAME "${PRODUCT_FILENAME}"

; Windows remembers a program's icon by its path. After an update that changed the icon, the
; desktop and Start menu shortcuts would keep showing the old one until that memory is refreshed.
!macro customInstall
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0x1000, i 0, i 0)'
  ${If} ${FileExists} "$SYSDIR\ie4uinit.exe"
    Push $0
    nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
    Pop $0
    Pop $0
  ${EndIf}
!macroend
