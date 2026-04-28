import { getDocument } from "./vendor/pdf.mjs";
import { WorkerMessageHandler } from "./vendor/pdf.worker.mjs";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "./vendor/pdf-lib.esm.min.js";

const STORAGE_KEY = "condo-water-calculator-v2";
globalThis.pdfjsWorker = { WorkerMessageHandler };

const DEFAULT_APARTMENT_NAMES = [
  "NEGRI",
  "FARAHI",
  "BEPA",
  "QUINTERO",
  "DI MATTEO",
  "TAGLIANI FERRARI",
  "NESTOR CISNEROS",
];

const CHARGE_DEFINITIONS = [
  { id: "quotaFissa", label: "Quota fissa", method: "units" },
  { id: "acquedotto", label: "Acquedotto", method: "consumption" },
  { id: "fognatura", label: "Fognatura", method: "consumption" },
  { id: "depurazione", label: "Depurazione", method: "consumption" },
  { id: "oneri", label: "Oneri perequazione", method: "consumption" },
  { id: "restituzioneAcconti", label: "Restituzione acconti", method: "consumption" },
  { id: "rettificaArrotondamento", label: "Rettifica arrotondamento", method: "units" },
  { id: "altreSpese", label: "Altre spese", method: "units" },
];

const METHOD_OPTIONS = [
  { value: "consumption", label: "Per consumo m3" },
  { value: "units", label: "Per appartamento" },
  { value: "residents", label: "Per residenti" },
  { value: "millesimi", label: "Per millesimi" },
];

const EMPTY_STATE = {
  condoName: "",
  invoiceNumber: "",
  periodStart: "",
  periodEnd: "",
  dueDate: "",
  billedConsumption: "",
  normalizeConsumption: true,
  charges: CHARGE_DEFINITIONS.map((charge) => ({
    ...charge,
    amount: "",
    vat: "10",
  })),
  apartments: createApartmentsFromNames(DEFAULT_APARTMENT_NAMES),
};

const INVOICE_STATE = {
  condoName: "Via Aspromonte 14 - Voghera",
  invoiceNumber: "BOL_SI_PR/2026/240522",
  periodStart: "2026-01-01",
  periodEnd: "2026-03-31",
  dueDate: "2026-05-15",
  billedConsumption: "159",
  normalizeConsumption: true,
  charges: [
    { id: "quotaFissa", label: "Quota fissa", amount: "60.03", vat: "10", method: "units" },
    { id: "acquedotto", label: "Acquedotto", amount: "209.65", vat: "10", method: "consumption" },
    { id: "fognatura", label: "Fognatura", amount: "62.76", vat: "10", method: "consumption" },
    { id: "depurazione", label: "Depurazione", amount: "169.46", vat: "10", method: "consumption" },
    { id: "oneri", label: "Oneri perequazione", amount: "25.84", vat: "10", method: "consumption" },
    { id: "restituzioneAcconti", label: "Restituzione acconti", amount: "-211.31", vat: "10", method: "consumption" },
    { id: "rettificaArrotondamento", label: "Rettifica arrotondamento", amount: "-0.01", vat: "0", method: "units" },
    { id: "altreSpese", label: "Altre spese", amount: "", vat: "10", method: "units" },
  ],
  apartments: createApartmentsFromNames(DEFAULT_APARTMENT_NAMES),
};

const INITIAL_STATE = INVOICE_STATE;

const state = loadState();

