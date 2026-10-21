import assert from "node:assert/strict";
import test from "node:test";
import { extractBilledConsumption } from "../pavia-acque.js";

const BOL_658482_EXCERPT = [
  "Consumo mc 143 - 17 Totale bolletta € 279,36 Scadenza 16/11/2026",
  "Data Lettura Lettura mc Tipo Lettura Consumo mc Giorni",
  "17/06/2026 2.275 Rilevata 29/09/2026 2.418 Rilevata 143 104",
  "Periodo Consumo mc Giorni",
  "Consumo del periodo dal 18/06/2026 al 29/09/2026 143 104",
  "Consumi stimati prec. fatt. dal 18/06/2026 al 30/06/2026 -17 12",
].join(" ");

test("reading bill BOL/2026/658482 bills 143 - 17 = 126 m3", () => {
  assert.equal(extractBilledConsumption(BOL_658482_EXCERPT), 126);
});

test("detail lines still yield 126 when the front formula is missing", () => {
  const withoutFrontFormula = BOL_658482_EXCERPT.replace("Consumo mc 143 - 17 ", "");
  assert.equal(extractBilledConsumption(withoutFrontFormula), 126);
});

test("the three-part A - B + C formula is unchanged", () => {
  assert.equal(extractBilledConsumption("Consumo mc 100 - 10 + 5 Totale bolletta"), 95);
  assert.equal(extractBilledConsumption("Consumo mc 80-0+12"), 92);
  assert.equal(extractBilledConsumption("Consumo mc 143 - 17 + 4"), 130);
});

test("A - B + C wins over a later two-part detail block", () => {
  const text = `Consumo mc 200 - 30 + 8 ${BOL_658482_EXCERPT.replace("Consumo mc 143 - 17 ", "")}`;
  assert.equal(extractBilledConsumption(text), 178);
});

test("the previous summary fallback still adds period, prior estimate and current estimate", () => {
  const text = [
    "Consumo del periodo dal giorno 50",
    "Consumi stimati prec. fatt. voce -4",
    "Consumo stimato del periodo stima 7",
  ].join(" ");
  assert.equal(extractBilledConsumption(text), 53);
});

test("A - B + C is used even when the older summary fallback is also present", () => {
  const text = [
    "Consumo mc 100 - 10 + 5",
    "Consumo del periodo dal giorno 80",
    "Consumi stimati prec. fatt. voce -1",
    "Consumo stimato del periodo stima 2",
  ].join(" ");
  assert.equal(extractBilledConsumption(text), 95);
});

test("a period total alone is not treated as the billed total", () => {
  assert.equal(
    extractBilledConsumption("Consumo del periodo dal 18/06/2026 al 29/09/2026 143 104"),
    null
  );
  assert.equal(extractBilledConsumption("Consumo mc 143 Totale bolletta"), null);
  assert.equal(extractBilledConsumption(""), null);
});
