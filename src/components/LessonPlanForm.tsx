import React, { useState, useMemo, useEffect } from 'react';
import type { LessonPlanRequest } from '../types';

interface LessonPlanFormProps {
  onSubmit: (formData: LessonPlanRequest) => void;
  isLoading: boolean;
}

const teachingModalities = [
  { id: 'educacao_infantil', name: 'Educação Infantil' },
  { id: 'ensino_fundamental', name: 'Ensino Fundamental' },
  { id: 'ensino_medio', name: 'Ensino Médio' },
];

const disciplinesByModality: { [key: string]: string[] } = {
  educacao_infantil: [
    'Campos de Experiências',
  ],
  ensino_fundamental: [
    'Língua Portuguesa',
    'Arte',
    'Educação Física',
    'Língua Inglesa',
    'Matemática',
    'Ciências',
    'Geografia',
    'História',
    'Ensino Religioso'
  ],
  ensino_medio: [
    'Língua Portuguesa',
    'Literatura',
    'Língua Inglesa',
    'Arte',
    'Educação Física',
    'Matemática',
    'Física',
    'Química',
    'Biologia',
    'História',
    'Geografia',
    'Sociologia',
    'Filosofia'
  ],
};

const gradesByModality: { [key: string]: string[] } = {
  educacao_infantil: [
    'Berçário I (0 a 1 ano)',
    'Berçário II (1 a 2 anos)',
    'Maternal I (2 a 3 anos)',
    'Maternal II (3 a 4 anos)',
    'Pré-escola I (4 a 5 anos)',
    'Pré-escola II (5 a 6 anos)'
  ],
  ensino_fundamental: [
    '1º Ano',
    '2º Ano',
    '3º Ano',
    '4º Ano',
    '5º Ano',
    '6º Ano',
    '7º Ano',
    '8º Ano',
    '9º Ano'
  ],
  ensino_medio: [
    '1ª Série',
    '2ª Série',
    '3ª Série'
  ],
};

const timeConfig: { 
  [key: string]: { 
    durations: { label: string; value: number }[], 
    counts: { label: string; value: number }[] 
  } 
} = {
  educacao_infantil: {
    durations: [
      { label: '30 min (Atividade curta/Rotina)', value: 30 },
      { label: '45 min (Atividade padrão)', value: 45 },
      { label: '60 min (1 hora)', value: 60 },
      { label: '4 horas (Período parcial)', value: 240 },
      { label: '7 horas (Período integral)', value: 420 },
    ],
    counts: [
      { label: '1 momento/atividade', value: 1 },
      { label: 'Sequência de 3 atividades', value: 3 },
      { label: '5 atividades (Semana)', value: 5 },
    ]
  },
  ensino_fundamental: {
    durations: [
      { label: '45 min (Hora-aula curta)', value: 45 },
      { label: '50 min (Hora-aula padrão)', value: 50 },
      { label: '60 min (Hora relógio)', value: 60 },
    ],
    counts: [
      { label: '1 aula (Isolada)', value: 1 },
      { label: '2 aulas (Geminada/Bloco)', value: 2 },
      { label: '3 aulas', value: 3 },
      { label: '4 aulas (Semana padrão)', value: 4 },
      { label: '5 aulas (Semana intensiva)', value: 5 },
    ]
  },
  ensino_medio: {
    durations: [
      { label: '45 min (Hora-aula noturno/curta)', value: 45 },
      { label: '50 min (Hora-aula padrão)', value: 50 },
      { label: '100 min (Bloco duplo)', value: 100 },
    ],
    counts: [
      { label: '1 aula', value: 1 },
      { label: '2 aulas (Geminada)', value: 2 },
      { label: '3 aulas (Carga horária estendida)', value: 3 },
      { label: '4 aulas (Semana de área)', value: 4 },
      { label: '5 aulas', value: 5 },
    ]
  }
};

// Base de dados simplificada para exemplo (o ideal é manter num arquivo separado se crescer muito)
const themeSuggestions: { [modality: string]: { [discipline: string]: { [grade: string]: string[] } } } = {
  'educacao_infantil': {
    'Campos de Experiências': {
      'Berçário I (0 a 1 ano)': ['Exploração sensorial', 'Sons e gestos'],
      'Pré-escola I (4 a 5 anos)': ['Escrita do nome', 'Jogos de regras']
    }
  },
  // ... (adicione mais sugestões conforme necessário ou use o código anterior completo)
};