const elements = {
  condoName: document.querySelector("#condo-name"),
  invoiceNumber: document.querySelector("#invoice-number"),
  periodStart: document.querySelector("#period-start"),
  periodEnd: document.querySelector("#period-end"),
  dueDate: document.querySelector("#due-date"),
  billedConsumption: document.querySelector("#billed-consumption"),
  normalizeConsumption: document.querySelector("#normalize-consumption"),
  chargesBody: document.querySelector("#charges-body"),
  apartmentsBody: document.querySelector("#apartments-body"),
  resultsHead: document.querySelector("#results-head"),
  resultsBody: document.querySelector("#results-body"),
  resultsFoot: document.querySelector("#results-foot"),
  saveStatus: document.querySelector("#save-status"),
  calculationNote: document.querySelector("#calculation-note"),
  summaryBill: document.querySelector("#summary-bill"),
  summaryUnits: document.querySelector("#summary-units"),
  summaryBilled: document.querySelector("#summary-billed"),
  summaryAverage: document.querySelector("#summary-average"),
  importPdf: document.querySelector("#import-pdf"),
  pdfFile: document.querySelector("#pdf-file"),
  exportPdf: document.querySelector("#export-pdf"),
  resetData: document.querySelector("#reset-data"),
};

bindStaticFields();
bindButtons();
render();

function createApartment(label = "") {
  return {
    id: crypto.randomUUID(),
    name: label,
    residents: "2",
    consumption: "",
    millesimi: "0",
  };
}

function createApartmentsFromNames(names) {
  return names.map((name) => createApartment(name));
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(INITIAL_STATE);
  }

  try {
    const parsed = JSON.parse(raw);
    return hydrateState(parsed);
  } catch (error) {
    console.warn("Impossibile leggere i dati salvati:", error);
    return structuredClone(INITIAL_STATE);
  }
}

function hydrateState(source) {
  const fallback = structuredClone(EMPTY_STATE);
  const sourceCharges = Array.isArray(source.charges) ? source.charges : [];
  const charges = CHARGE_DEFINITIONS.map((definition) => {
    const existing = sourceCharges.find((item) => item.id === definition.id) || {};
    return {
      ...definition,
      amount: existing.amount ?? "",
      vat: existing.vat ?? "10",
      method: existing.method ?? definition.method,
    };
  });

  const apartments = Array.isArray(source.apartments) && source.apartments.length
    ? source.apartments.map((apartment, index) => ({
        id: apartment.id || crypto.randomUUID(),
        name: apartment.name ?? `Interno ${index + 1}`,
        residents: apartment.residents ?? "",
        consumption: apartment.consumption ?? "",
        millesimi: apartment.millesimi ?? "",
      }))
    : fallback.apartments;

  return {
    ...fallback,
    condoName: source.condoName ?? "",
    invoiceNumber: source.invoiceNumber ?? "",
    periodStart: source.periodStart ?? "",
    periodEnd: source.periodEnd ?? "",
    dueDate: source.dueDate ?? (source.invoiceNumber === INVOICE_STATE.invoiceNumber ? INVOICE_STATE.dueDate : ""),
    billedConsumption: source.billedConsumption ?? "",
    normalizeConsumption: source.normalizeConsumption ?? true,
    charges,
    apartments,
  };
}

function bindStaticFields() {
  elements.apartmentsBody.addEventListener("input", handleApartmentChange);
  elements.apartmentsBody.addEventListener("keydown", handleApartmentKeydown);
}

function bindButtons() {
  elements.importPdf.addEventListener("click", () => {
    elements.pdfFile.click();
  });

  elements.pdfFile.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = "";
    if (!file) {
      return;
    }

    updateSaveStatus(`Importazione PDF in corso: ${file.name}`);

    try {
      const parsed = await parsePaviaAcquePdf(file);
      applyParsedInvoice(parsed);
      const warnings = [];
      if (parsed.archivedUnits && parsed.archivedUnits !== state.apartments.length) {
        warnings.push(`nel PDF risultano ${parsed.archivedUnits} unita' servite`);
      }
      if (parsed.archivedResidents) {
        warnings.push(`nel PDF risultano ${parsed.archivedResidents} residenti complessivi`);
      }
      const suffix = warnings.length ? `, ${warnings.join(" e ")}` : "";
      persistAndRender(`PDF importato: ${file.name}${suffix}.`);
    } catch (error) {
      console.error(error);
      updateSaveStatus("Impossibile leggere il PDF. Verifica che sia una bolletta Pavia Acque.");
    }
  });

  elements.resetData.addEventListener("click", () => {
    Object.assign(state, structuredClone(EMPTY_STATE));
    persistAndRender("Campi svuotati. I 7 immobili restano impostati.");
  });

  elements.exportPdf.addEventListener("click", async () => {
    const summary = calculate();
    if (!summary.rows.length) {
      updateSaveStatus("Aggiungi almeno un appartamento prima di esportare.");
      return;
    }

    try {
      const pdfBytes = await buildResultsPdf(summary);
      const fileName = buildFileName("pdf");
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      updateSaveStatus(`PDF esportato: ${fileName}`);
    } catch (error) {
      console.error(error);
      updateSaveStatus("Errore durante la generazione del PDF.");
    }
  });
}

