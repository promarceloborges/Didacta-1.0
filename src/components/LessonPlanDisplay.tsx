import React, { useState, useRef } from 'react';
import type { LessonPlanResponse } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

interface LessonPlanDisplayProps {
  data: LessonPlanResponse;
}

const LessonPlanPrintTemplate = React.forwardRef<HTMLDivElement, { data: LessonPlanResponse }>(({ data }, ref) => {
  const { plano_aula } = data;
  
  return (
    <div ref={ref} className="bg-white p-6 text-black font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}> 
      <div className="border-b-2 border-gray-800 mb-4 pb-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase">{plano_aula.titulo}</h1>
        <div className="flex justify-between text-sm text-gray-700 font-semibold mt-2">
             <span>{plano_aula.componente_curricular} &bull; {plano_aula.serie_turma}</span>
             <span>Duração: {plano_aula.duracao_total_min} min ({plano_aula.numero_de_aulas} aulas)</span>
        </div>
      </div>

      <div className="space-y-5">
         <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">1. Fundamentação Pedagógica</h2>
            <div className="space-y-2 text-sm text-gray-800">
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <p><strong>Competência Específica:</strong></p>
                    <p className="mt-1">{plano_aula.competencia_especifica.codigo} - {plano_aula.competencia_especifica.texto}</p>
                </div>
                
                <div>
                    <strong>Habilidades:</strong>
                    <ul className="list-disc list-inside ml-1 mt-1 space-y-1">
                        {plano_aula.habilidades.map(h => (
                            <li key={h.codigo}>
                                <span className="font-semibold">{h.codigo}:</span> {h.texto}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <strong>Objetivos de Aprendizagem:</strong>
                    <ul className="list-disc list-inside ml-1 mt-1 space-y-1">
                         {plano_aula.objetivos_de_aprendizagem.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                </div>
            </div>
         </section>

         <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">2. Metodologia e Atividades</h2>
            <div className="space-y-3 text-sm text-gray-800">
                 {plano_aula.metodologia.map((etapa, i) => (
                    <div key={i} className="mb-2">
                        <h3 className="font-bold text-gray-900 text-base mb-1">{etapa.etapa} <span className="font-normal text-gray-600 text-xs ml-2">({etapa.duracao_min} min)</span></h3>
                        <div className="pl-3 border-l-2 border-gray-300">
                            <ul className="list-disc list-inside ml-1 mb-2 space-y-1">
                                {etapa.atividades.map((a, j) => <li key={j}>{a}</li>)}
                            </ul>
                        </div>
                    </div>
                 ))}
            </div>
         </section>

         <section className="break-inside-avoid">
             <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">3. Avaliação</h2>
             <div className="text-sm text-gray-800 grid grid-cols-2 gap-4">
                 <div>
                    <p className="font-bold mb-1">Critérios:</p>
                    <ul className="list-disc list-inside ml-1 space-y-1">
                        {plano_aula.estrategia_de_avaliacao.criterios.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                 </div>
             </div>
         </section>
        
         <section className="break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">4. Recursos e Adaptações</h2>
            <div className="text-sm text-gray-800 space-y-2">
                <div>
                    <p className="font-bold mb-1">Material de Apoio:</p>
                    <ul className="list-disc list-inside ml-1 space-y-1">
                         {plano_aula.material_de_apoio.map((m, i) => (
                            <li key={i} className="break-words">
                                <span className="uppercase text-xs font-bold bg-gray-200 px-1 rounded mr-1">{m.tipo}</span> 
                                {m.titulo} 
                                <span className="text-gray-500 text-xs block ml-6 break-all">{m.link}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <p className="font-bold mb-1">Adaptações (NEE):</p>
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <ul className="list-disc list-inside ml-1 space-y-1">
                            {plano_aula.adapitacoes_nee.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
         </section>
      </div>
      
      <div className="mt-8 pt-2 border-t border-gray-300 text-center text-xs text-gray-400 flex justify-between items-center">
        <span>Gerado por <strong>Didacta</strong></span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
});

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 md:p-4 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{title}</h3>
        <svg className={`w-6 h-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      {isOpen && <div className="p-3 md:p-4 bg-white dark:bg-gray-800/50 rounded-b-lg">{children}</div>}
    </div>
  );
};

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({ data }) => {
  const { plano_aula } = data;
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | 'txt' | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const generatePlainText = (data: LessonPlanResponse): string => {
    const { plano_aula } = data;
    let content = `PLANO DE AULA: ${plano_aula.titulo}\n`;
    content += `Série/Turma: ${plano_aula.serie_turma} | Disciplina: ${plano_aula.componente_curricular}\n\n`;
    
    content += "FUNDAMENTAÇÃO\n";
    content += `Competência: ${plano_aula.competencia_especifica.codigo}\n`;
    plano_aula.habilidades.forEach(h => content += `- ${h.codigo}: ${h.texto}\n`);
    content += "\nMETODOLOGIA\n";
    plano_aula.metodologia.forEach(e => content += `${e.etapa}: ${e.atividades.join('; ')}\n`);
    
    return content;
  };
  
  const generateDocxObject = (data: LessonPlanResponse) => {
    const { plano_aula } = data;
    const children: any[] = [];
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(plano_aula.titulo)] }));
    // ... (Lógica simplificada para brevidade, o código completo do docx é grande, mas segue o padrão)
    return new Document({ sections: [{ children }] });
  };

  const handleShareWhatsApp = () => {
    setIsExportMenuOpen(false);
    const text = generatePlainText(data);
    const header = `*Didacta - Novo Plano de Aula*\n\n`;
    const encodedText = encodeURIComponent(header + text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
    if (exportingFormat) return;
    const fileName = `plano_${plano_aula.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    setExportingFormat(format);
    setIsExportMenuOpen(false);
    
    try {
        if (format === 'pdf' && printRef.current) {
            const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`${fileName}.pdf`);
        } else if (format === 'txt') {
            const blob = new Blob([generatePlainText(data)], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${fileName}.txt`; a.click();
        }
    } catch (e) {
        alert(`Erro ao exportar.`);
    } finally {
        setExportingFormat(null);
    }
  };

  return (
    <div className="text-gray-800 dark:text-gray-200">
      <div className="absolute left-[-9999px] top-0 overflow-hidden">
        <LessonPlanPrintTemplate ref={printRef} data={data} />
      </div>

      <div className='bg-white dark:bg-gray-900 p-4'>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-300 mb-2">{plano_aula.titulo}</h2>
            <p className="text-gray-600 dark:text-gray-400">{plano_aula.serie_turma} - {plano_aula.componente_curricular}</p>
          </div>

          <Section title="Fundamentação Pedagógica" defaultOpen={true}>
            <div className="space-y-4">
               <p><strong>Competência:</strong> {plano_aula.competencia_especifica.codigo}</p>
               <ul className="list-disc list-inside">{plano_aula.habilidades.map(h => <li key={h.codigo}>{h.codigo}: {h.texto}</li>)}</ul>
            </div>
          </Section>
          
          <Section title="Metodologia">
            <div className="space-y-6">
              {plano_aula.metodologia.map((etapa, i) => (
                <div key={i} className="border-l-4 border-emerald-500 pl-4">
                  <h4 className="font-bold">{etapa.etapa}</h4>
                  <ul className="list-disc list-inside">{etapa.atividades.map((a, j) => <li key={j}>{a}</li>)}</ul>
                </div>
              ))}
            </div>
          </Section>
      </div>

      <div className="mt-8 text-center pb-12 relative">
        <div className="relative inline-block text-left w-full md:w-auto">
            <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} disabled={!!exportingFormat} className="bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg">
              {exportingFormat ? 'Processando...' : 'Salvar ou Compartilhar'}
            </button>
            
            {isExportMenuOpen && (
                <div className="origin-bottom-right absolute right-0 bottom-full mb-3 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button onClick={handleShareWhatsApp} className="block w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700">WhatsApp</button>
                    <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700">PDF</button>
                    <button onClick={() => handleExport('txt')} className="block w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700">Texto</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LessonPlanDisplay;
