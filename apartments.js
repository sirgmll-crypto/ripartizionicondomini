export function displayApartmentName(name, index) {
  const trimmed = String(name ?? "").trim();
  return trimmed || `Interno ${index + 1}`;
}

export function apartmentsAfterInvoiceImport(apartments) {
  return apartments.map((apartment) => ({
    ...apartment,
    residents: "2",
    millesimi: "0",
    consumption: "",
  }));
}