function handleChargeChange(event) {
}

function handleApartmentChange(event) {
  const row = event.target.closest("[data-apartment-id]");
  if (!row) {
    return;
  }

  const apartment = state.apartments.find((item) => item.id === row.dataset.apartmentId);
  if (!apartment) {
    return;
  }

  const field = event.target.dataset.field;
  if (field !== "consumption") {
    return;
  }
  apartment[field] = normalizeDecimalInput(event.target.value);
  persistConsumptionDraft();
}

function handleApartmentRemove(event) {
}

function handleApartmentKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  const current = event.target.closest('input[data-field="consumption"]');
  if (!current) {
    return;
  }

  event.preventDefault();
  const inputs = Array.from(
    elements.apartmentsBody.querySelectorAll('input[data-field="consumption"]')
  );
  const index = inputs.indexOf(current);
  const next = inputs[index + 1];
  if (next) {
    next.focus();
    next.select();
  }
}

function persistAndRender(message = "Bozza salvata in locale.") {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateSaveStatus(message);
  render();
}

function persistConsumptionDraft(message = "Consumi aggiornati.") {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateSaveStatus(message);
  renderResults();
}

function render() {
  syncHeaderFields();
  renderChargeRows();
  renderApartmentRows();
  renderResults();
}

function syncHeaderFields() {
  elements.condoName.value = state.condoName;
  elements.invoiceNumber.value = state.invoiceNumber;
  elements.periodStart.value = state.periodStart;
  elements.periodEnd.value = state.periodEnd;
  elements.dueDate.value = state.dueDate;
  elements.billedConsumption.value = state.billedConsumption;
}

