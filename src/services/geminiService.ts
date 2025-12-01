import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

// AQUI ESTAVA O ERRO: A linha "const ai = ..." foi removida daqui de cima.
// Agora a IA só é iniciada dentro da função "generateLessonPlanStream" lá embaixo.

async function fetchEducationalData() {
  try {
    // Busca os arquivos da pasta public
    const [bnccResponse, saebResponse] = await Promise.all([
        fetch('/bncc_data.json'),
        fetch('/saeb_data.json')
    ]);

    // Converte para JSON se a resposta for OK
    const bnccData = bnccResponse.ok ? await bnccResponse.json() : [];
    const saebData = saebResponse.ok ? await saebResponse.json() : {};

    return { bnccData, saebData };
  } catch (error) {
    console.error("Erro ao buscar dados educativos:", error);
    return { bnccData: [], saebData: {} };
  }
}

// Definição da estrutura do plano de aula (Schema)
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

// Função principal exportada
export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  
  // 1. Pega a chave das variáveis de ambiente
  const apiKey = process.env.API_KEY;
  
  // 2. Verifica se a chave existe antes de tentar usar
  if (!apiKey) {
    console.error("CHAVE API NÃO ENCONTRADA. Verifique o painel do Netlify.");
    throw new Error("Erro de Configuração: A chave de API (API_KEY) não foi configurada no servidor.");
  }

  // 3. Inicializa a IA agora (Lazy Loading)
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // 4. Busca os dados da BNCC
  const { bnccData, saebData } = await fetchEducationalData();

  // 5. Prepara as instruções para a IA
  const systemInstruction = `
    Você é um especialista em pedagogia e design instrucional, fluente em português do Brasil (pt-BR).
    Sua tarefa é criar planos de aula detalhados e de alta qualidade, alinhados à Base Nacional Comum Curricular (BNCC) e ao SAEB.
    
    UTILIZE AS SEGUINTES BASES DE DADOS CARREGADAS PARA REFERÊNCIA:

    --- DADOS BNCC ---
    ${JSON.stringify(bnccData).substring(0, 20000)} 
    (Dados parciais para referência, use seu conhecimento geral da BNCC se necessário)
    ------------------

    --- DADOS SAEB ---
    ${JSON.stringify(saebData)}
    ------------------
    
    Diretrizes de Geração do JSON:
    - Você deve retornar estritamente um objeto JSON válido.
    - Siga rigorosamente o schema JSON fornecido.
    - O plano deve ser completo e detalhado.
  `;

  const prompt = `
    Gere um plano de aula completo:
    - Modalidade: ${request.modalidade_ensino}
    - Disciplina: ${request.componente_curricular}
    - Turma: ${request.serie_turma}
    - Tema: ${request.objeto_conhecimento}
    - Duração: ${request.duracao_aula_min} min (${request.numero_aulas} aulas)
    - Nível: ${request.nivel_detalhe}
  `;

  try {
    // 6. Chama a IA e transmite a resposta (Stream)
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
    console.error("Erro na geração:", error);
    let errorMessage = "Ocorreu um erro ao gerar o plano de aula.";
    
    if (error instanceof Error) {
        if (error.message.includes("429")) {
            errorMessage = "Muitos pedidos simultâneos. Aguarde um momento.";
        } else if (error.message.includes("API key")) {
             errorMessage = "Chave de API inválida ou expirada.";
        }
    }
    throw new Error(errorMessage);
  }
};
