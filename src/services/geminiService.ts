import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  
  // CORREÇÃO PARA VERCEL: Usa import.meta.env.VITE_API_KEY
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiKey) {
    console.error("ERRO CRÍTICO: A chave VITE_API_KEY não foi encontrada.");
    throw new Error("Erro de Configuração: Chave de API não encontrada na Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Busca os dados dinamicamente (certifique-se que estão na pasta public)
  const { bnccData, saebData } = await fetchEducationalData();

  const systemInstruction = `
    Você é um especialista em pedagogia e design instrucional.
    Crie um plano de aula detalhado e alinhado à BNCC.
    
    DADOS BNCC: ${JSON.stringify(bnccData).substring(0, 15000)}...
    
    Diretrizes:
    - Retorne APENAS JSON válido.
    - Siga o schema.
  `;

  const prompt = `
    Gere um plano de aula:
    - Modalidade: ${request.modalidade_ensino}
    - Disciplina: ${request.componente_curricular}
    - Turma: ${request.serie_turma}
    - Tema: ${request.objeto_conhecimento}
    - Duração: ${request.duracao_aula_min} min
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
        }
    });
    
    for await (const chunk of response) {
      if(chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("ERRO API GEMINI:", error);
    let msg = "Erro ao gerar plano.";
    
    if (error instanceof Error) {
        // Tratamento de erros específicos do Google
        if (error.message.includes("400")) msg = "Erro 400: Chave de API inválida.";
        if (error.message.includes("403")) msg = "Erro 403: Permissão negada ou chave expirada.";
        if (error.message.includes("404")) msg = "Erro 404: Modelo não encontrado.";
        if (error.message.includes("429")) msg = "Erro 429: Muitos pedidos. Tente novamente.";
    }
    throw new Error(msg);
  }
}

// Função auxiliar (mantida igual)
async function fetchEducationalData() {
  try {
    const [bnccResponse, saebResponse] = await Promise.all([
        fetch('/bncc_data.json'),
        fetch('/saeb_data.json')
    ]);
    const bnccData = bnccResponse.ok ? await bnccResponse.json() : [];
    const saebData = saebResponse.ok ? await saebResponse.json() : {};
    return { bnccData, saebData };
  } catch (error) {
    console.error("Erro ao buscar arquivos JSON:", error);
    return { bnccData: [], saebData: {} };
  }
}

// Schema (Resumido para caber aqui, use o completo que você já tem ou peça de novo se precisar)
const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    meta: { type: Type.OBJECT, properties: { gerado_por: { type: Type.STRING }, timestamp: { type: Type.STRING }, versao_template: { type: Type.STRING } }, required: ['gerado_por'] },
    plano_aula: { type: Type.OBJECT, properties: { titulo: { type: Type.STRING }, componente_curricular: { type: Type.STRING }, disciplina: { type: Type.STRING }, serie_turma: { type: Type.STRING }, objetos_do_conhecimento: { type: Type.ARRAY, items: { type: Type.STRING } }, duracao_total_min: { type: Type.INTEGER }, numero_de_aulas: { type: Type.INTEGER }, competencia_especifica: { type: Type.OBJECT, properties: { codigo: { type: Type.STRING }, texto: { type: Type.STRING } }, required: ['codigo', 'texto'] }, habilidades: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { codigo: { type: Type.STRING }, texto: { type: Type.STRING } }, required: ['codigo', 'texto'] } }, objetivos_de_aprendizagem: { type: Type.ARRAY, items: { type: Type.STRING } }, descritores: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { codigo: { type: Type.STRING }, texto: { type: Type.STRING } }, required: ['codigo', 'texto'] } }, metodologia: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { etapa: { type: Type.STRING }, duracao_min: { type: Type.INTEGER }, atividades: { type: Type.ARRAY, items: { type: Type.STRING } }, recursos: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['etapa', 'duracao_min', 'atividades', 'recursos'] } }, material_de_apoio: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tipo: { type: Type.STRING }, titulo: { type: Type.STRING }, link: { type: Type.STRING } }, required: ['tipo', 'titulo', 'link'] } }, estrategia_de_avaliacao: { type: Type.OBJECT, properties: { criterios: { type: Type.ARRAY, items: { type: Type.STRING } }, instrumentos: { type: Type.ARRAY, items: { type: Type.STRING } }, pesos: { type: Type.OBJECT, properties: { prova: {type: Type.NUMBER}, atividade: {type: Type.NUMBER}, participacao: {type: Type.NUMBER} } } }, required: ['criterios', 'instrumentos'] }, adapitacoes_nee: { type: Type.ARRAY, items: { type: Type.STRING } }, observacoes: { type: Type.STRING }, export_formats: { type: Type.ARRAY, items: { type: Type.STRING } }, hash_validacao: { type: Type.STRING } }, required: ['titulo', 'componente_curricular', 'disciplina', 'serie_turma', 'objetos_do_conhecimento', 'duracao_total_min', 'numero_de_aulas', 'competencia_especifica', 'habilidades', 'objetivos_de_aprendizagem', 'descritores', 'metodologia', 'material_de_apoio', 'estrategia_de_avaliacao', 'adapitacoes_nee', 'observacoes'] }
  },
  required: ['meta', 'plano_aula']
};
