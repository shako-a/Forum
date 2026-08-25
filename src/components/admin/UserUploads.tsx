import { adminDeleteUpload } from "@/app/actions/admin-ads";
import { ConfirmButton } from "@/components/business/ConfirmButton";
import type { Dictionary } from "@/i18n/dictionaries";

export type UploadRow = {
  id: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: string; // ISO
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Admin view of one member's upload ledger: what they put in storage, how
// much, and a per-file delete (for takedowns / erasure requests).
export function UserUploads({ uploads, dict }: { uploads: UploadRow[]; dict: Dictionary }) {
  const t = dict.admin;
  const total = uploads.reduce((s, u) => s + u.size, 0);
  return (
    <div className="admin-section">
      <h2 className="admin-section-title">
        📎 {t.uploads}
        {uploads.length > 0 && (
          <span className="muted-sm">
            {" "}
            · {t.uploadsTotal.replace("{n}", String(uploads.length)).replace("{size}", fmtSize(total))}
          </span>
        )}
      </h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.uploadsSub}</p>
      {uploads.length === 0 ? (
        <p className="muted-sm">{t.noUploads}</p>
      ) : (
        <div className="admin-uploads-grid">
          {uploads.map((u) => (
            <div key={u.id} className="admin-upload">
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="admin-upload-thumb">
                {u.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.url} alt="" loading="lazy" />
                ) : (
                  <span>🎬</span>
                )}
              </a>
              <div className="admin-upload-meta">
                <span>
                  {fmtSize(u.size)} · {new Date(u.createdAt).toLocaleDateString()}
                </span>
                <ConfirmButton
                  action={adminDeleteUpload.bind(null, u.id)}
                  label="🗑"
                  confirmText={t.confirmDeleteUpload}
                  className="action mod-action"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
