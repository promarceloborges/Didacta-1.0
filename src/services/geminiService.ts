import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlanRequest } from '../types';

// A chave será injetada pelo Vite/Netlify
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function fetchEducationalData() {
  try {
    // Busca na pasta public (raiz do site publicado)
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

// ... (MANTENHA O RESTO DO CÓDIGO do arquivo geminiService.ts original DAQUI PARA BAIXO: schema e função generateLessonPlanStream)
// Se precisar que eu repita o arquivo inteiro, me avise.
