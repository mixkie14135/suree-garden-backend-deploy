import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";

/* ================= Helpers ================= */
const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  const day = dt.getUTCDate();
  const mon = TH_MONTHS[dt.getUTCMonth()];
  const year = dt.getUTCFullYear() + 543;
  return `${day} ${mon} ${year}`;
}
function fmtTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  const h = String(dt.getUTCHours()).padStart(2, "0");
  const m = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

const STATUS_OPTIONS_ROOM = [
  { value: "", label: "ทั้งหมด" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];
const STATUS_OPTIONS_BANQ = [
  { value: "", label: "ทั้งหมด" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

function StatusPill({ value }) {
  const map = {
    pending:  { cls: "pill",     style: { background:"#fff5c2", color:"#7a5d00" }, label:"รอดำเนินการ" },
    confirmed:{ cls: "pill ok",  style: {},                                     label:"ยืนยันแล้ว" },
    checked_in:{cls: "pill ok",  style: {},                                     label:"เช็กอิน" },
    checked_out:{cls:"pill",     style: { background:"#e8eefc", color:"#1d4ed8" }, label:"เช็กเอาต์" },
    cancelled:{ cls: "pill bad", style: {},                                     label:"ยกเลิก" },
    expired:  { cls: "pill",     style: { background:"#eee", color:"#666" },    label:"หมดเวลา" },
  };
  const it = map[value] || { cls:"pill", style:{}, label:value || "-" };
  return <span className={it.cls} style={it.style}>{it.label}</span>;
}

/* ================= Main Page ================= */
export default function AdminBookings() {
  const [tab, setTab] = useState("room");
  const [status, setStatus] = useState("");
  const [quick, setQuick] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [slip, setSlip] = useState({ url: "", loading: false, error: "" });

  // quick range helpers
  useEffect(() => {
    if (quick === "today") {
      const t = new Date();
      const y = t.getFullYear();
      const m = t.getMonth();
      const d = t.getDate();
      const pad = (n) => String(n).padStart(2, "0");
      setDateFrom(`${y}-${pad(m+1)}-${pad(d)}`);
      setDateTo(`${y}-${pad(m+1)}-${pad(d)}`);
    } else if (quick === "month") {
      const t = new Date();
      const y = t.getFullYear();
      const m = t.getMonth();
      const pad = (n) => String(n).padStart(2, "0");
      setDateFrom(`${y}-${pad(m+1)}-01`);
      const endDate = new Date(y, m+1, 0).getDate();
      setDateTo(`${y}-${pad(m+1)}-${pad(endDate)}`);
    } else {
      setDateFrom("");
      setDateTo("");
    }
    setPage(1);
  }, [quick]);

  // fetch list
  useEffect(() => {
    let abort = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const params = { page, limit };
        if (status) params.status = status;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        const path = tab === "room" ? "/reservations/room" : "/reservations/banquet";
        const res = await apiGet(path, params, { signal: abort.signal });
        setRows(Array.isArray(res?.items) ? res.items : []);
        setTotal(res?.total ?? 0);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => abort.abort();
  }, [tab, status, dateFrom, dateTo, page, limit]);

  // client-side search
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const code = String(r.reservation_code || "").toLowerCase();
      const name = `${r.customer?.first_name || ""} ${r.customer?.last_name || ""}`.toLowerCase();
      const room = tab === "room"
        ? String(r.room?.room_number ?? "").toLowerCase()
        : String(r.banquet_room?.name ?? "").toLowerCase();
      return code.includes(s) || name.includes(s) || room.includes(s);
    });
  }, [q, rows, tab]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const onOpenDetail = async (id) => {
    try {
      const path = tab === "room" ? `/reservations/room/${id}` : `/reservations/banquet/${id}`;
      const res = await apiGet(path);
      setDetail({ type: tab, ...res });
      setSlip({ url: "", loading: false, error: "" });
    } catch (e) {
      console.error(e);
    }
  };

  function clearFilters() {
    setQuick("all"); setStatus(""); setDateFrom(""); setDateTo(""); setQ(""); setPage(1);
  }

  async function viewSlip() {
    if (!detail?.reservation_id || !detail?.type) return;
    const kind = detail.type === "room" ? "room" : "banquet";
    const urlPath = `/payments/${kind}/${detail.reservation_id}/slip-url`;
    try {
      setSlip({ url: "", loading: true, error: "" });
      const r = await apiGet(urlPath);
      if (r?.url) setSlip({ url: r.url, loading: false, error: "" });
      else setSlip({ url: "", loading: false, error: "ไม่พบสลิป" });
    } catch (e) {
      const msg = String(e?.message || e);
      setSlip({ url: "", loading: false, error: msg.includes("No slip") ? "ไม่มีสลิปในคำจองนี้" : msg });
    }
  }

  return (
    <div className="adminPage">
      <div className="adminPageHeader"><h2>จัดการการจอง</h2></div>
      {/* Tabs */}
      <div className="tabsWrapper" style={{ marginBottom: 12 }}>
        <div className="tabs">
          <button className={`tab ${tab==="room"?"active":""}`} onClick={()=>{setTab("room");setPage(1);}}>ห้องพัก</button>
          <button className={`tab ${tab==="banquet"?"active":""}`} onClick={()=>{setTab("banquet");setPage(1);}}>ห้องจัดเลี้ยง</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolLeft">
          <div className="info">{tab==="room"?"คำจองห้องทั้งหมด":"คำจองจัดเลี้ยงทั้งหมด"} ({total} รายการ)</div>
          <div className="search">
            <input placeholder="ค้นหา : รหัสการจอง / ชื่อลูกค้า / ห้อง" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
        <div className="controls">
          <div className="seg">
            <button className={`segBtn ${quick==="today"?"is-active":""}`} onClick={()=>{setQuick("today");setPage(1)}}>วันนี้</button>
            <button className={`segBtn ${quick==="month"?"is-active":""}`} onClick={()=>{setQuick("month");setPage(1)}}>เดือนนี้</button>
            <button className="segBtn" onClick={clearFilters} style={{marginLeft:6}}>ล้างตัวกรอง</button>
          </div>
          <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
            {(tab==="room"?STATUS_OPTIONS_ROOM:STATUS_OPTIONS_BANQ).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setQuick("all");setPage(1)}} disabled={quick!=="all"} className={quick!=="all"?"inputDisabled":""} />
          <span style={{alignSelf:"center"}}>–</span>
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setQuick("all");setPage(1)}} disabled={quick!=="all"} className={quick!=="all"?"inputDisabled":""} />
        </div>
      </div>

      {/* table */}
      <div className="card table adminRooms">
        <div className="tHead">
          <div>รหัสการจอง</div>
          <div>ชื่อลูกค้า</div>
          <div className="center">{tab==="room"?"ห้อง":"ห้องจัดเลี้ยง"}</div>
          <div className="center">{tab==="room"?"เช็กอิน":"วันที่เริ่ม"}</div>
          <div className="center">{tab==="room"?"เช็กเอาต์":"เวลาสิ้นสุด"}</div>
          <div className="right">สถานะ</div>
        </div>
        {loading ? <div className="tRow"><div>กำลังโหลด...</div></div> :
        filtered.length===0 ? <div className="tRow"><div>ไม่พบข้อมูล</div></div> :
        filtered.map(r=>(
          <div key={`${tab}-${r.reservation_id}`} className="tRow">
            <div className="cell--room">
              <button className="roomEdit" onClick={()=>onOpenDetail(r.reservation_id)} title="ดูรายละเอียด"><EyeIcon/></button>
              <div className="roomMeta"><div className="roomNo">{r.reservation_code}</div></div>
            </div>
            <div>{`${r.customer?.first_name || ""} ${r.customer?.last_name || ""}`.trim()||"-"}</div>
            <div className="center">{tab==="room"?r.room?.room_number??"-":r.banquet_room?.name??"-"}</div>
            <div className="center">{tab==="room"?fmtDate(r.checkin_date):`${fmtDate(r.event_date)} ${fmtTime(r.start_time)}`}</div>
            <div className="center">{tab==="room"?fmtDate(r.checkout_date):fmtTime(r.end_time)}</div>
            <div className="right"><StatusPill value={r.status}/></div>
          </div>
        ))}
      </div>

      {/* pagination */}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
        <div>หน้าที่ {page} / {totalPages}</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btnText" onClick={()=>setPage(1)} disabled={page<=1}>หน้าแรก</button>
          <button className="btnText" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>ก่อนหน้า</button>
          <button className="btnText" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>ถัดไป</button>
          <button className="btnText" onClick={()=>setPage(totalPages)} disabled={page>=totalPages}>หน้าสุดท้าย</button>
        </div>
      </div>

      {/* detail modal */}
      {detail && (
        <div className="modalOverlay" onClick={()=>{setDetail(null);setSlip({url:"",loading:false,error:""})}}>
          <div className="modalCard" onClick={e=>e.stopPropagation()}>
            <h3 className="modalTitle">รายละเอียดการจอง</h3>
            <div className="modalGrid">
              <div className="modalForm">
                <div className="fRow two">
                  <div><label>รหัสการจอง</label><div style={{fontWeight:800}}>{detail.reservation_code}</div></div>
                  <div><label>สถานะ</label><StatusPill value={detail.status}/></div>
                </div>
                <div className="fRow two">
                  <div><label>ชื่อลูกค้า</label><div>{`${detail.customer?.first_name||""} ${detail.customer?.last_name||""}`.trim()||"-"}</div></div>
                  <div><label>{detail.type==="room"?"ห้องพัก":"ห้องจัดเลี้ยง"}</label><div>{detail.type==="room"?detail.room?.room_id && ` ${detail.room?.room_number}`:detail.banquet?.banquet_id && detail.banquet?.name}</div></div>
                </div>
                {detail.type==="room"?(
                  <div className="fRow two">
                    <div><label>เช็กอิน</label><div>{fmtDate(detail.checkin_date)}</div></div>
                    <div><label>เช็กเอาต์</label><div>{fmtDate(detail.checkout_date)}</div></div>
                  </div>
                ):(
                  <div className="fRow two">
                    <div><label>วันที่จัดงาน</label><div>{fmtDate(detail.event_date)}</div></div>
                    <div><label>เวลา</label><div>{fmtTime(detail.start_time)} – {fmtTime(detail.end_time)}</div></div>
                  </div>
                )}
                <div className="fRow two">
                  <div><label>กำหนดชำระ</label><div>{fmtDate(detail.payment_due_at||detail.expires_at)} {fmtTime(detail.payment_due_at||detail.expires_at)}</div></div>
                  <div><label>สถานะชำระล่าสุด</label><div>{detail.last_payment_status||"unpaid"}</div></div>
                </div>
                <div className="fRow">
                  <label>สลิปชำระเงิน</label>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <button className="btnPrimary" onClick={viewSlip} disabled={slip.loading}>{slip.loading?"กำลังดึงสลิป...":"ดูสลิป"}</button>
                    {slip.url && (
                      <>
                        <a className="btnText" href={slip.url} target="_blank" rel="noreferrer">เปิดในแท็บใหม่</a>
                        <div style={{width:"100%",marginTop:8}}>
                          <img src={slip.url} alt="payment slip" style={{maxWidth:"100%",borderRadius:8,border:"1px solid var(--line)"}} />
                        </div>
                      </>
                    )}
                    {slip.error && <div style={{color:"#b00020"}}>{slip.error}</div>}
                  </div>
                </div>
              </div>
              <div className="modalGallery">
                <div className="gTitle">สรุป</div>
                <div className="thumb" style={{padding:12,minHeight:120}}>
                  <div><b>รหัส:</b> {detail.reservation_code}</div>
                  <div><b>ลูกค้า:</b> {`${detail.customer?.first_name || ""} ${detail.customer?.last_name || ""}`.trim()||"-"}</div>
                  {detail.type==="room"?<div><b>ห้อง:</b> {detail.room?.room_number??"-"}</div>:<div><b>ห้องจัดเลี้ยง:</b> {detail.banquet?.name??"-"}</div>}
                </div>
              </div>
            </div>
            <div className="modalActions">
              <button className="btnText" onClick={()=>{setDetail(null);setSlip({url:"",loading:false,error:""})}}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EyeIcon(){
  return <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg>;
}
