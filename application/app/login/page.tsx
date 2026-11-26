import { AlertCircle, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signIn, signInAccount } from "../actions";
import { fetchDemoDonors } from "../lib/feishu";
import { getDonorId } from "../lib/session";
import SpaceHeader from "../space-header";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [current, params] = await Promise.all([getDonorId(), searchParams]);

  let donors: string[];
  try {
    donors = await fetchDemoDonors();
  } catch {
    return (
      <div className="shell">
        <SpaceHeader />
        <main className="identity">
          <section className="panel identity-panel">
            <h1>暂时无法读取演示身份</h1>
            <p>飞书测试表读取失败，请稍后重试。</p>
            <Link className="identity-primary" href="/login">
              重新加载
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <SpaceHeader />
      <main className="identity">
        <section className="hero">
          <Image className="login-logo" src="/brand/abc-logo.png" alt="ABC 好社会咨询社" width={459} height={175} priority />
          <p className="kicker">ABC 公益创投分社 · 捐赠人空间</p>
          <h1>
            先选一个身份，
            <br />
            再<span className="mark">一起</span>出发。
          </h1>
          <p>用账号和密码进入属于你的捐赠人空间，随时可以切换。</p>
        </section>

        {current && !current.startsWith("DEMO-") && params.error !== "expired" && (
          <p className="login-note">
            当前身份：{current}。<Link href="/">返回当前空间</Link>
          </p>
        )}
        {params.error === "expired" && (
          <div className="login-alert" role="status">
            <AlertCircle size={20} aria-hidden />
            <div>
              <strong>登录状态已失效</strong>
              <p>为了保护你的信息，请重新输入账号密码，或选择下方演示账号进入。</p>
            </div>
          </div>
        )}
        {params.error === "invalid" && <p className="login-note">身份无效，请重新选择。</p>}

        <section className="panel identity-panel">
          <h2>账号登录</h2>
          <form className="login-form" action={signInAccount}>
            <label>
              账号
              <input name="account" inputMode="numeric" autoComplete="username" placeholder="例如 001" required />
            </label>
            <label>
              密码
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                required
              />
            </label>
            {params.error === "account" && <p className="login-error">账号或密码不正确，请重试。</p>}
            <button className="identity-primary" type="submit">
              进入我的空间
            </button>
          </form>
          <p className="login-hint">演示账号：001～085，密码：123456</p>

          <div className="login-divider">或快速进入演示账号</div>
          <div className="login-list">
            {donors.map((donorId) => (
              <form key={donorId} action={signIn}>
                <input type="hidden" name="donor" value={donorId} />
                <button className="login-option" type="submit">
                  <span className="login-avatar" aria-hidden>
                    {donorId.slice(-1)}
                  </span>
                  <span>
                    <strong>{donorId}</strong>
                  </span>
                  {donorId === current ? <span className="tag ready">当前</span> : null}
                  <span className="login-arrow">
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </button>
              </form>
            ))}
          </div>
          <p className="login-hint">以上均为虚构资料，仅用于界面演示；正式身份核验方案待确认。</p>
        </section>
      </main>
    </div>
  );
}
