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

      <div className="space-y-4">
         <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">1. Fundamentação</h2>
            <div className="text-sm text-gray-800 space-y-2">
                <p><strong>Competência:</strong> {plano_aula.competencia_especifica.codigo} - {plano_aula.competencia_especifica.texto}</p>
                <div>
                    <strong>Habilidades:</strong>
                    <ul className="list-disc list-inside ml-1">
                        {plano_aula.habilidades.map(h => <li key={h.codigo}><strong>{h.codigo}:</strong> {h.texto}</li>)}
                    </ul>
                </div>
            </div>
         </section>

         <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">2. Metodologia</h2>
            <div className="text-sm text-gray-800 space-y-3">
                 {plano_aula.metodologia.map((etapa, i) => (
                    <div key={i}>
                        <h3 className="font-bold">{etapa.etapa} ({etapa.duracao_min} min)</h3>
                        <ul className="list-disc list-inside ml-1">
                            {etapa.atividades.map((a, j) => <li key={j}>{a}</li>)}
                        </ul>
                    </div>
                 ))}
            </div>
         </section>

         <section className="break-inside-avoid">
             <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">3. Avaliação e Recuperação</h2>
             <div className="text-sm text-gray-800">
                 <p className="font-bold">Critérios:</p>
                 <ul className="list-disc list-inside ml-1 mb-2">
                    {plano_aula.estrategia_de_avaliacao.criterios.map((c, i) => <li key={i}>{c}</li>)}
                 </ul>
                 
                 {plano_aula.atividades_recuperacao && plano_aula.atividades_recuperacao.length > 0 && (
                    <>
                        <p className="font-bold">Recuperação / Reforço:</p>
                        <ul className="list-disc list-inside ml-1">
                            {plano_aula.atividades_recuperacao.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </>
                 )}
             </div>
         </section>
        
         <section className="break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1 uppercase tracking-wide">4. Recursos e Inclusão</h2>
            <div className="text-sm text-gray-800">
                <p className="font-bold">Material de Apoio:</p>
                <ul className="list-disc list-inside ml-1 mb-2">
                     {plano_aula.material_de_apoio.map((m, i) => <li key={i} className="break-all">{m.titulo} ({m.link})</li>)}
                </ul>
                 <p className="font-bold">Adaptações NEE:</p>
                <ul className="list-disc list-inside ml-1">
                    {plano_aula.adapitacoes_nee.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
            </div>
         </section>
      </div>
    </div>
  );
});

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left bg-gray-100 dark:bg-gray-800 rounded-t-lg font-semibold text-emerald-700 dark:text-emerald-400">
        {title} <span className={`transform transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="p-4 bg-white dark:bg-gray-900 rounded-b-lg">{children}</div>}
    </div>
  );
};

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({ data }) => {
  const { plano_aula } = data;
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'pdf') => {
      if (format === 'pdf' && printRef.current) {
        const canvas = await html2canvas(printRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`plano_${plano_aula.titulo.substring(0, 20)}.pdf`);
      }
      setIsExportMenuOpen(false);
  };

  const handleShareWhatsApp = () => {
      const text = `Plano: ${plano_aula.titulo}\n${plano_aula.objetivos_de_aprendizagem.join('\n')}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      setIsExportMenuOpen(false);
  };

  return (
    <div className="text-gray-800 dark:text-gray-200">
      <div className="absolute left-[-9999px]"><LessonPlanPrintTemplate ref={printRef} data={data} /></div>

      <div className='bg-white dark:bg-gray-900 p-4 rounded shadow'>
          <h2 className="text-2xl font-bold text-emerald-700 mb-4">{plano_aula.titulo}</h2>
          
          <Section title="Fundamentação" defaultOpen>
             <p><strong>Competência:</strong> {plano_aula.competencia_especifica.codigo}</p>
             <ul className="list-disc pl-5">{plano_aula.habilidades.map(h => <li key={h.codigo}>{h.codigo}: {h.texto}</li>)}</ul>
          </Section>

          <Section title="Metodologia e Atividades" defaultOpen>
             {plano_aula.metodologia.map((m, i) => (
                 <div key={i} className="mb-4 border-l-2 border-emerald-500 pl-3">
                     <h4 className="font-bold">{m.etapa} ({m.duracao_min} min)</h4>
                     <ul className="list-disc pl-5">{m.atividades.map((a, j) => <li key={j}>{a}</li>)}</ul>
                 </div>
             ))}
          </Section>

          <Section title="Avaliação e Recuperação">
              <h4 className="font-bold">Critérios</h4>
              <ul className="list-disc pl-5 mb-2">{plano_aula.estrategia_de_avaliacao.criterios.map((c, i) => <li key={i}>{c}</li>)}</ul>
              
              {plano_aula.atividades_recuperacao && (
                  <>
                    <h4 className="font-bold text-blue-600 dark:text-blue-400">Recuperação / Reforço</h4>
                    <ul className="list-disc pl-5">{plano_aula.atividades_recuperacao.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </>
              )}
          </Section>
      </div>

      <div className="mt-8 text-center relative inline-block">
        <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="bg-emerald-600 text-white px-6 py-2 rounded shadow">Salvar / Compartilhar</button>
        {isExportMenuOpen && (
            <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded border">
                <button onClick={handleShareWhatsApp} className="block w-full text-left px-4 py-2 hover:bg-gray-100">WhatsApp</button>
                <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">PDF</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default LessonPlanDisplay;
