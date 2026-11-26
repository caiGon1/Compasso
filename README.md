# Compasso — teoria musical

Aplicação React baseada nos 19 requisitos funcionais do PDF e do JSON fornecidos. Interface em português, adaptada a computadores e celulares.

## Executar

Requer Node.js 24 ou superior.

```sh
npm install
npm run dev
```

Acesse http://127.0.0.1:5173. Crie uma conta pela interface; não há conta ou senha padrão. O banco SQLite local é criado automaticamente em `.local/compasso.sqlite`. Essa pasta é privada e excluída do controle de versão e da entrega compactada.

```sh
npm test
npm run build
```

## Funcionalidades

- Cadastro com nome, e-mail, senha, faixa etária e instrumento; login, logout e edição do perfil (RF003, RF019).
- Linguagem infantil, exemplos para adolescentes, explicações para adultos e duas ou três questões por aula conforme a idade (RF002, RF004).
- Cinco módulos, seis aulas completas, desbloqueio sequencial validado pelo servidor (RF005–RF010).
- Exercícios com feedback explicado; conclusão a partir de 60% de acerto; até 50 XP por aula. Refazer uma aula melhora a nota, sem acumular XP indevidamente (RF011–RF013).
- Guitarra: pentatônica, tablatura e reprodução de um solo; bateria: pads e prática de rock 4/4; piano: teclado por mouse/teclado e exercício de independência (RF014–RF016).
- Treino auditivo de direção melódica, aula de intervalos, pauta SVG, comparação de acordes e metrônomo de 40–180 BPM (RF017).
- Progresso, histórico, dias de prática e três medalhas persistentes por conta (RF018).

## Organização técnica

- `src/main.jsx`: telas React e componentes de atividades.
- `src/content.js`: módulos, aulas, questões, instrumentos e regras de sequência. Novas aulas podem ser adicionadas declarativamente.
- `src/audio.js`: reprodução de amostras FluidR3 com Web Audio, cache, envelopes e controle de polifonia; `src/samples.json` contém os MP3 incorporados. Créditos em AUDIO-CREDITS.md.
- `src/style.css`: identidade visual, responsividade e foco visível.
- `server/api.js`: API compartilhada por ambiente local e hospedado.
- `server/local.mjs`: Vite e adaptador SQLite para desenvolvimento.
- `drizzle/0000_initial.sql`: migração de usuários, sessões e progresso.
- `npm run build`: gera o frontend em `dist/` com Vite; `build:vercel` é um alias desse comando. As rotas em `api/` usam o handler Node.js e o adaptador Postgres para Vercel.
- `tests/api.test.mjs`: cadastro, autenticação, bloqueio de aulas, avaliação, repetição sem duplicar XP, persistência entre sessões, isolamento e rejeição de outra origem.

Senhas usam PBKDF2-SHA256 com salt individual e 100.000 iterações. As sessões têm tokens aleatórios, armazenados como hash, e cookies HttpOnly/SameSite; Secure em HTTPS. Consultas SQL são parametrizadas. O servidor calcula a pontuação e controla os desbloqueios.

## Testes automatizados

A suíte usa Vitest, React Testing Library, JSDOM e cobertura V8. Há testes para as funcionalidades implementadas, os fluxos de erro e a integração entre a interface, a API e o banco. Os testes verificam resultados observáveis, sem depender de snapshots da página.

### Executar

Com Node.js 24.x, na pasta do projeto:

```sh
npm ci
npm test
npm run test:coverage
```

- `npm test`: executa a suíte local uma vez; não exige login na Vercel nem conexão com banco externo.
- `npm run test:watch`: repete os testes durante o desenvolvimento.
- `npm run test:coverage`: executa os testes e gera `coverage/index.html` e `coverage/coverage-summary.json`.
- Para um arquivo específico: `npx vitest run tests/ui.test.jsx`.

### O que é testado

