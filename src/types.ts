export interface LessonPlanRequest {
  modalidade_ensino: string;
  componente_curricular: string;
  disciplina: string;
  serie_turma: string;
  objeto_conhecimento: string;
  duracao_aula_min: number;
  numero_aulas: number;
  nivel_detalhe: 'resumo' | 'completo' | 'detalhado';
}

export interface Meta {
  gerado_por: string;
  timestamp: string;
  versao_template: string;
}

export interface MetodologiaEtapa {
  etapa: string;
  duracao_min: number;
  atividades: string[];
  recursos: string[];
}

export interface MaterialDeApoio {
  tipo: string;
  titulo: string;
  link: string;
}

export interface EstrategiaDeAvaliacao {
  criterios: string[];
  instrumentos: string[];
  pesos: Record<string, number>;
}

export interface Competency {
  codigo: string;
  texto: string;
}

export interface Skill {
  codigo: string;
  texto: string;
}

export interface Descriptor {
  codigo: string;
  texto: string;
}

export interface LessonPlan {
  titulo: string;
  componente_curricular: string;
  disciplina: string;
  serie_turma: string;
  objetos_do_conhecimento: string[];
  duracao_total_min: number;
  numero_de_aulas: number;
  competencia_especifica: Competency;
  habilidades: Skill[];
  objetivos_de_aprendizagem: string[];
  descritores: Descriptor[];
  metodologia: MetodologiaEtapa[];
  material_de_apoio: MaterialDeApoio[];
  estrategia_de_avaliacao: EstrategiaDeAvaliacao;
  atividades_recuperacao: string[]; // NOVO CAMPO
  adapitacoes_nee: string[];
  observacoes: string;
  export_formats: string[];
  hash_validacao: string;
}

export interface LessonPlanResponse {
  meta: Meta;
  plano_aula: LessonPlan;
}
