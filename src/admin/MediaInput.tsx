import { ImageIcon, Loader2, Upload, Video } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/format";
import { adminApi, resolveMedia } from "./api";
import { useAdminConfig } from "./context";
import { inputClass } from "./ui";

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

/**
 * A media URL field with preview. When R2 uploads are configured it also
 * offers "Upload", which sends the file straight from the browser to R2.
 */
export function MediaInput({
  value,
  onChange,
  kind,
  folder,
  error,
  aspect = "aspect-square",
}: {
  value: string;
  onChange: (v: string) => void;
  kind: "image" | "video";
  folder: string;
  error?: string;
  aspect?: string;
}) {
  const { uploadsEnabled, mediaBaseUrl } = useAdminConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string>();
  const preview = resolveMedia(value, mediaBaseUrl);

  async function upload(file: File) {
    setUploadError(undefined);
    setProgress(0);
    try {
      const { uploadUrl, publicUrl, contentType } = await adminApi<{ uploadUrl: string; publicUrl: string; contentType: string }>("/uploads", {
        body: { fileName: file.name, contentType: file.type, folder },
      });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Upload failed. Check the bucket's CORS settings."));
        xhr.send(file);
      });
      onChange(publicUrl);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex gap-3">
      <div className={cn("relative w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2", kind === "video" ? "aspect-[9/16]" : aspect)}>
        {preview ? (
          kind === "video" || isVideo(preview) ? (
            <video src={preview} muted playsInline preload="metadata" className="size-full object-cover" />
          ) : (
            <img src={preview} alt="" className="size-full object-cover" />
          )
        ) : (
          <span className="grid size-full place-items-center text-muted">{kind === "video" ? <Video className="size-5" /> : <ImageIcon className="size-5" />}</span>
        )}
        {progress !== null && (
          <span className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-bold text-white">{progress}%</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={kind === "video" ? "https://…/reel.mp4" : "https://…/photo.jpg"}
          className={inputClass(error || uploadError)}
        />
        {uploadsEnabled && (
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/avif"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={progress !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-accent hover:text-accent disabled:opacity-60"
            >
              {progress !== null ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {progress !== null ? "Uploading…" : `Upload ${kind}`}
            </button>
          </>
        )}
        {(error || uploadError) && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error || uploadError}</p>}
      </div>
    </div>
  );
}
