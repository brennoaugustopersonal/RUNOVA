# RUNOVA 🏃🔥

> **RUNOVA** é um aplicativo web mobile-first para acompanhamento de corridas pessoais.
> Tema escuro profundo, superfícies *glassmorphism*, telemetria em tempo real, mapa de rota,
> zonas de frequência cardíaca e análise de evolução — **100 % gratuito, offline e sem servidor**.

---

## 🌟 Funcionalidades

### Corrida
- 📡 **GPS real** com filtro de precisão, descarte de jitter e detecção de sinal degradado
- 🎮 **Modo simulador** para treino indoor, claramente marcado como simulado no histórico
- ⚡ Telemetria ao vivo: tempo, distância, ritmo instantâneo, velocidade, calorias, cadência
- 🫀 Frequência cardíaca **real via Bluetooth LE** (perfil GATT 0x180D) ou estimada por Karvonen
- 🗣️ Coach de voz em português: início, pausa, cada quilômetro e alerta de desvio de ritmo
- ⏱️ Contagem regressiva animada com opção de pular
- 🔒 *Wake Lock* mantém a tela ligada e recupera o bloqueio ao voltar para o app
- 💾 **Recuperação de corrida** após queda do navegador (snapshot a cada 5 s e ao sair da aba)

### Análise
- 📉 Splits por quilômetro com barra proporcional e destaque do mais rápido
- ❤️ Gráfico de FC + **tempo em cada zona de treino** (Z1–Z5 sobre a FC máxima do perfil)
- 🏅 **Recordes pessoais** por distância clássica e **VO₂máx** estimado (Daniels & Gilbert)
- 📊 **Volume semanal** com alerta da regra dos 10 % (prevenção de lesão)
- 📈 Comparativo de ritmo entre sessões
- 🗺️ Mapa de rota interativo (OpenStreetMap + filtro CSS para tema escuro)
- ⛰️ Ganho de elevação e classificação do relevo

### Contexto e dados
- 🌤️ Clima atual, previsão de 3 dias, índice UV e **qualidade do ar** (Open-Meteo, sem chave)
- 🧭 Nome do local da corrida via Nominatim (OpenStreetMap)
- 🎯 *Score* de condições para correr com recomendação objetiva
- 🏆 12 conquistas desbloqueáveis, incluindo sequência de dias
- 📤 Exportação em **CSV** (Excel pt-BR), **JSON** (backup) e **GPX** (Strava/Garmin/Komoot)
- 📥 Importação de backup JSON
- 👤 Perfil com peso, altura, idade, FC de repouso e FC máxima — alimenta calorias e zonas
- 📏 Unidades métricas ou imperiais

### Plataforma
- 📲 PWA instalável, com atalhos e aviso de nova versão
- 🌐 Funciona **offline**: tiles, clima e assets em cache via Workbox
- ♿ Diálogos com `role="dialog"`, *focus trap*, Escape, alvos de toque ≥ 44 px e
  respeito a `prefers-reduced-motion`

---

## 🛠️ Stack

- **TypeScript** (modo `strict`) + **React 18** + **Vite 7**
- **Tailwind CSS 3** · **Lucide React** · **Leaflet**
- **Vitest** — 272 testes automatizados
- **ESLint 9** (flat config) com regras de React Hooks
- APIs nativas: Geolocation, Web Bluetooth, Web Audio, SpeechSynthesis, Wake Lock, Vibration

---

## 🚀 Scripts

```bash
npm run dev         # servidor de desenvolvimento
npm run typecheck   # verificação de tipos
npm run lint        # ESLint
npm test            # testes
npm run build       # typecheck + build de produção
npm run verify      # typecheck + lint + testes + build
```

---

## 🔒 Privacidade

Todo o histórico e as configurações ficam **apenas no dispositivo**, em `localStorage`.
Não há conta, servidor próprio, analytics nem rastreamento. As únicas requisições externas
são para APIs públicas e gratuitas de clima (Open-Meteo), geocodificação (Nominatim) e
tiles de mapa (OpenStreetMap) — todas declaradas na CSP do `index.html`.

> ⚠️ Calorias, frequência cardíaca estimada, zonas de treino e VO₂máx são **estimativas
> orientativas** e não substituem avaliação médica ou profissional.

---

## 📄 Licença

Distribuído sob a licença [MIT](LICENSE).
