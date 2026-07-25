/**
 * Stub de `virtual:pwa-register` para os testes.
 * O módulo virtual só existe quando o plugin VitePWA está no pipeline,
 * e o Vite falha na análise estática do import mesmo dentro de try/catch.
 */
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
