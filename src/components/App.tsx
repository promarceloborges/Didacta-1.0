import React, { useState, useCallback, useEffect, useMemo } from 'react';
import LessonPlanForm from './LessonPlanForm';
import LessonPlanDisplay from './LessonPlanDisplay';
import { generateLessonPlanStream } from '../services/geminiService';
import type { LessonPlanRequest, LessonPlanResponse } from '../types';
import ThemeSwitcher from './ThemeSwitcher';

function App() {
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedPrefs = window.localStorage.getItem('theme');
      if (storedPrefs === 'light' || storedPrefs === 'dark') {
        return storedPrefs;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Cálculos para a animação de progresso
  const progressData = useMemo(() => {
    if (!isLoading) return { percent: 0, status: '' };

    // Estimativa baseada no tamanho médio de um JSON de plano de aula (aprox. 4000-5000 caracteres)
    const estimatedLength = 4500;
    const currentLength = streamingContent.length;
    const rawPercent = Math.round((currentLength / estimatedLength) * 100);
    // Trava em 99% até finalizar
    const percent = Math.min(rawPercent, 99);

    let status = "Iniciando...";
    if (streamingContent.includes('"objetivos_de_aprendizagem"')) status = "Definindo objetivos...";
    if (streamingContent.includes('"habilidades"')) status = "Mapeando a BNCC...";
    if (streamingContent.includes('"metodologia"')) status = "Estruturando a metodologia...";
    if (streamingContent.includes('"material_de_apoio"')) status = "Selecionando recursos...";
    if (streamingContent.includes('"estrategia_de_avaliacao"')) status = "Criando critérios de avaliação...";
    if (streamingContent.includes('"adapitacoes_nee"')) status = "Adaptando para inclusão...";
    
    return { percent, status };
  }, [streamingContent, isLoading]);

  const handleSubmit = useCallback(async (formData: LessonPlanRequest) => {
    setIsLoading(true);
    setError(null);
    setLessonPlan(null);
    setStreamingContent('');
    let accumulatedJson = '';

    try {
      for await (const chunk of generateLessonPlanStream(formData)) {
        accumulatedJson += chunk;
        setStreamingContent(prev => prev + chunk);
      }
      
      const cleanedJson = accumulatedJson
          .replace(/^```json\n?/, '')
          .replace(/\n?```$/, '');

      const result = JSON.parse(cleanedJson);
      setLessonPlan(result);

    } catch (err) {
      if (err instanceof Error) {
        let errorMessage = "Ocorreu um erro ao gerar o plano de aula.";
         if (err.message.includes("SAFETY")) {
            errorMessage = "A solicitação foi bloqueada por questões de segurança. Tente reformular o conteúdo.";
        } else if (err.message.includes("429")) {
            errorMessage = "Limite de requisições atingido. Por favor, aguarde um momento antes de tentar novamente.";
        } else if (err instanceof SyntaxError) {
            errorMessage = "Erro ao processar a resposta. O formato do JSON retornado é inválido.";
        }
        setError(errorMessage);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, []);

  // Configuração do círculo de progresso SVG
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressData.percent / 100) * circumference;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-[1920px]">
          <div>
            <h1 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              Didacta
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Crie planos de aula completos e alinhados à BNCC.
            </p>
          </div>
          <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="container mx-auto p-2 md:p-4 max-w-[1920px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna do Formulário */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg sticky top-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Parâmetros da Aula</h2>
              <LessonPlanForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
          
          {/* Coluna do Display */}
          <div className="lg:col-span-9 xl:col-span-9">
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg min-h-[calc(100vh-8rem)] relative">
              {isLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-gray-800/90 z-10 rounded-lg backdrop-blur-sm">
                    <div className="relative flex items-center justify-center">
                        {/* SVG Circle Progress */}
                        <svg
                          height={radius * 2}
                          width={radius * 2}
                          className="transform -rotate-90"
                        >
                          <circle
                            stroke="currentColor"
                            fill="transparent"
                            strokeWidth={stroke}
                            strokeDasharray={circumference + ' ' + circumference}
                            style={{ strokeDashoffset: 0 }}
                            r={normalizedRadius}
                            cx={radius}
                            cy={radius}
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            stroke="currentColor"
                            fill="transparent"
                            strokeWidth={stroke}
                            strokeDasharray={circumference + ' ' + circumference}
                            style={{ 
                                strokeDashoffset,
                                transition: 'stroke-dashoffset 0.3s ease-in-out'
                            }}
                            strokeLinecap="round"
                            r={normalizedRadius}
                            cx={radius}
                            cy={radius}
                            className="text-emerald-500"
                          />
                        </svg>
                        
                        {/* Percentage Text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {progressData.percent}%
                             </span>
                        </div>
                    </div>
                    
                    <div className="mt-6 text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 animate-pulse">
                            Gerando seu plano de aula...
                        </h3>
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {progressData.status}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-2">
                            O sistema está consultando a base curricular e estruturando as atividades.
                        </p>
                    </div>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full text-center">
                    <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg" role="alert">
                        <strong className="font-bold">Erro!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                </div>
              )}

              {!isLoading && !error && !lessonPlan && (
                 <div className="flex flex-col items-center justify-center h-full text-center min-h-[400px]">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-emerald-400 dark:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Seu plano de aula aparecerá aqui</h3>
                    <p className="text-gray-500 dark:text-gray-500 max-w-md">
                        Preencha o formulário à esquerda com os detalhes da sua aula e clique em "Gerar Plano de Aula".
                    </p>
                </div>
              )}

              {lessonPlan && !isLoading && <LessonPlanDisplay data={lessonPlan} />}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
