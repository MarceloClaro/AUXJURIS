
// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileUploadArea } from './components/FileUploadArea';
import { ChatInterface } from './components/ChatInterface';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DocumentList } from './components/DocumentList';
import { ComparisonSidebar } from './components/ComparisonSidebar';
import { ComparisonResultModal } from './components/ComparisonResultModal';
import type { ChatMessage, UploadedDocument, RagData, SwotAnalysis, ComparisonSource, GeminiHistoryPart } from './types';
import { MessageSender } from './types';
import {
  MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION, // Changed from SYSTEM_INSTRUCTION_BASE
  SYSTEM_INSTRUCTION_CDC,
  RAG_PREAMBLE,
  MAX_FILES,
  CDC_PDF_URL,
  SUMMARIZER_PROMPT_TEMPLATE,
  INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE,
  SWOT_ANALYSIS_PROMPT_TEMPLATE,
  COMPARISON_PROMPT_TEMPLATE,
  MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE,
  GEMINI_CHAT_MODEL_GENERAL,
  GEMINI_CHAT_MODEL_CDC,
  GEMINI_ANALYSIS_MODEL,
  MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS,
  MAX_CHARS_FOR_SUMMARIZATION_INPUT
} from './constants';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Chat, Content } from '@google/genai';
import { downloadCSV } from './utils';


declare const pdfjsLib: any;

