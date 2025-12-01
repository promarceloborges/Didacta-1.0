import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

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
    console.error("Erro ao buscar dados educativos:", error);
    return { bnccData: [], saebData: {} };
  }
}

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    meta: {
      type: Type.OBJECT,
      properties: {
        gerado_por: { type: Type.STRING },
        timestamp: { type: Type.STRING },
        versao_template: { type: Type.STRING },
      },
       required: ['gerado_por', 'timestamp', 'versao_template']
    },
    plano_aula: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING },
        componente_curricular: { type: Type.STRING },
        disciplina: { type: Type.STRING },
        serie_turma: { type: Type.STRING },
        objetos_do_conhecimento: { type: Type.ARRAY, items: { type: Type.STRING } },
        duracao_total_min: { type: Type.INTEGER },
        numero_de_aulas: { type: Type.INTEGER },
        competencia_especifica: { 
            type: Type.OBJECT,
            properties: {
                codigo: { type: Type.STRING },
                texto: { type: Type.STRING },
            },
            required: ['codigo', 'texto']
        },
        habilidades: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    codigo: { type: Type.STRING },
                    texto: { type: Type.STRING },
                },
                required: ['codigo', 'texto']
            }
        },
        objetivos_de_aprendizagem: { type: Type.ARRAY, items: { type: Type.STRING } },
        descritores: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    codigo: { type: Type.STRING },
                    texto: { type: Type.STRING },
                },
                required: ['codigo', 'texto']
            }
        },
        metodologia: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              etapa: { type: Type.STRING },
              duracao_min: { type: Type.INTEGER },
              atividades: { type: Type.ARRAY, items: { type: Type.STRING } },
              recursos: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['etapa', 'duracao_min', 'atividades', 'recursos']
          },
        },
        material_de_apoio: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tipo: { type: Type.STRING },
              titulo: { type: Type.STRING },
              link: { type: Type.STRING },
            },
            required: ['tipo', 'titulo', 'link']
          },
        },
        estrategia_de_avaliacao: {
          type: Type.OBJECT,
          properties: {
            criterios: { type: Type.ARRAY, items: { type: Type.STRING } },
            instrumentos: { type: Type.ARRAY, items: { type: Type.STRING } },
            pesos: { 
                type: Type.OBJECT,
                properties: {
                    prova: {type: Type.NUMBER},
                    atividade: {type: Type.NUMBER},
                    participacao: {type: Type.NUMBER}
                }
             },
          },
          required: ['criterios', 'instrumentos']
        },
        adapitacoes_nee: { type: Type.ARRAY, items: { type: Type.STRING } },
        observacoes: { type: Type.STRING },
        export_formats: { type: Type.ARRAY, items: { type: Type.STRING } },
        hash_validacao: { type: Type.STRING },
      },
       required: ['titulo', 'componente_curricular', 'disciplina', 'serie_turma', 'objetos_do_conhecimento', 'duracao_total_min', 'numero_de_aulas', 'competencia_especifica', 'habilidades', 'objetivos_de_aprendizagem', 'descritores', 'metodologia', 'material_de_apoio', 'estrategia_de_avaliacao', 'adapitacoes_nee', 'observacoes']
    },
  },
  required: ['meta', 'plano_aula']
};

export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  
  // AUMENTADO O LIMITE DE TOKENS E OTIMIZADO O PROMPT
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API key not found. Please check your environment variables in Netlify.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Busca os dados dinamicamente de ambos os arquivos
  const { bnccData, saebData } = await fetchEducationalData();

  const systemInstruction = `
    Você é um especialista em pedagogia, fluente em português do Brasil.
    Sua tarefa é criar planos de aula EXTREMAMENTE DETALHADOS E COMPLETOS.
    
    O usuário precisa de um plano longo, que cubra todo o tempo de aula solicitado sem cortes.
    Seja verboso nas explicações da metodologia.
    
    UTILIZE AS SEGUINTES BASES DE DADOS:
    --- DADOS BNCC ---
    ${JSON.stringify(bnccData).substring(0, 25000)} 
    (Dados truncados para economizar tokens de entrada, mas use o conhecimento geral da BNCC se necessário)
    -------------------

    Diretrizes Críticas:
    1. O JSON deve ser válido e COMPLETO. Não pare no meio.
    2. Se o plano for longo, simplifique a estrutura de 'metodologia' para ter menos etapas mas com descrições mais ricas, para economizar tokens de estrutura.
    3. Use 'bnccData' para códigos.
  `;

  const prompt = `
    Gere um plano de aula completo sobre: ${request.objeto_conhecimento}
    Para: ${request.serie_turma} (${request.modalidade_ensino})
    Disciplina: ${request.componente_curricular}
    Duração: ${request.duracao_aula_min} min (${request.numero_aulas} aulas)
    
    IMPORTANTE: O plano deve ser completo e detalhado, preenchendo todos os campos do schema.
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
            maxOutputTokens: 8192, // AUMENTADO AO MÁXIMO PARA EVITAR CORTES
        }
    });
    
    for await (const chunk of response) {
      if(chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("Error generating lesson plan:", error);
    let errorMessage = "Ocorreu um erro ao gerar o plano de aula.";
    if (error instanceof Error) {
        if (error.message.includes("SAFETY")) {
            errorMessage = "Conteúdo bloqueado por segurança.";
        } else if (error.message.includes("429")) {
            errorMessage = "Muitos pedidos. Tente novamente em 1 minuto.";
        } else if (error.message.includes("API key")) {
             errorMessage = "Erro de Chave de API.";
        }
    }
    throw new Error(errorMessage);
  }
}
