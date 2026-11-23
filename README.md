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
- `scripts/build.mjs`: empacota o frontend e a API em Worker ES Module; a hospedagem usa D1 no binding DB.
- `tests/api.test.mjs`: cadastro, autenticação, bloqueio de aulas, avaliação, repetição sem duplicar XP, persistência entre sessões, isolamento e rejeição de outra origem.

Senhas usam PBKDF2-SHA256 com salt individual e 100.000 iterações. As sessões têm tokens aleatórios, armazenados como hash, e cookies HttpOnly/SameSite; Secure em HTTPS. Consultas SQL são parametrizadas. O servidor calcula a pontuação e controla os desbloqueios.

## Escopo e limites

Esta é uma primeira versão funcional do produto, com conteúdo introdutório. O modelo conceitual dos documentos foi adaptado: conteúdo editorial é versionado em código, e usuários/sessões/progresso ficam no banco. Assinaturas não foram implementadas porque aparecem apenas no modelo de exemplo, sem requisito funcional de cobrança. Não foram importados nomes, matrículas, contas, vídeos de exemplo ou supostas assinaturas dos documentos.

O treino livre não concede XP; os pontos vêm das aulas avaliadas. Piano acústico, guitarra elétrica limpa e bateria usam amostras instrumentais FluidR3, incorporadas ao projeto. Somente o clique do metrônomo é sintetizado. As transições usam View Transitions com alternativa CSS e respeitam a preferência por movimento reduzido. As atividades instrumentais orientam a prática, sem análise automática de microfone ou MIDI. Fontes Google têm fallback local. A aplicação não inclui recuperação de senha por e-mail, verificação de e-mail, administração de conteúdo, cobrança ou proteção avançada contra abuso. Esses itens devem ser planejados antes de abrir um serviço público amplo.

Testes automatizados cobrem as regras centrais; não substituem testes de usabilidade com pessoas de diferentes idades nem uma auditoria completa de acessibilidade.