function renderChargeRows() {
  elements.chargesBody.innerHTML = state.charges
    .map((charge) => {
      const total = calculateGross(charge.amount, charge.vat);

      return `
        <tr data-charge-id="${charge.id}">
          <td>${charge.label}</td>
          <td>
            <input data-field="amount" type="number" step="0.01" value="${escapeValue(charge.amount)}" readonly />
          </td>
          <td>
            <input data-field="vat" type="number" min="0" step="0.01" value="${escapeValue(charge.vat)}" readonly />
          </td>
          <td class="inline-total">${formatCurrency(total)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderApartmentRows() {
  elements.apartmentsBody.innerHTML = state.apartments
    .map((apartment, index) => `
      <tr data-apartment-id="${apartment.id}">
        <td>
          <input data-field="name" type="text" value="${escapeValue(apartment.name || `Interno ${index + 1}`)}" readonly />
        </td>
        <td>
          <input
            data-field="consumption"
            type="text"
            inputmode="decimal"
            placeholder="Es. 12,5"
            value="${escapeValue(apartment.consumption)}"
          />
        </td>
      </tr>
    `)
    .join("");
}

function renderResults() {
  const summary = calculate();

  elements.summaryBill.textContent = formatCurrency(summary.totalBill);
  elements.summaryUnits.textContent = String(summary.rows.length);
  elements.summaryBilled.textContent = `${formatNumber(summary.billedConsumption)} m3`;
  elements.summaryAverage.textContent = `${formatCurrency(summary.averageCostPerCubicMeter)}/m3`;
  elements.calculationNote.textContent = summary.note;
  elements.calculationNote.classList.toggle("warning-note", summary.hasConsumptionMismatch);

  if (!summary.rows.length) {
    elements.resultsHead.innerHTML = "";
    elements.resultsBody.innerHTML = "";
    elements.resultsFoot.innerHTML = "";
    return;
  }

  const chargeHeaders = state.charges.map((charge) => `<th>${charge.label}</th>`).join("");
  elements.resultsHead.innerHTML = `
    <tr>
      <th>Interno</th>
      <th>M3 inseriti</th>
      <th>M3 riprop.</th>
      ${chargeHeaders}
      <th>Totale</th>
    </tr>
  `;

  elements.resultsBody.innerHTML = summary.rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${formatNumber(row.rawConsumption)}</td>
        <td>${formatNumber(row.adjustedConsumption)}</td>
        ${state.charges.map((charge) => `<td>${formatCurrency(row.breakdown[charge.id] || 0)}</td>`).join("")}
        <td class="total-cell">${formatCurrency(row.total)}</td>
      </tr>
    `)
    .join("");

  elements.resultsFoot.innerHTML = `
    <tr class="foot-row">
      <td>Totale</td>
      <td>${formatNumber(summary.rawConsumption)}</td>
      <td>${formatNumber(summary.adjustedConsumption)}</td>
      ${state.charges.map((charge) => `<td>${formatCurrency(summary.chargeTotals[charge.id] || 0)}</td>`).join("")}
      <td class="total-cell">${formatCurrency(summary.totalBill)}</td>
    </tr>
  `;
}

function applyParsedInvoice(parsed) {
  state.condoName = parsed.condoName || state.condoName;
  state.invoiceNumber = parsed.invoiceNumber || "";
  state.periodStart = parsed.periodStart || "";
  state.periodEnd = parsed.periodEnd || "";
  state.dueDate = parsed.dueDate || "";
  state.billedConsumption = parsed.billedConsumption ? formatInputNumber(parsed.billedConsumption, 2) : "";
  state.normalizeConsumption = true;

  state.charges = CHARGE_DEFINITIONS.map((definition) => ({
    ...definition,
    amount: parsed.charges[definition.id] == null ? "" : formatInputNumber(parsed.charges[definition.id], 2),
    vat: definition.id === "rettificaArrotondamento" ? "0" : "10",
    method: definition.method,
  }));

  state.apartments = state.apartments.map((apartment) => ({
    ...apartment,
    residents: "2",
    millesimi: "0",
    consumption: "",
  }));
}

async function parsePaviaAcquePdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pageTexts = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => item.str).join(" "));
  }

  const normalizedText = normalizePdfText(pageTexts.join("\n"));
  return extractPaviaAcqueData(normalizedText);
}

function extractPaviaAcqueData(text) {
  const summarySection = text.match(/RIEPILOGO IMPORTI.*?Totale Bolletta\s+-?\d+[\.,]\d{2}/i)?.[0] || text;
  const charges = {
    quotaFissa: findAmount(summarySection, "Quote fisse"),
    acquedotto: findAmount(summarySection, "Acquedotto"),
    fognatura: findAmount(summarySection, "Fognatura"),
    depurazione: findAmount(summarySection, "Depurazione"),
    oneri: findAmount(summarySection, "Oneri perequazione"),
    restituzioneAcconti: findAmount(summarySection, "Restituzione acconti boll\\. prec\\."),
    altreSpese: null,
    rettificaArrotondamento: 0,
  };

  const totalInvoice = findAmount(summarySection, "Totale Bolletta");
  const billedConsumption = extractBilledConsumption(text);
  const grossWithoutAdjustment = CHARGE_DEFINITIONS
    .filter((charge) => charge.id !== "rettificaArrotondamento" && charges[charge.id] != null)
    .reduce((total, charge) => total + calculateGross(charges[charge.id], charge.id === "altreSpese" ? 10 : 10), 0);

  charges.rettificaArrotondamento = totalInvoice == null ? 0 : roundTo(totalInvoice - grossWithoutAdjustment, 2);

  return {
    condoName: extractCondoName(text),
    invoiceNumber: matchGroup(text, /Numero\s+(BOL_[A-Z0-9_/-]+)/i),
    periodStart: extractPeriodStart(text),
    periodEnd: extractPeriodEnd(text),
    dueDate: extractDueDate(text),
    billedConsumption,
    charges,
    archivedUnits: extractInteger(text, /N\.\s*unit[aà]\s*immobiliari\s*servite\s*(\d+)/i),
    archivedResidents: extractInteger(text, /N\.\s*componenti\s*nucleo\s*familiare\s*(\d+)/i),
  };
}

