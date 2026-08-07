# Metodologia de Colaboração com o Bolt.new

> **Local canônico deste arquivo:** `docs/bolt-metodologia.md` neste repositório (`murounedecor-creator/AppMurounedecor`, branch `main`).
> Ambas as contas Claude usadas neste projeto devem ler esta versão — não manter cópia local divergente.
> Ao propor uma mudança de conteúdo, editar este arquivo direto no GitHub (não regravar do zero em outra conversa).

Este documento não é sobre um projeto específico — é sobre como o Bolt.new se comporta de verdade, baseado em evidência observada (acertos e erros reais deste projeto), e como escrever prompts que funcionam bem dado esse comportamento. Aplica-se a qualquer projeto construído no Bolt.new.

## 1. O Bolt roda sobre modelos Claude

**Fato confirmado pela documentação oficial do Bolt** (não é uma dedução feita a partir dos dados de erro deste projeto — é informação de mercado, citada aqui para justificar por que técnicas de prompt engineering do Claude se aplicam diretamente): o Bolt usa Sonnet como modelo padrão, com Opus disponível para tarefas de raciocínio mais pesado. Isso significa que:

- Tags XML/delimitadores estruturados são processados com mais precisão do que texto corrido — usar seções claras (escopo, o que corrigir, o que NÃO alterar, critério de aceite) em vez de parágrafo único.
- Primacy/recency bias: a instrução mais crítica deve vir no início ou repetida no fim.
- Instrução negativa explícita funciona: "NÃO altere X" é mais eficaz do que confiar em inferência.
- Hierarquia numerada reduz ambiguidade em prompts com várias etapas.

Tratar um prompt pro Bolt como se fosse system prompt direto pro Claude — porque, na prática, é isso que acontece.

## 2. Mecânica de custo — o que realmente consome token

Fato observado e confirmado na documentação do Bolt: a cada mensagem, o Bolt resincroniza o projeto inteiro para o contexto da IA. Esse é o maior custo — não o tamanho do texto digitado.

- Projetos maiores custam mais por mensagem (150k–500k tokens é comum em projeto de porte médio).
- 1 mensagem por tarefa pequena multiplica o custo de resincronização à toa.
- 1 mensagem gigante reduz esse custo fixo, mas troca por risco pior: uma sessão de debug de mudança grande malsucedida pode consumir 7–12 milhões de tokens.

**Regra prática:** agrupar correções por causa raiz, não por ordem de identificação. Duas tarefas do mesmo tipo de bug em telas diferentes vão na mesma mensagem. Tarefas que mexem em dado salvo (sincronização, exclusão em massa) ou reintroduzem algo já removido por erro anterior vão sozinhas, isoladas.

Antes de qualquer sequência de mensagens, perguntar o saldo de tokens restante. Se estiver baixo, priorizar mensagens que corrigem dado real sobre as cosméticas.

## 3. Economia radical: quando NÃO usar o Bolt

**Confirmado como o padrão mais barato e mais seguro deste projeto:** para uma correção pontual e localizada (1 arquivo, poucas linhas, sem mudança de schema ou lógica de negócio), o caminho mais barato não é um prompt bem escrito pro Bolt — é pular o Bolt inteiramente.

Protocolo:
1. Localizar o arquivo e a linha exata direto no GitHub (usar zip download `https://codeload.github.com/[owner]/[repo]/zip/refs/heads/main` para inspecionar, se precisar ler várias telas de uma vez).
2. Editar diretamente no editor web do GitHub.
3. Antes de commitar, verificar sintaxe (ex: `npx tsc --noEmit` com as flags apropriadas para o projeto) — nunca commitar sem essa checagem.
4. Só reservar uma mensagem de Bolt para: lógica nova, mudança de schema, algo que exige o Bolt "entender" várias partes do projeto ao mesmo tempo, ou uma correção grande demais para editar linha a linha com segurança.

Isso não substitui a seção 2 — reforça: o prompt mais eficiente às vezes é nenhum prompt.

## 4. Protocolo de diagnóstico antes de corrigir

Para qualquer lote de correções não-trivial, mandar primeiro uma mensagem só de diagnóstico (sem aplicar nada), e usar a resposta para escrever as próximas mensagens com precisão cirúrgica.

**Lição confirmada por erro real:** um diagnóstico só é confiável para o que foi explicitamente pedido. Pergunta aberta demais ("liste componentes que truncam texto") gera varredura plausível que pode ignorar telas inteiras com evidência fotográfica real do mesmo problema.

Depois de receber a resposta, cruzar contra a evidência original (prints, sintomas relatados) e apontar explicitamente qualquer caso conhecido que não apareceu, pedindo localização específica — nunca assumir que "não encontrado" significa "não existe".

## 5. Ceticismo entre sessões, contas e o próprio Bolt

**Regra generalizada a partir de um erro real deste projeto:** nenhum diagnóstico é fato confirmado só porque veio de uma fonte de IA — seja o Bolt relatando sucesso, esta conta Claude em sessão anterior, ou a outra conta Claude usada em paralelo neste projeto.

