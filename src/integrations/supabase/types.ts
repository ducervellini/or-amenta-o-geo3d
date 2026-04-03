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
      areas_empresa: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
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
          descricao: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          salario_base: number
          unidade_salarial: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          salario_base?: number
          unidade_salarial?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          salario_base?: number
          unidade_salarial?: string
          updated_at?: string
        }
        Relationships: []
      }
      combustiveis: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          preco_litro: number
          tipo: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          preco_litro?: number
          tipo?: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          preco_litro?: number
          tipo?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      composicao_itens: {
        Row: {
          coeficiente: number
          composicao_id: string
          consumo: number | null
          created_at: string
          custo_total: number
          custo_unitario: number
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
          vida_util: number | null
        }
        Insert: {
          coeficiente?: number
          composicao_id: string
          consumo?: number | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
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
          vida_util?: number | null
        }
        Update: {
          coeficiente?: number
          composicao_id?: string
          consumo?: number | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
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
          descricao: string | null
          id: string
          nome: string
          servico_id: string | null
          status: string
          travado: boolean
          unidade: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          custo_unitario_total?: number | null
          descricao?: string | null
          id?: string
          nome: string
          servico_id?: string | null
          status?: string
          travado?: boolean
          unidade?: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          custo_unitario_total?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          servico_id?: string | null
          status?: string
          travado?: boolean
          unidade?: string
          updated_at?: string
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
      encargos_sociais: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          grupo: string
          id: string
          nome: string
          obrigatorio: boolean
          percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          grupo?: string
          id?: string
          nome: string
          obrigatorio?: boolean
          percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          grupo?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          custo_hora_improdutiva: number
          custo_hora_produtiva: number
          depreciacao_hora: number
          id: string
          nome: string
          potencia: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          custo_hora_improdutiva?: number
          custo_hora_produtiva?: number
          depreciacao_hora?: number
          id?: string
          nome: string
          potencia?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          custo_hora_improdutiva?: number
          custo_hora_produtiva?: number
          depreciacao_hora?: number
          id?: string
          nome?: string
          potencia?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      historico_aprendizado: {
        Row: {
          created_at: string
          dados: Json
          id: string
          metricas: Json | null
          referencia_id: string | null
          tags: string[] | null
          tipo: string
        }
        Insert: {
          created_at?: string
          dados?: Json
          id?: string
          metricas?: Json | null
          referencia_id?: string | null
          tags?: string[] | null
          tipo: string
        }
        Update: {
          created_at?: string
          dados?: Json
          id?: string
          metricas?: Json | null
          referencia_id?: string | null
          tags?: string[] | null
          tipo?: string
        }
        Relationships: []
      }
      horarios_almoco: {
        Row: {
          ativo: boolean
          created_at: string
          duracao_minutos: number
          hora_fim: string
          hora_inicio: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          duracao_minutos?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      jornadas_trabalho: {
        Row: {
          ativo: boolean
          created_at: string
          dias_por_semana: number
          horas_diarias: number
          horas_por_mes: number
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_por_semana?: number
          horas_diarias?: number
          horas_por_mes?: number
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_por_semana?: number
          horas_diarias?: number
          horas_por_mes?: number
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          fornecedor: string | null
          id: string
          nome: string
          preco_unitario: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          nome: string
          preco_unitario?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          nome?: string
          preco_unitario?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      mercados: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      modulos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          mercado_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          mercado_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          mercado_id?: string
          nome?: string
          updated_at?: string
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
          id: string
          modulo_id: string
        }
        Insert: {
          area_empresa_id: string
          created_at?: string
          id?: string
          modulo_id: string
        }
        Update: {
          area_empresa_id?: string
          created_at?: string
          id?: string
          modulo_id?: string
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
      orcamento_cenarios: {
        Row: {
          ativo: boolean
          composicao_id: string
          created_at: string
          dados: Json
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          composicao_id: string
          created_at?: string
          dados?: Json
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          composicao_id?: string
          created_at?: string
          dados?: Json
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
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
      orcamento_revisoes: {
        Row: {
          composicao_id: string
          created_at: string
          dados: Json
          id: string
          observacao: string | null
          user_id: string | null
          versao: number
        }
        Insert: {
          composicao_id: string
          created_at?: string
          dados?: Json
          id?: string
          observacao?: string | null
          user_id?: string | null
          versao?: number
        }
        Update: {
          composicao_id?: string
          created_at?: string
          dados?: Json
          id?: string
          observacao?: string | null
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
      parametros_admin_central: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      parametros_admin_local: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      parametros_bdi: {
        Row: {
          ativo: boolean
          bdi_calculado: number
          componentes: Json
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bdi_calculado?: number
          componentes?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bdi_calculado?: number
          componentes?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      parametros_dre: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estrutura: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      parametros_financiamento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          percentual: number
          prazo_meses: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          prazo_meses?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          prazo_meses?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      parametros_margem: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          percentual_maximo: number
          percentual_minimo: number
          percentual_padrao: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          percentual_maximo?: number
          percentual_minimo?: number
          percentual_padrao?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          percentual_maximo?: number
          percentual_minimo?: number
          percentual_padrao?: number
          updated_at?: string
        }
        Relationships: []
      }
      parametros_tributos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          percentual: number
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          percentual?: number
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          percentual?: number
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
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
          descricao: string | null
          dias_folga: number
          dias_trabalho: number
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_folga: number
          dias_trabalho: number
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_folga?: number
          dias_trabalho?: number
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          area_empresa_id: string | null
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          fatores_dificuldade: Json | null
          id: string
          mercado_id: string
          modulo_id: string | null
          nome: string
          premissas_padrao: Json | null
          produtividade_padrao: number | null
          tipo_geometria: string
          unidade_medicao: string
          unidade_tempo_produtividade: string
          updated_at: string
        }
        Insert: {
          area_empresa_id?: string | null
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          fatores_dificuldade?: Json | null
          id?: string
          mercado_id: string
          modulo_id?: string | null
          nome: string
          premissas_padrao?: Json | null
          produtividade_padrao?: number | null
          tipo_geometria?: string
          unidade_medicao?: string
          unidade_tempo_produtividade?: string
          updated_at?: string
        }
        Update: {
          area_empresa_id?: string | null
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          fatores_dificuldade?: Json | null
          id?: string
          mercado_id?: string
          modulo_id?: string | null
          nome?: string
          premissas_padrao?: Json | null
          produtividade_padrao?: number | null
          tipo_geometria?: string
          unidade_medicao?: string
          unidade_tempo_produtividade?: string
          updated_at?: string
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
          created_at: string
          custo_hora: number
          custo_km: number
          id: string
          manutencao_hora: number
          nome: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          custo_hora?: number
          custo_km?: number
          id?: string
          manutencao_hora?: number
          nome: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          custo_hora?: number
          custo_km?: number
          id?: string
          manutencao_hora?: number
          nome?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "engenheiro"
        | "orcamentista"
        | "visualizador"
        | "diretor"
        | "gerente"
        | "consultor_tecnico"
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
      app_role: [
        "admin",
        "engenheiro",
        "orcamentista",
        "visualizador",
        "diretor",
        "gerente",
        "consultor_tecnico",
      ],
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
