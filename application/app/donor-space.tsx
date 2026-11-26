"use client";

import { ArrowLeft, ArrowRight, Award, HeartHandshake, House, ReceiptText, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { DonationRecord, DonorData } from "./lib/types";
import SpaceHeader from "./space-header";

const impactSlides = [
  {
    label: "善意",
    src: "/impact/01-shan-yi.jpg",
    alt: "善意：每一份爱心，都是改变的开始",
  },
  {
    label: "透明",
    src: "/impact/02-tou-ming.jpg",
    alt: "透明：公开每一笔善款去向，让爱心有据可查",
  },
  {
    label: "同行",
    src: "/impact/03-tong-xing.jpg",
    alt: "同行：携手走过成长之路，共同见证点滴改变",
  },
  {
    label: "改变",
    src: "/impact/04-gai-bian.jpg",
    alt: "改变：汇聚点滴善款，成就真实而持续的改变",
  },
  {
    label: "希望",
    src: "/impact/05-xi-wang.jpg",
    alt: "希望：播撒爱的种子，让未来拥有更多可能",
  },
] as const;

const tabs = [
  { id: "home", label: "首页", icon: House },
  { id: "history", label: "捐赠与发票", icon: ReceiptText },
  { id: "profile", label: "我的", icon: UserRound },
] as const;
type Tab = typeof tabs[number]["id"];
type Detail = { kind: "record"; record: DonationRecord } | { kind: "certificates" } | { kind: "journey" } | null;

const INVOICE_OPTIONS = ["已开票", "未开票"];

// 捐赠人端只区分「已开票 / 未开票」，其余办理细节留在内部。
function invoiceState(record: DonationRecord) {
  return record.invoiceStatus === "已开票" ? "已开票" : "未开票";
}

function progressTag(record: DonationRecord) {
  const label = invoiceState(record);
  return { label, tone: label === "已开票" ? "ready" : "wait" };
}

function progressSentence(record: DonationRecord) {
  return invoiceState(record) === "已开票" ? "发票已开出。" : "发票尚未开出。";
}

export default function DonorSpace({ data }: { data: DonorData }) {
  const { donorId, donorName, records, materials } = data;
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [slideIndex, setSlideIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const years = [...new Set(records.map((record) => record.date.slice(0, 4)).filter(Boolean))].sort().reverse();
  const visible = records.filter(
    (record) => (!year || record.date.startsWith(year)) && (!status || invoiceState(record) === status),
  );
  const totalAmount = records.reduce((sum, record) => sum + (Number.isFinite(record.amount) && record.amount > 0 ? record.amount : 0), 0);
  const certificateCount = materials.filter((material) => (material.type ?? "").includes("证书") && material.fileAvailable).length;

  // 捐赠经历：按项目归并，展示参加过的活动名称与参与年份。
  const journeyList = (() => {
    const map = new Map<string, { name: string; count: number; years: Set<string>; lastDate: string }>();
    for (const record of records) {
      const name = record.project || "未命名项目";
      const item = map.get(name) ?? { name, count: 0, years: new Set<string>(), lastDate: "" };
      item.count += 1;
      const recordYear = record.date.slice(0, 4);
      if (recordYear) item.years.add(recordYear);
      if (record.date > item.lastDate) item.lastDate = record.date;
      map.set(name, item);
    }
    return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  })();

  useEffect(() => {
    if (tab !== "home" || detail) return;
    const el = trackRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const cards = Array.from(el.children) as HTMLElement[];
      if (cards.length < 2) return;
      const step = el.clientWidth;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [tab, detail]);

  function syncSlide() {
    const el = trackRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - el.offsetLeft + card.offsetWidth / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setSlideIndex(best);
  }

  function goToSlide(index: number) {
    const el = trackRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }

  function navigate(next: Tab) {
    setTab(next);
    setDetail(null);
  }

  function money(value: number) {
    return Number.isFinite(value) && value > 0 ? `¥${value.toLocaleString("zh-CN")}` : "金额未标注";
  }

  function list(items: DonationRecord[], options?: { byYear?: boolean }) {
    let lastYear = "";
    return (
      <ul className="records">
        {items.map((record) => {
          const recordYear = record.date.slice(0, 4);
          const showYear = Boolean(options?.byYear && recordYear && recordYear !== lastYear);
          if (showYear) lastYear = recordYear;
          const tag = progressTag(record);
          return (
            <Fragment key={record.id}>
              {showYear && <li className="year-divider">{recordYear} 年</li>}
              <li>
                <button onClick={() => setDetail({ kind: "record", record })}>
                  <span className="record-main">
                    <small className="record-date">{record.date}</small>
                    <strong>{record.project || record.id}</strong>
                    <small className="record-meta">
                      {[record.id, record.fileName].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  <span className="record-side">
                    <b className="record-amount">{money(record.amount)}</b>
                    <span className={`tag ${tag.tone}`}>{tag.label}</span>
                  </span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ul>
    );
  }

  function fileHref(kind: "record" | "material", id: string) {
    return `/api/file?donor=${encodeURIComponent(donorId)}&kind=${kind}&id=${encodeURIComponent(id)}`;
  }

  function certificates() {
    if (!materials.length) return <section className="panel"><p>暂无证书与材料。</p></section>;
    return (
      <section className="panel">
        <ul className="materials">
          {materials.map((material) => (
            <li key={material.id}>
              <strong>{material.name || material.type || material.id}</strong>
              <small>
                {[material.type, material.status, material.fileName].filter(Boolean).join(" · ")}
              </small>
              {material.fileAvailable ? (
                <a className="action" href={fileHref("material", material.id)} target="_blank" rel="noreferrer">
                  打开{material.type || "材料"}
                </a>
              ) : (
                <small>暂未提供。</small>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function journey() {
    if (!journeyList.length) return <section className="panel"><p>暂无捐赠经历。</p></section>;
    return (
      <section className="panel">
        <ul className="materials">
          {journeyList.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              <small>
                {[...item.years].sort().reverse().join(" / ")} 年 · 参与 {item.count} 次
              </small>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="shell">
      <SpaceHeader showSwitch />
      <main>
        {detail && (
          <button className="back" onClick={() => setDetail(null)}>
            <ArrowLeft size={18} />
            返回
          </button>
        )}
        {detail?.kind === "record" ? (
          <>
            <h1>捐赠详情</h1>
            <section className="panel">
              <h2>{detail.record.project || "未命名项目"}</h2>
              <p className="progress-note">{progressSentence(detail.record)}</p>
              <dl>
                <dt>捐赠日期</dt>
                <dd>{detail.record.date}</dd>
                <dt>记录编号</dt>
                <dd>{detail.record.id}</dd>
                <dt>捐赠金额</dt>
                <dd>{money(detail.record.amount)}</dd>
                <dt>开票状态</dt>
                <dd>{invoiceState(detail.record)}</dd>
              </dl>
              <h3>捐赠票据</h3>
              {detail.record.fileAvailable ? (
                <>
                  {detail.record.fileName && <p>{detail.record.fileName}</p>}
                  <a className="action" href={fileHref("record", detail.record.id)} target="_blank" rel="noreferrer">
                    打开票据
                  </a>
                </>
              ) : (
                <p>票据暂未提供。</p>
              )}
            </section>
          </>
        ) : detail?.kind === "certificates" ? (
          <>
            <h1>我的证书与材料</h1>
            {certificates()}
          </>
        ) : detail?.kind === "journey" ? (
          <>
            <h1>捐赠经历</h1>
            {journey()}
          </>
        ) : tab === "home" ? (
          <>
            <section className="carousel-section">
              <div className="carousel-head">
                <div>
                  <p className="kicker">YOUR IMPACT</p>
                  <h2>你的善意，去了这些地方</h2>
                </div>
                <small>左右滑动</small>
              </div>
              <div className="carousel" ref={trackRef} onScroll={syncSlide} aria-label="捐赠人故事">
                {impactSlides.map((slide, index) => (
                  <article className="slide" key={slide.label}>
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      width={1280}
                      height={569}
                      sizes="(max-width: 660px) 92vw, 640px"
                      priority={index === 0}
                    />
                  </article>
                ))}
              </div>
              <div className="carousel-dots">
                {impactSlides.map((slide, index) => (
                  <button
                    key={slide.label}
                    type="button"
                    aria-label={`查看${slide.label}`}
                    aria-current={slideIndex === index}
                    onClick={() => goToSlide(index)}
                  />
                ))}
              </div>
            </section>

            <div className="shortcuts">
              <button onClick={() => navigate("history")}>
                <ReceiptText aria-hidden />
                <span className="label">查票据</span>
                <small>找到某次捐赠的票据</small>
                <ArrowRight size={17} aria-hidden />
              </button>
              <button onClick={() => setDetail({ kind: "certificates" })}>
                <Award aria-hidden />
                <span className="label">找证书</span>
                <small>查看证书与项目材料</small>
                <ArrowRight size={17} aria-hidden />
              </button>
            </div>
          </>
        ) : tab === "history" ? (
          <>
            <h1>捐赠与发票</h1>
            <div className="filters">
              <label>
                年份
                <select value={year} onChange={(event) => setYear(event.target.value)}>
                  <option value="">全部年份</option>
                  {years.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                开票状态
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">全部状态</option>
                  {INVOICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {visible.length ? (
              list(visible, { byYear: true })
            ) : (
              <section className="panel">
                <p>没有符合筛选条件的记录。</p>
                <button className="action" onClick={() => { setYear(""); setStatus(""); }}>
                  清除筛选
                </button>
              </section>
            )}
          </>
        ) : (
          <>
            <section className="profile-hero">
              <p className="kicker">MY GIVING</p>
              <h1>您好，{donorName || donorId}</h1>
            </section>
            <section className="hero profile-banner">
              <p className="kicker">A BETTER COMMUNITY</p>
              <h1>
                一起，把<span className="mark">好事</span>做出来。
              </h1>
              <p>
                谢谢你，让善意抵达需要的地方。
                <br />
                a better community，从每一次同行开始。
              </p>
              <div className="hero-note" aria-hidden>
                <span>MAKE</span>
                <span>GOOD</span>
                <span>HAPPEN</span>
              </div>
            </section>
            <div className="stats">
              <div>
                <b>{records.length}</b>
                <span>累计捐赠次数</span>
              </div>
              <div>
                <b>{certificateCount}</b>
                <span>获得证书</span>
              </div>
              <div>
                <b>{money(totalAmount)}</b>
                <span>累计金额</span>
              </div>
            </div>
            <div className="entry-grid">
              <button onClick={() => setDetail({ kind: "certificates" })}>
                <span className="entry-icon" aria-hidden>
                  <Award size={20} />
                </span>
                <strong>我的证书与材料</strong>
                <small>查看与下载</small>
              </button>
              <button onClick={() => setDetail({ kind: "journey" })}>
                <span className="entry-icon alt" aria-hidden>
                  <HeartHandshake size={20} />
                </span>
                <strong>捐赠经历</strong>
                <small>{journeyList.length} 个公益项目</small>
              </button>
            </div>
            <small>模拟身份：{donorId}</small>
            <Link className="identity-secondary" href="/login">
              切换演示身份
            </Link>
          </>
        )}
        <details className="help">
          <summary>需要帮助？</summary>
          <p>若记录或材料有疑问，可联系项目运营。正式联系渠道待确认。</p>
        </details>
      </main>
      <nav aria-label="主导航">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => navigate(id)} aria-current={tab === id ? "page" : undefined}>
            <Icon size={22} aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
