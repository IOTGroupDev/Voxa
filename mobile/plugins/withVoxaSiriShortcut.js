const { IOSConfig, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SWIFT_FILE_NAME = 'StartVoxaCaptureIntent.swift';

const SWIFT_SOURCE = `import AppIntents
import UIKit

@available(iOS 16.0, *)
struct StartVoxaCaptureIntent: AppIntent {
  static var title: LocalizedStringResource = "Запиши в Voxa"
  static var description = IntentDescription("Начать быструю запись в Voxa")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let url = URL(string: "voxa://capture?autostart=true") {
      UIApplication.shared.open(url)
    }

    return .result()
  }
}

@available(iOS 16.0, *)
struct VoxaCaptureShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: StartVoxaCaptureIntent(),
      phrases: [
        "Запиши в \\\\(.applicationName)",
        "Record in \\\\(.applicationName)"
      ],
      shortTitle: "Запиши",
      systemImageName: "mic.fill"
    )
  }
}
`;

module.exports = function withVoxaSiriShortcut(config) {
  return withXcodeProject(config, (modConfig) => {
    const projectRoot = modConfig.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const swiftFilePath = path.join(projectRoot, projectName, SWIFT_FILE_NAME);
    fs.mkdirSync(path.dirname(swiftFilePath), { recursive: true });
    fs.writeFileSync(swiftFilePath, SWIFT_SOURCE);

    const project = modConfig.modResults;
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName,
    });

    const projectFilePath = `${projectName}/${SWIFT_FILE_NAME}`;
    if (!project.hasFile(projectFilePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: projectFilePath,
        groupName: projectName,
        project,
        targetUuid: target.uuid,
      });
    }

    return modConfig;
  });
};
