import { UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DonorSpace from "./donor-space";
import { donorExists, fetchDonorData } from "./lib/feishu";
import { getDonorId } from "./lib/session";
import SpaceHeader from "./space-header";

// 每次请求重新读取飞书表，工作人员改动后刷新即可看到最新数据。
export const dynamic = "force-dynamic";

export default async function Page() {
  const donorId = await getDonorId();
  if (!donorId) redirect("/login");

  let data;
  try {
    data = await fetchDonorData(donorId);
  } catch {
    return (
      <div className="shell">
        <SpaceHeader showSwitch />
        <main>
          <section className="panel">
            <h1>数据加载失败</h1>
            <p>暂时无法读取飞书测试表，请稍后刷新重试。</p>
            <Link className="action" href="/">
              重新加载
            </Link>
            <Link className="action" href="/login">
              切换身份
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (!data.records.length && !data.materials.length) {
    if (!(await donorExists(donorId))) redirect("/login?error=expired");
    return (
      <div className="shell">
        <SpaceHeader showSwitch />
        <main className="identity">
          <section className="panel identity-panel">
            <UserRound size={28} aria-hidden />
            <h1>暂未关联捐赠记录</h1>
            <p>当前账号（{donorId}）还没有关联到捐赠记录。下一份好事，等你一起。</p>
            <Link className="identity-primary" href="/login">
              切换身份
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return <DonorSpace data={data} />;
}
