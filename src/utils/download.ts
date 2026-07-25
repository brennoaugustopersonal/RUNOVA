/**
 * Downloads via Blob + object URL.
 * Substitui `data:` URLs, que estouram o limite de tamanho em Safari/iOS
 * e falham silenciosamente com históricos grandes.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Espera o navegador iniciar o download antes de liberar a URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(data: unknown, filename: string): void {
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }),
    filename
  );
}

/**
 * CSV com BOM UTF-8 e separador `;` — abre corretamente no Excel pt-BR
 * sem quebrar acentos nem juntar colunas.
 */
export function downloadCsv(rows: Array<Array<string | number>>, filename: string): void {
  const escapeCell = (cell: string | number): string => {
    const value = String(cell ?? '');
    return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\r\n');
  triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/** Exporta uma rota como GPX 1.1 — importável no Strava, Garmin e Komoot. */
export function downloadGpx(
  routePoints: Array<[number, number]>,
  name: string,
  startedAt: string,
  filename: string
): void {
  const time = new Date(startedAt).toISOString();
  const points = routePoints
    .map(([lat, lon]) => `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"></trkpt>`)
    .join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RUNOVA" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <type>running</type>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;

  triggerDownload(new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8' }), filename);
}