function normalizePdfText(text) {
  return text
    .replaceAll("\u00a0", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findAmount(text, label) {
  const pattern = new RegExp(`${label}\\s+(-?\\d+[\\.,]\\d{2})`, "i");
  const value = matchGroup(text, pattern);
  return value == null ? null : parseLocaleNumber(value);
}

function extractBilledConsumption(text) {
  const expression = text.match(/Consumo mc\s+(\d+)\s*-\s*(\d+)\s*\+\s*(\d+)/i);
  if (expression) {
    return Number(expression[1]) - Number(expression[2]) + Number(expression[3]);
  }

  const summaryExpression = text.match(/Consumo del periodo dal .*? (\d+)\s+Consumi stimati prec\. fatt\. .*? (-?\d+)\s+Consumo stimato del periodo .*? (\d+)/i);
  if (summaryExpression) {
    return Number(summaryExpression[1]) + Number(summaryExpression[2]) + Number(summaryExpression[3]);
  }

  return null;
}

function extractCondoName(text) {
  const match = text.match(/Indirizzo fornitura:\s*(.+?)\s+RIEPILOGO IMPORTI/i);
  return match ? match[1].trim() : "";
}

function extractPeriodStart(text) {
  const range = extractPeriodRange(text);
  return range?.start ? toIsoDate(range.start) : "";
}

function extractPeriodEnd(text) {
  const range = extractPeriodRange(text);
  return range?.end ? toIsoDate(range.end) : "";
}

function extractPeriodRange(text) {
  const patterns = [
    /Consumo(?:\s+\w+){0,4}\s+del\s+periodo\s+dal\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i,
    /periodo\s+dal\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i,
    /dal\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { start: match[1], end: match[2] };
    }
  }

  return null;
}

function extractDueDate(text) {
  const dueDate = matchGroup(text, /Scadenza\s+(\d{2}\/\d{2}\/\d{4})/i);
  return dueDate ? toIsoDate(dueDate) : "";
}

function extractInteger(text, pattern) {
  const value = matchGroup(text, pattern);
  return value == null ? null : Number.parseInt(value, 10);
}

function matchGroup(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function calculate() {
  const apartments = state.apartments.map((apartment, index) => ({
    id: apartment.id,
    name: apartment.name || `Interno ${index + 1}`,
    residents: toNumber(apartment.residents),
    rawConsumption: toNumber(apartment.consumption),
    millesimi: toNumber(apartment.millesimi),
  }));

  const rawConsumption = sum(apartments.map((apartment) => apartment.rawConsumption));
  const billedConsumption = toNumber(state.billedConsumption);
  const normalizationEnabled = Boolean(state.normalizeConsumption) && billedConsumption > 0 && rawConsumption > 0;
  const normalizationFactor = normalizationEnabled ? billedConsumption / rawConsumption : 1;

  const rows = apartments.map((apartment) => ({
    ...apartment,
    adjustedConsumption: roundTo(apartment.rawConsumption * normalizationFactor, 4),
    breakdown: {},
    total: 0,
  }));

  const notes = [];
  if (billedConsumption > 0 && rawConsumption <= 0) {
    notes.push(
      `La fattura caricata riporta ${formatNumber(billedConsumption)} m3. Inserisci i consumi dei 7 immobili: finche' i m3 restano vuoti, le voci a consumo vengono ripartite in modo provvisorio.`
    );
  } else if (normalizationEnabled && Math.abs(billedConsumption - rawConsumption) > 0.001) {
    notes.push(
      `I consumi inseriti (${formatNumber(rawConsumption)} m3) sono stati riproporzionati a ${formatNumber(billedConsumption)} m3, come nel simulatore Pavia Acque.`
    );
  } else if (billedConsumption > 0 && Math.abs(billedConsumption - rawConsumption) > 0.001) {
    notes.push(
      `Il totale inserito negli appartamenti (${formatNumber(rawConsumption)} m3) non coincide con il fatturato (${formatNumber(billedConsumption)} m3).`
    );
  }

  const chargeTotals = {};
  let totalBill = 0;

  state.charges.forEach((charge) => {
    const total = calculateGross(charge.amount, charge.vat);
    chargeTotals[charge.id] = total;
    totalBill += total;

    let weights = rows.map((row) => getWeight(charge.method, row));
    let fallbackUsed = false;
    if (sum(weights) <= 0 && total > 0) {
      weights = rows.map(() => 1);
      fallbackUsed = true;
    }

    if (fallbackUsed) {
      notes.push(`La voce ${charge.label} e' stata ripartita in parti uguali per mancanza di dati utili.`);
    }

    const allocations = allocateAmount(total, weights);
    rows.forEach((row, index) => {
      row.breakdown[charge.id] = allocations[index];
      row.total = roundTo(row.total + allocations[index], 2);
    });
  });

  const effectiveBilledConsumption = billedConsumption || roundTo(sum(rows.map((row) => row.adjustedConsumption)), 2);
  const hasConsumptionMismatch = billedConsumption > 0 && Math.abs(billedConsumption - rawConsumption) > 0.001;

  return {
    rows,
    chargeTotals,
    totalBill: roundTo(totalBill, 2),
    totalResidents: sum(rows.map((row) => row.residents)),
    rawConsumption: roundTo(rawConsumption, 2),
    adjustedConsumption: roundTo(sum(rows.map((row) => row.adjustedConsumption)), 2),
    billedConsumption: effectiveBilledConsumption,
    averageCostPerCubicMeter: effectiveBilledConsumption > 0 ? roundTo(totalBill / effectiveBilledConsumption, 2) : 0,
    hasConsumptionMismatch,
    note: notes.join(" "),
  };
}

function getWeight(method, apartment) {
  if (method === "consumption") {
    return apartment.adjustedConsumption;
  }

  if (method === "residents") {
    return apartment.residents;
  }

  if (method === "millesimi") {
    return apartment.millesimi;
  }

  return 1;
}

function allocateAmount(totalValue, weights) {
  if (!weights.length) {
    return [];
  }

  const safeWeights = weights.map((weight) => Math.max(0, toNumber(weight)));
  const totalWeight = sum(safeWeights);
  if (totalWeight <= 0) {
    return safeWeights.map(() => 0);
  }

  const totalCents = Math.round(totalValue * 100);
  const rawShares = safeWeights.map((weight) => (totalCents * weight) / totalWeight);
  const baseShares = rawShares.map((share) => Math.floor(share));
  let remainder = totalCents - sum(baseShares);

  const ranked = rawShares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; index < ranked.length && remainder > 0; index += 1) {
    baseShares[ranked[index].index] += 1;
    remainder -= 1;
  }

  return baseShares.map((share) => roundTo(share / 100, 2));
}

function calculateGross(amount, vat) {
  const net = toNumber(amount);
  const vatRate = toNumber(vat);
  return roundTo(net + (net * vatRate) / 100, 2);
}

function buildFileName(extension = "pdf") {
  const cleanName = (state.condoName || "ripartizione-acqua")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const invoiceSlug = (state.invoiceNumber || "fattura")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleanName || "ripartizione-acqua"}-${invoiceSlug || "fattura"}.${extension}`;
}

function updateSaveStatus(message) {
  elements.saveStatus.textContent = message;
}

function escapeValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatCurrency(value, withSymbol = true) {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));

  return withSymbol ? `€ ${formatted}` : formatted;
}

function formatPdfCurrency(value) {
  return `EUR ${formatCurrency(value, false)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: Number.isInteger(toNumber(value)) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatInputNumber(value, decimals = 2) {
  const numeric = toNumber(value);
  if (Number.isInteger(numeric)) {
    return String(numeric);
  }

  return numeric.toFixed(decimals);
}

function parseLocaleNumber(value) {
  const text = String(value).trim();
  if (text.includes(",")) {
    return Number.parseFloat(text.replaceAll(".", "").replace(",", "."));
  }

  return Number.parseFloat(text);
}

function normalizeDecimalInput(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  const normalized = text.replace(/\s+/g, "").replace(",", ".");
  if (!/^\d*\.?\d*$/.test(normalized)) {
    return text;
  }

  return normalized;
}

function toIsoDate(value) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

async function buildResultsPdf(summary) {
  const pdfDoc = await PDFDocument.create();
  const pageSize = [PageSizes.A4[1], PageSizes.A4[0]];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 28;
  const rowHeight = 26;
  const headerHeight = 34;
  const titleColor = rgb(0.13, 0.19, 0.17);
  const accentColor = rgb(0.7, 0.29, 0.17);
  const borderColor = rgb(0.83, 0.77, 0.72);
  const headerBg = rgb(0.95, 0.93, 0.9);
  const stripeBg = rgb(0.99, 0.98, 0.97);
  const columns = [
    { key: "name", label: "Immobile", width: 105, align: "left" },
    { key: "rawConsumption", label: "M3 inseriti", width: 50, align: "right" },
    { key: "adjustedConsumption", label: "M3 riprop.", width: 50, align: "right" },
    ...state.charges.map((charge) => ({
      key: charge.id,
      label: charge.label,
      width: 56,
      align: "right",
    })),
    { key: "total", label: "Totale", width: 60, align: "right" },
  ];

  const buildRowValues = (row) => ({
    name: row.name,
    rawConsumption: formatNumber(row.rawConsumption),
    adjustedConsumption: formatNumber(row.adjustedConsumption),
    total: formatPdfCurrency(row.total),
    ...Object.fromEntries(
      state.charges.map((charge) => [charge.id, formatPdfCurrency(row.breakdown[charge.id] || 0)])
    ),
  });

  const rows = summary.rows.map(buildRowValues);
  rows.push({
    name: "Totale",
    rawConsumption: formatNumber(summary.rawConsumption),
    adjustedConsumption: formatNumber(summary.adjustedConsumption),
    total: formatPdfCurrency(summary.totalBill),
    ...Object.fromEntries(
      state.charges.map((charge) => [charge.id, formatPdfCurrency(summary.chargeTotals[charge.id] || 0)])
    ),
  });

  let page = pdfDoc.addPage(pageSize);
  let y = drawPdfHeader(page, summary, font, fontBold, {
    margin,
    titleColor,
    accentColor,
  });

  y = drawTableHeader(page, y, columns, fontBold, {
    margin,
    headerHeight,
    borderColor,
    headerBg,
  });

  rows.forEach((row, index) => {
    if (y - rowHeight < margin) {
      page = pdfDoc.addPage(pageSize);
      y = drawPdfHeader(page, summary, font, fontBold, {
        margin,
        titleColor,
        accentColor,
      });
      y = drawTableHeader(page, y, columns, fontBold, {
        margin,
        headerHeight,
        borderColor,
        headerBg,
      });
    }

    const isTotal = index === rows.length - 1;
    drawTableRow(page, y, columns, row, font, fontBold, {
      margin,
      rowHeight,
      borderColor,
      fillColor: isTotal ? headerBg : index % 2 === 0 ? stripeBg : null,
      bold: isTotal,
    });
    y -= rowHeight;
  });

  return pdfDoc.save();
}

function drawPdfHeader(page, summary, font, fontBold, options) {
  const { margin, titleColor, accentColor } = options;
  const { width, height } = page.getSize();
  const title = state.condoName || "Ripartizione acqua condominiale";
  const invoiceText = `Fattura: ${state.invoiceNumber || "-"}`;
  const dueDateText = `Scadenza pagamento: ${formatDisplayDate(state.dueDate)}`;
  const periodText = `Periodo: ${formatDisplayDate(state.periodStart)} - ${formatDisplayDate(state.periodEnd)}`;
  const totalText = `Totale bolletta: ${formatPdfCurrency(summary.totalBill)}`;
  const consumptionText = `Consumo fatturato: ${formatNumber(summary.billedConsumption)} m3`;

  page.drawText(title, {
    x: margin,
    y: height - margin - 8,
    size: 19,
    font: fontBold,
    color: titleColor,
  });

  page.drawText(invoiceText, {
    x: margin,
    y: height - margin - 34,
    size: 10,
    font,
    color: titleColor,
  });
  page.drawText(dueDateText, {
    x: margin + 185,
    y: height - margin - 34,
    size: 10,
    font,
    color: titleColor,
  });
  page.drawText(periodText, {
    x: margin,
    y: height - margin - 50,
    size: 10,
    font,
    color: titleColor,
  });
  page.drawText(consumptionText, {
    x: width - margin - font.widthOfTextAtSize(consumptionText, 10),
    y: height - margin - 34,
    size: 10,
    font,
    color: titleColor,
  });
  page.drawText(totalText, {
    x: width - margin - fontBold.widthOfTextAtSize(totalText, 11),
    y: height - margin - 50,
    size: 11,
    font: fontBold,
    color: accentColor,
  });

  return height - margin - 78;
}

function drawTableHeader(page, y, columns, fontBold, options) {
  const { margin, headerHeight, borderColor, headerBg } = options;
  let x = margin;
  page.drawRectangle({
    x: margin,
    y: y - headerHeight,
    width: columns.reduce((total, column) => total + column.width, 0),
    height: headerHeight,
    color: headerBg,
    borderColor,
    borderWidth: 1,
  });

  columns.forEach((column) => {
    page.drawRectangle({
      x,
      y: y - headerHeight,
      width: column.width,
      height: headerHeight,
      borderColor,
      borderWidth: 1,
    });

    const lines = wrapText(column.label, column.width - 8, fontBold, 7);
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: x + 4,
        y: y - 12 - index * 8,
        size: 7,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
    });
    x += column.width;
  });

  return y - headerHeight;
}

