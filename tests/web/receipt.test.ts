import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Receipt } from "@/components/track/Receipt";
import { snapshotWith } from "@/web/api/fixtures";
import { LanguageProvider } from "@/web/i18n/LanguageProvider";
import { resetWallet, setPaySource } from "@/web/wallet";

const snapshot = snapshotWith({
  status: "COMPLETED_SIMULATED",
  receipt: { id: "receipt_invoice_001", issuedAt: "2026-10-16T00:00:00Z", summary: "Transfer complete." },
});
const renderReceipt = () => renderToStaticMarkup(createElement(LanguageProvider, null,
  createElement(Receipt, { snapshot, onSendAnother() {} })));
afterEach(() => resetWallet());

describe("receipt invoice", () => {
  it("shows the invoice number, sender, recipient and print action", () => {
    const html = renderReceipt();
    expect(html).toContain("INV-receipt_invoice_001");
    expect(html).toContain("CentMe demo sender");
    expect(html).toContain("Demo Recipient");
    expect(html).toContain("Print / Save PDF");
  });
  it.each([ ["WALLET", "CentMe wallet"], ["CARD", "Visa ••4821"] ] as const)("shows the stored %s source", (source, label) => {
    setPaySource(snapshot.id, source);
    const html = renderReceipt();
    expect(html).toContain("Paid from");
    expect(html).toContain(label);
  });
  it("includes the final amount for printing before the counter animation runs", () => {
    expect(renderReceipt()).toContain("฿343.00");
  });
  it("hides the paid-from row when the browser has no stored source", () => {
    expect(renderReceipt()).not.toContain("Paid from");
  });
});
