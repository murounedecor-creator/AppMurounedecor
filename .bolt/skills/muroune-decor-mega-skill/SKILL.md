---
name: muroune-decor-mega-skill
description: Use esta habilidade SEMPRE que a conversa envolver o projeto Muroune Decor / Mourone Decorações — app React Native/Expo/Supabase/Bolt.new gerenciado por Samir (Muroune) e 2 colaboradores, inteiramente pelo celular Android. Aciona para qualquer diagnóstico de bug, escrita/auditoria de prompt para o Bolt, decisão técnica ou de produto, dúvida de workflow mobile-only (Termux, GitHub, EAS, Supabase SQL Editor), sincronização multi-colaborador (Bolt→GitHub→Termux→EAS), ou pedido de engenharia de prompt em geral. Use também quando o usuário mencionar "colaboradores", "outra conta Claude", "Bolt", "docs/bolt-metodologia.md", "git pull"/"git stash", build travado, ou pedir para "confira, reconfira e confirme". Esta habilidade trabalha em conjunto com o Super Prompt de instruções do projeto — não o substitui, executa o processo que o Super Prompt define.
---

# Muroune Decor — Mega Habilidade (v2, Avançada)
## Prompt Engineering + Metodologia Bolt + Sincronização Multi-Colaborador + Execução

Esta habilidade é o **motor de execução** do Super Prompt do projeto Muroune. O Super Prompt define *quem você é* e *o que já sabe* (contexto, marca, stack, histórico). Esta habilidade define *o processo passo a passo* que você segue toda vez que precisa: (a) diagnosticar algo no app, (b) escrever ou auditar um prompt para o Bolt, (c) sincronizar código entre múltiplos colaboradores e plataformas, ou (d) qualquer outra tarefa de prompt engineering, dentro ou fora do Muroune.

Se o Super Prompt ainda não foi colado nesta conversa, funcione mesmo assim com o que estiver disponível nos arquivos do projeto — mas avise que idealmente o Super Prompt deveria estar carregado primeiro.

---

## 0. Roteador — qual processo usar

Classifique o pedido antes de agir. Não pule esta etapa.

| O pedido é sobre... | Vá para |
|---|---|
| Um bug/comportamento estranho no app (algo não funciona como deveria) | Seção 1 |
| Build sem as mudanças esperadas, colaborador editou e "sumiu", Termux desatualizado | Seção 2 |
| Escrever, revisar ou melhorar um prompt para o Bolt.new | Seção 3 |
| Criar/auditar/melhorar QUALQUER outro prompt (não-Bolt) | Seção 4 |
| Decisão de produto, priorização, ou "o que fazer agora" | Seção 5 |
| Dar/revisar acesso de colaborador em GitHub/Bolt/Supabase/Expo | Seção 6 |

Pedidos combinados: execute em sequência (ex: "esse bug ainda existe? se sim, escreve o prompt" → Seção 1, depois Seção 3).

---

## 1. Protocolo de Diagnóstico (bug relatado ou suspeitado)

**Regra de ouro, não negociável:** nunca declare um bug como "corrigido" ou "não existe" com base em memória, resumo de sessão anterior, ou relato do Bolt/outra conta. Sempre confira o código real, ou peça pro usuário confirmar visualmente no app antes de fechar o item.

Passos:

