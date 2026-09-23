import Foundation
import MediaMetadataKit

private struct MetadataRequest: Decodable {
  let id: String
  let command: String
  let path: String
}

private struct MetadataResponse: Encodable {
  let id: String
  let ok: Bool
  let metadata: NativeMediaMetadata?
  let error: String?
}

@main
struct MediaMetadataHelper {
  private static let decoder = JSONDecoder()
  private static let encoder = JSONEncoder()
  private static let probe = NativeMetadataProbe()

  private static func writeResponse(_ response: MetadataResponse) {
    guard let data = try? encoder.encode(response), let line = String(data: data, encoding: .utf8) else {
      return
    }
    FileHandle.standardOutput.write(Data("\(line)\n".utf8))
    try? FileHandle.standardOutput.synchronize()
  }

  static func main() async {
    while let line = readLine() {
      guard let data = line.data(using: .utf8), let request = try? decoder.decode(MetadataRequest.self, from: data) else {
        writeResponse(MetadataResponse(id: "unknown", ok: false, metadata: nil, error: "Invalid JSON request."))
        continue
      }

      guard request.command == "probe" else {
        writeResponse(MetadataResponse(id: request.id, ok: false, metadata: nil, error: "Unsupported command."))
        continue
      }

      do {
        let metadata = try await probe.probe(filePath: request.path)
        writeResponse(MetadataResponse(id: request.id, ok: true, metadata: metadata, error: nil))
      } catch {
        writeResponse(MetadataResponse(id: request.id, ok: false, metadata: nil, error: error.localizedDescription))
      }
    }
  }
}
