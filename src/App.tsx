// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileUploadArea } from './components/FileUploadArea';
import { ChatInterface } from './components/ChatInterface';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DocumentList } from './components/DocumentList';
import { ComparisonSidebar } from './components/ComparisonSidebar';
import { ComparisonResultModal } from './components/ComparisonResultModal';
import { ConstituicaoViewer } from './components/Constituicao/ConstituicaoViewer'; 
import { CPPViewer } from './components/CPP/CPPViewer';
import { CPViewer } from './components/CP/CPViewer'; 
import { CDCViewer } from './components/CDC/CDCViewer'; 
import type { ChatMessage, UploadedDocument, RagData, SwotAnalysis, ComparisonSource, GeminiHistoryPart } from './types';
import { MessageSender } from './types';
import {
  MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION,
  SYSTEM_INSTRUCTION_CF88, // Para o chat RAG com PDF da CF/88
  RAG_PREAMBLE,
  MAX_FILES,
  CF88_PDF_URL, // Para o chat RAG com PDF da CF/88
  SUMMARIZER_PROMPT_TEMPLATE,
  INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE,
  SWOT_ANALYSIS_PROMPT_TEMPLATE,
  COMPARISON_PROMPT_TEMPLATE,
  MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE,
  GEMINI_CHAT_MODEL_GENERAL,
  // GEMINI_CHAT_MODEL_CDC removido
  GEMINI_ANALYSIS_MODEL,
  MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS,
  MAX_CHARS_FOR_SUMMARIZATION_INPUT,
  LOGO_URL,
  // URLs dos JSONs para os leitores já estão em constants.ts
} from './constants';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Chat, Content } from '@google/genai';


declare const pdfjsLib: any;

