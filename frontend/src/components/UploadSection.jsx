import React from "react";
import SectionCard from "./SectionCard";

function UploadSection({ uploading, uploadMessage, onFileChange, onUpload, onReset }) {
  return (
    <SectionCard
      title="Upload Bank Statement CSV"
      subtitle="Ingest your latest bank statement directly into the dashboard."
      className="upload-card"
    >
      <form className="upload-form" onSubmit={onUpload}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => onFileChange(e.target.files[0] || null)}
          className="file-input"
        />
        <button type="submit" className="btn primary" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload CSV"}
        </button>
        <button
          type="button"
          className="btn subtle"
          onClick={onReset}
          disabled={uploading}
        >
          Reset Transactions
        </button>
      </form>
      {uploadMessage && <p className="helper-text">{uploadMessage}</p>}
    </SectionCard>
  );
}

export default UploadSection;
