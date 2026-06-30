"use client";

import { FormEvent, useEffect, useState } from "react";
import { callApi } from "@/lib/api";

type AccessResult = {
  success: boolean;
  allowed?: boolean;
  email?: string;
  adminName?: string;
  error?: string;
};

type ResetResult = {
  success: boolean;
  message?: string;
  error?: string;
  results?: { sheet: string; deletedRows: number; skipped?: boolean }[];
};

function normalizeRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Ä‘/g, "d")
    .replace(/\s+/g, "_");
}

export default function DatLaiHeThongPage() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [result, setResult] = useState<ResetResult | null>(null);
  useEffect(() => {
    const roleKey = normalizeRole(
      sessionStorage.getItem("capQuyenKey") ||
        sessionStorage.getItem("capQuyen") ||
        "",
    );
    const localAllowed =
      roleKey === "superadmin" &&
      sessionStorage.getItem("taiKhoanKhoiTao") === "true";

    if (!localAllowed) {
      setAllowed(false);
      setChecking(false);
      return;
    }

    callApi<AccessResult>("admin", {
      action: "getDatLaiHeThongAccess",
      sessionId: sessionStorage.getItem("sessionId") || "",
    })
      .then((response) => {
        setAllowed(!!response.allowed);
      })
      .catch(() => {
        setAllowed(false);
      })
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || submitting) return;
    if (confirmText.trim() !== "DAT LAI HE THONG") {
      setNotice({
        ok: false,
        text: 'Vui lòng nhập đúng "DAT LAI HE THONG" để xác nhận.',
      });
      return;
    }
    if (!password) {
      setNotice({ ok: false, text: "Vui lòng nhập lại mật khẩu admin." });
      return;
    }
    if (
      !confirm(
        "Thao tác này sẽ xóa dữ liệu vận hành và chỉ giữ tài khoản khởi tạo. Bạn chắc chắn muốn tiếp tục?",
      )
    )
      return;

    setSubmitting(true);
    setNotice(null);
    setResult(null);
    try {
      const response = await callApi<ResetResult>("admin", {
        action: "adminDatLaiToanBoHeThong",
        sessionId: sessionStorage.getItem("sessionId") || "",
        matKhauXacNhan: password,
      });
      setResult(response);
      setNotice({
        ok: response.success,
        text:
          response.message || response.error || "Không thể đặt lại hệ thống.",
      });
      if (response.success) {
        setPassword("");
        setConfirmText("");
      }
    } catch {
      setNotice({ ok: false, text: "Không thể kết nối máy chủ." });
    } finally {
      setSubmitting(false);
    }
  }

  if (checking || !allowed) return null;

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <section className="mx-auto max-w-4xl px-2">
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-200 bg-red-50 px-5 py-4">
            <h1 className="text-base font-bold text-red-900">
              Đặt lại toàn bộ hệ thống
            </h1>
            <p className="mt-1 text-xs font-semibold text-red-700">
              Chỉ SuperAdmin khởi tạo mới được thực hiện thao tác này.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5 p-5">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
              Thao tác này sẽ xóa tất cả dữ liệu trong của Chương trình. Vui
              lòng cân nhắc kỹ trước khi thực hiện thao tác này. Chỉ SuperAdmin
              khởi tạo mới được thực hiện thao tác này. Sau khi đặt lại hệ
              thống, bạn sẽ cần đăng nhập lại bằng tài khoản khởi tạo. Dữ liệu
              vận hành sẽ bị xóa hoàn toàn và không thể khôi phục.
            </div>

            {notice && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                  notice.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {notice.text}
              </div>
            )}

            <label className="grid gap-2 text-sm font-bold text-gray-800">
              Nhập lại mật khẩu SuperAdmin
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-gray-800">
              Gõ DAT LAI HE THONG để xác nhận
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? "Đang đặt lại hệ thống..."
                : "Đặt lại toàn bộ hệ thống"}
            </button>

            {result?.success && result.results && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h2 className="text-sm font-bold text-gray-900">
                  Kết quả đặt lại
                </h2>
                <div className="mt-3 grid gap-2 text-xs text-gray-700">
                  {result.results.map((item) => (
                    <div
                      key={item.sheet}
                      className="flex items-center justify-between rounded-md bg-white px-3 py-2 ring-1 ring-gray-100"
                    >
                      <span className="font-semibold">{item.sheet}</span>
                      <span>
                        {item.skipped
                          ? "Không tìm thấy sheet"
                          : `${item.deletedRows} dòng`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
