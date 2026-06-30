"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { callApi } from "@/lib/api";

type LoaiGCN = {
  rowNumber: number;
  maLoaiGCN: string;
  tenLoaiGCN: string;
  soBuoiToiThieu: number | string;
  moTa: string;
  thuTu: number | string;
  trangThai: string;
};

type DotGCN = {
  rowNumber: number;
  soDot: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  tenDot: string;
  trangThai: string;
};

type ApiResult = {
  success: boolean;
  error?: string;
  message?: string;
  loaiGCN?: LoaiGCN[];
  dotGCN?: DotGCN[];
  item?: LoaiGCN | DotGCN;
};

const PAGE_SIZE = 20;
const statuses = ["Hoạt động", "Ẩn"];
const emptyLoai: Omit<LoaiGCN, "rowNumber"> = {
  maLoaiGCN: "",
  tenLoaiGCN: "",
  soBuoiToiThieu: 0,
  moTa: "",
  thuTu: 1,
  trangThai: "Hoạt động",
};
const emptyDot: Omit<DotGCN, "rowNumber"> = {
  soDot: "",
  ngayBatDau: "",
  ngayKetThuc: "",
  tenDot: "",
  trangThai: "Hoạt động",
};

function getPageNumbers(page: number, totalPages: number) {
  const pages = new Set([1, totalPages]);
  for (let i = 1; i <= Math.min(4, totalPages); i++) pages.add(i);
  for (let i = page - 1; i <= page + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  return Array.from(pages)
    .filter((item) => item > 0)
    .sort((a, b) => a - b);
}

function isHidden(status: string) {
  const value = status
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  return value !== "hoat dong";
}

function statusForForm(status: string) {
  return isHidden(status || "Hoạt động") ? "Ẩn" : "Hoạt động";
}

function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, "_");
}

