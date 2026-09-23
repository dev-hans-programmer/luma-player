import AVFoundation
import Foundation

public struct NativeMediaMetadata: Codable, Equatable, Sendable {
  public let durationMs: Double?
  public let width: Int?
  public let height: Int?
  public let hasAudio: Bool

  public init(durationMs: Double?, width: Int?, height: Int?, hasAudio: Bool) {
    self.durationMs = durationMs
    self.width = width
    self.height = height
    self.hasAudio = hasAudio
  }
}

public enum NativeMetadataProbeError: LocalizedError, Equatable {
  case fileNotFound
  case metadataUnavailable(String)

  public var errorDescription: String? {
    switch self {
    case .fileNotFound:
      return "The media file does not exist."
    case let .metadataUnavailable(message):
      return message
    }
  }
}

/// Thin AVFoundation adapter. It deliberately exposes metadata only; playback
/// remains owned by Chromium and the Electron media protocol.
public struct NativeMetadataProbe: Sendable {
  public init() {}

  public func probe(filePath: String) async throws -> NativeMediaMetadata {
    guard FileManager.default.fileExists(atPath: filePath) else {
      throw NativeMetadataProbeError.fileNotFound
    }

    let asset = AVURLAsset(url: URL(fileURLWithPath: filePath))
    let duration: CMTime
    let tracks: [AVAssetTrack]
    do {
      duration = try await asset.load(.duration)
      tracks = try await asset.load(.tracks)
    } catch {
      throw NativeMetadataProbeError.metadataUnavailable(error.localizedDescription)
    }

    let durationSeconds = duration.seconds
    let durationMs = durationSeconds.isFinite ? max(0, durationSeconds * 1000) : nil
    let videoTrack = tracks.first { $0.mediaType == .video }
    let videoSize: CGSize?
    do {
      videoSize = try await videoTrack?.load(.naturalSize)
    } catch {
      throw NativeMetadataProbeError.metadataUnavailable(error.localizedDescription)
    }

    return NativeMediaMetadata(
      durationMs: durationMs,
      width: videoSize.map { Int(abs($0.width)) },
      height: videoSize.map { Int(abs($0.height)) },
      hasAudio: tracks.contains { $0.mediaType == .audio },
    )
  }
}
