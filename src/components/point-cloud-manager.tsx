import { useMemo, useState } from "react";
import "../styles/crane-control-panel.css";

export default function PointCloudManager() {
  const versions = useMemo(
    () => [
      { label: "V1 - 基础清洗版", value: "v1" },
      { label: "V2 - 去噪增强版", value: "v2" },
      { label: "V3 - 高精度融合版", value: "v3" },
    ],
    [],
  );
  const [selectedVersion, setSelectedVersion] = useState<string>(versions[0].value);
  const [pcdFileName, setPcdFileName] = useState<string>("未选择文件");

  const handlePcdFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPcdFileName(file.name);
    } else {
      setPcdFileName("未选择文件");
    }
  };

  return (
    <div className="crane-control-panel">
      <div className="panel-header">
        <h4>点云管理</h4>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `calc(12px * var(--scale, 1))`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `calc(8px * var(--scale, 1))`,
          }}
        >
          <label
            style={{
              color: "#FFFFFFFF",
              fontSize: `calc(13px * var(--scale, 1))`,
            }}
          >
            点云版本
          </label>
          <select
            value={selectedVersion}
            onChange={(event) => setSelectedVersion(event.target.value)}
            style={{
              width: "100%",
              color: "#FFFFFFFF",
              background: "#00000033",
              border: "1px solid #FFFFFF5E",
              borderRadius: `calc(8px * var(--scale, 1))`,
              padding: `calc(8px * var(--scale, 1))`,
              fontSize: `calc(13px * var(--scale, 1))`,
            }}
          >
            {versions.map((item) => (
              <option key={item.value} value={item.value} style={{ color: "#111" }}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `calc(8px * var(--scale, 1))`,
          }}
        >
          <label
            style={{
              color: "#FFFFFFFF",
              fontSize: `calc(13px * var(--scale, 1))`,
            }}
          >
            上传 PCD 文件
          </label>
          <input
            type="file"
            accept=".pcd"
            onChange={handlePcdFileChange}
            style={{
              width: "100%",
              color: "#FFFFFFFF",
              background: "#00000033",
              border: "1px solid #FFFFFF5E",
              borderRadius: `calc(8px * var(--scale, 1))`,
              padding: `calc(8px * var(--scale, 1))`,
              fontSize: `calc(12px * var(--scale, 1))`,
            }}
          />
          <span
            style={{
              color: "#FFFFFF99",
              fontSize: `calc(12px * var(--scale, 1))`,
              wordBreak: "break-all",
            }}
          >
            当前文件：{pcdFileName}
          </span>
        </div>
      </div>
    </div>
  );
}