function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= PAGE_SIZE) return null;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pages = getPageNumbers(page, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs">
      <span className="font-semibold text-gray-500">
        Hiển thị {(page - 1) * PAGE_SIZE + 1}-
        {Math.min(page * PAGE_SIZE, total)} / {total}
      </span>
      <div className="flex items-center gap-1">
        {pages.map((item, index) => (
          <span key={item} className="flex items-center gap-1">
            {index > 0 && item - pages[index - 1] > 1 && (
              <span className="px-1 text-gray-400">...</span>
            )}
            <button
              type="button"
              onClick={() => onPage(item)}
              className={`h-8 min-w-8 rounded border px-2 font-bold ${
                item === page
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CauHinhGCNPage() {
  const [activeTab, setActiveTab] = useState<"loai" | "dot">("loai");
  const [role, setRole] = useState("");
  const [loaiItems, setLoaiItems] = useState<LoaiGCN[]>([]);
  const [dotItems, setDotItems] = useState<DotGCN[]>([]);
  const [loaiForm, setLoaiForm] = useState(emptyLoai);
  const [dotForm, setDotForm] = useState(emptyDot);
  const [editingLoai, setEditingLoai] = useState<number | null>(null);
  const [editingDot, setEditingDot] = useState<number | null>(null);
  const [pageLoai, setPageLoai] = useState(1);
  const [pageDot, setPageDot] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const canView = useMemo(
    () =>
      ["superadmin", "admin", "acc", "admin_khu_vuc"].includes(
        normalizeRole(role),
      ),
    [role],
  );
  const canManage = useMemo(
    () => ["superadmin", "admin"].includes(normalizeRole(role)),
    [role],
  );
  const sessionId = () => sessionStorage.getItem("sessionId") || "";
  const visibleLoai = loaiItems.slice(
    (pageLoai - 1) * PAGE_SIZE,
    pageLoai * PAGE_SIZE,
  );
  const visibleDot = dotItems.slice(
    (pageDot - 1) * PAGE_SIZE,
    pageDot * PAGE_SIZE,
  );

  async function loadConfig() {
    setLoading(true);
    try {
      const response = await callApi<ApiResult>("admin", {
        action: "getCauHinhGCNAdmin",
        sessionId: sessionId(),
      });
      if (response.success) {
        setLoaiItems(response.loaiGCN || []);
        setDotItems(response.dotGCN || []);
        setNotice(null);
      } else {
        setNotice({
          ok: false,
          text: response.error || "Không thể tải cấu hình GCN.",
        });
      }
    } catch {
      setNotice({ ok: false, text: "Không thể kết nối máy chủ." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(sessionStorage.getItem("capQuyenKey") || sessionStorage.getItem("capQuyen") || "");
    loadConfig();
  }, []);

  useEffect(() => {
    setPageLoai(1);
  }, [loaiItems.length]);

  useEffect(() => {
    setPageDot(1);
  }, [dotItems.length]);

  function resetLoai() {
    setLoaiForm(emptyLoai);
    setEditingLoai(null);
  }

  function resetDot() {
    setDotForm(emptyDot);
    setEditingDot(null);
  }

  function editLoai(item: LoaiGCN) {
    setLoaiForm({
      maLoaiGCN: item.maLoaiGCN,
      tenLoaiGCN: item.tenLoaiGCN,
      soBuoiToiThieu: item.soBuoiToiThieu,
      moTa: item.moTa,
      thuTu: item.thuTu,
      trangThai: statusForForm(item.trangThai),
    });
    setEditingLoai(item.rowNumber);
    setActiveTab("loai");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editDot(item: DotGCN) {
    setDotForm({
      soDot: item.soDot,
      ngayBatDau: item.ngayBatDau,
      ngayKetThuc: item.ngayKetThuc,
      tenDot: item.tenDot,
      trangThai: statusForForm(item.trangThai),
    });
    setEditingDot(item.rowNumber);
    setActiveTab("dot");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function upsertLoai(saved: LoaiGCN) {
    setLoaiItems((current) => {
      const exists = current.some((item) => item.rowNumber === saved.rowNumber);
      return exists
        ? current.map((item) => (item.rowNumber === saved.rowNumber ? saved : item))
        : [...current, saved];
    });
  }

  function upsertDot(saved: DotGCN) {
    setDotItems((current) => {
      const exists = current.some((item) => item.rowNumber === saved.rowNumber);
      return exists
        ? current.map((item) => (item.rowNumber === saved.rowNumber ? saved : item))
        : [...current, saved];
    });
  }

  async function submitLoai(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await callApi<ApiResult>("admin", {
        action: "adminLuuCauHinhLoaiGCN",
        sessionId: sessionId(),
        rowNumber: editingLoai || undefined,
        ...loaiForm,
      });
      if (!response.success) {
        setNotice({ ok: false, text: response.error || "Không thể lưu loại GCN." });
        return;
      }
      if (response.item) upsertLoai(response.item as LoaiGCN);
      resetLoai();
      setNotice({ ok: true, text: response.message || "Đã lưu loại GCN." });
    } catch {
      setNotice({ ok: false, text: "Không thể kết nối máy chủ." });
    } finally {
      setSaving(false);
    }
  }

  async function submitDot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await callApi<ApiResult>("admin", {
        action: "adminLuuCauHinhDotGCN",
        sessionId: sessionId(),
        rowNumber: editingDot || undefined,
        ...dotForm,
      });
      if (!response.success) {
        setNotice({ ok: false, text: response.error || "Không thể lưu đợt GCN." });
        return;
      }
      if (response.item) upsertDot(response.item as DotGCN);
      resetDot();
      setNotice({ ok: true, text: response.message || "Đã lưu đợt cấp GCN." });
    } catch {
      setNotice({ ok: false, text: "Không thể kết nối máy chủ." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleLoai(item: LoaiGCN) {
    if (!canManage) return;
    const next = isHidden(item.trangThai) ? "Hoạt động" : "Ẩn";
    const response = await callApi<ApiResult>("admin", {
      action: "adminLuuCauHinhLoaiGCN",
      sessionId: sessionId(),
      ...item,
      trangThai: next,
    });
    setNotice({
      ok: response.success,
      text: response.message || response.error || "Không thể cập nhật trạng thái.",
    });
    if (response.success && response.item) upsertLoai(response.item as LoaiGCN);
  }

  async function toggleDot(item: DotGCN) {
    if (!canManage) return;
    const next = isHidden(item.trangThai) ? "Hoạt động" : "Ẩn";
    const response = await callApi<ApiResult>("admin", {
      action: "adminLuuCauHinhDotGCN",
      sessionId: sessionId(),
      ...item,
      trangThai: next,
    });
    setNotice({
      ok: response.success,
      text: response.message || response.error || "Không thể cập nhật trạng thái.",
    });
    if (response.success && response.item) upsertDot(response.item as DotGCN);
  }

  async function deleteLoai(item: LoaiGCN) {
    if (!canManage) return;
    if (!confirm(`Xóa loại GCN ${item.maLoaiGCN}?`)) return;
    const response = await callApi<ApiResult>("admin", {
      action: "adminXoaCauHinhLoaiGCN",
      sessionId: sessionId(),
      rowNumber: item.rowNumber,
    });
    setNotice({ ok: response.success, text: response.message || response.error || "Không thể xóa." });
    if (response.success) loadConfig();
  }

  async function deleteDot(item: DotGCN) {
    if (!canManage) return;
    if (!confirm(`Xóa đợt GCN ${item.soDot}?`)) return;
    const response = await callApi<ApiResult>("admin", {
      action: "adminXoaCauHinhDotGCN",
      sessionId: sessionId(),
      rowNumber: item.rowNumber,
    });
    setNotice({ ok: response.success, text: response.message || response.error || "Không thể xóa." });
    if (response.success) loadConfig();
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <section className="mx-auto max-w-6xl px-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-slate-50 px-5 py-4">
            <h1 className="text-base font-bold text-gray-900">
              Cấu hình Giấy chứng nhận
            </h1>
            <p className="mt-1 text-xs text-gray-600">
              Quản lý hạn mức, loại giấy chứng nhận và các đợt cấp đang mở.
            </p>
          </div>

          {!canView ? (
            <div className="p-5">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Tài khoản này chưa có quyền cấu hình GCN.
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                {[
                  ["loai", "Hạn mức / Loại GCN"],
                  ["dot", "Đợt cấp GCN"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key as "loai" | "dot")}
                    className={`rounded-lg border px-5 py-3 text-left text-sm font-bold transition ${
                      activeTab === key
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {notice && (
                <div
                  className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
                    notice.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {notice.text}
                </div>
              )}

              {!canManage && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  Tài khoản của bạn chỉ có quyền xem cấu hình GCN.
                </div>
              )}

              {activeTab === "loai" ? (
                <div className="space-y-5">
                  {canManage && (
                  <form
                    onSubmit={submitLoai}
                    className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.75fr)_minmax(150px,.9fr)]"
                  >
                    <label className="grid min-w-[150px] gap-1 text-xs font-bold text-gray-700">
                      Mã loại
                      <input
                        value={loaiForm.maLoaiGCN}
                        onChange={(event) =>
                          setLoaiForm((current) => ({
                            ...current,
                            maLoaiGCN: normalizeCode(event.target.value),
                          }))
                        }
                        required
                        className="w-full whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Tên loại GCN
                      <input
                        value={loaiForm.tenLoaiGCN}
                        onChange={(event) =>
                          setLoaiForm((current) => ({
                            ...current,
                            tenLoaiGCN: event.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Số buổi tối thiểu
                      <input
                        type="number"
                        min="0"
                        value={loaiForm.soBuoiToiThieu}
                        onChange={(event) =>
                          setLoaiForm((current) => ({
                            ...current,
                            soBuoiToiThieu: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Thứ tự
                      <input
                        type="number"
                        value={loaiForm.thuTu}
                        onChange={(event) =>
                          setLoaiForm((current) => ({
                            ...current,
                            thuTu: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Trạng thái
                      <select
                        value={loaiForm.trangThai}
                        onChange={(event) =>
                          setLoaiForm((current) => ({
                            ...current,
                            trangThai: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex min-w-0 items-end gap-2 md:col-span-2 xl:col-span-1 xl:col-start-5">
                      <button
                        disabled={saving}
                        className="h-10 min-w-[120px] flex-1 rounded-lg bg-gray-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
                      >
                        {saving ? "Đang lưu..." : editingLoai ? "Cập nhật" : "Thêm"}
                      </button>
                      {editingLoai && (
                        <button
                          type="button"
                          onClick={resetLoai}
                          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700 md:col-span-2 xl:col-span-4 xl:row-start-2">
                      Mô tả
                      <textarea
                        value={loaiForm.moTa}
                        onChange={(event) =>
                          setLoaiForm((current) => ({
                            ...current,
                            moTa: event.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </form>
                  )}

                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left">Mã</th>
                            <th className="px-4 py-3 text-left">Tên loại</th>
                            <th className="px-4 py-3 text-left">Buổi tối thiểu</th>
                            <th className="px-4 py-3 text-left">Thứ tự</th>
                            <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-left">Trạng thái</th>
                            {canManage && (
                              <th className="px-4 py-3 text-right">Thao tác</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {loading ? (
                            <tr>
                              <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                                Đang tải cấu hình...
                              </td>
                            </tr>
                          ) : visibleLoai.length === 0 ? (
                            <tr>
                              <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                                Chưa có loại GCN.
                              </td>
                            </tr>
                          ) : (
                            visibleLoai.map((item) => (
                              <tr key={item.rowNumber}>
                                <td className="px-4 py-3 font-bold text-gray-900">
                                  {item.maLoaiGCN}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-gray-800">
                                    {item.tenLoaiGCN}
                                  </div>
                                  {item.moTa && (
                                    <div className="mt-1 max-w-xl text-xs text-gray-500">
                                      {item.moTa}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">{item.soBuoiToiThieu}</td>
                                <td className="px-4 py-3">{item.thuTu}</td>
                                <td className="min-w-[120px] whitespace-nowrap px-4 py-3">
                                  <span
                                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                                      isHidden(item.trangThai)
                                        ? "bg-gray-100 text-gray-500"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {statusForForm(item.trangThai)}
                                  </span>
                                </td>
                                {canManage && (
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => editLoai(item)}
                                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleLoai(item)}
                                      className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50"
                                    >
                                      {isHidden(item.trangThai) ? "Hiện" : "Ẩn"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteLoai(item)}
                                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={pageLoai}
                      total={loaiItems.length}
                      onPage={setPageLoai}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {canManage && (
                  <form
                    onSubmit={submitDot}
                    className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5 md:grid-cols-2 xl:grid-cols-5"
                  >
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Số đợt
                      <input
                        value={dotForm.soDot}
                        onChange={(event) =>
                          setDotForm((current) => ({
                            ...current,
                            soDot: event.target.value.trim(),
                          }))
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Tên đợt
                      <input
                        value={dotForm.tenDot}
                        onChange={(event) =>
                          setDotForm((current) => ({
                            ...current,
                            tenDot: event.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Ngày bắt đầu
                      <input
                        type="date"
                        value={dotForm.ngayBatDau}
                        onChange={(event) =>
                          setDotForm((current) => ({
                            ...current,
                            ngayBatDau: event.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Ngày kết thúc
                      <input
                        type="date"
                        value={dotForm.ngayKetThuc}
                        onChange={(event) =>
                          setDotForm((current) => ({
                            ...current,
                            ngayKetThuc: event.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-bold text-gray-700">
                      Trạng thái
                      <select
                        value={dotForm.trangThai}
                        onChange={(event) =>
                          setDotForm((current) => ({
                            ...current,
                            trangThai: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex min-w-0 items-end gap-2 md:col-span-2 xl:col-span-1 xl:col-start-5 xl:row-start-2">
                      <button
                        disabled={saving}
                        className="h-10 min-w-[120px] flex-1 rounded-lg bg-gray-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
                      >
                        {saving ? "Đang lưu..." : editingDot ? "Cập nhật" : "Thêm"}
                      </button>
                      {editingDot && (
                        <button
                          type="button"
                          onClick={resetDot}
                          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </form>
                  )}

                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left">Số đợt</th>
                            <th className="px-4 py-3 text-left">Tên đợt</th>
                            <th className="px-4 py-3 text-left">Thời gian</th>
                            <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-left">Trạng thái</th>
                            {canManage && (
                              <th className="px-4 py-3 text-right">Thao tác</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {loading ? (
                            <tr>
                              <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                                Đang tải cấu hình...
                              </td>
                            </tr>
                          ) : visibleDot.length === 0 ? (
                            <tr>
                              <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                                Chưa có đợt cấp GCN.
                              </td>
                            </tr>
                          ) : (
                            visibleDot.map((item) => (
                              <tr key={item.rowNumber}>
                                <td className="px-4 py-3 font-bold text-gray-900">
                                  {item.soDot}
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-800">
                                  {item.tenDot}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {item.ngayBatDau} - {item.ngayKetThuc}
                                </td>
                                <td className="min-w-[120px] whitespace-nowrap px-4 py-3">
                                  <span
                                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                                      isHidden(item.trangThai)
                                        ? "bg-gray-100 text-gray-500"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {statusForForm(item.trangThai)}
                                  </span>
                                </td>
                                {canManage && (
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => editDot(item)}
                                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleDot(item)}
                                      className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50"
                                    >
                                      {isHidden(item.trangThai) ? "Hiện" : "Ẩn"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteDot(item)}
                                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={pageDot}
                      total={dotItems.length}
                      onPage={setPageDot}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
