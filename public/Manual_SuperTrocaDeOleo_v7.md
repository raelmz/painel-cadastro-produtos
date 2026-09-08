# Manual de Padrão de Cadastro de Produtos - Super Troca de Óleo v7

Documento de referência para padronização e enriquecimento de produtos no sistema DigiSat Comercial.

> v7 corrige dois problemas identificados na v6: (1) a unidade "UN" sendo inserida indevidamente na descrição de peças, e (2) o TIPO da descrição não bater com o SUBGRUPO escolhido (ex.: descrição "FILTRO AR PRIMARIO" com subgrupo "FILTRO DE AR MOTOR"). Também adiciona uma regra rígida de formatação de tabela para evitar saída "grudada" sem separadores.

## 1. Objetivo

(sem alteração da v6 — ver seção 1 do manual anterior)

Este manual define as regras obrigatórias de cadastro de produtos da Super Troca de Óleo, para padronizar descrição, marca, subgrupo, unidade e característica de cada item no DigiSat.

## 2. Contexto do Projeto

(sem alteração — ver v6, seção 2)

## 3. Campos Obrigatórios no DigiSat

| Campo | Regra |
|---|---|
| CÓDIGO INTERNO | Nunca alterar. É a chave de identificação do produto. |
| DESCRIÇÃO | Preencher com nome padronizado conforme este manual. |
| UNIDADE | LT, UN, KG, ML, JG ou outra unidade real da embalagem. |
| CARACTERÍSTICA | Veículos, motores, perfis recomendados ou enum fallback fechado. |
| SUBGRUPO | Usar somente a lista oficial/proposta deste manual. |
| MARCA | Apenas a marca do fabricante. |

## 4. Padrão de Descrição (CORRIGIDO NA v7)

A descrição deve seguir a lógica:

```text
TIPO + MARCA + ESPECIFICAÇÃO + [EMBALAGEM/VOLUME, apenas quando aplicável]
```

### 4.1 Regra do TIPO (NOVA — obrigatória)

O TIPO usado na descrição **deve ser exatamente a palavra-chave do SUBGRUPO escolhido**, nunca uma variação livre. A IA não pode escrever "FILTRO AR", "FILTRO AR PRIMARIO", "FILTRO DE AR PRIMÁRIO" etc. — deve usar sempre a forma fixa abaixo.

| SUBGRUPO | TIPO fixo a usar na descrição |
|---|---|
| FILTRO AR CABINE | FILTRO DE AR CABINE |
| FILTRO DE ÓLEO | FILTRO DE ÓLEO |
| FILTRO DE AR MOTOR | FILTRO DE AR MOTOR |
| FILTRO DE COMBUSTÍVEL | FILTRO DE COMBUSTÍVEL |
| FILTRO SEPARADOR | FILTRO SEPARADOR |
| FILTRO UREIA/ARLA | FILTRO DE UREIA/ARLA |
| FILTRO HIDRÁULICO | FILTRO HIDRÁULICO |
| KIT DE FILTROS | KIT DE FILTROS |
| ÓLEO MOTOR GASOLINA/FLEX | ÓLEO |
| ÓLEO MOTOR DIESEL | ÓLEO |
| ÓLEO MOTO 2T/4T | ÓLEO MOTO |
| ÓLEO CÂMBIO/DIFERENCIAL | ÓLEO CÂMBIO |
| FLUIDO TRANSMISSÃO ATF/CVT | FLUIDO |
| FLUIDO DE FREIO | FLUIDO DE FREIO |
| ADITIVO/RADIADOR | ADITIVO |
| ARLA 32 | ARLA 32 |
| GRAXA | GRAXA |
| PALHETA | PALHETA |
| PASTILHA DE FREIO | PASTILHA DE FREIO |
| BATERIA | BATERIA |
| LÂMPADA | LÂMPADA |
| AROMATIZANTE | AROMATIZANTE |
| LIMPEZA AUTOMOTIVA | (usar o nome real do produto: CERA, SILICONE, LIMPA CONTATO etc.) |
| ACESSÓRIOS/PEÇAS DIVERSAS | (usar o nome real do item) |
| [VERIFICAR SUBGRUPO] | (usar o nome mais próximo possível do produto original) |

**Regra prática:** escolha o SUBGRUPO primeiro. Depois, comece a descrição com o TIPO fixo correspondente da tabela acima. Nunca o contrário (nunca decidir a descrição livremente e só depois "encaixar" um subgrupo).

### 4.2 Regra da Unidade/Embalagem na Descrição (CORRIGIDA — antes causava erro)

- **Óleos, fluidos, graxa, aditivo, ARLA**: informar o volume/peso da embalagem no final da descrição (ex.: `1L`, `20L`, `500ML`, `1KG`), pois isso é informação relevante (o mesmo produto existe em vários tamanhos).
- **Peças unitárias (filtros, pastilhas, lâmpadas, palhetas, bateria, kit de filtros, acessórios)**: **NUNCA** escrever a unidade (`UN`) dentro da descrição. A unidade "UN" já vai separadamente na coluna `UNIDADE` — repeti-la na descrição não agrega informação e quebra o padrão.
  - ❌ Errado: `FILTRO DE AR MOTOR WEGA FAP2214 UN`
  - ✅ Correto: `FILTRO DE AR MOTOR WEGA FAP2214`

### 4.3 Demais regras (mantidas da v6)