function drawTableRow(page, y, columns, row, font, fontBold, options) {
  const { margin, rowHeight, borderColor, fillColor, bold } = options;
  const activeFont = bold ? fontBold : font;
  const textSize = 8;
  let x = margin;

  if (fillColor) {
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: columns.reduce((total, column) => total + column.width, 0),
      height: rowHeight,
      color: fillColor,
    });
  }

  columns.forEach((column) => {
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: column.width,
      height: rowHeight,
      borderColor,
      borderWidth: 1,
    });

    const rawValue = row[column.key] ?? "";
    const text = String(rawValue);
    const lines = column.align === "left"
      ? wrapText(text, column.width - 8, activeFont, textSize)
      : [text];

    lines.slice(0, 2).forEach((line, index) => {
      const lineWidth = activeFont.widthOfTextAtSize(line, textSize);
      const textX = column.align === "right"
        ? x + column.width - lineWidth - 4
        : x + 4;
      page.drawText(line, {
        x: textX,
        y: y - 16 - index * 9,
        size: textSize,
        font: activeFont,
        color: rgb(0.17, 0.17, 0.17),
      });
    });

    x += column.width;
  });
}

function wrapText(text, maxWidth, font, size) {
  if (!text) {
    return [""];
  }

  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
      current = word;
      return;
    }

    lines.push(truncateText(word, maxWidth, font, size));
    current = "";
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [truncateText(String(text), maxWidth, font, size)];
}

function truncateText(text, maxWidth, font, size) {
  let output = String(text);
  while (output.length > 1 && font.widthOfTextAtSize(`${output}...`, size) > maxWidth) {
    output = output.slice(0, -1);
  }
  return output === text ? output : `${output}...`;
}

function toNumber(value) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + toNumber(value), 0);
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}
