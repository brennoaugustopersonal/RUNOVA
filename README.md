# RUNOVA 🏃‍♂️🔥

> **RUNOVA** é um aplicativo web mobile-first de alta performance para acompanhamento de corridas pessoais. Projetado com estética moderna em **Tema Escuro (Preto Profundo)**, superfícies **Glassmorphism**, iluminação vibrante em gradiente **Laranja (`#ff6d2e`)** e **Amarelo (`#ffb800`)**, telemetria em tempo real e gráficos visuais comparativos de desempenho.

---

## 🌟 Principais Funcionalidades

- **📱 Design Mobile-First & Navigation Thumb-Friendly:** Interface projetada para utilização confortável com apenas uma mão em smartphones.
- **⚡ Telemetria em Tempo Real:** Cronômetro com tipografia tabular limpa, anel de progresso circular animado em gradiente SVG, cálculo instantâneo de ritmo (min/km), velocidade (km/h), distância (km) e calorias (kcal).
- **📡 Suporte Duplo: GPS Real & Modo Simulador:** 
  - **Modo GPS Real:** Rastreia coordenadas em tempo real através da Geolocation API do smartphone e calcula distâncias exatas com a fórmula de Haversine.
  - **Modo Simulador:** Permite testar corridas e acelerações (1x, 5x, 10x) no desktop sem necessidade de caminhar na rua.
- **📊 Comparativo Visual de Desempenho:** Gráfico de barras que compara automaticamente o ritmo médio da corrida atual com o histórico prévio, exibindo métricas de evolução (ex: `⚡ +4.2% Mais Rápido`).
- **🔊 Feedback Sonoro Nativo:** Sinais sonoros sintetizados via Web Audio API nativa para início, pausa e comemoração de objetivo atingido.
- **📲 Suporte PWA (Progressive Web App):** Instalável como app nativo na tela inicial do iOS/Android.
- **💾 Persistência de Dados Local:** Armazenamento offline seguro via `LocalStorage`.

---

## 🛠️ Tecnologias Utilizadas

- **Framework Core:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Estilização & Design System:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Geolocalização & Áudio:** HTML5 Geolocation API + Web Audio API Sintética
- **Deploy Ready:** Vercel, Netlify, GitHub Pages

---

## 🏗️ Arquitetura do Projeto

O projeto segue princípios de **Clean Architecture**:

```
RUNOVA/
├── public/
│   ├── favicon.svg          # Ícone oficial em vetor
│   └── manifest.json        # Configuração PWA para celulares
├── src/
│   ├── components/          # Componentes visuais de UI
│   │   ├── Header.jsx       # Topo com logo e indicador de status
│   │   ├── BottomNav.jsx    # Navegação inferior fixa com FAB
│   │   ├── ActiveRunView.jsx# Tela cheia da corrida ativa com Ring SVG
│   │   ├── SetupRunModal.jsx# Configuração de metas de distância e tempo
│   │   ├── PerformanceChart.jsx # Gráfico de barras comparativo
│   │   ├── SessionSummaryModal.jsx # Resumo comemorativo de fim de treino
│   │   ├── HistoryView.jsx  # Lista de treinos realizados
│   │   └── RunDetailsModal.jsx # Detalhes da sessão
│   ├── hooks/               # Lógica de estado reativo
│   │   ├── useActiveRun.js  # Gerenciador da corrida ativa (GPS/Simulação)
│   │   └── useRunHistory.js # Gerenciador de histórico e acumulados
│   ├── services/            # Serviços de infraestrutura e negócios
│   │   ├── runSimulator.js  # Motor de simulação de telemetria
│   │   ├── storageService.js# Persistência em LocalStorage
│   │   └── soundService.js  # Síntese de áudio via Web Audio API
│   ├── utils/               # Funções puras de utilidades e matemática
│   │   ├── calculations.js  # Haversine, ritmo, velocidade, calorias
│   │   └── formatters.js    # Formatação de datas e números em PT-BR
│   ├── index.css            # Tokens de estilo, glassmorphism e animações
│   ├── App.jsx              # Componente raiz da aplicação
│   └── main.jsx             # Ponto de entrada React
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (versão 18+ recomendada)
- npm ou yarn

### Passos:
```bash
# 1. Clonar o repositório
git clone https://github.com/brennoaugustopersonal/RUNOVA.git

# 2. Entrar na pasta do projeto
cd RUNOVA

# 3. Instalar dependências
npm install

# 4. Iniciar o servidor de desenvolvimento
npm run dev
```

Abra o navegador em `http://localhost:3000`.

---

## 📦 Build para Produção

Para gerar o pacote otimizado de produção:

```bash
npm run build
```

Os arquivos compilados estarão na pasta `/dist`, prontos para serem hospedados na Vercel, Netlify ou GitHub Pages.

---

## 🔒 Segurança e Privacidade

- **Sem Coleta de Dados Externos:** Toda a telemetria e o histórico são armazenados estritamente no dispositivo do usuário (`LocalStorage`).
- **Permissão de GPS:** O acesso à localização é solicitado estritamente durante o uso do modo GPS Real e não é enviado a nenhum servidor externo.

---

## 📄 Licença

Este projeto é disponibilizado sob a licença [MIT](LICENSE).

---
*RUNOVA — Desenvolvido para transformar seus treinos de corrida.*
