import { adminApi } from "./api";

/**
 * Upload a file straight from the browser to R2 using a signed URL from the
 * API. Returns the file's path in the bucket (e.g. "reels/2026-10/x.mp4"),
 * which the site resolves against MEDIA_BASE_URL.
 */
export async function uploadFile(file: File, folder: string, onProgress?: (pct: number) => void): Promise<string> {
  const { uploadUrl, path, contentType } = await adminApi<{ uploadUrl: string; path: string; contentType: string }>("/uploads", {
    body: { fileName: file.name, contentType: file.type, folder },
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}). Check the R2 API token's permissions.`)));
    xhr.onerror = () => reject(new Error("Upload blocked. Check the R2 bucket's CORS policy allows this site."));
    xhr.send(file);
  });
  return path;
}

/**
 * Grab a frame (about 1 second in) from a local video file as a JPG, for use
 * as the reel's cover. Works on the file before upload, so no CORS is needed.
 * Rejects if the browser can't decode the video (e.g. HEVC .mov on Chrome).
 */
export function coverFromVideo(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = (msg: string) => {
      URL.revokeObjectURL(url);
      reject(new Error(msg));
    };
    const timer = setTimeout(() => fail("Timed out reading the video"), 15_000);
    video.onerror = () => {
      clearTimeout(timer);
      fail("This browser can't read that video format");
    };
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 3);
    };
    video.onseeked = () => {
      clearTimeout(timer);
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Couldn't create the cover image"));
          const name = file.name.replace(/\.[^.]+$/, "") + "-cover.jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    video.src = url;
  });
}
