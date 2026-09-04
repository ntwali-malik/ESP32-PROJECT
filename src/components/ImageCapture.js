import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";

function ImageCapture({
  file,
  onChange,
  label = "Cube image",
  required = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => stopCamera, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return undefined;

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }

    return undefined;
  }, [cameraOpen]);

  const openCamera = async () => {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser. Use Upload instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      setCameraError(
        "Camera access was denied or is unavailable. Use Upload to choose an image."
      );
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onChange(
          new File([blob], `cube-scan-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
        );
        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="image-capture">
      <span className="image-capture-label">
        {label}
        {required ? " *" : ""}
      </span>

      {cameraError && <p className="camera-error">{cameraError}</p>}

      {previewUrl && (
        <div className="capture-preview">
          <img alt="Selected cube" src={previewUrl} />
          <button
            className="preview-remove"
            onClick={() => onChange(null)}
            type="button"
          >
            <X size={14} />
            Remove
          </button>
        </div>
      )}

      <div className="image-actions">
        <button className="secondary-button" onClick={openCamera} type="button">
          <Camera size={16} />
          Scan
        </button>
        <label className="secondary-button file-input-button">
          <Upload size={16} />
          Upload
          <input
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              if (nextFile) onChange(nextFile);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>

      {cameraOpen && (
        <div className="camera-overlay">
          <div className="camera-panel">
            <div className="camera-header">
              <strong>Scan cube</strong>
              <button className="preview-remove" onClick={closeCamera} type="button">
                <X size={16} />
                Close
              </button>
            </div>
            <video autoPlay muted playsInline ref={videoRef} />
            <canvas hidden ref={canvasRef} />
            <div className="camera-controls">
              <button className="secondary-button" onClick={closeCamera} type="button">
                Cancel
              </button>
              <button className="primary-button capture-button" onClick={capturePhoto} type="button">
                <Camera size={16} />
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageCapture;
