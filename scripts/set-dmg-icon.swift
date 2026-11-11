import Cocoa
import Foundation

// Script para asignar el icono personalizado a los instaladores .dmg en macOS
guard CommandLine.arguments.count >= 3 else {
    print("Uso: swift set-dmg-icon.swift <ruta-icono.png|icns> <archivo1.dmg> [archivo2.dmg ...]")
    exit(1)
}

let iconPath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: iconPath) else {
    print("Error: No se pudo cargar el icono desde \(iconPath)")
    exit(1)
}

for i in 2..<CommandLine.arguments.count {
    let targetPath = CommandLine.arguments[i]
    let fileUrl = URL(fileURLWithPath: targetPath)
    if FileManager.default.fileExists(atPath: fileUrl.path) {
        let success = NSWorkspace.shared.setIcon(image, forFile: fileUrl.path, options: [])
        print("Icono asignado a \(targetPath): \(success ? "Éxito" : "Fallo")")
    }
}
