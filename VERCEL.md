# Compasso na Vercel

O botão de lua/sol alterna o tema e salva a escolha neste navegador. Na primeira visita, segue a preferência do sistema, sem exibir o tema claro antes de carregar.

Projeto: `caigon1s-projects/compasso`. A implantação usa `npm run build:vercel` (Vite), funções Node.js em `api/` e banco Neon Postgres no plano gratuito, na região São Paulo. Configure `DATABASE_URL` exclusivamente no servidor, sem prefixo `VITE_`.

`.env.local`, `.vercel/` e o SQLite local são excluídos da entrega e do Git. As contas e o progresso do ambiente Vercel ficam no Neon. O SQLite local é um ambiente separado; dados locais não são transferidos automaticamente.

```sh
vercel link --project compasso --scope caigon1s-projects
vercel env pull .env.local --environment=production
npm run db:migrate
npm run build:vercel
vercel deploy --prod
```

O teste real do Postgres cria uma conta temporária exclusiva e a remove ao terminar:

```sh
npm run test:postgres
```

Configure um banco exclusivo de testes em `.env.test.local` antes desse comando. Consulte a seção de testes do README para aplicar o esquema e entender quais verificações usam substitutos controlados ou um banco real.

O desenvolvimento local usa `npm run dev` e SQLite. `npm run build` gera apenas os arquivos do frontend em `dist/`; `npm run build:vercel` executa o mesmo build para manter compatibilidade com a configuração da Vercel. A API em `api/` é implantada como funções Node.js, com persistência em Neon Postgres. O projeto não depende de configuração ou scripts da hospedagem anterior.
