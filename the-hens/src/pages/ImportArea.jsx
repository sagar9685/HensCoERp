import React, { useState } from "react";
import axios from "axios";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  X,
} from "lucide-react";
import "./ImportArea.css";
import Header from "../component/Header";

const ImportArea = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".xlsx")) {
        setFile(droppedFile);
        setMessage({ text: "", type: "" });
        // Simulate preview data (in real app, parse first few rows)
        setPreviewData({
          fileName: droppedFile.name,
          size: (droppedFile.size / 1024).toFixed(1) + " KB",
          sampleData: [
            { areaName: "Downtown Area" },
            { areaName: "Industrial Zone" },
            { areaName: "Residential Sector" },
          ],
        });
      } else {
        setMessage({ text: "Please upload only .xlsx files", type: "error" });
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith(".xlsx")) {
      setFile(selectedFile);
      setMessage({ text: "", type: "" });
      setPreviewData({
        fileName: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(1) + " KB",
        sampleData: [
          { areaName: "Downtown Area" },
          { areaName: "Industrial Zone" },
          { areaName: "Residential Sector" },
        ],
      });
    } else {
      setMessage({
        text: "Please select an Excel (.xlsx) file",
        type: "error",
      });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData(null);
    setMessage({ text: "", type: "" });
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({
        text: "Please select an Excel file (.xlsx)",
        type: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/area/import`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage({
        text: res.data.message || "Areas imported successfully!",
        type: "success",
      });

      // Reset after successful upload
      setTimeout(() => {
        setFile(null);
        setPreviewData(null);
      }, 2000);
    } catch (err) {
      setMessage({
        text:
          err.response?.data?.message ||
          "Failed to import areas. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="import-container">
        <div className="import-card">
          <div className="card-header">
            <div className="header-icon">
              <FileSpreadsheet size={28} />
            </div>
            <div className="header-content">
              <h2>Import Areas</h2>
              <p className="subtitle">Upload Excel file to import area data</p>
            </div>
          </div>

          <div className="card-body">
            <div
              className={`upload-area ${dragActive ? "drag-active" : ""} ${
                file ? "has-file" : ""
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept=".xlsx"
                onChange={handleFileChange}
                className="file-input"
              />

              {!file ? (
                <div className="upload-content">
                  <Upload size={48} className="upload-icon" />
                  <div className="upload-text">
                    <h3>Drop your Excel file here</h3>
                    <p>
                      or <span className="browse-link">browse</span> to upload
                    </p>
                    <p className="file-types">Supports .xlsx only</p>
                  </div>
                </div>
              ) : (
                <div className="file-preview">
                  <div className="file-info">
                    <FileSpreadsheet size={32} className="file-icon" />
                    <div className="file-details">
                      <h4>{previewData?.fileName || file.name}</h4>
                      <p>
                        {previewData?.size ||
                          (file.size / 1024).toFixed(1) + " KB"}
                      </p>
                    </div>
                    <button
                      className="remove-file"
                      onClick={handleRemoveFile}
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {previewData?.sampleData && (
                    <div className="data-preview">
                      <h5>Preview (Sample Data)</h5>
                      <div className="preview-table">
                        <div className="table-header">
                          <span>areaName</span>
                        </div>
                        {previewData.sampleData.map((row, index) => (
                          <div key={index} className="table-row">
                            <span>{row.areaName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="requirements">
              <h4>Requirements:</h4>
              <ul>
                <li>File must be in .xlsx format</li>
                <li>
                  First column must be named <code>areaName</code>
                </li>
                <li>Maximum file size: 10MB</li>
                <li>Maximum rows: 10,000</li>
              </ul>
            </div>

            <div className="action-section">
              <button
                className={`upload-btn ${loading ? "loading" : ""}`}
                onClick={handleUpload}
                disabled={loading || !file}
              >
                {loading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Import Areas
                  </>
                )}
              </button>
            </div>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.type === "success" ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                <span>{message.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ImportArea;
