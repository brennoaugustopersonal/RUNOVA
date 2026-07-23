# Política de Segurança do RUNOVA

## Versões Suportadas

| Versão | Suportada |
|--------|-----------|
| 1.x | ✅ |

## Privacidade

O RUNOVA é um aplicativo **sem backend**. Todos os dados de corrida, histórico e configurações são armazenados exclusivamente no `localStorage` do navegador do usuário. Nenhum dado pessoal é enviado para servidores externos.

As únicas requisições de rede feitas pelo aplicativo são:

1. **Open-Meteo API** — para obter dados meteorológicos atuais
2. **OpenStreetMap / CartoDB tiles** — para renderizar mapas
3. **ipapi.co** — para geolocalização aproximada por IP (apenas se a geolocalização do navegador falhar)

Todas as comunicações são feitas via HTTPS.

## Reportando Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança no RUNOVA, por favor abra uma issue no GitHub:

https://github.com/brennoaugustopersonal/RUNOVA/issues

Não divulgue publicamente até que a issue seja revisada.

## Medidas de Segurança

- Content Security Policy (CSP) configurada no `index.html`
- Service Worker com escopo restrito
- Sem dependências de backend ou banco de dados externo
- Proteção contra XSS via React e CSP
