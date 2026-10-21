import assert from "node:assert/strict";
import test from "node:test";
import { apartmentsAfterInvoiceImport, displayApartmentName } from "../apartments.js";

test("an empty name is shown as Interno N", () => {
  assert.equal(displayApartmentName("", 0), "Interno 1");
  assert.equal(displayApartmentName("   ", 2), "Interno 3");
  assert.equal(displayApartmentName(null, 6), "Interno 7");
});

test("a custom name is trimmed and kept", () => {
  assert.equal(displayApartmentName("  Maria Rossi  ", 0), "Maria Rossi");
  assert.equal(displayApartmentName("Interno 3", 0), "Interno 3");
});

test("importing a new bill keeps names and clears the typed m3", () => {
  const next = apartmentsAfterInvoiceImport([
    { id: "a", name: "Maria Rossi", residents: "4", consumption: "43.88", millesimi: "12" },
    { id: "b", name: "", residents: "2", consumption: "24", millesimi: "0" },
  ]);

  assert.deepEqual(next, [
    { id: "a", name: "Maria Rossi", residents: "2", consumption: "", millesimi: "0" },
    { id: "b", name: "", residents: "2", consumption: "", millesimi: "0" },
  ]);
});