Já aconteceu: uma sessão anterior desta própria conta afirmou que duas telas usavam a mesma fonte de dados quando na verdade uma usa AsyncStorage e outra usa tabela Supabase — um erro que só foi pego porque foi conferido no código real depois.

Protocolo obrigatório:
- Diagnóstico do Bolt ("arquivo salvo", "correção aplicada", "nenhuma outra configuração foi alterada") → conferir o conteúdo real do arquivo ou print do resultado antes de encerrar a tarefa.
- Diagnóstico de uma sessão anterior (desta conta ou da outra) → tratar como hipótese até bater contra o código real do GitHub, nunca reafirmar sem checar.
- Se duas contas/sessões divergem sobre um mesmo ponto técnico, a fonte de verdade é sempre o código no GitHub, nunca a sessão que "parece mais confiante".

## 6. Arquivo binário (imagem) — limite real da interface de chat

Anexar imagem pelo chat e pedir para o Bolt "salvar" não preserva o binário de forma confiável — já produziu ícone corrompido/vazio neste projeto.

Único caminho confiável:
1. Visualização de Código (`</>`) dentro do Bolt, subindo o arquivo direto na árvore — não consome token, preserva o binário real.
2. Ou, se o upload direto no Bolt não funcionar bem no celular: subir pelo GitHub (seção 8) e usar "Atualizar" no Bolt pra sincronizar.

## 7. Estrutura de prompt que funciona bem para o BoltPrompts vagos ("melhore isso", "conserte os bugs") tendem a gerar reescrita ampla e imprevisível — o oposto do que se quer numa ferramenta que cobra por resincronização de projeto inteiro.

## 8. Riscos técnicos conhecidos

- Módulos nativos com binário compilado (ex: acesso a contatos, câmera nativa) tendem a ser instáveis no WebContainer. Se um já causou crash antes, qualquer reintrodução exige teste isolado, nunca integração direta.
- Supabase + RLS: `.delete()`/`.update()` podem ser bloqueados por política de segurança sem lançar erro. Botão que "não funciona" sem erro no console → suspeitar de RLS antes de lógica de componente.
- Build nativo não roda dentro do Bolt (sem Xcode/Android Studio) — builds via EAS (cloud), disparado de fora (Termux ou botão de publicação do Bolt, se confirmado).
- Termux (Android) rodando EAS CLI pode reportar 0 núcleos de CPU, quebrando cálculo de concorrência (erro típico: "Expected concurrency to be a number from 1 and up"). Correção: `EAS_SKIP_AUTO_FINGERPRINT=1` antes do comando `eas build`.

## 9. Workflow mobile-only (Bolt + GitHub, sem desktop)

- Upload de arquivo binário pelo GitHub exige que a pasta de destino já exista — link direto pra pasta inexistente retorna 404.
- Pasta vazia desaparece do Git quando o último arquivo é apagado — normal, não é bug.
- Para recriar pasta pelo celular: "Create new file", digitar caminho completo no campo de nome (ex: `pasta/subpasta/.gitkeep`) — o `/` cria a estrutura sozinho.
- Campo de renomear durante upload pode não ficar editável no navegador mobile — renomear no gerenciador de arquivos do celular antes de subir.
- Sempre confirmar visualmente "Commit directly to the main branch" antes de finalizar — marcar sem querer "Create a new branch" manda os arquivos pra um lugar que o Bolt não sincroniza.

## 10. Protocolo de decisão em caso de ambiguidade ou conflito

Antes de escrever um prompt novo pro Bolt, checar:
1. Existe mais de um caminho de implementação razoável? Apresentar como escolha objetiva (A/B/C) e aguardar decisão.
2. A tarefa conflita com regra já estabelecida (reintroduzir algo que já causou crash, mudar paleta travada, mudar fórmula de negócio)? Sinalizar antes de prosseguir.
3. A tarefa depende de fato ainda não confirmado no código real? Confirmar antes, ou incluir a verificação como primeiro passo do próprio prompt.

## 11. Checklist antes de mandar qualquer mensagem ao Bolt

- [ ] Essa correção realmente precisa do Bolt, ou é mais barato editar direto no GitHub (seção 3)?
- [ ] A mensagem agrupa tarefas pela mesma causa raiz, sem virar 1-por-1 nem bloco gigante?
- [ ] Se depende de diagnóstico anterior, estou citando arquivo/linha exatos?
- [ ] Deixei explícito o que NÃO alterar?
- [ ] Incluí critério de aceite/teste no final?
- [ ] Se envolve arquivo binário, uso Código (`</>`) ou GitHub — não anexo por chat?
- [ ] Se envolve risco conhecido, pedi teste isolado + confirmação explícita?
- [ ] Vou conferir o resultado real (arquivo, print) antes de considerar concluído — não só o resumo em texto do Bolt (seção 5)?