1. **Colete evidência concreta.** Print anotado? Mensagem de erro literal? Comportamento específico ("faz X quando deveria fazer Y", nunca "não funciona")? Se faltar isso, peça — mas só faça UMA pergunta objetiva antes de já começar a investigar o que puder com o que tem.
2. **Verifique no código real** quando disponível — nunca assuma que o Histórico de Bugs do Super Prompt (Parte 6) ainda reflete o estado atual sem checar, mesmo que pareça óbvio.
3. **Formule hipótese de causa raiz**, citando arquivo e linha exatos quando possível. Padrões já vistos neste projeto, revisar primeiro (lista viva — cresce a cada bug real diagnosticado):
   - Dessincronia entre dois armazenamentos (AsyncStorage vs. Supabase) — sempre suspeitar quando "um lugar mostra, o outro não".
   - Coluna de banco com tipo incompatível com o dado real (ex: `INTEGER` recebendo decimal) — inserts falham silenciosamente se o código não checa `error` do Supabase.
   - RLS bloqueando `.delete()`/`.update()` sem lançar erro visível.
   - **`useEffect` sem `useFocusEffect`** — tela não recarrega ao voltar de navegação; sintoma característico: "só atualiza se eu fechar e abrir o app de novo". Já confirmado em Dashboard e aba Pedidos — checar esse padrão em QUALQUER tela nova que exiba lista/contador antes de assumir causa diferente.
   - `overflow: 'hidden'` + texto em negrito cortando 1-2 caracteres.
   - Teclado sobrepondo campo — falta `KeyboardAvoidingView` + `ScrollView keyboardShouldPersistTaps="handled"`.
   - Variável de ambiente (`EXPO_PUBLIC_*`) desatualizada entre `.env` local, EAS `preview`, e EAS `production` — os três podem divergir.
   - **Ação que grava em duas tabelas relacionadas sem trava contra duplicidade** (ex: gerar recibo → lançamento financeiro): se a ação puder ser disparada mais de uma vez pelo usuário, suspeitar de INSERT sem checagem de existência prévia — correção padrão é UPSERT chaveado no identificador relacionado (`order_id`, etc.), nunca só "adicionar validação de clique duplo" na UI (isso não impede duplicidade real vinda de outra origem).
   - **Configuração/checkbox salvo mas sem efeito no cálculo** (ex: "Descontar Despesas Operacionais" marcado, resultado não muda): suspeitar que o valor é lido e exibido, mas a função de cálculo em si não consulta esse estado — checar se é problema de leitura (não persiste) ou de aplicação (persiste mas a fórmula ignora).
4. **Se a causa não for óbvia pela leitura do código**, proponha instrumentação temporária (`console.log` cirúrgico) em vez de adivinhar — peça o resultado antes de propor a correção final. Nunca deixe `console.log` de diagnóstico na versão final; sempre feche o ciclo com um prompt de limpeza.
5. **Confirme a correção de verdade** depois de aplicada — peça print ou log do resultado, nunca aceite "ficou bom" sem verificação.

---

## 2. Protocolo de Sincronização Multi-Colaborador (Bolt → GitHub → Termux → EAS)

**Quando acionar:** o usuário relata que gerou build e as mudanças de um colaborador (ou dele mesmo, feitas em outra sessão/dispositivo) não aparecem no APK. Este cenário já ocorreu de verdade neste projeto (07/08/2026) e tende a se repetir com 2+ colaboradores ativos — trate como rotina, não como incidente isolado.

**Por que acontece:** o pipeline tem 3 elos de sincronização manual, nenhum automático:

```
Bolt.new (colaborador edita)
   ↓ só sincroniza pro GitHub quando o DONO abre o projeto no Bolt
GitHub (repositório remoto)
   ↓ só chega no Termux com "git pull" manual
Termux (pasta local)
   ↓ "eas build" empacota o que está local, não busca do GitHub direto
EAS Build → APK
```

**Sequência de diagnóstico e correção, nesta ordem exata — não pule etapas:**

1. **Confirmar se a mudança chegou no GitHub.** Pedir para abrir a aba Commits do repositório e checar se o commit do colaborador aparece, com autor/horário compatíveis.
   - Se **não** aparece: o dono precisa abrir o projeto no Bolt.new com a própria conta primeiro (só o dono sincroniza Bolt→GitHub). Reconferir o GitHub depois.
   - Se **já** aparece: seguir para o passo 2.
2. **No Termux, rodar `git status` antes de qualquer build.** Se aparecer `Your branch is behind 'origin/main' by N commits`, é a causa confirmada.
3. **Checar se há mudança local não commitada** (comum: `app.json`, que o próprio `eas build` reescreve — permissões normalizadas com prefixo `android.permission.*`, e o bloco `extra.eas.projectId`). Nunca descartar sem olhar:
   ```
   git --no-pager diff app.json
   ```
   (usar `--no-pager` sempre no Termux — o pager padrão do Git costuma faltar nesse ambiente e o comando falha com `fatal: unable to execute pager 'pager'`).
   - Se for só normalização automática → seguro descartar com `git checkout -- app.json` antes do pull.
   - Se houver algo que precisa ser preservado (ex: `projectId` do EAS — **nunca perder esse campo**) → usar a sequência stash abaixo, nunca descartar.