- Escrever em maiúsculas.
- Para óleos, informar API quando existir.
- Para óleos, informar tipo de base: `SINT`, `SEMISSINT` ou `MINERAL`.
- Escrever viscosidade sem hífen: `5W30`, `15W40`, `20W50`.
- Não usar parênteses, barras decorativas, traços soltos ou espaços duplos.
- Não colocar códigos equivalentes entre marcas na descrição.

### 4.4 Exemplos corrigidos

| Descrição anterior | ❌ Erro que aconteceu na v6 | ✅ Descrição correta v7 |
|---|---|---|
| TR20457 1 ELEMENTO FILTRANTE AR PRIMARIO | FILTRO AR PRIMARIO TURBO FILTROS TR20457 UN | FILTRO DE AR MOTOR TURBO FILTROS TR20457 |
| FAP2214 FILTRO AR WEGA | FILTRO AR WEGA FAP2214 UN | FILTRO DE AR MOTOR WEGA FAP2214 |
| SHELL HELIX ULTRA ECT C2/C3 0W30 1LT | — | ÓLEO SHELL HELIX ULTRA ECT C2/C3 0W30 SINT 1L |

## 5. Subgrupos Fechados

(sem alteração — usar a mesma lista fechada da v6, seção 5, agora vinculada à tabela de TIPO da seção 4.1 acima)

## 6. Campo Característica

(sem alteração — mantém integralmente a v6, seções 6, 6.1, 6.1.1, 6.2, incluindo a Regra Anti-Preguiça sobre `PENDÊNCIA DE REVISÃO MANUAL`)

## 7. Padrões por Categoria (ATUALIZADO)

| Categoria | Fórmula da descrição | Subgrupo padrão | Unidade |
|---|---|---|---|
| Óleos gasolina/flex | ÓLEO MARCA LINHA VISCOSIDADE API BASE VOLUME | ÓLEO MOTOR GASOLINA/FLEX | LT |
| Óleos diesel | ÓLEO MARCA LINHA VISCOSIDADE API BASE VOLUME | ÓLEO MOTOR DIESEL | LT |
| Óleos moto | ÓLEO MOTO MARCA LINHA VISCOSIDADE API BASE VOLUME | ÓLEO MOTO 2T/4T | LT |
| Óleos câmbio/diferencial | ÓLEO CÂMBIO MARCA VISCOSIDADE ESPECIFICAÇÃO VOLUME | ÓLEO CÂMBIO/DIFERENCIAL | LT |
| Filtros (qualquer tipo) | [TIPO FIXO DA TABELA 4.1] MARCA CÓDIGO-FABRICANTE (sem unidade) | conforme tabela 4.1 | UN |
| Pastilha/palheta/lâmpada/bateria | [TIPO FIXO] MARCA CÓDIGO-FABRICANTE (sem unidade) | conforme tabela 4.1 | UN |
| Fluidos | FLUIDO TIPO MARCA ESPECIFICAÇÃO VOLUME | FLUIDO DE FREIO / FLUIDO TRANSMISSÃO ATF/CVT | LT/ML |
| Outros | TIPO MARCA ESPECIFICAÇÃO (+ VOLUME se aplicável) | Conforme tabela de subgrupos | Conforme item |

## 8. Exemplos Reais

(mantém os exemplos da v6, seção 8 e 8.1, sem alteração)

## 9. Formato de Saída da Tabela (NOVO — obrigatório)

Este item existe porque em lotes anteriores a IA às vezes devolveu linhas "grudadas", sem os separadores `|`, tornando a tabela ilegível/impossível de colar no Excel.

Regras obrigatórias de formatação:

1. Cada produto = **exatamente uma linha** de tabela Markdown.
2. As 7 colunas devem estar **sempre** separadas por ` | ` (espaço, barra vertical, espaço), incluindo no início e no fim da linha (formato `| célula | célula | ... |`).
3. Nunca concatenar valores de colunas diferentes sem o separador `|`. Se uma célula contiver internamente informações de marca + código, ainda assim ela é **uma única célula**, e as colunas seguintes precisam do `|` antes delas.
4. Antes de enviar a resposta, revisar cada linha e confirmar que ela tem exatamente 6 caracteres `|` (7 colunas = 6 separadores internos, mais os 2 das bordas se estiver usando formato Markdown padrão).
5. Não escrever nenhum texto antes ou depois da tabela, exceto o cabeçalho de colunas pedido.

Cabeçalho fixo obrigatório:

```
CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA
```

## 10. Checklist Antes de Gravar

- A descrição começa com o TIPO fixo correspondente ao SUBGRUPO (tabela 4.1).
- Se for óleo/fluido/graxa/aditivo/ARLA: o volume está no final da descrição.
- Se for peça unitária (filtro, pastilha, lâmpada, palheta, bateria, acessório): a descrição **não** contém "UN" nem qualquer unidade.
- Para óleos, API foi preenchido quando existir.
- Para óleos, base foi preenchida: `SINT`, `SEMISSINT` ou `MINERAL`.
- A marca está preenchida separadamente.
- O subgrupo está na lista fechada.
- A característica segue a regra de prioridade (ver seção 6).
- Se for fallback, a característica está exatamente na enum fechada.
- Produto com `[VERIFICAR]` ou `[VERIFICAR EMBALAGEM]` foi marcado como pendência.
- Se CARACTERÍSTICA ficou como `PENDÊNCIA DE REVISÃO MANUAL`, houve pesquisa real do código de fabricante antes disso.
- A tabela de saída está com todas as linhas usando o separador `|` corretamente, sem nenhuma linha "grudada".
