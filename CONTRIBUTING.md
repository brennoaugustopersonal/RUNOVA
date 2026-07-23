# Contribuindo com o RUNOVA

Obrigado por considerar contribuir com o RUNOVA! 🏃‍♂️

## Como Contribuir

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b minha-feature`
3. Faça suas alterações
4. Execute os testes: `npm test`
5. Certifique-se de que o build funciona: `npm run build`
6. Envie um Pull Request

## Configuração do Ambiente

```bash
git clone https://github.com/brennoaugustopersonal/RUNOVA.git
cd RUNOVA
npm install
npm run dev
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm test` | Executa testes automatizados |
| `npm run build` | Gera build de produção com PWA |

## Tecnologias

- **React 18** — UI components
- **Vite 5** — Build tool
- **Tailwind CSS 3** — Estilização
- **Vitest** — Testes
- **Leaflet** — Mapas
- **Lucide React** — Ícones

## Convenções de Código

- Idioma: **PT-BR** (português brasileiro)
- Mobile-first, design responsivo
- Tema escuro (`#070709`)
- Componentes funcionais com hooks
- Testes unitários para toda lógica
- Commits descritivos em português

## Estrutura

```
src/
  components/   — Componentes React
  hooks/        — Custom hooks
  services/     — Lógica de serviços
  utils/        — Utilitários
  tests/        — Testes automatizados
```
