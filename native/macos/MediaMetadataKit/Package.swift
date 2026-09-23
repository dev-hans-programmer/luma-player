// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "MediaMetadataKit",
  platforms: [.macOS(.v13)],
  products: [
    .library(name: "MediaMetadataKit", targets: ["MediaMetadataKit"]),
    .executable(name: "luma-media-helper", targets: ["MediaMetadataHelper"]),
    .executable(name: "luma-media-helper-self-test", targets: ["MediaMetadataKitSelfTest"]),
  ],
  targets: [
    .target(name: "MediaMetadataKit"),
    .executableTarget(name: "MediaMetadataHelper", dependencies: ["MediaMetadataKit"]),
    .executableTarget(name: "MediaMetadataKitSelfTest", dependencies: ["MediaMetadataKit"]),
  ]
)
