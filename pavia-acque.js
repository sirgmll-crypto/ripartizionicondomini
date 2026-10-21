export function extractBilledConsumption(text) {
  const withCurrentEstimate = text.match(/Consumo mc\s+(\d+)\s*-\s*(\d+)\s*\+\s*(\d+)/i);
  if (withCurrentEstimate) {
    return Number(withCurrentEstimate[1]) - Number(withCurrentEstimate[2]) + Number(withCurrentEstimate[3]);
  }

  // Some reading bills omit the estimated advance and print only "A - B".
  const readingOnly = text.match(/Consumo mc\s+(\d+)\s*-\s*(\d+)(?!\s*[+-])/i);
  if (readingOnly) {
    return Number(readingOnly[1]) - Number(readingOnly[2]);
  }

  const summaryExpression = text.match(/Consumo del periodo dal .*? (\d+)\s+Consumi stimati prec\. fatt\. .*? (-?\d+)\s+Consumo stimato del periodo .*? (\d+)/i);
  if (summaryExpression) {
    return Number(summaryExpression[1]) + Number(summaryExpression[2]) + Number(summaryExpression[3]);
  }

  // Detail block with a period total and an already-signed previous estimate,
  // and no "Consumo stimato del periodo" line. The integer between the two
  // quantities is the day count, not cubic metres.
  const periodAndPreviousEstimate = text.match(
    /Consumo del periodo dal\s+\d{2}\/\d{2}\/\d{4}\s+al\s+\d{2}\/\d{2}\/\d{4}\s+(-?\d+)\s+\d+\s+Consumi stimati prec\. fatt\. dal\s+\d{2}\/\d{2}\/\d{4}\s+al\s+\d{2}\/\d{2}\/\d{4}\s+(-?\d+)/i
  );
  if (periodAndPreviousEstimate && !/Consumo stimato del periodo/i.test(text)) {
    return Number(periodAndPreviousEstimate[1]) + Number(periodAndPreviousEstimate[2]);
  }

  return null;
}