4. **Sequência segura de sincronização** (preserva local E remoto, sem escolher um lado às cegas):
   ```
   git stash
   git pull origin main
   git stash pop
   ```
   - Se o `stash pop` reportar `CONFLICT`, **parar e pedir o print exato do conflito** antes de resolver — nunca aceitar automaticamente um dos lados.
   - Se reportar `Auto-merging app.json` sem a palavra `CONFLICT`, o merge foi limpo — seguro continuar.
5. **Só depois de tudo sincronizado, gerar o build:**
   ```
   EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform android --profile preview --no-wait
   ```
   (a flag `EAS_SKIP_AUTO_FINGERPRINT=1` evita o erro conhecido `Expected 'concurrency' to be a number from 1 and up`, que ocorre quando o Termux/EAS reporta 0 núcleos de CPU disponíveis.)
6. **Depois do APK instalado, confirmar visualmente** — nunca aceitar "compilou sem erro" como prova de que as mudanças do colaborador estão realmente lá. Pedir para abrir as telas específicas que foram mexidas.

**Checklist de rotina a repassar ao usuário** toda vez que um colaborador tiver editado algo antes de um novo build:
- [ ] Dono abriu o Bolt com a própria conta antes de ir pro Termux?
- [ ] Commit do colaborador confirmado no GitHub (aba Commits)?
- [ ] `git status` no Termux checado antes do build?
- [ ] Se havia mudança local, foi conferida com `git --no-pager diff` antes de decidir descartar ou guardar?
- [ ] Build gerado com `EAS_SKIP_AUTO_FINGERPRINT=1`?
- [ ] Mudança conferida visualmente no APK instalado, não só "buildou sem erro"?

---

## 3. Motor de Prompt para o Bolt.new

Use sempre que for escrever ou revisar um prompt que vai ser colado no Bolt. Siga `docs/bolt-metodologia.md` (ou a Parte 8 do Super Prompt) como regras de fundo; esta seção é o processo de montagem.

### 3.1 — Antes de escrever qualquer coisa

- **É mesmo o Bolt que precisa disso?** Se for correção pontual (1 arquivo, poucas linhas, sem mudança de schema/lógica), a resposta certa costuma ser "não, edita direto no GitHub" — diga isso em vez de escrever o prompt.
- **Já existe diagnóstico confirmado?** Se sim, cite arquivo/linha exatos no prompt. Se não, o próprio prompt deve pedir diagnóstico primeiro (sem aplicar nada), separado da correção.
- **Quantas tarefas cabem nesta mensagem?** Agrupe por causa raiz, não por ordem em que foram descobertas. Duas correções de UI cortada em telas diferentes → mesma mensagem. Uma mudança de schema + uma mudança cosmética → mensagens separadas (risco desigual).
- **Se envolve dado financeiro/duplicidade** (lançamentos, recibos, pagamentos): tratar como risco alto — exigir critério de aceite explícito testando o cenário de repetição (ex: "gerar 2x, confirmar que só existe 1 registro"), nunca assumir que a trava funcionou só porque o Bolt disse que sim.
- **Pergunte o saldo de tokens** se a sequência for longa ou se já foi mencionado saldo baixo antes.

### 3.2 — Estrutura obrigatória do prompt

```
CONTEXTO/ACHADO:
[arquivo e linha exatos já confirmados — "não reprocurar"]

O QUE CORRIGIR:
1. [instrução numerada, comportamento antes → depois]
2. [...]

ESCOPO — NÃO ALTERAR:
- [lista explícita do que fica intocado]

CRITÉRIO DE ACEITE:
- [como testar, passo a passo, incluindo o que deve E o que não deve aparecer]
```

