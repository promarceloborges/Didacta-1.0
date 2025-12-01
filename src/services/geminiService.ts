import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  
  // MUDANÇA AQUI: Usando o padrão nativo do Vite
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiKey) {
    console.error("Chave de API não encontrada. Verifique se VITE_API_KEY está configurada no Netlify.");
    throw new Error("Erro de Configuração: Chave de API não encontrada. Configure VITE_API_KEY no Netlify.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Busca os dados dinamicamente
  const { bnccData, saebData } = await fetchEducationalData();

  const systemInstruction = `
    Você é um especialista em pedagogia e design instrucional, fluente em português do Brasil (pt-BR).
    Sua tarefa é criar planos de aula detalhados e de alta qualidade, alinhados à Base Nacional Comum Curricular (BNCC) e ao SAEB.
    
    UTILIZE AS SEGUINTES BASES DE DADOS CARREGADAS PARA REFERÊNCIA:

    --- DADOS BNCC (COMPETÊNCIAS E HABILIDADES) ---
    ${JSON.stringify(bnccData)}
    -----------------------------------------------

    --- DADOS SAEB (MATRIZES DE REFERÊNCIA) ---
    ${JSON.stringify(saebData)}
    -------------------------------------------

    Instruções de Uso dos Dados:
    1. Consulte a base 'bnccData' para encontrar o código da habilidade (ex: EF01LP01, EM13LGG101) que melhor se adapta ao tema. O campo 'texto_full' contém a descrição.
    2. Consulte a base 'saebData' para encontrar descritores. Note que a base SAEB está estruturada por DISCIPLINA e ANO (ex: saeb.lingua_portuguesa.5_ano.descritores).
       - Navegue na estrutura JSON do SAEB para encontrar o nível escolar e disciplina mais próximos da solicitação do usuário.
       - Se a disciplina ou ano exato não estiverem no SAEB, use o nível mais próximo (ex: usar descritores do 5º ano para o 4º ano como referência de meta).
    
    Diretrizes de Geração do JSON:
    - Você deve retornar estritamente um objeto JSON válido, sem texto fora do JSON.
    - Siga rigorosamente o schema JSON fornecido em 'responseSchema'.
    - Para 'competencia_especifica' e 'habilidades', use dados da BNCC fornecidos. Se não encontrar exato, use seu conhecimento para inferir o código correto da BNCC.
    - Para 'descritores', extraia do objeto 'saebData'. Exemplo: Se a aula é de Matemática 9º ano, procure em saeb.matematica.9_ano.descritores.
    - Para 'material_de_apoio', se tipo for 'Vídeo', o link DEVE ser uma URL de busca do YouTube.
    - O conteúdo deve ser original, prático e adaptado à realidade das escolas brasileiras.
    - Inclua adaptações claras para alunos com NEE (Necessidades Educacionais Especiais).
  `;

  const prompt = `
    Por favor, gere um plano de aula completo com base nos seguintes parâmetros:
    
    Parâmetros da Solicitação:
    - Modalidade de Ensino: ${request.modalidade_ensino}
    - Componente Curricular/Disciplina: ${request.componente_curricular}
    - Série/Turma: ${request.serie_turma}
    - Objeto do Conhecimento/Conteúdo: ${request.objeto_conhecimento}
    - Duração da Aula (minutos): ${request.duracao_aula_min}
    - Número de Aulas: ${request.numero_aulas}
    - Nível de Detalhe: ${request.nivel_detalhe}
    - Língua: pt-BR
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
    console.error("Error generating lesson plan:", error);
    let errorMessage = "Ocorreu um erro ao gerar o plano de aula.";
    if (error instanceof Error) {
        if (error.message.includes("SAFETY")) {
            errorMessage = "Bloqueio de segurança da IA. Tente outro tema.";
        } else if (error.message.includes("429")) {
            errorMessage = "Muitos pedidos. Aguarde um instante.";
        } else if (error.message.includes("API key")) {
             errorMessage = "Erro de Chave: VITE_API_KEY não configurada.";
        }
    }
    throw new Error(errorMessage);
  }
}

// Mantendo a função auxiliar e o schema (necessários para o código acima funcionar)
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
    console.error("Erro dados:", error);
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
