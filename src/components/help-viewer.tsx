"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./mermaid-diagram";

export function HelpViewer({ markdown }: { markdown: string }) {
  const [query, setQuery] = useState("");
  const hasMatch = useMemo(
    () => query.trim().length < 2 || markdown.toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th")),
    [markdown, query],
  );

  return (
    <div className="help-layout">
      <aside className="help-sidebar" aria-label="เครื่องมือคู่มือ">
        <label htmlFor="help-search">ค้นหาในคู่มือ</label>
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="เช่น PO, POD, สต็อก"
        />
        {!hasMatch && <p className="help-no-match" role="status">ไม่พบคำนี้ในคู่มือ</p>}
        <p>ใช้ Ctrl+F เพื่อเลื่อนไปยังคำที่ต้องการ หรือเลือกหัวข้อจากสารบัญ</p>
        <Link className="help-back-link" href="/">← กลับหน้าหลัก</Link>
      </aside>
      <article className="help-article">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const language = /language-(\w+)/.exec(className ?? "")?.[1];
              const value = String(children).replace(/\n$/, "");
              if (language === "mermaid") return <MermaidDiagram chart={value} />;
              return <code className={className} {...props}>{children}</code>;
            },
            a({ href, children, ...props }) {
              const external = href?.startsWith("http");
              return <a href={href} {...props} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
