"use client";

import { useState, Fragment } from "react";

function money(n: number) {
  return `${n.toFixed(2)} ETB`;
}

type SupplierOpt = { id: number; name: string };

type ItemView = {
  id: number;
  name: string;
  unit: string;
  qty: number;
  min: number;
  cost: number;
  supplierId: number | null;
  supplierName: string | null;
  status: string;
  low: boolean;
};

export default function InventoryTable({
  items,
  suppliers,
  canManage,
  updateItem,
}: {
  items: ItemView[];
  suppliers: SupplierOpt[];
  canManage: boolean;
  updateItem: (formData: FormData) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="table-scroll">
      <table className="cas-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Unit</th>
            <th>Current Qty</th>
            <th>Min</th>
            <th>Unit cost</th>
            <th>Stock value</th>
            <th>Supplier</th>
            <th>Status</th>
            {canManage && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <Fragment key={i.id}>
              <tr className={i.low ? "row-low-stock" : undefined}>
                <td>{i.name}</td>
                <td>{i.unit}</td>
                <td className={`font-mono ${i.low ? "text-danger" : ""}`}>{i.qty}</td>
                <td className="font-mono">{i.min}</td>
                <td className="font-mono">{money(i.cost)}</td>
                <td className="font-mono" style={{ fontWeight: 600 }}>
                  {money(i.qty * i.cost)}
                </td>
                <td style={{ color: "var(--text-muted)" }}>{i.supplierName || "—"}</td>
                <td>
                  <span className={`badge ${i.status === "active" ? "badge-success" : ""}`}>
                    {i.status}
                  </span>
                  {i.low && (
                    <span className="badge badge-danger" style={{ marginLeft: 6 }}>
                      Low
                    </span>
                  )}
                </td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      className="cas-btn cas-btn-ghost cas-btn-sm"
                      aria-expanded={openId === i.id}
                      onClick={() => setOpenId((id) => (id === i.id ? null : i.id))}
                    >
                      {openId === i.id ? "Close" : "Edit"}
                    </button>
                  </td>
                )}
              </tr>
              {canManage && openId === i.id && (
                <tr className="cas-table-edit-row">
                  <td colSpan={9}>
                    <form action={updateItem} className="form-row cols-4" style={{ marginBottom: 0 }}>
                      <input type="hidden" name="id" value={i.id} />
                      <input name="name" className="cas-input" defaultValue={i.name} required />
                      <input name="unit" className="cas-input" defaultValue={i.unit} required />
                      <input
                        name="qty"
                        type="number"
                        step="0.01"
                        className="cas-input"
                        defaultValue={i.qty}
                        required
                      />
                      <input
                        name="min"
                        type="number"
                        step="0.01"
                        className="cas-input"
                        defaultValue={i.min}
                        required
                      />
                      <input
                        name="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        className="cas-input"
                        defaultValue={i.cost}
                        placeholder="Unit cost"
                      />
                      <select
                        name="supplierId"
                        className="cas-select"
                        defaultValue={i.supplierId ?? ""}
                      >
                        <option value="">—</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select name="status" className="cas-select" defaultValue={i.status}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                      <button className="cas-btn cas-btn-success cas-btn-sm">Save</button>
                    </form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={canManage ? 9 : 8} style={{ color: "var(--text-muted)" }}>
                No inventory items yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
