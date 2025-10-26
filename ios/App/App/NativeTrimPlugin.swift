import Foundation
import Capacitor
import UIKit

@objc(NativeTrimPlugin)
public class NativeTrimPlugin: CAPPlugin, UINavigationControllerDelegate {
  private var pendingCall: CAPPluginCall?

  @objc func trim(_ call: CAPPluginCall) {
    guard let srcPath = call.getString("path"), !srcPath.isEmpty else {
      call.reject("path required")
      return
    }

    DispatchQueue.main.async {
      guard UIVideoEditorController.canEditVideo(atPath: srcPath) else {
        call.reject("Cannot edit video at path")
        return
      }
      let editor = UIVideoEditorController()
      editor.videoPath = srcPath
      editor.videoQuality = .typeHigh
      editor.modalPresentationStyle = .fullScreen
      editor.delegate = self
      self.pendingCall = call
      self.bridge?.viewController?.present(editor, animated: true, completion: nil)
    }
  }
}

extension NativeTrimPlugin: UIVideoEditorControllerDelegate {
  public func videoEditorController(_ editor: UIVideoEditorController, didSaveEditedVideoToPath editedVideoPath: String) {
    editor.dismiss(animated: true) {
      self.pendingCall?.resolve(["path": editedVideoPath])
      self.pendingCall = nil
    }
  }

  public func videoEditorController(_ editor: UIVideoEditorController, didFailWithError error: Error) {
    editor.dismiss(animated: true) {
      self.pendingCall?.reject(error.localizedDescription)
      self.pendingCall = nil
    }
  }

  public func videoEditorControllerDidCancel(_ editor: UIVideoEditorController) {
    editor.dismiss(animated: true) {
      self.pendingCall?.reject("cancelled")
      self.pendingCall = nil
    }
  }
}
