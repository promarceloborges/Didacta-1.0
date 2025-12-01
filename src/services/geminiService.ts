import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

// --- MUDANÇA AQUI ---
// Usando import.meta.env para ler a chave nativamente (sem precisar de config extra)
const apiKey = import.meta.env.VITE_API_KEY; 

// Mantendo a lógica de inicialização lazy
// ... (Resto do código igual ao anterior, mas usando a variável 'apiKey' definida acima)

async function fetchEducationalData() {
    // ... (código igual)
}

// ... (Schema igual)

export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  
  // Verificação de segurança
  if (!apiKey) {
    console.error("CHAVE VITE_API_KEY NÃO ENCONTRADA.");
    throw new Error("Erro de Configuração: A chave VITE_API_KEY não está configurada no Netlify.");
  }

  // Inicializa com a chave correta
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // ... (Resto da função generateLessonPlanStream igual, com prompt e try/catch)
  // Vou colocar o código completo abaixo para você copiar:

  const { bnccData, saebData } = await fetchEducationalData();

  const systemInstruction = `
    Você é um especialista em pedagogia e design instrucional, fluente em português do Brasil (pt-BR).
    Sua tarefa é criar planos de aula detalhados e de alta qualidade, alinhados à Base Nacional Comum Curricular (BNCC) e ao SAEB.
    
    UTILIZE AS SEGUINTES BASES DE DADOS CARREGADAS PARA REFERÊNCIA:
    --- DADOS BNCC ---
    ${JSON.stringify(bnccData)}
    ------------------
    --- DADOS SAEB ---
    ${JSON.stringify(saebData)}
    ------------------

    Instruções: Siga rigorosamente o schema JSON.
  `;

  const prompt = `
    Por favor, gere um plano de aula completo com base nos seguintes parâmetros:
    - Modalidade: ${request.modalidade_ensino}
    - Disciplina: ${request.componente_curricular}
    - Turma: ${request.serie_turma}
    - Conteúdo: ${request.objeto_conhecimento}
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
        }
    });
    
    for await (const chunk of response) {
      if(chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("Erro na geração:", error);
    throw new Error("Ocorreu um erro ao gerar o plano. Verifique o console.");
  }
};
