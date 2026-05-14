export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_local_categorias: {
        Row: {
          ativo: boolean
          bloco: Database["public"]["Enums"]["admin_local_bloco"]
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          escala_padrao: Database["public"]["Enums"]["admin_local_escala"]
          frequencia_evento_padrao:
            | Database["public"]["Enums"]["admin_local_evento_freq"]
            | null
          id: string
          is_epi: boolean
          nome: string
          ordem: number
          unidade_padrao: string
          updated_at: string
          updated_by: string | null
          valor_referencia: number
          valor_referencia_data: string
          vida_util_meses: number | null
          vincula_cargo: boolean
        }
        Insert: {
          ativo?: boolean
          bloco: Database["public"]["Enums"]["admin_local_bloco"]
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          escala_padrao?: Database["public"]["Enums"]["admin_local_escala"]
          frequencia_evento_padrao?:
            | Database["public"]["Enums"]["admin_local_evento_freq"]
            | null
          id?: string
          is_epi?: boolean
          nome: string
          ordem?: number
          unidade_padrao?: string
          updated_at?: string
          updated_by?: string | null
          valor_referencia?: number
          valor_referencia_data?: string
          vida_util_meses?: number | null
          vincula_cargo?: boolean
        }
        Update: {
          ativo?: boolean
          bloco?: Database["public"]["Enums"]["admin_local_bloco"]
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          escala_padrao?: Database["public"]["Enums"]["admin_local_escala"]
          frequencia_evento_padrao?:
            | Database["public"]["Enums"]["admin_local_evento_freq"]
            | null
          id?: string
          is_epi?: boolean
          nome?: string
          ordem?: number
          unidade_padrao?: string
          updated_at?: string
          updated_by?: string | null
          valor_referencia?: number
          valor_referencia_data?: string
          vida_util_meses?: number | null
          vincula_cargo?: boolean
        }
        Relationships: []
      }
      admin_local_itens: {
        Row: {
          cargo_id: string | null
          categoria_id: string
          created_at: string
          created_by: string | null
          dedicacao_percentual: number
          deleted_at: string | null
          deleted_by: string | null
          escala_aplicada: Database["public"]["Enums"]["admin_local_escala"]
          frequencia_evento:
            | Database["public"]["Enums"]["admin_local_evento_freq"]
            | null
          id: string
          justificativa_override: string | null
          nome_customizado: string | null
          observacao: string | null
          orcamento_id: string
          ordem: number
          quantidade: number
          quantidade_manual: boolean
          total: number | null
          updated_at: string
          updated_by: string | null
          valor_unitario: number
          valor_unitario_manual: boolean
        }
        Insert: {
          cargo_id?: string | null
          categoria_id: string
          created_at?: string
          created_by?: string | null
          dedicacao_percentual?: number
          deleted_at?: string | null
          deleted_by?: string | null
          escala_aplicada: Database["public"]["Enums"]["admin_local_escala"]
          frequencia_evento?:
            | Database["public"]["Enums"]["admin_local_evento_freq"]
            | null
          id?: string
          justificativa_override?: string | null
          nome_customizado?: string | null
          observacao?: string | null
          orcamento_id: string
          ordem?: number
          quantidade?: number
          quantidade_manual?: boolean
          total?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_unitario?: number
          valor_unitario_manual?: boolean
        }
        Update: {
          cargo_id?: string | null
          categoria_id?: string
          created_at?: string
          created_by?: string | null
          dedicacao_percentual?: number
          deleted_at?: string | null
          deleted_by?: string | null
          escala_aplicada?: Database["public"]["Enums"]["admin_local_escala"]
          frequencia_evento?:
            | Database["public"]["Enums"]["admin_local_evento_freq"]
            | null
          id?: string
          justificativa_override?: string | null
          nome_customizado?: string | null
          observacao?: string | null
          orcamento_id?: string
          ordem?: number
          quantidade?: number
          quantidade_manual?: boolean
          total?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_unitario?: number
          valor_unitario_manual?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admin_local_itens_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_local_itens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "admin_local_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_local_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_local_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "v_orcamentos_benchmark"
            referencedColumns: ["orcamento_id"]
          },
        ]
      }
      admin_local_templates: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          itens_padrao: Json
          nome: string
          tipo_obra: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          itens_padrao?: Json
          nome: string
          tipo_obra: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          itens_padrao?: Json
          nome?: string
          tipo_obra?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      areas_empresa: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beneficios: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          local_trabalho: string
          nome: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          local_trabalho?: string
          nome: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          local_trabalho?: string
          nome?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ativo: boolean
          beneficios_selecionados: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          encargos_selecionados: Json
          horario_almoco_id: string | null
          id: string
          jornada_id: string | null
          local_trabalho: string
          nome: string
          regime_contratacao: string
          regime_id: string | null
          salario_base: number
          unidade_salarial: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          beneficios_selecionados?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          encargos_selecionados?: Json
          horario_almoco_id?: string | null
          id?: string
          jornada_id?: string | null
          local_trabalho?: string
          nome: string
          regime_contratacao?: string
          regime_id?: string | null
          salario_base?: number
          unidade_salarial?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          beneficios_selecionados?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          encargos_selecionados?: Json
          horario_almoco_id?: string | null
          id?: string
          jornada_id?: string | null
          local_trabalho?: string
          nome?: string
          regime_contratacao?: string
          regime_id?: string | null
          salario_base?: number
          unidade_salarial?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_horario_almoco_id_fkey"
            columns: ["horario_almoco_id"]
            isOneToOne: false
            referencedRelation: "horarios_almoco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas_trabalho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_regime_id_fkey"
            columns: ["regime_id"]
            isOneToOne: false
            referencedRelation: "regimes_operacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          cargo_id: string
          id: string
          nome_anterior: string | null
          nome_novo: string | null
          salario_base_anterior: number | null
          salario_base_novo: number | null
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          cargo_id: string
          id?: string
          nome_anterior?: string | null
          nome_novo?: string | null
          salario_base_anterior?: number | null
          salario_base_novo?: number | null
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          cargo_id?: string
          id?: string
          nome_anterior?: string | null
          nome_novo?: string | null
          salario_base_anterior?: number | null
          salario_base_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_historico_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          codigo: string
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      combustiveis: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          nome: string
          preco_litro: number
          tipo: string
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome: string
          preco_litro?: number
          tipo?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome?: string
          preco_litro?: number
          tipo?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      composicao_itens: {
        Row: {
          coeficiente: number
          composicao_id: string
          consumo: number | null
          created_at: string
          created_by: string | null
          custo_total: number
          custo_unitario: number
          deleted_at: string | null
          deleted_by: string | null
          depreciacao: number | null
          descricao: string | null
          fator_utilizacao: number | null
          grupo_custo: string | null
          id: string
          insumo_id: string
          manutencao: number | null
          observacoes: string | null
          parametros: Json | null
          quantidade: number
          tipo_insumo: Database["public"]["Enums"]["tipo_insumo"]
          unidade: string | null
          updated_at: string
          updated_by: string | null
          vida_util: number | null
        }
        Insert: {
          coeficiente?: number
          composicao_id: string
          consumo?: number | null
          created_at?: string
          created_by?: string | null
          custo_total?: number
          custo_unitario?: number
          deleted_at?: string | null
          deleted_by?: string | null
          depreciacao?: number | null
          descricao?: string | null
          fator_utilizacao?: number | null
          grupo_custo?: string | null
          id?: string
          insumo_id: string
          manutencao?: number | null
          observacoes?: string | null
          parametros?: Json | null
          quantidade?: number
          tipo_insumo: Database["public"]["Enums"]["tipo_insumo"]
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
          vida_util?: number | null
        }
        Update: {
          coeficiente?: number
          composicao_id?: string
          consumo?: number | null
          created_at?: string
          created_by?: string | null
          custo_total?: number
          custo_unitario?: number
          deleted_at?: string | null
          deleted_by?: string | null
          depreciacao?: number | null
          descricao?: string | null
          fator_utilizacao?: number | null
          grupo_custo?: string | null
          id?: string
          insumo_id?: string
          manutencao?: number | null
          observacoes?: string | null
          parametros?: Json | null
          quantidade?: number
          tipo_insumo?: Database["public"]["Enums"]["tipo_insumo"]
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
          vida_util?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "composicao_itens_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      composicoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          custo_unitario_total: number | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem_id: string
          servico_id: string | null
          status: string
          travado: boolean
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          custo_unitario_total?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem_id?: string
          servico_id?: string | null
          status?: string
          travado?: boolean
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          custo_unitario_total?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem_id?: string
          servico_id?: string | null
          status?: string
          travado?: boolean
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composicoes_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_admin_local: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          quantidade: number
          subcategoria: string | null
          tipo_cobranca: string
          unidade: string
          updated_at: string
          updated_by: string | null
          valor_diaria: number
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          quantidade?: number
          subcategoria?: string | null
          tipo_cobranca?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
          valor_diaria?: number
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          quantidade?: number
          subcategoria?: string | null
          tipo_cobranca?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
          valor_diaria?: number
          valor_mensal?: number
        }
        Relationships: []
      }
      encargos_sociais: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          grupo: string
          id: string
          nome: string
          obrigatorio: boolean
          percentual: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          grupo?: string
          id?: string
          nome: string
          obrigatorio?: boolean
          percentual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          grupo?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          percentual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          codigo: string
          combustivel_consumo_hora: number
          combustivel_preco_litro: number
          created_at: string
          created_by: string | null
          custo_hora_improdutiva: number
          custo_hora_produtiva: number
          deleted_at: string | null
          deleted_by: string | null
          depreciacao_hora: number
          horas_improdutivas_mes: number
          horas_produtivas_mes: number
          id: string
          manutencao_hora: number
          nome: string
          potencia: string | null
          tipo_propriedade: string
          unidade: string
          updated_at: string
          updated_by: string | null
          valor_aluguel_hora: number
          valor_aquisicao: number
          valor_residual: number
          vida_util_horas: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          combustivel_consumo_hora?: number
          combustivel_preco_litro?: number
          created_at?: string
          created_by?: string | null
          custo_hora_improdutiva?: number
          custo_hora_produtiva?: number
          deleted_at?: string | null
          deleted_by?: string | null
          depreciacao_hora?: number
          horas_improdutivas_mes?: number
          horas_produtivas_mes?: number
          id?: string
          manutencao_hora?: number
          nome: string
          potencia?: string | null
          tipo_propriedade?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
          valor_aluguel_hora?: number
          valor_aquisicao?: number
          valor_residual?: number
          vida_util_horas?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          combustivel_consumo_hora?: number
          combustivel_preco_litro?: number
          created_at?: string
          created_by?: string | null
          custo_hora_improdutiva?: number
          custo_hora_produtiva?: number
          deleted_at?: string | null
          deleted_by?: string | null
          depreciacao_hora?: number
          horas_improdutivas_mes?: number
          horas_produtivas_mes?: number
          id?: string
          manutencao_hora?: number
          nome?: string
          potencia?: string | null
          tipo_propriedade?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
          valor_aluguel_hora?: number
          valor_aquisicao?: number
          valor_residual?: number
          vida_util_horas?: number
        }
        Relationships: []
      }
      equipamentos_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          depreciacao_hora_anterior: number | null
          depreciacao_hora_novo: number | null
          equipamento_id: string
          id: string
          manutencao_hora_anterior: number | null
          manutencao_hora_novo: number | null
          valor_aquisicao_anterior: number | null
          valor_aquisicao_novo: number | null
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          depreciacao_hora_anterior?: number | null
          depreciacao_hora_novo?: number | null
          equipamento_id: string
          id?: string
          manutencao_hora_anterior?: number | null
          manutencao_hora_novo?: number | null
          valor_aquisicao_anterior?: number | null
          valor_aquisicao_novo?: number | null
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          depreciacao_hora_anterior?: number | null
          depreciacao_hora_novo?: number | null
          equipamento_id?: string
          id?: string
          manutencao_hora_anterior?: number | null
          manutencao_hora_novo?: number | null
          valor_aquisicao_anterior?: number | null
          valor_aquisicao_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_historico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_servicos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      grupos_servicos_servicos: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          grupo_id: string
          id: string
          servico_id: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          grupo_id: string
          id?: string
          servico_id: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          grupo_id?: string
          id?: string
          servico_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_servicos_servicos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_servicos_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_aprendizado: {
        Row: {
          created_at: string
          created_by: string | null
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          id: string
          metricas: Json | null
          referencia_id: string | null
          tags: string[] | null
          tipo: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metricas?: Json | null
          referencia_id?: string | null
          tags?: string[] | null
          tipo: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metricas?: Json | null
          referencia_id?: string | null
          tags?: string[] | null
          tipo?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      horarios_almoco: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duracao_minutos: number
          hora_fim: string
          hora_inicio: string
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      jornadas_trabalho: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          dias_por_semana: number
          horas_diarias: number
          horas_por_mes: number
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dias_por_semana?: number
          horas_diarias?: number
          horas_por_mes?: number
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dias_por_semana?: number
          horas_diarias?: number
          horas_por_mes?: number
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      materiais: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["material_categoria"]
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duracao_meses: number
          fornecedor: string | null
          id: string
          nome: string
          preco_unitario: number
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["material_categoria"]
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duracao_meses?: number
          fornecedor?: string | null
          id?: string
          nome: string
          preco_unitario?: number
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["material_categoria"]
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duracao_meses?: number
          fornecedor?: string | null
          id?: string
          nome?: string
          preco_unitario?: number
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      materiais_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          custo_unitario_anterior: number | null
          custo_unitario_novo: number | null
          id: string
          material_id: string
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          custo_unitario_anterior?: number | null
          custo_unitario_novo?: number | null
          id?: string
          material_id: string
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          custo_unitario_anterior?: number | null
          custo_unitario_novo?: number | null
          id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_historico_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      mercados: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      mobilizacao_custos: {
        Row: {
          ativo: boolean
          categoria: string
          consumo_km: number | null
          created_at: string
          created_by: string | null
          custo_total: number
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          frequencia: string
          id: string
          mobilizacao_id: string
          observacoes: string | null
          preco_litro: number | null
          quantidade: number
          tipo_propriedade: string | null
          updated_at: string
          updated_by: string | null
          valor_aluguel: number | null
          valor_unitario: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          consumo_km?: number | null
          created_at?: string
          created_by?: string | null
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          frequencia?: string
          id?: string
          mobilizacao_id: string
          observacoes?: string | null
          preco_litro?: number | null
          quantidade?: number
          tipo_propriedade?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_aluguel?: number | null
          valor_unitario?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          consumo_km?: number | null
          created_at?: string
          created_by?: string | null
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          frequencia?: string
          id?: string
          mobilizacao_id?: string
          observacoes?: string | null
          preco_litro?: number | null
          quantidade?: number
          tipo_propriedade?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_aluguel?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "mobilizacao_custos_mobilizacao_id_fkey"
            columns: ["mobilizacao_id"]
            isOneToOne: false
            referencedRelation: "mobilizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilizacao_equipes: {
        Row: {
          cargo_id: string | null
          created_at: string
          created_by: string | null
          custo_alimentacao: number
          custo_deslocamento: number
          custo_hospedagem: number
          custo_total: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          mobilizacao_id: string
          nome: string
          observacoes: string | null
          quantidade_pessoas: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_alimentacao?: number
          custo_deslocamento?: number
          custo_hospedagem?: number
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          mobilizacao_id: string
          nome: string
          observacoes?: string | null
          quantidade_pessoas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_alimentacao?: number
          custo_deslocamento?: number
          custo_hospedagem?: number
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          mobilizacao_id?: string
          nome?: string
          observacoes?: string | null
          quantidade_pessoas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobilizacao_equipes_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilizacao_equipes_mobilizacao_id_fkey"
            columns: ["mobilizacao_id"]
            isOneToOne: false
            referencedRelation: "mobilizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilizacoes: {
        Row: {
          arquivo_geo: string | null
          ativo: boolean
          base_endereco: string | null
          base_latitude: number | null
          base_longitude: number | null
          created_at: string
          created_by: string | null
          custo_por_dia: number
          custo_por_equipe: number
          custo_total: number
          data_inicio: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          dias_chuva_mes: number
          dias_improdutivos: number
          dias_produtivos: number
          dias_trabalho: number
          distancia_base_projeto: number
          distancia_media_diaria: number
          duracao_meses: number
          estado: string | null
          fator_improdutividade: number
          id: string
          jornada_diaria: number
          latitude: number | null
          longitude: number | null
          mob_desmob_itens: Json
          municipio: string | null
          municipios_considerados: Json
          nome: string
          oportunidade_id: string | null
          orcamento_id: string | null
          pluviometria_dados: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          arquivo_geo?: string | null
          ativo?: boolean
          base_endereco?: string | null
          base_latitude?: number | null
          base_longitude?: number | null
          created_at?: string
          created_by?: string | null
          custo_por_dia?: number
          custo_por_equipe?: number
          custo_total?: number
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          dias_chuva_mes?: number
          dias_improdutivos?: number
          dias_produtivos?: number
          dias_trabalho?: number
          distancia_base_projeto?: number
          distancia_media_diaria?: number
          duracao_meses?: number
          estado?: string | null
          fator_improdutividade?: number
          id?: string
          jornada_diaria?: number
          latitude?: number | null
          longitude?: number | null
          mob_desmob_itens?: Json
          municipio?: string | null
          municipios_considerados?: Json
          nome: string
          oportunidade_id?: string | null
          orcamento_id?: string | null
          pluviometria_dados?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          arquivo_geo?: string | null
          ativo?: boolean
          base_endereco?: string | null
          base_latitude?: number | null
          base_longitude?: number | null
          created_at?: string
          created_by?: string | null
          custo_por_dia?: number
          custo_por_equipe?: number
          custo_total?: number
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          dias_chuva_mes?: number
          dias_improdutivos?: number
          dias_produtivos?: number
          dias_trabalho?: number
          distancia_base_projeto?: number
          distancia_media_diaria?: number
          duracao_meses?: number
          estado?: string | null
          fator_improdutividade?: number
          id?: string
          jornada_diaria?: number
          latitude?: number | null
          longitude?: number | null
          mob_desmob_itens?: Json
          municipio?: string | null
          municipios_considerados?: Json
          nome?: string
          oportunidade_id?: string | null
          orcamento_id?: string | null
          pluviometria_dados?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobilizacoes_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilizacoes_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "v_propostas_vencendo"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          mercado_id: string | null
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          mercado_id?: string | null
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          mercado_id?: string | null
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modulos_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercados"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos_areas_empresa: {
        Row: {
          area_empresa_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          modulo_id: string
          updated_by: string | null
        }
        Insert: {
          area_empresa_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          modulo_id: string
          updated_by?: string | null
        }
        Update: {
          area_empresa_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          modulo_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modulos_areas_empresa_area_empresa_id_fkey"
            columns: ["area_empresa_id"]
            isOneToOne: false
            referencedRelation: "areas_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_areas_empresa_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidade_atividades: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          created_at: string
          created_by: string | null
          data_atividade: string
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          lembrete_em: string | null
          oportunidade_id: string
          responsavel_id: string | null
          tipo: Database["public"]["Enums"]["oportunidade_atividade_tipo"]
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          data_atividade?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          lembrete_em?: string | null
          oportunidade_id: string
          responsavel_id?: string | null
          tipo: Database["public"]["Enums"]["oportunidade_atividade_tipo"]
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          data_atividade?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          lembrete_em?: string | null
          oportunidade_id?: string
          responsavel_id?: string | null
          tipo?: Database["public"]["Enums"]["oportunidade_atividade_tipo"]
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidade_atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidade_atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "v_propostas_vencendo"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          ativo: boolean
          cidade: string | null
          cliente_id: string | null
          codigo: string
          concorrentes: string[] | null
          coordenador_id: string | null
          created_at: string
          created_by: string | null
          data_decisao_prevista: string | null
          data_envio_proposta: string | null
          data_fechamento: string | null
          data_validade_proposta: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string
          estado: string | null
          estagio: Database["public"]["Enums"]["oportunidade_estagio"]
          grupo_servicos_id: string | null
          id: string
          motivo_perda: Database["public"]["Enums"]["motivo_perda"] | null
          observacao_perda: string | null
          origem: string | null
          probabilidade: number | null
          tipo_obra: string | null
          updated_at: string
          updated_by: string | null
          valor_previsto: number | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cliente_id?: string | null
          codigo: string
          concorrentes?: string[] | null
          coordenador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_decisao_prevista?: string | null
          data_envio_proposta?: string | null
          data_fechamento?: string | null
          data_validade_proposta?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao: string
          estado?: string | null
          estagio?: Database["public"]["Enums"]["oportunidade_estagio"]
          grupo_servicos_id?: string | null
          id?: string
          motivo_perda?: Database["public"]["Enums"]["motivo_perda"] | null
          observacao_perda?: string | null
          origem?: string | null
          probabilidade?: number | null
          tipo_obra?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_previsto?: number | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cliente_id?: string | null
          codigo?: string
          concorrentes?: string[] | null
          coordenador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_decisao_prevista?: string | null
          data_envio_proposta?: string | null
          data_fechamento?: string | null
          data_validade_proposta?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string
          estado?: string | null
          estagio?: Database["public"]["Enums"]["oportunidade_estagio"]
          grupo_servicos_id?: string | null
          id?: string
          motivo_perda?: Database["public"]["Enums"]["motivo_perda"] | null
          observacao_perda?: string | null
          origem?: string | null
          probabilidade?: number | null
          tipo_obra?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_orcamentos_benchmark"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "oportunidades_grupo_servicos_id_fkey"
            columns: ["grupo_servicos_id"]
            isOneToOne: false
            referencedRelation: "grupos_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_cenarios: {
        Row: {
          ativo: boolean
          composicao_id: string
          created_at: string
          created_by: string | null
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          composicao_id: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          composicao_id?: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_cenarios_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens_servico: {
        Row: {
          composicao_id: string
          created_at: string
          created_by: string | null
          custo_total: number
          custo_unitario: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          multiplicador_aplicado: number
          orcamento_id: string
          quantidade: number
          updated_by: string | null
          variacao_id: string | null
        }
        Insert: {
          composicao_id: string
          created_at?: string
          created_by?: string | null
          custo_total?: number
          custo_unitario?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          multiplicador_aplicado?: number
          orcamento_id: string
          quantidade?: number
          updated_by?: string | null
          variacao_id?: string | null
        }
        Update: {
          composicao_id?: string
          created_at?: string
          created_by?: string | null
          custo_total?: number
          custo_unitario?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          multiplicador_aplicado?: number
          orcamento_id?: string
          quantidade?: number
          updated_by?: string | null
          variacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_servico_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_servico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_servico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "v_orcamentos_benchmark"
            referencedColumns: ["orcamento_id"]
          },
          {
            foreignKeyName: "orcamento_itens_servico_variacao_id_fkey"
            columns: ["variacao_id"]
            isOneToOne: false
            referencedRelation: "servico_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_parametros: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          dias_projeto: number
          distancia_base_km: number
          extensao_km: number
          id: string
          municipio: string | null
          orcamento_id: string
          qtd_equipes: number
          qtd_pessoas: number
          qtd_propriedades: number
          qtd_supervisores: number
          tipo_obra: string | null
          uf: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dias_projeto?: number
          distancia_base_km?: number
          extensao_km?: number
          id?: string
          municipio?: string | null
          orcamento_id: string
          qtd_equipes?: number
          qtd_pessoas?: number
          qtd_propriedades?: number
          qtd_supervisores?: number
          tipo_obra?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dias_projeto?: number
          distancia_base_km?: number
          extensao_km?: number
          id?: string
          municipio?: string | null
          orcamento_id?: string
          qtd_equipes?: number
          qtd_pessoas?: number
          qtd_propriedades?: number
          qtd_supervisores?: number
          tipo_obra?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_parametros_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_parametros_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "v_orcamentos_benchmark"
            referencedColumns: ["orcamento_id"]
          },
        ]
      }
      orcamento_revisoes: {
        Row: {
          composicao_id: string
          created_at: string
          created_by: string | null
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          id: string
          observacao: string | null
          updated_by: string | null
          user_id: string | null
          versao: number
        }
        Insert: {
          composicao_id: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          observacao?: string | null
          updated_by?: string | null
          user_id?: string | null
          versao?: number
        }
        Update: {
          composicao_id?: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          observacao?: string | null
          updated_by?: string | null
          user_id?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_revisoes_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_templates: {
        Row: {
          admin_local_template_nome: string | null
          ativo: boolean
          bdi_sugerido_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          itens_servico: Json
          nome: string
          parametros_padrao: Json
          tipo_obra: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_local_template_nome?: string | null
          ativo?: boolean
          bdi_sugerido_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          itens_servico?: Json
          nome: string
          parametros_padrao?: Json
          tipo_obra: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_local_template_nome?: string | null
          ativo?: boolean
          bdi_sugerido_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          itens_servico?: Json
          nome?: string
          parametros_padrao?: Json
          tipo_obra?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_templates_bdi_sugerido_id_fkey"
            columns: ["bdi_sugerido_id"]
            isOneToOne: false
            referencedRelation: "parametros_bdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_templates_bdi_sugerido_id_fkey"
            columns: ["bdi_sugerido_id"]
            isOneToOne: false
            referencedRelation: "v_parametros_bdi_componentes_jsonb"
            referencedColumns: ["bdi_id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          bdi_id: string | null
          bdi_percentual: number
          created_at: string
          created_by: string | null
          custo_adm_local: number
          custo_servicos: number
          custo_total: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          mobilizacao_id: string | null
          oportunidade_id: string
          preco_total: number
          snapshot: Json | null
          snapshot_app_versao: string | null
          snapshot_em: string | null
          snapshot_por: string | null
          snapshot_versao: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bdi_id?: string | null
          bdi_percentual?: number
          created_at?: string
          created_by?: string | null
          custo_adm_local?: number
          custo_servicos?: number
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          mobilizacao_id?: string | null
          oportunidade_id: string
          preco_total?: number
          snapshot?: Json | null
          snapshot_app_versao?: string | null
          snapshot_em?: string | null
          snapshot_por?: string | null
          snapshot_versao?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bdi_id?: string | null
          bdi_percentual?: number
          created_at?: string
          created_by?: string | null
          custo_adm_local?: number
          custo_servicos?: number
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          mobilizacao_id?: string | null
          oportunidade_id?: string
          preco_total?: number
          snapshot?: Json | null
          snapshot_app_versao?: string | null
          snapshot_em?: string | null
          snapshot_por?: string | null
          snapshot_versao?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_bdi_id_fkey"
            columns: ["bdi_id"]
            isOneToOne: false
            referencedRelation: "parametros_bdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_bdi_id_fkey"
            columns: ["bdi_id"]
            isOneToOne: false
            referencedRelation: "v_parametros_bdi_componentes_jsonb"
            referencedColumns: ["bdi_id"]
          },
          {
            foreignKeyName: "orcamentos_mobilizacao_id_fkey"
            columns: ["mobilizacao_id"]
            isOneToOne: false
            referencedRelation: "mobilizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "v_propostas_vencendo"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_admin_central: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          percentual: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parametros_admin_central_mensal: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          observacao: string | null
          percentual: number
          updated_at: string
          updated_by: string | null
          vigencia_mes: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          observacao?: string | null
          percentual: number
          updated_at?: string
          updated_by?: string | null
          vigencia_mes: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          observacao?: string | null
          percentual?: number
          updated_at?: string
          updated_by?: string | null
          vigencia_mes?: string
        }
        Relationships: []
      }
      parametros_admin_local: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          percentual: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parametros_bdi: {
        Row: {
          ativo: boolean
          bdi_calculado: number
          componentes: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          bdi_calculado?: number
          componentes?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          bdi_calculado?: number
          componentes?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parametros_bdi_componentes: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          nome: string
          observacao: string | null
          ordem: number
          parametros_bdi_id: string
          percentual: number
          sigla: string | null
          tipo: Database["public"]["Enums"]["bdi_componente_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome: string
          observacao?: string | null
          ordem?: number
          parametros_bdi_id: string
          percentual: number
          sigla?: string | null
          tipo: Database["public"]["Enums"]["bdi_componente_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          ordem?: number
          parametros_bdi_id?: string
          percentual?: number
          sigla?: string | null
          tipo?: Database["public"]["Enums"]["bdi_componente_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parametros_bdi_componentes_parametros_bdi_id_fkey"
            columns: ["parametros_bdi_id"]
            isOneToOne: false
            referencedRelation: "parametros_bdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parametros_bdi_componentes_parametros_bdi_id_fkey"
            columns: ["parametros_bdi_id"]
            isOneToOne: false
            referencedRelation: "v_parametros_bdi_componentes_jsonb"
            referencedColumns: ["bdi_id"]
          },
        ]
      }
      parametros_dre: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          estrutura: Json
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parametros_financiamento: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          percentual: number
          prazo_meses: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          prazo_meses?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          prazo_meses?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parametros_margem: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          percentual_maximo: number
          percentual_minimo: number
          percentual_padrao: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          percentual_maximo?: number
          percentual_minimo?: number
          percentual_padrao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          percentual_maximo?: number
          percentual_minimo?: number
          percentual_padrao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parametros_tributos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          percentual: number
          sigla: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          sigla: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          sigla?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          full_name: string | null
          id: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regimes_operacionais: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          dias_folga: number
          dias_trabalho: number
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          dias_folga: number
          dias_trabalho: number
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          dias_folga?: number
          dias_trabalho?: number
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      row_ordering: {
        Row: {
          created_at: string
          id: string
          posicao: number
          registro_id: string | null
          subtitulo: string | null
          tabela: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          posicao?: number
          registro_id?: string | null
          subtitulo?: string | null
          tabela: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          posicao?: number
          registro_id?: string | null
          subtitulo?: string | null
          tabela?: string
          user_id?: string
        }
        Relationships: []
      }
      servico_variacoes: {
        Row: {
          ativo: boolean
          composicao_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao_diferenca: string | null
          id: string
          is_default: boolean
          multiplicador_custo: number
          nome: string
          ordem: number
          servico_id: string
          tipo: Database["public"]["Enums"]["servico_variacao_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          composicao_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao_diferenca?: string | null
          id?: string
          is_default?: boolean
          multiplicador_custo?: number
          nome: string
          ordem?: number
          servico_id: string
          tipo?: Database["public"]["Enums"]["servico_variacao_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          composicao_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao_diferenca?: string | null
          id?: string
          is_default?: boolean
          multiplicador_custo?: number
          nome?: string
          ordem?: number
          servico_id?: string
          tipo?: Database["public"]["Enums"]["servico_variacao_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_variacoes_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_variacoes_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          area_empresa_id: string | null
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          fatores_dificuldade: Json | null
          id: string
          mercado_id: string
          modulo_id: string | null
          nome: string
          ordem_id: string
          premissas_padrao: Json | null
          produtividade_padrao: number | null
          tipo_geometria: string
          unidade_medicao: string
          unidade_tempo_produtividade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_empresa_id?: string | null
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fatores_dificuldade?: Json | null
          id?: string
          mercado_id: string
          modulo_id?: string | null
          nome: string
          ordem_id?: string
          premissas_padrao?: Json | null
          produtividade_padrao?: number | null
          tipo_geometria?: string
          unidade_medicao?: string
          unidade_tempo_produtividade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_empresa_id?: string | null
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fatores_dificuldade?: Json | null
          id?: string
          mercado_id?: string
          modulo_id?: string | null
          nome?: string
          ordem_id?: string
          premissas_padrao?: Json | null
          produtividade_padrao?: number | null
          tipo_geometria?: string
          unidade_medicao?: string
          unidade_tempo_produtividade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_area_empresa_id_fkey"
            columns: ["area_empresa_id"]
            isOneToOne: false
            referencedRelation: "areas_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ativo: boolean
          codigo: string
          combustivel_consumo_km: number
          combustivel_preco_litro: number
          created_at: string
          created_by: string | null
          custo_hora: number
          custo_km: number
          deleted_at: string | null
          deleted_by: string | null
          horas_improdutivas_mes: number
          horas_produtivas_mes: number
          id: string
          km_mensal_estimado: number
          lavagem_mensal: number
          manutencao_hora: number
          manutencao_preventiva_mensal: number
          media_km_l: number
          nome: string
          oleo_troca_km: number
          oleo_valor: number
          pneus_valor: number
          pneus_vida_util_km: number
          seguro_mensal: number
          tipo_combustivel: string
          tipo_propriedade: string
          unidade: string
          updated_at: string
          updated_by: string | null
          valor_aluguel_mensal: number
          valor_aquisicao: number
          valor_residual: number
          vida_util_km: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          combustivel_consumo_km?: number
          combustivel_preco_litro?: number
          created_at?: string
          created_by?: string | null
          custo_hora?: number
          custo_km?: number
          deleted_at?: string | null
          deleted_by?: string | null
          horas_improdutivas_mes?: number
          horas_produtivas_mes?: number
          id?: string
          km_mensal_estimado?: number
          lavagem_mensal?: number
          manutencao_hora?: number
          manutencao_preventiva_mensal?: number
          media_km_l?: number
          nome: string
          oleo_troca_km?: number
          oleo_valor?: number
          pneus_valor?: number
          pneus_vida_util_km?: number
          seguro_mensal?: number
          tipo_combustivel?: string
          tipo_propriedade?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
          valor_aluguel_mensal?: number
          valor_aquisicao?: number
          valor_residual?: number
          vida_util_km?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          combustivel_consumo_km?: number
          combustivel_preco_litro?: number
          created_at?: string
          created_by?: string | null
          custo_hora?: number
          custo_km?: number
          deleted_at?: string | null
          deleted_by?: string | null
          horas_improdutivas_mes?: number
          horas_produtivas_mes?: number
          id?: string
          km_mensal_estimado?: number
          lavagem_mensal?: number
          manutencao_hora?: number
          manutencao_preventiva_mensal?: number
          media_km_l?: number
          nome?: string
          oleo_troca_km?: number
          oleo_valor?: number
          pneus_valor?: number
          pneus_vida_util_km?: number
          seguro_mensal?: number
          tipo_combustivel?: string
          tipo_propriedade?: string
          unidade?: string
          updated_at?: string
          updated_by?: string | null
          valor_aluguel_mensal?: number
          valor_aquisicao?: number
          valor_residual?: number
          vida_util_km?: number
        }
        Relationships: []
      }
      veiculos_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          custo_hora_anterior: number | null
          custo_hora_novo: number | null
          id: string
          valor_aquisicao_anterior: number | null
          valor_aquisicao_novo: number | null
          veiculo_id: string
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          custo_hora_anterior?: number | null
          custo_hora_novo?: number | null
          id?: string
          valor_aquisicao_anterior?: number | null
          valor_aquisicao_novo?: number | null
          veiculo_id: string
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          custo_hora_anterior?: number | null
          custo_hora_novo?: number | null
          id?: string
          valor_aquisicao_anterior?: number | null
          valor_aquisicao_novo?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_historico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_atividades_pendentes: {
        Row: {
          id: string | null
          lembrete_em: string | null
          oportunidade_codigo: string | null
          oportunidade_descricao: string | null
          oportunidade_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          tipo:
            | Database["public"]["Enums"]["oportunidade_atividade_tipo"]
            | null
          titulo: string | null
          urgencia: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidade_atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidade_atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "v_propostas_vencendo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_benchmark_distribuicao_tipo_obra: {
        Row: {
          extensao_km_media: number | null
          ganhos: number | null
          perdidos: number | null
          prazo_medio_dias: number | null
          preco_max: number | null
          preco_mediana: number | null
          preco_medio: number | null
          preco_min: number | null
          preco_p25: number | null
          preco_p75: number | null
          qtd_propriedades_media: number | null
          tipo_obra: string | null
          total_orcamentos: number | null
        }
        Relationships: []
      }
      v_itens_deletados: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string | null
          identificador: string | null
          tabela: string | null
        }
        Relationships: []
      }
      v_mudancas_mestres_recentes: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          entidade: string | null
          entidade_id: string | null
          entidade_nome: string | null
          mudanca: string | null
        }
        Relationships: []
      }
      v_orcamentos_benchmark: {
        Row: {
          bdi_percentual: number | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          custo_admin_local: number | null
          custo_servicos: number | null
          descricao: string | null
          dias_projeto: number | null
          distancia_base_km: number | null
          estagio_pipeline:
            | Database["public"]["Enums"]["oportunidade_estagio"]
            | null
          extensao_km: number | null
          municipio: string | null
          orcamento_id: string | null
          preco_por_unidade: number | null
          preco_total: number | null
          probabilidade: number | null
          qtd_equipes: number | null
          qtd_pessoas: number | null
          qtd_propriedades: number | null
          qtd_supervisores: number | null
          status_orcamento: string | null
          tipo_obra_oportunidade: string | null
          tipo_obra_parametros: string | null
          uf: string | null
          updated_at: string | null
          valor_previsto: number | null
        }
        Relationships: []
      }
      v_parametros_bdi_componentes_jsonb: {
        Row: {
          bdi_id: string | null
          componentes_normalizado: Json | null
        }
        Insert: {
          bdi_id?: string | null
          componentes_normalizado?: never
        }
        Update: {
          bdi_id?: string | null
          componentes_normalizado?: never
        }
        Relationships: []
      }
      v_performance_coordenador: {
        Row: {
          coordenador_id: string | null
          coordenador_nome: string | null
          em_andamento: number | null
          ganhas: number | null
          perdidas: number | null
          pipeline_em_aberto: number | null
          receita_ganha: number | null
          total_oportunidades: number | null
          win_rate_percent: number | null
        }
        Relationships: []
      }
      v_pipeline_por_tipo_obra: {
        Row: {
          estagio: Database["public"]["Enums"]["oportunidade_estagio"] | null
          quantidade: number | null
          tipo_obra: string | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_pipeline_resumo: {
        Row: {
          estagio: Database["public"]["Enums"]["oportunidade_estagio"] | null
          quantidade: number | null
          ticket_medio: number | null
          valor_ponderado: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_propostas_vencendo: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          data_envio_proposta: string | null
          data_validade_proposta: string | null
          descricao: string | null
          dias_para_vencer: number | null
          estagio: Database["public"]["Enums"]["oportunidade_estagio"] | null
          id: string | null
          valor_previsto: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_orcamentos_benchmark"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
    }
    Functions: {
      _drop_all_policies: { Args: { _table: string }; Returns: undefined }
      aplicar_template_orcamento: {
        Args: { _orcamento_id: string; _template_id: string }
        Returns: Json
      }
      avaliar_formula_quantidade: {
        Args: {
          _dias_projeto: number
          _distancia_base_km: number
          _extensao_km: number
          _formula: string
          _qtd_equipes: number
          _qtd_pessoas: number
          _qtd_propriedades: number
          _qtd_supervisores: number
        }
        Returns: number
      }
      buscar_orcamentos_similares: {
        Args: { _limit?: number; _orcamento_id: string }
        Returns: {
          cliente_nome: string
          custo_total: number
          dias_projeto: number
          estagio_pipeline: string
          extensao_km: number
          orcamento_id: string
          preco_por_unidade: number
          qtd_propriedades: number
          similaridade_score: number
          status_orcamento: string
          tipo_obra: string
        }[]
      }
      calcular_meses_projeto: { Args: { _dias: number }; Returns: number }
      calcular_preco_unitario_orcamento: {
        Args: { _orcamento_id: string }
        Returns: number
      }
      can_edit_mestres: { Args: never; Returns: boolean }
      can_edit_orcamentos: { Args: never; Returns: boolean }
      can_edit_parametros: { Args: never; Returns: boolean }
      can_soft_delete: { Args: never; Returns: boolean }
      can_view_app_data: { Args: never; Returns: boolean }
      criar_snapshot_orcamento: {
        Args: { _orcamento_id: string }
        Returns: Json
      }
      diff_snapshot_orcamento: {
        Args: { _orcamento_id: string }
        Returns: Json
      }
      get_admin_central_percentual: {
        Args: { _data?: string }
        Returns: number
      }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_app_active_user: { Args: never; Returns: boolean }
      restaurar_item: {
        Args: { _id: string; _tabela: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_local_bloco:
        | "mobilizacao_desmobilizacao"
        | "permanencia"
        | "supervisao"
      admin_local_escala:
        | "fixo"
        | "por_pessoa"
        | "por_equipe"
        | "por_dia"
        | "por_mes"
        | "por_km"
        | "por_propriedade"
        | "por_pessoa_dia"
        | "por_pessoa_mes"
        | "por_equipe_dia"
        | "por_equipe_mes"
        | "percentual_aluguel"
      admin_local_evento_freq: "ida" | "volta" | "ida_e_volta" | "fixo"
      app_role:
        | "admin"
        | "engenheiro"
        | "orcamentista"
        | "visualizador"
        | "diretor"
        | "gerente"
        | "consultor_tecnico"
      bdi_componente_tipo:
        | "admin_local"
        | "admin_central"
        | "financiamento"
        | "tributo"
        | "margem"
        | "comissao"
        | "risco"
        | "outro"
      material_categoria:
        | "plotagem"
        | "consumivel"
        | "epi"
        | "ferramenta"
        | "geral"
      motivo_perda:
        | "preco"
        | "prazo"
        | "escopo"
        | "concorrencia"
        | "timing"
        | "sem_resposta"
        | "mudanca_prioridade"
        | "sem_orcamento_cliente"
        | "outro"
      oportunidade_atividade_tipo:
        | "ligacao"
        | "email"
        | "reuniao"
        | "visita"
        | "whatsapp"
        | "proposta_enviada"
        | "contraproposta_recebida"
        | "outro"
      oportunidade_estagio:
        | "lead"
        | "qualificado"
        | "orcamento_em_elaboracao"
        | "proposta_enviada"
        | "em_negociacao"
        | "ganho"
        | "perdido"
        | "standby"
      servico_variacao_tipo: "escopo" | "complexidade"
      tipo_insumo:
        | "mao_de_obra"
        | "equipamento"
        | "veiculo"
        | "material"
        | "combustivel"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_local_bloco: [
        "mobilizacao_desmobilizacao",
        "permanencia",
        "supervisao",
      ],
      admin_local_escala: [
        "fixo",
        "por_pessoa",
        "por_equipe",
        "por_dia",
        "por_mes",
        "por_km",
        "por_propriedade",
        "por_pessoa_dia",
        "por_pessoa_mes",
        "por_equipe_dia",
        "por_equipe_mes",
        "percentual_aluguel",
      ],
      admin_local_evento_freq: ["ida", "volta", "ida_e_volta", "fixo"],
      app_role: [
        "admin",
        "engenheiro",
        "orcamentista",
        "visualizador",
        "diretor",
        "gerente",
        "consultor_tecnico",
      ],
      bdi_componente_tipo: [
        "admin_local",
        "admin_central",
        "financiamento",
        "tributo",
        "margem",
        "comissao",
        "risco",
        "outro",
      ],
      material_categoria: [
        "plotagem",
        "consumivel",
        "epi",
        "ferramenta",
        "geral",
      ],
      motivo_perda: [
        "preco",
        "prazo",
        "escopo",
        "concorrencia",
        "timing",
        "sem_resposta",
        "mudanca_prioridade",
        "sem_orcamento_cliente",
        "outro",
      ],
      oportunidade_atividade_tipo: [
        "ligacao",
        "email",
        "reuniao",
        "visita",
        "whatsapp",
        "proposta_enviada",
        "contraproposta_recebida",
        "outro",
      ],
      oportunidade_estagio: [
        "lead",
        "qualificado",
        "orcamento_em_elaboracao",
        "proposta_enviada",
        "em_negociacao",
        "ganho",
        "perdido",
        "standby",
      ],
      servico_variacao_tipo: ["escopo", "complexidade"],
      tipo_insumo: [
        "mao_de_obra",
        "equipamento",
        "veiculo",
        "material",
        "combustivel",
      ],
    },
  },
} as const
