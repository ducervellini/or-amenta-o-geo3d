

## Reordenação de Linhas e Subtítulos em Todas as Tabelas

### O que será feito

Duas funcionalidades novas aplicadas globalmente em todas as tabelas do sistema:

1. **Arrastar para reordenar (drag & drop)**: Cada linha terá um ícone de "grip" (⠿) à esquerda que permite arrastar a linha para cima ou para baixo, definindo a ordem desejada. Botões de seta (↑↓) também estarão disponíveis para mover sem arrastar.

2. **Inserção de subtítulos agrupadores**: Um botão "Inserir subtítulo" permitirá criar linhas de cabeçalho intermediárias (ex: "Fase 1", "Equipamentos pesados") que agrupam visualmente as linhas abaixo delas. Subtítulos podem ser editados, removidos e reposicionados como qualquer linha.

### Como funciona

**Banco de dados**: Uma nova tabela `row_ordering` armazenará a posição e os subtítulos:

```sql
create table public.row_ordering (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,           -- ex: 'servicos', 'materiais', 'cargos'
  registro_id uuid,               -- null para subtítulos
  posicao integer not null,
  subtitulo text,                  -- preenchido apenas para linhas de subtítulo
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
```

Isso permite que cada usuário tenha sua própria ordenação por tabela.

**Frontend**: 

- O componente `CrudPage` (usado por ~20 telas: Materiais, Serviços, Mercados, Áreas, Tributos, etc.) será atualizado para suportar reordenação e subtítulos de forma centralizada, beneficiando todas as telas automaticamente.
- As telas com tabelas customizadas (Composições, Cargos, Equipamentos, Orçamento, Dashboard) receberão a mesma lógica individualmente.
- Será usado `@dnd-kit/core` para drag & drop acessível e performático.

### Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Criar tabela `row_ordering` com RLS por `user_id` |
| `src/hooks/useRowOrdering.ts` | Novo hook: carrega/salva posições e subtítulos de `row_ordering`, fornece funções `moveUp`, `moveDown`, `insertSubtitle`, `removeSubtitle`, `reorder` |
| `src/components/crud/CrudPage.tsx` | Integrar `useRowOrdering` — adicionar coluna de grip/setas, intercalar subtítulos, botão "Inserir subtítulo" na toolbar |
| `src/components/ui/sortable-row.tsx` | Novo componente de linha arrastável com `@dnd-kit` |
| `src/pages/Composicoes.tsx` | Integrar reordenação nas linhas dentro de cada grupo |
| `src/pages/ComposicaoDetalhe.tsx` | Reordenação dos itens da composição |
| `src/pages/cadastros/Cargos.tsx` | Integrar reordenação (tabela customizada) |
| `src/pages/cadastros/Equipamentos.tsx` | Integrar reordenação (tabela customizada) |
| `src/pages/OrcamentoDetalhe.tsx` | Reordenação dos serviços no orçamento |
| `package.json` | Adicionar `@dnd-kit/core` e `@dnd-kit/sortable` |

### Fluxo do usuário

1. Abre qualquer tela com tabela (ex: Materiais, Serviços)
2. Arrasta linhas pelo ícone ⠿ ou usa setas ↑↓ para reposicionar
3. Clica "Inserir subtítulo" na barra de ferramentas → digita o texto → subtítulo aparece como linha de destaque
4. A ordem e subtítulos são salvos automaticamente no banco e persistem entre sessões