type ChatMode = 'general' | 'cdc';

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
  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [ragData, setRagData] = useState<RagData | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  
  const [generalChatSession, setGeneralChatSession] = useState<Chat | null>(null);
  const [cdcChatSession, setCdcChatSession] = useState<Chat | null>(null);
  
  const [currentUiMessages, setCurrentUiMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  const [cdcData, setCdcData] = useState<UploadedDocument | null>(null);
  const [cdcRagData, setCdcRagData] = useState<RagData | null>(null);
  const [isProcessingCdc, setIsProcessingCdc] = useState<boolean>(false);
  const [cdcError, setCdcError] = useState<string | null>(null);
  
  const [documentForComparisonA_Id, setDocumentForComparisonA_Id] = useState<string | null>(null);
  const [documentForComparisonA_Source, setDocumentForComparisonA_Source] = useState<ComparisonSource>(null);
  const [documentForComparisonA_Text, setDocumentForComparisonA_Text] = useState<string>('');
  const [documentForComparisonB, setDocumentForComparisonB] = useState<UploadedDocument | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<string>('');
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

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
    if (chatMode === 'general' && uploadedDocuments.length > 0) {
      const currentRag = buildRagDataFromDocuments(uploadedDocuments.filter(d => d.text));
      setRagData(currentRag.length > 0 ? currentRag : null);
    } else if (chatMode === 'cdc' && cdcData) {
       const cdcRAG: RagData = [{ documentName: cdcData.name, content: cdcData.text, summary: cdcData.summary, insights: cdcData.insights, swot: cdcData.swot }];
       setCdcRagData(cdcRAG);
    }
  }, [uploadedDocuments, cdcData, chatMode, buildRagDataFromDocuments]);

  const initializeChatSession = useCallback((mode: ChatMode, baseSystemInstruction: string, currentHistory: GeminiHistoryPart[] = []) => {
    let systemInstructionText = baseSystemInstruction;
    const activeRagData = mode === 'cdc' ? cdcRagData : ragData;

    if (activeRagData && activeRagData.length > 0) {
        const ragString = JSON.stringify(activeRagData.map(d => ({
            documentName: d.documentName,
            content: d.content.substring(0, 20000), // Keep RAG context concise for chat
            summary: d.summary,
            insights: d.insights,
            swot: d.swot,
        })), null, 2);
        systemInstructionText = `${RAG_PREAMBLE(ragString)}\n${baseSystemInstruction}`;
    }
    
    const chat = genAI.chats.create({
        model: mode === 'general' ? GEMINI_CHAT_MODEL_GENERAL : GEMINI_CHAT_MODEL_CDC,
        config: {
            safetySettings: modelConfig.safetySettings,
            systemInstruction: { role: "system", parts: [{text: systemInstructionText}] },
        },
        history: currentHistory,
    });
    return chat;
  }, [ragData, cdcRagData]); // Include dependencies


  const cleanAiText = (text: string): string => {
    let cleaned = text;
    // Remove markdown list markers (bullet points, numbered lists)
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, ''); // Matches bullets at the start of a line
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, ''); // Matches numbered lists at the start of a line
    
    // Remove markdown emphasis (asterisks, underscores)
    // For **bold** or __bold__
    cleaned = cleaned.replace(/(?<!\\)(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2');
    // For *italic* or _italic_
    cleaned = cleaned.replace(/(?<!\\)(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2');
    
    // Remove ```json ``` and ``` ``` markers
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleaned.match(fenceRegex);
    if (match && match[2]) {
      cleaned = match[2].trim();
    }
    cleaned = cleaned.replace(/^```\s*\n?|\n?\s*```$/g, '');


    return cleaned.trim();
  };

  const callGeminiAPIForAnalysis = async (
    taskPromptTemplate: (text: string, summary?: string, insights?: string) => string,
    documentText: string,
    analysisTypeForReview: string,
    summaryForContext?: string, // For insights/SWOT that might use a summary of the main doc
    insightsForContext?: string // For SWOT that might use insights
  ): Promise<string> => {
    let effectiveDocumentText = documentText;
    let taskUserPrompt: string;
  
    // Stage 1: Specialized Analysis
    if (taskPromptTemplate === SUMMARIZER_PROMPT_TEMPLATE && documentText.length > MAX_CHARS_FOR_SUMMARIZATION_INPUT) {
        effectiveDocumentText = documentText.substring(0, MAX_CHARS_FOR_SUMMARIZATION_INPUT);
        console.warn(`Document text truncated for summarization input. Original length: ${documentText.length}, Truncated length: ${effectiveDocumentText.length}`);
        addMessageToUi(MessageSender.SYSTEM, `O documento original é muito extenso (${documentText.length} caracteres) e foi truncado para ${effectiveDocumentText.length} caracteres antes do resumo inicial.`);
    }
    taskUserPrompt = taskPromptTemplate(effectiveDocumentText, summaryForContext, insightsForContext);
  
    let rawAnalysisText = "";
    try {
      addMessageToUi(MessageSender.SYSTEM, `Realizando ${analysisTypeForReview.toLowerCase()} primária...`);
      const initialResponse = await genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: [{role: "user", parts: [{text: taskUserPrompt}]}], // Task prompt is the user message here
        config: { safetySettings: modelConfig.safetySettings } // No extensive system instruction for this stage
      });
      rawAnalysisText = initialResponse.text.trim() || "";
    } catch (error) {
      console.error(`Error in initial Gemini API call for ${analysisTypeForReview}:`, error);
      throw new Error(`Falha na análise primária de ${analysisTypeForReview.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`);
    }
  
    // Stage 2: Master Agent Review
    let reviewedText = "";
    try {
      addMessageToUi(MessageSender.SYSTEM, `Refinando ${analysisTypeForReview.toLowerCase()} com o Assistente Mestre...`);
      const reviewUserPrompt = MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE(rawAnalysisText, analysisTypeForReview);
      
      const reviewedResponse = await genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL, 
        contents: [{role: "user", parts: [{text: reviewUserPrompt}]}], // Review task prompt is the user message
        config: { // Master system instruction is applied here
            safetySettings: modelConfig.safetySettings,
            systemInstruction: {role: "system", parts: [{text: MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION}]}
        }
      });
      reviewedText = reviewedResponse.text.trim() || "";
    } catch (error) {
      console.error(`Error in Master Agent review for ${analysisTypeForReview}:`, error);
      // If master review fails, return the raw analysis with a warning
      addMessageToUi(MessageSender.SYSTEM, `Falha na revisão pelo Agente Mestre para ${analysisTypeForReview.toLowerCase()}. Exibindo resultado primário.`);
      return cleanAiText(rawAnalysisText); // Clean the raw text at least
    }
    
    return cleanAiText(reviewedText);
  };
  
  useEffect(() => {
    const activeChatSession = chatMode === 'general' ? generalChatSession : cdcChatSession;
    const baseInstruction = chatMode === 'cdc' ? SYSTEM_INSTRUCTION_CDC : MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION;
    
    // Re-initialize chat session if RAG data or mode changes
    // This is important for the system instruction to pick up the new RAG data
    if (activeChatSession) {
        const newHistory = activeChatSession.getHistory(); // Preserve current history
        const newSession = initializeChatSession(chatMode, baseInstruction, newHistory);
        if (chatMode === 'general') setGeneralChatSession(newSession);
        else setCdcChatSession(newSession);
    } else {
        const newSession = initializeChatSession(chatMode, baseInstruction);
        if (chatMode === 'general') setGeneralChatSession(newSession);
        else setCdcChatSession(newSession);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMode, ragData, cdcRagData, initializeChatSession]); // MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION is constant


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

  const handleSwitchMode = useCallback(async (newMode: ChatMode) => {
    if (chatMode === newMode) return;
    setChatMode(newMode);
    setCurrentUiMessages([]); 
    
    if (newMode === 'cdc') {
      if (!cdcRagData && !isProcessingCdc) {
        await fetchAndProcessCdc();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMode, cdcRagData, isProcessingCdc]);

  const fetchAndProcessCdc = async () => {
    setIsProcessingCdc(true);
    setCdcError(null);
    setCurrentUiMessages(prev => [...prev, {id: `sys-${Date.now()}`, sender: MessageSender.SYSTEM, text: "Baixando e processando o Código de Defesa do Consumidor...", timestamp: new Date() }]);
    try {
      const response = await fetch(CDC_PDF_URL);
      if (!response.ok) throw new Error(`Falha ao baixar o PDF do CDC: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) throw new Error("pdf.js não carregado.");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      const cdcDoc: UploadedDocument = {
        id: `cdc-${Date.now()}`, name: "Código de Defesa do Consumidor (CDC)", text: fullText.trim(),
        file: new File([arrayBuffer], "CDC.pdf", {type: "application/pdf"})
      };
      setCdcData(cdcDoc);
      setCdcError(null);
      setCurrentUiMessages(prev => [...prev, {id: `sys-${Date.now()}`, sender: MessageSender.SYSTEM, text: "Base de conhecimento do CDC carregada. Pergunte sobre o Código.", timestamp: new Date() }]);
    } catch (error) {
      const errorMsg = `Erro ao carregar o CDC: ${error instanceof Error ? error.message : String(error)}`;
      setCdcError(errorMsg);
      setCurrentUiMessages(prev => [...prev, {id: `sys-${Date.now()}`, sender: MessageSender.SYSTEM, text: errorMsg, timestamp: new Date() }]);
      setCdcRagData(null);
    } finally {
      setIsProcessingCdc(false);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    const newDocuments: UploadedDocument[] = files.map(file => ({
      id: `${file.name}-${Date.now()}`, name: file.name, text: '', file,
      processingAnalysis: false, analysisError: null,
    }));
    setUploadedDocuments(newDocuments);
    setRagData(null); 
    setCurrentUiMessages([]);
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
    if (uploadedDocuments.length === 0 || chatMode !== 'general') return;
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
      let textForAnalysis = docToAnalyze.text;
      let currentSummary: string | undefined = undefined;
      let currentInsights: string | undefined = undefined;

      // Summarization
      if (docToAnalyze.text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS) {
        addMessageToUi(MessageSender.SYSTEM, `Documento "${docToAnalyze.name}" é longo, gerando resumo inicial...`);
        currentSummary = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, docToAnalyze.text, "Resumo");
        textForAnalysis = currentSummary; // Use summary for subsequent steps if original is too long
        addMessageToUi(MessageSender.SYSTEM, `Resumo de "${docToAnalyze.name}" gerado e refinado pelo Agente Mestre.`);
      } else {
        currentSummary = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, docToAnalyze.text, "Resumo");
        addMessageToUi(MessageSender.SYSTEM, `Resumo de "${docToAnalyze.name}" gerado e refinado pelo Agente Mestre.`);
      }
      
      // Insights (based on original text or its summary)
      currentInsights = await callGeminiAPIForAnalysis(INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE, textForAnalysis, currentSummary, "Insights");
      addMessageToUi(MessageSender.SYSTEM, `Insights de "${docToAnalyze.name}" gerados e refinados pelo Agente Mestre.`);

      // SWOT Analysis (based on original text or its summary, and insights)
      const swotFullText = await callGeminiAPIForAnalysis(SWOT_ANALYSIS_PROMPT_TEMPLATE, textForAnalysis, currentSummary, currentInsights, "Análise SWOT");
      addMessageToUi(MessageSender.SYSTEM, `Análise SWOT de "${docToAnalyze.name}" gerada e refinada pelo Agente Mestre.`);
      
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
        prevDocs.map(d => d.id === documentId ? { ...d, summary: cleanAiText(currentSummary || docToAnalyze.summary || ""), insights: cleanAiText(currentInsights || ""), swot: swotResult, processingAnalysis: false, analysisError: null } : d)
      );
    } catch (error) {
      setUploadedDocuments(prevDocs => 
        prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: false, analysisError: `Erro Gemini: ${error instanceof Error ? error.message : String(error)}` } : d)
      );
    }
  };
  
  const handleSendMessage = async (userInput: string) => {
    if (isLoadingChat || !userInput.trim()) return;
    cancelSpeech(); 
    
    addMessageToUi(MessageSender.USER, userInput);
    const currentChatSession = chatMode === 'general' ? generalChatSession : cdcChatSession;

    if (!currentChatSession) {
        addMessageToUi(MessageSender.SYSTEM, "Sessão de chat não iniciada. Por favor, aguarde ou recarregue.");
        return;
    }
    
    setIsLoadingChat(true);
    const aiUiMsgPlaceholder = addMessageToUi(MessageSender.AI, "Digitando...", `ai-${Date.now()}`);
    
    try {
      const result = await currentChatSession.sendMessageStream({message: userInput}); // Corrected: Pass object
      let streamedText = "";
      let finalResponseSources: { uri: string; title: string; }[] | undefined = undefined;

      for await (const chunk of result) {
        streamedText += chunk.text;
        setCurrentUiMessages(prev => prev.map(msg => msg.id === aiUiMsgPlaceholder.id ? {...msg, text: cleanAiText(streamedText) } : msg));
        if (chunk.candidates && chunk.candidates[0]?.groundingMetadata?.groundingChunks) {
            finalResponseSources = chunk.candidates[0].groundingMetadata.groundingChunks
                .filter(gc => gc.web?.uri)
                .map(gc => ({ uri: gc.web.uri!, title: gc.web.title || gc.web.uri! }));
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
      setDocBError(null); // Clear specific error for Doc B if file is removed
      return;
    }
    setDocBProcessing(true); 
    setDocBError(null); 
    try {
      const text = await extractTextFromFile(file);
      setDocumentForComparisonB({
        id: `compB-${file.name}-${Date.now()}`, name: file.name, text: text, file: file, processingAnalysis: false,
      });
      // setComparisonError(null); // Moved: Clear overall comparison error only when comparison starts
    } catch (error) {
      setDocumentForComparisonB(null);
      setDocBError(`Erro ao ler Documento B: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setDocBProcessing(false); 
    }
  };
  
  const [docBProcessing, setDocBProcessing] = useState<boolean>(false); 
  const [docBError, setDocBError] = useState<string | null>(null); 
  
  const handleCompareDocuments = async () => {
    if (!documentForComparisonA_Text || !documentForComparisonB?.text) {
      setComparisonError("Selecione o Documento A e envie o Documento B para comparação.");
      setShowComparisonModal(true);
      return;
    }
    setIsComparing(true);
    setComparisonError(null); // Clear previous comparison errors
    setDocBError(null); // Clear specific Doc B error if comparison starts
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
      if (documentForComparisonA_Text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS) {
        addMessageToUi(MessageSender.SYSTEM, `Documento A ("${docANameBase}") é extenso, resumindo para comparação...`);
        // For comparison, we use the simplified prompt directly, assuming MasterAgent will review the *comparison output*
        finalDocAText = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, documentForComparisonA_Text, "Resumo para Comparação (Doc A)");
        docANameToUse = `${docANameBase} (Resumido)`;
      }
      if (documentForComparisonB.text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS) {
        addMessageToUi(MessageSender.SYSTEM, `Documento B ("${docBNameBase}") é extenso, resumindo para comparação...`);
        finalDocBText = await callGeminiAPIForAnalysis(SUMMARIZER_PROMPT_TEMPLATE, documentForComparisonB.text, "Resumo para Comparação (Doc B)");
        docBNameToUse = `${docBNameBase} (Resumido)`;
      }

      const comparisonUserPrompt = COMPARISON_PROMPT_TEMPLATE(docANameToUse, finalDocAText, docBNameToUse, finalDocBText);
      // Stage 1: Get initial comparison
      const rawComparisonText = await genAI.models.generateContent({
         model: GEMINI_ANALYSIS_MODEL,
         contents: [{role: "user", parts: [{text: comparisonUserPrompt}]}],
         config: { safetySettings: modelConfig.safetySettings }
      }).then(res => res.text.trim() || "");
      
      addMessageToUi(MessageSender.SYSTEM, `Comparação inicial entre "${docANameToUse}" e "${docBNameToUse}" gerada. Refinando com o Assistente Mestre...`);

      // Stage 2: Master Agent Review of the comparison
      const reviewUserPrompt = MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE(rawComparisonText, "Comparação de Documentos");
      const reviewedComparisonText = await genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: [{role: "user", parts: [{text: reviewUserPrompt}]}],
        config: {
            safetySettings: modelConfig.safetySettings,
            systemInstruction: {role: "system", parts: [{text: MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION}]}
        }
      }).then(res => res.text.trim() || "");
      
      setComparisonResult(cleanAiText(reviewedComparisonText));

    } catch (error) {
      setComparisonError(`Erro na API Gemini durante comparação: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsComparing(false);
      setShowComparisonModal(true); 
    }
  };

  const chatIsReady = chatMode === 'general' ? (!!ragData && ragData.length > 0) : (!!cdcRagData && cdcRagData.length > 0);
  const currentRagContextAvailable = chatIsReady;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-900 text-gray-100 font-sans">
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 md:p-6 bg-gray-800 border-r border-gray-700 flex flex-col space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar h-auto md:h-screen">
        <header className="mb-2 md:mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-400">
              {chatMode === 'cdc' ? 'Consulta ao CDC' : 'Assistente Jurídico IA'}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-gray-400">
            {chatMode === 'cdc' 
              ? 'Pergunte sobre o Código de Defesa do Consumidor' 
              : 'Potencializado por Gemini & RAG com seus documentos'}
          </p>
          {ttsError && (<p className="text-xs text-red-400 mt-1">TTS: {ttsError}</p>)}
        </header>

        <div className="flex space-x-2">
            <button onClick={() => handleSwitchMode('general')} disabled={chatMode === 'general'}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${chatMode === 'general' ? 'bg-sky-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                Assistente Geral
            </button>
            <button onClick={() => handleSwitchMode('cdc')} disabled={chatMode === 'cdc' || isProcessingCdc}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${chatMode === 'cdc' ? 'bg-sky-600 text-white cursor-default' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} ${isProcessingCdc ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isProcessingCdc ? <LoadingSpinner size="sm" /> : 'Consultar CDC'}
            </button>
        </div>
        
        {chatMode === 'general' && (
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
        
        {chatMode === 'cdc' && (
          <>
            {isProcessingCdc && (<div className="flex items-center justify-center text-gray-300 p-4"><LoadingSpinner /><span className="ml-2">Processando CDC...</span></div>)}
            {cdcError && (<div className="my-2 p-3 bg-red-900/50 border border-red-700 rounded-md text-sm text-red-300"><p><strong>Erro CDC:</strong></p><p>{cdcError}</p></div>)}
            {cdcRagData && !cdcError && (<div className="mt-2 md:mt-4 p-3 bg-green-900/30 border border-green-700 rounded-md"><h2 className="text-md md:text-lg font-semibold text-green-400 mb-1">CDC</h2><p className="text-sm text-green-300">Pronto.</p></div>)}
          </>
        )}
      </div>

      <div className="flex-grow flex flex-col h-screen md:h-screen md:w-1/2 lg:w-2/4">
        <ChatInterface messages={currentUiMessages} onSendMessage={handleSendMessage} isLoading={isLoadingChat} isSpeaking={isSpeaking}
          onToggleSpeak={isSpeaking ? cancelSpeech : () => { const lastAiMsg = currentUiMessages.filter(m => m.sender === MessageSender.AI).pop(); if (lastAiMsg) speak(lastAiMsg.text); }}
          chatReady={chatIsReady} ragContextAvailable={currentRagContextAvailable} chatMode={chatMode} cdcError={cdcError} isProcessingCdc={isProcessingCdc}
        />
      </div>

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