// AppMode atualizado para refletir os modos de leitura e chats específicos
type AppMode = 'general' | 'cf88-reader' | 'cpp-reader' | 'cp-reader' | 'cdc-reader' | 'cf88-chat';

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const modelConfig = {
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
};

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('general');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [ragData, setRagData] = useState<RagData | null>(null); // Para modo 'general'
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  
  const [generalChatSession, setGeneralChatSession] = useState<Chat | null>(null);
  const [cf88ChatSession, setCf88ChatSession] = useState<Chat | null>(null); // Para chat RAG com PDF da CF/88
  
  const [currentUiMessages, setCurrentUiMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  // Estado para chat RAG com PDF da CF/88
  const [cf88PdfChatData, setCf88PdfChatData] = useState<UploadedDocument | null>(null);
  const [cf88PdfChatRagData, setCf88PdfChatRagData] = useState<RagData | null>(null);
  const [isProcessingCf88PdfChat, setIsProcessingCf88PdfChat] = useState<boolean>(false);
  const [cf88PdfChatError, setCf88PdfChatError] = useState<string | null>(null);
  
  // Estados para comparação de documentos
  const [documentForComparisonA_Id, setDocumentForComparisonA_Id] = useState<string | null>(null);
  const [documentForComparisonA_Source, setDocumentForComparisonA_Source] = useState<ComparisonSource>(null);
  const [documentForComparisonA_Text, setDocumentForComparisonA_Text] = useState<string>('');
  const [documentForComparisonB, setDocumentForComparisonB] = useState<UploadedDocument | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<string>('');
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [docBProcessing, setDocBProcessing] = useState<boolean>(false); 
  const [docBError, setDocBError] = useState<string | null>(null); 

  const { speak, cancelSpeech, isSpeaking, ttsError } = useTextToSpeech();

  const buildRagDataFromDocuments = useCallback((docs: UploadedDocument[]): RagData => {
    return docs
      .filter(doc => doc.text)
      .map(doc => ({
        documentName: doc.name,
        content: doc.text,
        summary: doc.summary,
        insights: doc.insights,
        swot: doc.swot,
      }));
  }, []);
  
  useEffect(() => {
    if (appMode === 'general' && uploadedDocuments.length > 0) {
      const currentRag = buildRagDataFromDocuments(uploadedDocuments.filter(d => d.text));
      setRagData(currentRag.length > 0 ? currentRag : null);
    } else if (appMode === 'cf88-chat' && cf88PdfChatData) {
       const cf88RAG: RagData = [{ documentName: cf88PdfChatData.name, content: cf88PdfChatData.text, summary: cf88PdfChatData.summary, insights: cf88PdfChatData.insights, swot: cf88PdfChatData.swot }];
       setCf88PdfChatRagData(cf88RAG);
    } else if (appMode !== 'general' && appMode !== 'cf88-chat') { // Se não for modo de chat geral ou chat CF/88, limpar RAG
      setRagData(null);
      setCf88PdfChatRagData(null);
    }
  }, [uploadedDocuments, cf88PdfChatData, appMode, buildRagDataFromDocuments]);

  const initializeChatSession = useCallback((mode: AppMode, baseSystemInstruction: string, currentHistory: GeminiHistoryPart[] = []) => {
    let systemInstructionText = baseSystemInstruction;
    const activeRagData = mode === 'cf88-chat' ? cf88PdfChatRagData : ragData;

    if (activeRagData && activeRagData.length > 0 && (mode === 'general' || mode === 'cf88-chat')) {
        const ragString = JSON.stringify(activeRagData.map(d => ({
            documentName: d.documentName,
            content: d.content.substring(0, 20000), 
            summary: d.summary,
            insights: d.insights,
            swot: d.swot,
        })), null, 2);
        const preamble = typeof RAG_PREAMBLE === 'function' ? RAG_PREAMBLE(ragString) : RAG_PREAMBLE;
        systemInstructionText = `${preamble}\n${baseSystemInstruction}`;
    }
    
    const chat = genAI.chats.create({
        model: GEMINI_CHAT_MODEL_GENERAL, // Usar o modelo geral para todos os chats agora
        config: {
            safetySettings: modelConfig.safetySettings,
            systemInstruction: { role: "system", parts: [{text: systemInstructionText}] },
        },
        history: currentHistory,
    });
    return chat;
  }, [ragData, cf88PdfChatRagData]); 


  const cleanAiText = (text: string): string => {
    let cleaned = text;
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, ''); 
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, ''); 
    cleaned = cleaned.replace(/(?<!\\)(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2');
    cleaned = cleaned.replace(/(?<!\\)(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2');
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleaned.match(fenceRegex);
    if (match && match[2]) {
      cleaned = match[2].trim();
    }
    cleaned = cleaned.replace(/^```\s*\n?|\n?\s*```$/g, '');
    return cleaned.trim();
  };

  const callGeminiAPIForAnalysis = async (
    promptOrTemplate: string | ((docText: string, summary?: string, insights?: string) => string),
    documentTextForAnalysisOrReview: string, 
    analysisType: string, 
    summaryForContext?: string, 
    insightsForContext?: string 
  ): Promise<string> => {
    
    let currentStagePrompt: string;
    let isReviewStageCall = false;

    if (typeof promptOrTemplate === 'string') {
      // This case is now used for the review prompt, which is a string
      currentStagePrompt = promptOrTemplate;
      // Check if it's the master review prompt based on its content
      if (currentStagePrompt.includes("Como o \"Assistente Especialista em Direito Administrativo e Concursos Públicos\"")) {
        isReviewStageCall = true;
      }
    } else { 
      // This case is for initial analysis (summarizer, insights, swot, comparison)
      // which are functions that return a string prompt.
      let effectiveDocText = documentTextForAnalysisOrReview;
      if (promptOrTemplate === SUMMARIZER_PROMPT_TEMPLATE && documentTextForAnalysisOrReview.length > MAX_CHARS_FOR_SUMMARIZATION_INPUT) {
        effectiveDocText = documentTextForAnalysisOrReview.substring(0, MAX_CHARS_FOR_SUMMARIZATION_INPUT);
        console.warn(`Document text truncated for summarization input. Original length: ${documentTextForAnalysisOrReview.length}, Truncated length: ${effectiveDocText.length}`);
        addMessageToUi(MessageSender.SYSTEM, `O documento original é muito extenso (${documentTextForAnalysisOrReview.length} caracteres) e foi truncado para ${effectiveDocText.length} caracteres antes do resumo inicial.`);
      }
      // For COMPARISON_PROMPT_TEMPLATE, documentTextForAnalysisOrReview might be an empty string if texts are already in the template.
      // For others, it's the main document text or summary.
      currentStagePrompt = promptOrTemplate(effectiveDocText, summaryForContext, insightsForContext);
    }

    addMessageToUi(MessageSender.SYSTEM, 
      isReviewStageCall 
      ? `Refinando ${analysisType.toLowerCase()} com o Assistente Mestre...` 
      : `Realizando ${analysisType.toLowerCase()} primária...`
    );

    let rawAnalysisText = "";
    try {
      const initialResponse = await genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: [{role: "user", parts: [{text: currentStagePrompt}]}],
        config: { 
            safetySettings: modelConfig.safetySettings,
            // Apply master system instruction only if it's the review stage
            systemInstruction: isReviewStageCall 
                           ? {role: "system", parts: [{text: MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION}]}
                           : undefined // No extensive system instruction for initial analysis
        }
      });
      rawAnalysisText = initialResponse.text.trim() || "";
    } catch (error) {
      console.error(`Error in Gemini API call for ${analysisType} (Stage: ${isReviewStageCall ? 'Review' : 'Initial'}):`, error);
      throw new Error(`Falha na API Gemini para ${analysisType.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // If this was the review stage, return the (cleaned) result directly
    if (isReviewStageCall) {
      return cleanAiText(rawAnalysisText);
    } else {
      // If it was an initial analysis, now call for review
      try {
        // addMessageToUi(MessageSender.SYSTEM, `Solicitando revisão de ${analysisType.toLowerCase()} ao Assistente Mestre...`);
        const reviewPromptString = MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE(rawAnalysisText, analysisType);
        // Recursive call, but this time the promptOrTemplate is the review string, and documentTextForAnalysisOrReview is the rawAnalysisText
        return await callGeminiAPIForAnalysis(reviewPromptString, rawAnalysisText, `Revisão de ${analysisType}`); 
      } catch (reviewError) {
        console.error(`Error in Master Agent review call for ${analysisType}:`, reviewError);
        addMessageToUi(MessageSender.SYSTEM, `Falha na revisão pelo Agente Mestre para ${analysisType.toLowerCase()}. Exibindo resultado primário.`);
        return cleanAiText(rawAnalysisText); // Return cleaned raw text if review fails
      }
    }
  };
  
  useEffect(() => {
    const activeChatSession = appMode === 'cf88-chat' ? cf88ChatSession : generalChatSession;
    const baseInstruction = appMode === 'cf88-chat' ? SYSTEM_INSTRUCTION_CF88 : MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION;
    
    if (appMode === 'general' || appMode === 'cf88-chat') { // Only initialize/re-initialize for actual chat modes
      if (activeChatSession) {
          const newHistory = activeChatSession.getHistory(); 
          const newSession = initializeChatSession(appMode, baseInstruction, newHistory);
          if (appMode === 'general') setGeneralChatSession(newSession);
          else if (appMode === 'cf88-chat') setCf88ChatSession(newSession);
      } else {
          const newSession = initializeChatSession(appMode, baseInstruction);
          if (appMode === 'general') setGeneralChatSession(newSession);
          else if (appMode === 'cf88-chat') setCf88ChatSession(newSession);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, ragData, cf88PdfChatRagData, initializeChatSession]); 


  const addMessageToUi = (sender: MessageSender, text: string, id?: string, sources?: { uri: string; title: string }[]): ChatMessage => {
    const newMessage: ChatMessage = {
      id: id || `${sender}-${Date.now()}`,
      sender,
      text: sender === MessageSender.AI ? cleanAiText(text) : text,
      timestamp: new Date(),
      sources,
    };
    setCurrentUiMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSwitchMode = useCallback(async (newMode: AppMode) => { 
    if (appMode === newMode) return;
    setAppMode(newMode);
    setCurrentUiMessages([]); 
    
    if (newMode === 'cf88-chat') {
      if (!cf88PdfChatRagData && !isProcessingCf88PdfChat) {
        await fetchAndProcessCf88PdfForChat();
      }
    }
    // Old CDC PDF logic removed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, cf88PdfChatRagData, isProcessingCf88PdfChat]);

  const fetchAndProcessCf88PdfForChat = async () => { 
    setIsProcessingCf88PdfChat(true); 
    setCf88PdfChatError(null); 
    addMessageToUi(MessageSender.SYSTEM, "Baixando e processando a Constituição Federal (PDF) para chat...");
    try {
      const response = await fetch(CF88_PDF_URL); // CF88_PDF_URL from constants
      if (!response.ok) throw new Error(`Falha ao baixar o PDF da CF/88: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) throw new Error("pdf.js não carregado.");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      const cf88Doc: UploadedDocument = {
        id: `cf88-pdf-chat-${Date.now()}`, name: "Constituição Federal de 1988 (PDF para Chat)", text: fullText.trim(),
        file: new File([arrayBuffer], "CF88_EC134_livro.pdf", {type: "application/pdf"})
      };
      setCf88PdfChatData(cf88Doc); 
      setCf88PdfChatError(null);
      addMessageToUi(MessageSender.SYSTEM, "Base de conhecimento da CF/88 (PDF) carregada para chat. Pergunte sobre a Constituição.");
    } catch (error) {
      const errorMsg = `Erro ao carregar CF/88 (PDF para Chat): ${error instanceof Error ? error.message : String(error)}`;
      setCf88PdfChatError(errorMsg);
      addMessageToUi(MessageSender.SYSTEM, errorMsg);
      setCf88PdfChatRagData(null);
    } finally {
      setIsProcessingCf88PdfChat(false);
    }
  };
  // fetchAndProcessCdc (for PDF) removed.

  const handleFilesSelect = (files: File[]) => {
    const newDocuments: UploadedDocument[] = files.map(file => ({
      id: `${file.name}-${Date.now()}`, name: file.name, text: '', file,
      processingAnalysis: false, analysisError: null,
    }));
    setUploadedDocuments(newDocuments);
    setRagData(null); 
    setCurrentUiMessages([]);
    if(appMode !== 'general') setAppMode('general'); // Switch to general mode if files are uploaded
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    if (fileType === 'application/pdf') {
      if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) throw new Error("pdf.js não carregado.");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText.trim();
    } else if (fileType === 'application/json' || fileType === 'text/plain') {
      return await file.text();
    }
    throw new Error('Tipo de arquivo não suportado para extração de texto.');
  };

  const processFiles = async () => {
    if (uploadedDocuments.length === 0 ) return;
    setIsProcessingFiles(true);
    addMessageToUi(MessageSender.SYSTEM, "Extraindo texto dos arquivos para o Assistente Jurídico Geral...");

    const updatedDocsPromises = uploadedDocuments.map(async doc => {
      try {
        const fileContent = await extractTextFromFile(doc.file);
        return { ...doc, text: fileContent, analysisError: fileContent ? null : 'Nenhum conteúdo extraído.' };
      } catch (error) {
        addMessageToUi(MessageSender.SYSTEM, `Erro ao processar ${doc.name}.`);
        return { ...doc, text: '', analysisError: error instanceof Error ? error.message : 'Erro desconhecido.' };
      }
    });

    const processedDocs = await Promise.all(updatedDocsPromises);
    setUploadedDocuments(processedDocs);
    setIsProcessingFiles(false);

    const successfullyProcessedDocs = processedDocs.filter(doc => doc.text);
    if (successfullyProcessedDocs.length === 0 && processedDocs.length > 0) {
      addMessageToUi(MessageSender.SYSTEM, "Nenhum texto pôde ser extraído dos arquivos.");
    } else if (successfullyProcessedDocs.length > 0) {
      addMessageToUi(MessageSender.SYSTEM, `Extração de texto concluída. ${successfullyProcessedDocs.length} documento(s) pronto(s).`);
    }
  };

  const handleAnalyzeDocument = async (documentId: string) => {
    setUploadedDocuments(prevDocs => 
      prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: true, analysisError: null } : d)
    );
    const docToAnalyze = uploadedDocuments.find(d => d.id === documentId);
    if (!docToAnalyze || !docToAnalyze.text) {
      setUploadedDocuments(prevDocs => 
        prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: false, analysisError: "Documento sem texto para analisar." } : d)
      );
      return;
    }

    try {
      let currentSummary: string | undefined = undefined;
      let currentInsights: string | undefined = undefined;

      currentSummary = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, docToAnalyze.text, "Resumo");
      addMessageToUi(MessageSender.SYSTEM, `Resumo de "${docToAnalyze.name}" gerado e refinado.`);
      
      const textForInsightsAndSwot = (docToAnalyze.text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS && currentSummary) 
                                     ? currentSummary 
                                     : docToAnalyze.text;

      currentInsights = await callGeminiAPIForAnalysis(INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE, textForInsightsAndSwot, "Insights", currentSummary);
      addMessageToUi(MessageSender.SYSTEM, `Insights de "${docToAnalyze.name}" gerados e refinados.`);

      const swotFullText = await callGeminiAPIForAnalysis(SWOT_ANALYSIS_PROMPT_TEMPLATE, textForInsightsAndSwot, "Análise SWOT", currentSummary, currentInsights);
      addMessageToUi(MessageSender.SYSTEM, `Análise SWOT de "${docToAnalyze.name}" gerada e refinada.`);
      
      const swotResult: SwotAnalysis = {};
      const swotSections = ["Forças:", "Fraquezas:", "Oportunidades:", "Ameaças:"];
      let currentSectionKey: keyof SwotAnalysis | null = null;
      swotFullText.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        const matchedSection = swotSections.find(s => trimmedLine.toLowerCase().startsWith(s.toLowerCase().replace(':', '')));
        if (matchedSection) {
          currentSectionKey = matchedSection.toLowerCase().replace(':', '') as keyof SwotAnalysis;
          swotResult[currentSectionKey] = (swotResult[currentSectionKey] || "") + trimmedLine.substring(matchedSection.length).trim() + "\n";
        } else if (currentSectionKey && trimmedLine) {
          swotResult[currentSectionKey] += trimmedLine + "\n";
        }
      });
      for (const key in swotResult) {
          swotResult[key as keyof SwotAnalysis] = cleanAiText(swotResult[key as keyof SwotAnalysis]?.trim() || "");
      }

      setUploadedDocuments(prevDocs => 
        prevDocs.map(d => d.id === documentId ? { ...d, summary: cleanAiText(currentSummary || ""), insights: cleanAiText(currentInsights || ""), swot: swotResult, processingAnalysis: false, analysisError: null } : d)
      );
    } catch (error) {
      setUploadedDocuments(prevDocs => 
        prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: false, analysisError: `Erro Gemini: ${error instanceof Error ? error.message : String(error)}` } : d)
      );
    }
  };
  
  const handleSendMessage = async (userInput: string) => {
    if (isLoadingChat || !userInput.trim()) return;
    // Não enviar mensagens se estiver em modo de leitura
    if (appMode === 'cf88-reader' || appMode === 'cpp-reader' || appMode === 'cp-reader' || appMode === 'cdc-reader') return;

    cancelSpeech(); 
    
    addMessageToUi(MessageSender.USER, userInput);
    // Define qual sessão de chat usar com base no appMode
    const currentChatSession = appMode === 'cf88-chat' ? cf88ChatSession : generalChatSession;

    if (!currentChatSession) {
        addMessageToUi(MessageSender.SYSTEM, "Sessão de chat não iniciada. Por favor, aguarde ou recarregue.");
        return;
    }
    
    setIsLoadingChat(true);
    const aiUiMsgPlaceholder = addMessageToUi(MessageSender.AI, "Digitando...", `ai-${Date.now()}`);
    
    try {
      const resultStream = await currentChatSession.sendMessageStream({message: userInput}); 
      let streamedText = "";
      let finalResponseSources: { uri: string; title: string; }[] | undefined = undefined;

      for await (const chunk of resultStream) { // Corrigido para usar resultStream
        streamedText += chunk.text;
        setCurrentUiMessages(prev => prev.map(msg => msg.id === aiUiMsgPlaceholder.id ? {...msg, text: cleanAiText(streamedText) } : msg));
        if (chunk.candidates && chunk.candidates[0]?.groundingMetadata?.groundingChunks) {
            finalResponseSources = chunk.candidates[0].groundingMetadata.groundingChunks
                .filter(gc => gc.web?.uri)
                .map(gc => ({ uri: gc.web!.uri!, title: gc.web!.title || gc.web!.uri! }));
        }
      }
      const finalTextToDisplay = cleanAiText(streamedText) || "Não obtive uma resposta.";
      setCurrentUiMessages(prev => prev.map(msg => 
        msg.id === aiUiMsgPlaceholder.id ? {...msg, text: finalTextToDisplay, sources: finalResponseSources } : msg
      ));
      speak(finalTextToDisplay);

    } catch (error) {
      let errorText = `Desculpe, ocorreu um erro ao enviar mensagem para Gemini: ${error instanceof Error ? error.message : String(error)}`;
      if (error instanceof Error && (error as any).message?.includes("RESOURCE_EXHAUSTED")) {
        errorText = "Você excedeu sua cota da API Gemini. Por favor, verifique seu plano e faturamento.";
      }
       else if (error instanceof Error && (error as any).message?.includes("400") && (error as any).message?.includes("API key not valid")) {
        errorText = "Chave da API Gemini não é válida. Verifique a configuração 'process.env.API_KEY'.";
      }
      setCurrentUiMessages(prev => prev.map(msg => 
        msg.id === aiUiMsgPlaceholder.id ? {...msg, text: errorText, sender: MessageSender.SYSTEM } : msg
      ));
      speak(errorText);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleFileForComparisonB = async (file: File | null) => {
    if (!file) {
      setDocumentForComparisonB(null);
      setDocBError(null); 
      return;
    }
    setDocBProcessing(true); 
    setDocBError(null); 
    try {
      const text = await extractTextFromFile(file);
      setDocumentForComparisonB({
        id: `compB-${file.name}-${Date.now()}`, name: file.name, text: text, file: file, processingAnalysis: false,
      });
    } catch (error) {
      setDocumentForComparisonB(null);
      setDocBError(`Erro ao ler Documento B: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setDocBProcessing(false); 
    }
  };
  
  const handleCompareDocuments = async () => {
    if (!documentForComparisonA_Text || !documentForComparisonB?.text) {
      setComparisonError("Selecione o Documento A e envie o Documento B para comparação.");
      setShowComparisonModal(true);
      return;
    }
    setIsComparing(true);
    setComparisonError(null); 
    setDocBError(null); 
    setComparisonResult('');
    
    const docANameBase = documentForComparisonA_Source === 'lastAiResponse' 
      ? "Última Resposta do Assistente" 
      : uploadedDocuments.find(doc => doc.id === documentForComparisonA_Id)?.name || "Documento A";
    const docBNameBase = documentForComparisonB.name;

    let finalDocAText = documentForComparisonA_Text;
    let finalDocBText = documentForComparisonB.text;
    let docANameToUse = docANameBase;
    let docBNameToUse = docBNameBase;

    try {
      // Simplificando: a revisão agora é parte do callGeminiAPIForAnalysis
      // Não precisa mais separar em "raw" e "reviewed" aqui para comparação.
      // A função callGeminiAPIForAnalysis cuidará da sumarização + revisão se necessário.
      
      if (documentForComparisonA_Text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS) {
        addMessageToUi(MessageSender.SYSTEM, `Documento A ("${docANameBase}") é extenso, resumindo para comparação...`);
        finalDocAText = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, documentForComparisonA_Text, "Resumo para Comparação (Doc A)");
        docANameToUse = `${docANameBase} (Resumido)`;
      }
      if (documentForComparisonB.text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS) {
        addMessageToUi(MessageSender.SYSTEM, `Documento B ("${docBNameBase}") é extenso, resumindo para comparação...`);
        finalDocBText = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, documentForComparisonB.text, "Resumo para Comparação (Doc B)");
        docBNameToUse = `${docBNameBase} (Resumido)`;
      }

      const comparisonAnalysisType = "Comparação de Documentos";
      // A função COMPARISON_PROMPT_TEMPLATE retorna a string do prompt inicial.
      // Passamos uma função anônima para callGeminiAPIForAnalysis para que ele saiba que é um prompt inicial.
      // O segundo argumento `documentTextForAnalysisOrReview` é "" porque os textos já estão no prompt.
      const initialComparisonPromptString = COMPARISON_PROMPT_TEMPLATE(docANameToUse, finalDocAText, docBNameToUse, finalDocBText);
      
      const reviewedComparisonText = await callGeminiAPIForAnalysis(
        () => initialComparisonPromptString, // Passa uma função que retorna o prompt
        "", // Não há um "documento principal" aqui, os textos já estão no prompt
        comparisonAnalysisType
      );
      setComparisonResult(reviewedComparisonText); // Já virá limpo da callGeminiAPIForAnalysis

    } catch (error) {
      setComparisonError(`Erro na API Gemini durante comparação: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsComparing(false);
      setShowComparisonModal(true); 
    }
  };

  // Condição para chat pronto ajustada para os modos de chat ativos
  const chatIsActuallyReady = (appMode === 'general' && !!ragData && ragData.length > 0) || 
                             (appMode === 'cf88-chat' && !!cf88PdfChatRagData && cf88PdfChatRagData.length > 0);
  const currentRagContextAvailable = chatIsActuallyReady; // Mesmo que chatIsActuallyReady para simplificar

  const getAppModeTitle = () => {
    switch(appMode) {
      case 'general': return 'Assistente Jurídico IA';
      case 'cf88-reader': return 'Leitura da CF/88';
      case 'cpp-reader': return 'Leitura do CPP';
      case 'cp-reader': return 'Leitura do Código Penal';
      case 'cdc-reader': return 'Leitura do CDC';
      case 'cf88-chat': return 'Chat com CF/88 (PDF RAG)';
      default: return 'Assistente Jurídico IA';
    }
  };
  
  const getAppModeSubtitle = () => {
     switch(appMode) {
      case 'general': return 'Potencializado por Gemini & RAG com seus documentos';
      case 'cf88-reader': return 'Navegue pela Constituição Federal (JSON)';
      case 'cpp-reader': return 'Navegue pelo Código de Processo Penal (JSON)';
      case 'cp-reader': return 'Navegue pelo Código Penal (JSON)';
      case 'cdc-reader': return 'Navegue pelo Código de Defesa do Consumidor (JSON)';
      case 'cf88-chat': return 'Pergunte sobre a Constituição Federal (RAG com PDF)';
      default: return '';
    }
  }

  const isReaderActive = appMode === 'cf88-reader' || appMode === 'cpp-reader' || appMode === 'cp-reader' || appMode === 'cdc-reader';


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-900 text-gray-100 font-sans">
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 md:p-6 bg-gray-800 border-r border-gray-700 flex flex-col space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar h-auto md:h-screen">
        <header className="mb-2 md:mb-4 flex flex-col items-center">
          {LOGO_URL && <img src={LOGO_URL} alt="Logo Assistente Jurídico IA" className="w-20 h-20 mb-3 rounded-full shadow-lg" />}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400">
              {getAppModeTitle()}
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              {getAppModeSubtitle()}
            </p>
          </div>
          {ttsError && (<p className="text-xs text-red-400 mt-2 self-start w-full text-center">{ttsError}</p>)}
        </header>

        <div className="flex flex-col space-y-2">
            <button onClick={() => handleSwitchMode('general')} disabled={appMode === 'general'}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${appMode === 'general' ? 'bg-sky-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                Assistente Geral (Chat RAG)
            </button>
            <button onClick={() => handleSwitchMode('cf88-chat')} disabled={appMode === 'cf88-chat' || isProcessingCf88PdfChat}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${appMode === 'cf88-chat' ? 'bg-sky-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} ${isProcessingCf88PdfChat ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isProcessingCf88PdfChat ? <LoadingSpinner size="sm" /> : 'Chat com CF/88 (RAG com PDF)'}
            </button>
            <button onClick={() => handleSwitchMode('cf88-reader')} disabled={appMode === 'cf88-reader'}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${appMode === 'cf88-reader' ? 'bg-teal-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                Ler CF/88 (Navegação)
            </button>
            <button onClick={() => handleSwitchMode('cpp-reader')} disabled={appMode === 'cpp-reader'}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${appMode === 'cpp-reader' ? 'bg-teal-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                Ler CPP (Navegação)
            </button>
            <button onClick={() => handleSwitchMode('cp-reader')} disabled={appMode === 'cp-reader'}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${appMode === 'cp-reader' ? 'bg-teal-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                Ler Código Penal (Navegação)
            </button>
            <button onClick={() => handleSwitchMode('cdc-reader')} disabled={appMode === 'cdc-reader'}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${appMode === 'cdc-reader' ? 'bg-teal-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                Ler CDC (Navegação)
            </button>
            {/* Botão Consultar CDC (antigo chat PDF) removido */}
        </div>
        
        {appMode === 'general' && (
          <>
            <FileUploadArea onFilesSelect={handleFilesSelect} onProcessFiles={processFiles} isProcessing={isProcessingFiles} maxFiles={MAX_FILES} currentFileCount={uploadedDocuments.length}/>
            {uploadedDocuments.length > 0 && !isProcessingFiles && uploadedDocuments.some(d => !d.text) && (
               <button onClick={processFiles} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg" disabled={isProcessingFiles}>
                 {isProcessingFiles ? 'Processando...' : `Extrair Texto de ${uploadedDocuments.length} Arquivo(s)`}
               </button>
            )}
            {isProcessingFiles && (<div className="flex items-center justify-center text-gray-300"><LoadingSpinner /><span className="ml-2">Extraindo texto...</span></div>)}
            {uploadedDocuments.length > 0 && (<div className="mt-2 md:mt-4"><h2 className="text-md md:text-lg font-semibold text-sky-400 mb-2">Documentos:</h2><DocumentList documents={uploadedDocuments} onAnalyzeDocument={handleAnalyzeDocument}/></div>)}
            {ragData && ragData.length === 0 && uploadedDocuments.length > 0 && !isProcessingFiles && (<p className="text-sm text-red-400">Nenhum texto pôde ser extraído dos arquivos.</p>)}
          </>
        )}
         {appMode === 'cf88-chat' && (
          <>
            {isProcessingCf88PdfChat && (<div className="flex items-center justify-center text-gray-300 p-4"><LoadingSpinner /><span className="ml-2">Processando CF/88 (PDF para Chat)...</span></div>)}
            {cf88PdfChatError && (<div className="my-2 p-3 bg-red-900/50 border border-red-700 rounded-md text-sm text-red-300"><p><strong>Erro CF/88 PDF Chat:</strong></p><p>{cf88PdfChatError}</p></div>)}
            {cf88PdfChatRagData && !cf88PdfChatError && (<div className="mt-2 md:mt-4 p-3 bg-green-900/30 border border-green-700 rounded-md"><h2 className="text-md md:text-lg font-semibold text-green-400 mb-1">CF/88 (PDF Chat)</h2><p className="text-sm text-green-300">Pronto para chat.</p></div>)}
          </>
        )}
        {/* Lógica para antigo chat CDC removida */}
      </div>

      <div className="flex-grow flex flex-col h-screen md:h-screen md:w-1/2 lg:w-2/4">
        {isReaderActive ? (
            appMode === 'cf88-reader' ? <ConstituicaoViewer /> :
            appMode === 'cpp-reader' ? <CPPViewer /> :
            appMode === 'cp-reader' ? <CPViewer /> :
            appMode === 'cdc-reader' ? <CDCViewer /> : null
        ) : (
            <ChatInterface 
              messages={currentUiMessages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoadingChat} 
              isSpeaking={isSpeaking}
              onToggleSpeak={isSpeaking ? cancelSpeech : () => { const lastAiMsg = currentUiMessages.filter(m => m.sender === MessageSender.AI).pop(); if (lastAiMsg) speak(lastAiMsg.text); }}
              chatReady={chatIsActuallyReady} 
              ragContextAvailable={currentRagContextAvailable} 
              chatMode={appMode} 
              cf88PdfChatError={appMode === 'cf88-chat' ? cf88PdfChatError : null}
              isProcessingCf88PdfChat={appMode === 'cf88-chat' ? isProcessingCf88PdfChat : false}
            />
        )}
      </div>

      {/* Sidebar de Comparação só aparece no modo 'general' */}
      {(appMode === 'general') && (
        <div className="w-full md:w-1/3 lg:w-1/4 p-4 md:p-6 bg-gray-800 border-l border-gray-700 flex flex-col space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar h-auto md:h-screen">
            <ComparisonSidebar
              uploadedDocuments={uploadedDocuments.filter(doc => !!doc.text)} 
              lastAiResponse={currentUiMessages.filter(m => m.sender === MessageSender.AI).pop()?.text || ''}
              onFileForComparisonB={handleFileForComparisonB}
              onStartComparison={handleCompareDocuments}
              isComparing={isComparing}
              comparisonError={comparisonError}
              setDocumentForComparisonA_Id={setDocumentForComparisonA_Id}
              setDocumentForComparisonA_Source={setDocumentForComparisonA_Source}
              setDocumentForComparisonA_Text={setDocumentForComparisonA_Text}
              docBFileProcessing={docBProcessing}
              docBFileError={docBError}
            />
        </div>
      )}

      {showComparisonModal && (
        <ComparisonResultModal isOpen={showComparisonModal} onClose={() => setShowComparisonModal(false)} result={comparisonResult} error={comparisonError} isLoading={isComparing}
          docAName={documentForComparisonA_Source === 'lastAiResponse' ? "Última Resposta da IA" : uploadedDocuments.find(d => d.id === documentForComparisonA_Id)?.name || "Doc A"}
          docBName={documentForComparisonB?.name || "Doc B"}
        />
      )}
    </div>
  );
};
export default App;