| Funcionalidade | Cenários principais | Arquivos em `tests/` |
| --- | --- | --- |
| Cadastro e login | Validação de campos, normalização, duplicidade de e-mail, senha incorreta, usuário desconhecido, hash de senha, token de sessão e cookies seguros | `api.test.mjs`, `api-validation.test.mjs`, `ui.test.jsx` |
| Sessões e logout | Token adulterado, expiração, invalidação do token antigo, limpeza do cookie e falha de rede ao sair | `api-validation.test.mjs`, `ui.test.jsx`, `ui-integration.test.jsx` |
| Perfil e faixa etária | Edição persistente, validação, adaptação da explicação e quantidade de perguntas para crianças, adolescentes e adultos | `api-validation.test.mjs`, `learning.test.mjs`, `ui.test.jsx` |
| Módulos e aulas | Integridade do conteúdo, sequência, bloqueio de aulas, trilha completa, envio desabilitado até responder, correção explicada e revisão após reprovação | `learning.test.mjs`, `ui.test.jsx` |
| Pontos e progresso | Reprovação, nota mínima, melhoria da nota, preservação da melhor tentativa, XP sem duplicação e isolamento de contas | `api.test.mjs`, `learning.test.mjs`, `ui-integration.test.jsx` |
| Conquistas e histórico | Totais de XP/aulas, medalhas conquistadas ou pendentes e atualização após conclusão de aula | `ui.test.jsx`, `ui-integration.test.jsx` |
| Piano e teclado | Cliques, sustenidos, atalhos, baixo com a outra mão, ignorar digitação em campos e repetição de tecla, remoção dos listeners | `ui.test.jsx`, `audio.test.mjs`, `audio-playback.test.mjs` |
| Guitarra e bateria | Solo com timbre de guitarra, pads de bumbo/caixa/chimbal e amostras distintas | `ui.test.jsx`, `audio.test.mjs`, `audio-playback.test.mjs` |
| Metrônomo | Pulso inicial, andamento, mudança de BPM, parada e cancelamento do timer ao desmontar | `ui.test.jsx`, `audio-playback.test.mjs` |
| Pauta, intervalos e acordes | Pauta acessível, reprodução de intervalos e notas das tríades maior/menor | `ui.test.jsx` |
| Treino auditivo | Resposta habilitada após ouvir, acerto/erro, contagem sem duplicação e novos desafios ascendentes, descendentes ou iguais | `ui.test.jsx` |
| Reprodução de áudio | Mapeamento de frequências, decodificação e cache, agendamento sincronizado, cancelamento durante carregamento, limite de vozes, liberação de nós e recuperação após falha | `audio-playback.test.mjs` |
| Modo claro/escuro | Tema inicial antes do React, preferência do sistema, escolha salva, alternância, cor do navegador e armazenamento bloqueado | `theme.test.jsx` |
| Navegação e transições | Navegação pelas telas e instrumentos, cancelamento de áudio ao sair, movimento reduzido e alternativa sem View Transitions | `ui.test.jsx` |
| API e erros | Origem externa bloqueada, JSON inválido, corpo grande, métodos/rotas desconhecidos e falhas do banco sem expor segredos | `api-validation.test.mjs` |
| Vercel e Postgres | Conversão de SQL, valores parametrizados, `first/all/run`, configuração/conexão, encaminhamento das seis rotas e resposta 503 | `postgres-adapter.test.mjs`, `vercel-handler.test.mjs` |

`ui-integration.test.jsx` percorre **React → API real → SQLite em memória → interface**: cria conta, conclui uma aula, confere XP e conquista, desmonta/remonta a aplicação para verificar persistência, edita o perfil e sai. O transporte HTTP é simulado; a API e as consultas ao banco são reais. Cada execução usa dados temporários, sem alterar `.local/compasso.sqlite`.

### Resultado verificado

Na execução de 26/11/2026: **86 testes aprovados e 1 teste de Postgres externo ignorado** por ser opcional. Cobertura do código de aplicação incluído no relatório:

| Métrica | Resultado |
| --- | ---: |
| Instruções | 97,53% |
| Ramificações | 95,14% |
| Funções | 95,54% |
| Linhas executáveis | 100% |

O comando de cobertura falha se ficar abaixo de 85% de instruções, linhas ou funções, ou de 80% de ramificações. Esses números não significam que todas as combinações possíveis foram testadas. O relatório inclui interface, tema, áudio, conteúdo, API e adaptador de Postgres; exclui somente o ponto de montagem `src/main.jsx`. Servidor de desenvolvimento e scripts de build/migração não entram nessa medição. As compilações são verificadas separadamente com `npm run build` e `npm run build:vercel`.

### Teste opcional com Postgres real

Use um **banco exclusivo de testes**, separado do banco de produção. Crie `.env.test.local` com `DATABASE_URL` no formato de `.env.example`; esse arquivo é ignorado pelo Git. Aplique o esquema nesse banco e execute:

```sh
node --env-file=.env.test.local scripts/migrate-postgres.mjs
npm run test:postgres
```

O teste cria uma conta temporária e a remove em `finally`, junto com suas sessões e seu progresso. Sem a execução explícita desse comando, ele fica ignorado, mesmo que exista `DATABASE_URL` no ambiente. O resultado local acima não inclui uma nova execução contra Neon/Vercel.

### Limites da verificação

Os testes de interface usam JSDOM. Os testes de reprodução simulam Web Audio para verificar agendamento e recursos, e validam as amostras MP3 incorporadas; a qualidade percebida dos timbres precisa de escuta humana. Aparência, responsividade em navegadores reais, usabilidade por faixa etária e auditoria completa de acessibilidade continuam exigindo verificação manual. Os testes do handler Vercel e do adaptador SQL usam substitutos controlados; o teste opcional de Postgres verifica o banco externo quando configurado.

## Escopo e limites

Esta é uma primeira versão funcional do produto, com conteúdo introdutório. O modelo conceitual dos documentos foi adaptado: conteúdo editorial é versionado em código, e usuários/sessões/progresso ficam no banco. Assinaturas não foram implementadas porque aparecem apenas no modelo de exemplo, sem requisito funcional de cobrança. Não foram importados nomes, matrículas, contas, vídeos de exemplo ou supostas assinaturas dos documentos.

O treino livre não concede XP; os pontos vêm das aulas avaliadas. Piano acústico, guitarra elétrica limpa e bateria usam amostras instrumentais FluidR3, incorporadas ao projeto. Somente o clique do metrônomo é sintetizado. As transições usam View Transitions com alternativa CSS e respeitam a preferência por movimento reduzido. As atividades instrumentais orientam a prática, sem análise automática de microfone ou MIDI. Fontes Google têm fallback local. A aplicação não inclui recuperação de senha por e-mail, verificação de e-mail, administração de conteúdo, cobrança ou proteção avançada contra abuso. Esses itens devem ser planejados antes de abrir um serviço público amplo.

Testes automatizados cobrem as regras centrais; não substituem testes de usabilidade com pessoas de diferentes idades nem uma auditoria completa de acessibilidade.