const LessonPlanForm: React.FC<LessonPlanFormProps> = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        modalidade_ensino: 'ensino_medio',
        componente_curricular: 'Biologia',
        serie_turma: '3ª Série',
        objeto_conhecimento: 'Sistema Nervoso Central',
        duracao_aula_min: 50,
        numero_aulas: 1,
        nivel_detalhe: 'completo' as 'resumo' | 'completo' | 'detalhado',
    });

  const currentDisciplines = useMemo(() => {
    return disciplinesByModality[formData.modalidade_ensino] || [];
  }, [formData.modalidade_ensino]);

  const currentGrades = useMemo(() => {
    return gradesByModality[formData.modalidade_ensino] || [];
  }, [formData.modalidade_ensino]);

  const currentTimeConfig = useMemo(() => {
    return timeConfig[formData.modalidade_ensino] || timeConfig['ensino_medio'];
  }, [formData.modalidade_ensino]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'modalidade_ensino') {
        const newDiscipline = disciplinesByModality[value][0];
        const newGrade = gradesByModality[value][0];
        const newTimeConfig = timeConfig[value] || timeConfig['ensino_medio'];
        
        setFormData(prev => ({
            ...prev,
            modalidade_ensino: value,
            componente_curricular: newDiscipline,
            serie_turma: newGrade,
            duracao_aula_min: newTimeConfig.durations[0].value,
            numero_aulas: newTimeConfig.counts[0].value
        }));
    } else {
        setFormData(prev => ({
          ...prev,
          [name]: name === 'duracao_aula_min' || name === 'numero_aulas' ? parseInt(value, 10) : value,
        }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const modalityName = teachingModalities.find(m => m.id === formData.modalidade_ensino)?.name || formData.modalidade_ensino;
    const submissionData: LessonPlanRequest = {
        ...formData,
        modalidade_ensino: modalityName,
        disciplina: formData.componente_curricular,
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <div>
        <label htmlFor="modalidade_ensino" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Modalidade de Ensino
        </label>
        <select
          name="modalidade_ensino"
          id="modalidade_ensino"
          value={formData.modalidade_ensino}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {teachingModalities.map(modality => (
            <option key={modality.id} value={modality.id}>{modality.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="componente_curricular" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Componente Curricular
        </label>
        <select
          name="componente_curricular"
          id="componente_curricular"
          value={formData.componente_curricular}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
            {currentDisciplines.map(discipline => (
                <option key={discipline} value={discipline}>{discipline}</option>
            ))}
        </select>
      </div>

      <div>
        <label htmlFor="serie_turma" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Série / Turma
        </label>
        <select
          name="serie_turma"
          id="serie_turma"
          value={formData.serie_turma}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
            {currentGrades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
            ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="objeto_conhecimento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Objeto do Conhecimento / Conteúdo
        </label>
        <textarea
          name="objeto_conhecimento"
          id="objeto_conhecimento"
          value={formData.objeto_conhecimento}
          onChange={handleChange}
          required
          rows={3}
          placeholder="Digite o tema da aula..."
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
            <label htmlFor="duracao_aula_min" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Duração da Aula
            </label>
            <select
                name="duracao_aula_min"
                id="duracao_aula_min"
                value={formData.duracao_aula_min}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
                {currentTimeConfig.durations.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
        <div>
            <label htmlFor="numero_aulas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nº de Aulas
            </label>
            <select
                name="numero_aulas"
                id="numero_aulas"
                value={formData.numero_aulas}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
                {currentTimeConfig.counts.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
      </div>

      <div>
        <label htmlFor="nivel_detalhe" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Nível de Detalhe
        </label>
        <select
          name="nivel_detalhe"
          id="nivel_detalhe"
          value={formData.nivel_detalhe}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="resumo">Resumo</option>
          <option value="completo">Completo</option>
          <option value="detalhado">Detalhado</option>
        </select>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Gerando Plano...' : 'Gerar Plano de Aula'}
        </button>
      </div>
    </form>
  );
};

export default LessonPlanForm;
