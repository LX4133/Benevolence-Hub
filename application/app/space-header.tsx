import Image from "next/image";
import Link from "next/link";

export default function SpaceHeader({ showSwitch = false }: { showSwitch?: boolean }) {
  return (
    <header>
      <span className="logo">
        <Image src="/brand/abc-logo.png" alt="ABC 好社会咨询社" width={459} height={175} priority />
      </span>
      <span className="brand">
        <b>捐赠人空间</b>
        <small>ABC 公益创投分社</small>
      </span>
      <span className="demo">模拟演示</span>
      {showSwitch && (
        <Link className="switch" href="/login">
          切换身份
        </Link>
      )}
    </header>
  );
}
