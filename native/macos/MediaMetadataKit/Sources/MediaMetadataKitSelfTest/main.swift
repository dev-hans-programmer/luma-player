import Foundation
import MediaMetadataKit

@main
struct MediaMetadataKitSelfTest {
  static func main() async throws {
    let expected = NativeMediaMetadata(durationMs: 1250, width: 1920, height: 1080, hasAudio: true)
    let encoded = try JSONEncoder().encode(expected)
    let decoded = try JSONDecoder().decode(NativeMediaMetadata.self, from: encoded)
    precondition(decoded == expected, "Native metadata must round-trip through JSON.")

    do {
      _ = try await NativeMetadataProbe().probe(filePath: "/tmp/luma-missing-media-file")
      preconditionFailure("A missing file must fail clearly.")
    } catch NativeMetadataProbeError.fileNotFound {
      print("MediaMetadataKit self-test passed")
    }
  }
}
