"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

    void import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        fontFamily: "Arial, Tahoma, sans-serif",
      });
      try {
        const result = await mermaid.render(id, chart);
        if (active) setSvg(result.svg);
      } catch {
        if (active) setError("ไม่สามารถแสดงแผนภาพนี้ได้ กรุณาอ่านขั้นตอนในข้อความประกอบ");
      }
    });

    return () => {
      active = false;
    };
  }, [chart, reactId]);

  if (error) return <div className="help-diagram-error" role="alert">{error}</div>;
  if (!svg) return <div className="help-diagram-loading">กำลังวาดแผนภาพ…</div>;

  return <div className="help-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