Regras de montagem:
- Trate o Bolt como se fosse o próprio Claude recebendo um system prompt — ele roda sobre Sonnet/Opus, então tags claras, negativas explícitas ("NÃO altere X") e hierarquia numerada funcionam.
- Instrução mais crítica sempre primeiro (primacy bias).
- Se houver risco técnico conhecido (módulo nativo com binário, ex: `expo-contacts`), exija teste isolado + confirmação explícita antes de integrar ao fluxo real — nunca aprove integração direta.
- Se envolver arquivo binário (imagem, ícone), nunca peça para anexar por chat — sempre Código (`</>`) no Bolt ou upload direto no GitHub.
- Se a mudança envolve regra de negócio nova (não só bug), confirme com o usuário antes de escrever — nunca infira comportamento ambíguo sozinho (ex: "o que exatamente deve sumir da tela depois de X" precisa de resposta explícita, não suposição).

### 3.3 — Depois que o Bolt responder

- Nunca aceite o resumo em texto do Bolt como prova. Peça para conferir o arquivo real (ou confira você mesmo, se tiver acesso ao repositório).
- Se o Bolt reportar que não encontrou algo que tinha evidência fotográfica real, não aceite "não encontrado = não existe" — peça para ele localizar de novo com mais contexto, ou localize você mesmo.
- Feche com uma reafirmação clara do que foi confirmado batendo com o código, e o que ainda está pendente.

---

## 4. Motor Geral de Prompt Engineering (qualquer prompt, não só Bolt)

Aplique o processo de 5 passos sempre que o pedido for criar, auditar ou melhorar um prompt para qualquer modelo/uso — clientes, personas, extração de dados, agentes, etc.

**Passo 1 — Diagnóstico:** objetivo real (separado do pedido literal), modelo-alvo, contexto de uso (produto vs. uso único vs. agente), tipo de output, 3 modos de falha mais prováveis.

**Passo 2 — Seleção de estratégia:** escolha técnicas com justificativa funcional (nunca por sofisticação). Referência rápida:

| Situação | Técnica |
|---|---|
| Raciocínio matemático/causa-raiz | Chain-of-Thought |
| Padrão de output muito específico | Few-Shot (3-5 exemplos, cobrindo edge case) |
| Role genérico demais | Role Prompting específico (título + anos + nicho + framework de pensamento) |
| Múltiplos cenários válidos | Tree of Thought |
| Agente com ferramentas | ReAct |
| Precisão crítica (financeiro, diagnóstico) | Self-Consistency |
| Formato crítico, modelo insiste em prefácio | Output Anchoring |
| Documento longo estruturado | Skeleton-of-Thought |

**Passo 3 — Construção:** monte com as seções necessárias, omitindo as que não se aplicam: `<role> <context> <objective> <instructions> <constraints> <output_format> <examples> <tone>`.

**Passo 4 — Auditoria antes de entregar** (checklist mental, não pule):
- Clareza: cada instrução tem 1 única interpretação?
- Completude: formato 100% especificado? Edge cases cobertos? Instrução para incerteza?
- Robustez: instruções se contradizem? O modelo poderia escapar de alguma constraint?
- Eficiência: há redundância? A ordem está otimizada (crítico → suporte)?

**Passo 5 — Entrega:** prompt principal em bloco de código → variante (mais curta OU mais robusta) → decisões técnicas (máx. 5 pontos) → pontos de atenção → 2-3 inputs de teste sugeridos.

**Regras absolutas:** nunca entregue prompt genérico; nunca use instrução vaga ("seja criativo", "responda bem"); sempre especifique formato; sempre inclua constraints explícitas; ambiguidade → no máximo 2 perguntas antes de criar; prioridade Clareza > Completude > Brevidade > Elegância; ao melhorar prompt existente, diagnostique os problemas ANTES de reescrever, e mostre o diff das mudanças mais importantes.

---

## 5. Protocolo de Priorização (decisão de produto / "o que fazer agora")

Quando o pedido for do tipo "qual dessas pendências atacar primeiro" ou "o que fazer agora":

1. Liste as pendências reais conhecidas (cheque a Parte 6 do Super Prompt e/ou `docs/bolt-metodologia.md` — mas confirme status atual antes de assumir que a lista ainda é válida).
2. Classifique cada uma em 3 eixos:
   - **Dado real vs. cosmético** — bug que corrompe/perde dado do cliente ou dinheiro (ex: duplicidade de lançamento financeiro) sempre vence sobre UI.
   - **Custo estimado** (baixo = editar no GitHub direto; médio = 1 mensagem Bolt; alto = mensagem Bolt + teste isolado + risco conhecido).
   - **Bloqueio** — algo que impede testar/usar o resto do app (ex: build desatualizado por dessincronia multi-colaborador) sempre vem primeiro, mesmo que pareça "só configuração".
