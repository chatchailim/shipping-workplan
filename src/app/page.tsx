import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-card">
        <p className="home-eyebrow">OPT SHIPPING WORK PLAN v2</p>
        <h1>ศูนย์กลางการวางแผนและติดตามงานจัดส่ง</h1>
        <p>
          โครงระบบ P0 พร้อมสำหรับการพัฒนาโมดูลธุรกิจ หากคุณเพิ่งเริ่มใช้งาน
          โปรดอ่านภาพรวมกระบวนการ บทบาท และขั้นตอนตามหน้าที่ในคู่มือ
        </p>
        <div className="home-actions">
          <Link className="primary-link" href="/login">เข้าสู่ระบบ</Link>
          <Link className="secondary-link" href="/help">เปิดคู่มือการใช้งาน</Link>
          <Link className="secondary-link" href="/help#4-ภาพรวมกระบวนการทั้งหมด">ดูกระบวนการทั้งหมด</Link>
        </div>
        <dl className="status-grid">
          <div><dt>Foundation</dt><dd>พร้อม</dd></div>
          <div><dt>Database</dt><dd>31 Models</dd></div>
          <div><dt>CI</dt><dd>ผ่าน</dd></div>
          <div><dt>Business Modules</dt><dd>กำลังพัฒนา</dd></div>
        </dl>
      </section>
    </main>
  );
}
