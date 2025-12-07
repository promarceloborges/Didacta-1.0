import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  
  // --- CORREÇÃO DEFINITIVA PARA VERCEL ---
  // Lê a variável com prefixo VITE_, padrão obrigatório para Vite na Vercel
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiKey) {
    throw new Error("ERRO CRÍTICO: A chave 'VITE_API_KEY' não foi encontrada. Verifique as Variáveis de Ambiente na Vercel.");
  }

  // Inicialização LAZY (só conecta ao clicar)
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const { bnccData, saebData } = await fetchEducationalData();

  const systemInstruction = `
    Atue como especialista pedagógico brasileiro.
    Crie planos de aula alinhados à BNCC e SAEB.
    
    Contexto BNCC: ${JSON.stringify(bnccData).substring(0, 15000)}
    Contexto SAEB: ${JSON.stringify(saebData)}

    DIRETRIZES:
    1. Retorne APENAS JSON válido.
    2. Não corte a resposta. Se for longo, seja conciso no texto, mas mantenha a estrutura.
    3. Inclua atividades de recuperação para alunos com dificuldades.
  `;

  const prompt = `
    Plano de Aula:
    - Modalidade: ${request.modalidade_ensino}
    - Disciplina: ${request.componente_curricular}
    - Turma: ${request.serie_turma}
    - Tema: ${request.objeto_conhecimento}
    - Duração: ${request.duracao_aula_min} min (${request.numero_aulas} aulas)
    - Detalhe: ${request.nivel_detalhe}
  `;

  try {
    const response = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: lessonPlanSchema,
            temperature: 0.7,
            maxOutputTokens: 8192, // Limite máximo para evitar cortes
        }
    });
    
    for await (const chunk of response) {
      if(chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("Erro API:", error);
    throw new Error("Falha ao gerar plano. Verifique a chave VITE_API_KEY na Vercel.");
  }
}

async function fetchEducationalData() {
  try {
    const [bnccResponse, saebResponse] = await Promise.all([
        fetch('/bncc_data.json'),
        fetch('/saeb_data.json')
    ]);
    return { 
        bnccData: bnccResponse.ok ? await bnccResponse.json() : [], 
        saebData: saebResponse.ok ? await saebResponse.json() : {} 
    };
  } catch (e) { return { bnccData: [], saebData: {} }; }
}

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    meta: { type: Type.OBJECT, properties: { gerado_por: { type: Type.STRING }, timestamp: { type: Type.STRING }, versao_template: { type: Type.STRING } }, required: ['gerado_por'] },
    plano_aula: { type: Type.OBJECT, properties: { 
        titulo: { type: Type.STRING }, 
        componente_curricular: { type: Type.STRING }, 
        disciplina: { type: Type.STRING }, 
        serie_turma: { type: Type.STRING }, 
        objetos_do_conhecimento: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        duracao_total_min: { type: Type.INTEGER }, 
        numero_de_aulas: { type: Type.INTEGER }, 
        competencia_especifica: { type: Type.OBJECT, properties: { codigo: { type: Type.STRING }, texto: { type: Type.STRING } }, required: ['codigo', 'texto'] }, 
        habilidades: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { codigo: { type: Type.STRING }, texto: { type: Type.STRING } }, required: ['codigo', 'texto'] } }, 
        objetivos_de_aprendizagem: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        descritores: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { codigo: { type: Type.STRING }, texto: { type: Type.STRING } }, required: ['codigo', 'texto'] } }, 
        metodologia: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { etapa: { type: Type.STRING }, duracao_min: { type: Type.INTEGER }, atividades: { type: Type.ARRAY, items: { type: Type.STRING } }, recursos: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['etapa', 'duracao_min', 'atividades', 'recursos'] } }, 
        material_de_apoio: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tipo: { type: Type.STRING }, titulo: { type: Type.STRING }, link: { type: Type.STRING } }, required: ['tipo', 'titulo', 'link'] } }, 
        estrategia_de_avaliacao: { type: Type.OBJECT, properties: { criterios: { type: Type.ARRAY, items: { type: Type.STRING } }, instrumentos: { type: Type.ARRAY, items: { type: Type.STRING } }, pesos: { type: Type.OBJECT, properties: { prova: {type: Type.NUMBER}, atividade: {type: Type.NUMBER}, participacao: {type: Type.NUMBER} } } }, required: ['criterios', 'instrumentos'] }, 
        atividades_recuperacao: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Estratégias para alunos com dificuldade" },
        adapitacoes_nee: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        observacoes: { type: Type.STRING }, 
        export_formats: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        hash_validacao: { type: Type.STRING } 
    }, required: ['titulo', 'componente_curricular', 'disciplina', 'serie_turma', 'objetos_do_conhecimento', 'duracao_total_min', 'numero_de_aulas', 'competencia_especifica', 'habilidades', 'objetivos_de_aprendizagem', 'metodologia', 'material_de_apoio', 'estrategia_de_avaliacao', 'atividades_recuperacao', 'adapitacoes_nee', 'observacoes'] }
  },
  required: ['meta', 'plano_aula']
};