3. Apresente a recomendação com a justificativa dos 3 eixos, não apenas a ordem — e pergunte se o Samir concorda antes de agir. Se houver mais de um caminho razoável, apresente como escolha objetiva.

---

## 6. Protocolo de Acesso Multi-Colaborador (GitHub / Bolt / Supabase / Expo)

**Quando acionar:** pedido de convidar/revisar colaborador em qualquer uma das 4 plataformas do projeto.

Lembrar sempre: as 4 contas são independentes — acesso numa não implica acesso nas outras 3.

| Plataforma | Onde convidar | Nível recomendado para colaborador |
|---|---|---|
| GitHub | Settings → Collaborators (do repositório) | Write |
| Bolt.new | Botão Share, dentro do projeto → convite individual | Editor (nunca "Anyone with the link: Editor") |
| Supabase | Organização → Team → Invite | Developer |
| expo.dev/EAS | Organização → Members → Invite (exige conta pessoal já convertida/associada a uma Organization) | Developer |

Avisos a repassar sempre que orientar sobre Bolt com colaboradores:
- Só o dono do projeto conecta/gerencia o GitHub dentro do Bolt — colaboradores não veem esse botão, e mudanças deles só sobem pro GitHub quando o dono reabre o projeto (ver Seção 2).
- Multiplayer do Bolt processa um prompt de cada vez; token consumido é da conta de quem prompta, não do dono.
- No Supabase e no Expo, evitar dar Owner/Admin para colaboradores a menos que um deles vá administrar o projeto no lugar do dono.

---

## 7. Frases e padrões a evitar (aprendidos de erros reais deste projeto)

- Nunca diga "está tudo certo" sem ter conferido o artefato real (arquivo, print, log) nesta mesma resposta.
- Nunca reafirme um diagnóstico de outra sessão/conta como fato — sempre "vou confirmar" antes de "está confirmado".
- Nunca assuma que duas telas usam a mesma fonte de dados sem checar cada uma individualmente (erro real já cometido: AsyncStorage vs. Supabase confundidos).
- Nunca aceite "Bolt disse sucesso" como prova de que uma gravação no banco funcionou — Supabase pode falhar silenciosamente (RLS, tipo de coluna incompatível) sem lançar erro se o código não checa.
- Nunca proponha remover `console.log` de diagnóstico sem confirmar antes que o bug foi mesmo resolvido — a ordem é: confirmar → depois limpar.
- Nunca assuma que "buildou sem erro" significa "as mudanças do colaborador estão no APK" — confirmar sincronização (Seção 2) antes de aceitar isso como resolvido.
- Nunca descarte `app.json` com `git checkout --` sem antes rodar `git --no-pager diff` — pode conter `projectId` ou outro dado que não deve ser perdido.
- Nunca infira uma regra de negócio ambígua (ex: "o que some da tela depois de X acontecer") — sempre confirmar com o usuário antes de prompt-ar ao Bolt.

---

## 8. Como esta habilidade se relaciona com o Super Prompt

- O **Super Prompt** = quem você é + o que já sabe (identidade, marca, stack, histórico de bugs, Parte 8 = metodologia Bolt detalhada incluindo o fluxo multi-colaborador da Seção 2 acima).
- Esta **Mega Habilidade** = como você processa qualquer tarefa nova (diagnóstico, sincronização multi-colaborador, prompt para o Bolt, prompt geral, priorização, gestão de acesso).
- Se os dois divergirem em algum ponto factual sobre o projeto (ex: status de um bug), o código real vence os dois — sinalize a divergência e sugira atualizar ambos os documentos.
- Toda vez que um novo padrão de bug ou um novo procedimento operacional for confirmado em produção (como o fluxo Bolt→GitHub→Termux→EAS desta versão), ele deve ser incorporado tanto ao Super Prompt (Parte 6 ou 8) quanto a esta habilidade — os dois documentos crescem juntos, nunca um sem o outro.
