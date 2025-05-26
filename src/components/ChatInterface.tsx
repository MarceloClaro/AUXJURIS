import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { MessageSender } from '../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { LoadingSpinner } from './LoadingSpinner';

// Usar AppMode para consistência com App.tsx
type AppMode = 'general' | 'cf88-chat' | 'cf88-reader' | 'cpp-reader' | 'cp-reader' | 'cdc-reader';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isSpeaking: boolean;
  onToggleSpeak: () => void;
  chatReady: boolean; 
  ragContextAvailable: boolean; 
  chatMode: AppMode; // Alterado para AppMode
  // Props específicas do CDC (PDF chat) removidas
  cf88PdfChatError: string | null; // Erro específico do carregamento do PDF da CF/88 para chat
  isProcessingCf88PdfChat: boolean; // Processando PDF da CF/88 para chat
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isSpeaking,
  onToggleSpeak,
  chatReady, 
  ragContextAvailable, 
  chatMode,
  cf88PdfChatError, 
  isProcessingCf88PdfChat
}) => {
  const [userInput, setUserInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && chatReady && 
        chatMode !== 'cf88-reader' && chatMode !== 'cpp-reader' && 
        chatMode !== 'cp-reader' && chatMode !== 'cdc-reader') { // Não enviar se for modo leitor
      onSendMessage(userInput.trim());
      setUserInput('');
    }
  };
  
  useEffect(() => {
    // Focar no input apenas se for um modo de chat e estiver pronto
    if (chatReady && inputRef.current && 
        (chatMode === 'general' || chatMode === 'cf88-chat')) {
        inputRef.current.focus();
    }
  }, [chatReady, chatMode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any); 
    }
  };

  const getChatTitle = () => {
    switch(chatMode) {
      case 'general': return "Chat Jurídico (Geral)";
      case 'cf88-chat': return "Chat com CF/88 (PDF)";
      case 'cf88-reader': return "Leitura da CF/88"; 
      case 'cpp-reader': return "Leitura do CPP";
      case 'cp-reader': return "Leitura do Código Penal";
      case 'cdc-reader': return "Leitura do CDC";
      default: return "Chat Jurídico"; // Fallback
    }
  };

  const getPlaceholderText = () => {
    if (chatMode === 'cf88-chat') { 
        if (isProcessingCf88PdfChat) return "Processando a CF/88 (PDF)...";
        if (cf88PdfChatError) return "Erro ao carregar a CF/88 (PDF). Verifique o painel lateral.";
        if (!chatReady) return "Aguardando a CF/88 (PDF) ser carregada...";
        return "Digite sua pergunta sobre a CF/88...";
    }
    if (chatMode === 'cf88-reader' || chatMode === 'cpp-reader' || chatMode === 'cp-reader' || chatMode === 'cdc-reader') {
      return "Navegue pelo documento no painel central. O chat está desabilitado neste modo.";
    }
    // General mode
    if (!ragContextAvailable && !isLoading) return "Aguardando processamento dos arquivos (PDF, JSON, TXT)...";
    if (!chatReady) return "Inicializando assistente...";
    return "Digite sua consulta jurídica...";
  };

  const isReaderMode = chatMode === 'cf88-reader' || chatMode === 'cpp-reader' || chatMode === 'cp-reader' || chatMode === 'cdc-reader';
  const isInputDisabled = !chatReady || isLoading || 
                         (chatMode === 'cf88-chat' && (isProcessingCf88PdfChat || !!cf88PdfChatError)) ||
                         isReaderMode; 

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-sky-400">{getChatTitle()}</h2>
        {/* Botão de TTS apenas para modos de chat */}
        {!isReaderMode && chatReady && ( 
          <button
            onClick={onToggleSpeak}
            title={isSpeaking ? "Parar Leitura" : "Ler Respostas em Voz Alta"}
            className={`p-2 rounded-full transition-colors ${
              isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-sky-500 hover:bg-sky-600'
            } text-white`}
             aria-label={isSpeaking ? "Parar leitura em voz alta" : "Ler respostas em voz alta"}
          >
            {isSpeaking ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l-2.25 2.25M19.5 12l2.25-2.25M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.22-.02-.44-.05-.65M12 3c-.08.006-.16.016-.24.028M12 3a8.965 8.965 0 0 0-6.22 2.693M12 12.75V3A8.965 8.965 0 0 1 18.22 5.307" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            )}
          </button>
        )}
      </header>
      
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-900/70">
        {/* Placeholders for general mode or CF88 chat mode when files/PDF not processed or error */}
        {chatMode === 'general' && !ragContextAvailable && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-lg">Por favor, envie e processe seus documentos (PDF, JSON, TXT) primeiro.</p>
            <p className="text-sm">A interface de chat será ativada após o processamento dos arquivos.</p>
          </div>
        )}
         {chatMode === 'cf88-chat' && isProcessingCf88PdfChat && ( 
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <LoadingSpinner size="lg" />
                <p className="text-lg mt-4">Carregando Constituição Federal (PDF) para chat...</p>
             </div>
        )}
        {chatMode === 'cf88-chat' && cf88PdfChatError && !isProcessingCf88PdfChat &&( 
             <div className="flex flex-col items-center justify-center h-full text-center text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="text-lg">Falha ao carregar a CF/88 (PDF para Chat).</p>
                <p className="text-sm">{cf88PdfChatError}</p>
             </div>
        )}
        
        {/* Placeholder for chat modes when ready but no messages */}
        {chatReady && messages.length === 0 && !isLoading && (chatMode === 'general' || chatMode === 'cf88-chat') && (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12s3.862-8.25 8.625-8.25S21 7.444 21 12Z" />
                </svg>
                <p className="text-lg">Nenhuma mensagem ainda.</p>
                <p className="text-sm">
                    {chatMode === 'cf88-chat'
                        ? "Comece a conversa digitando sua pergunta sobre a CF/88 abaixo." 
                        : "Comece a conversa digitando sua pergunta jurídica abaixo."}
                </p>
             </div>
        )}

         {/* Placeholders for reader modes */}
         {isReaderMode && messages.length === 0 && ( 
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                <p className="text-lg">{getChatTitle()}</p>
                <p className="text-sm">
                    {chatMode === 'cf88-reader' ? "A Constituição está sendo exibida no painel central." :
                     chatMode === 'cpp-reader' ? "O Código de Processo Penal está sendo exibido no painel central." :
                     chatMode === 'cp-reader' ? "O Código Penal está sendo exibido no painel central." :
                     chatMode === 'cdc-reader' ? "O Código de Defesa do Consumidor está sendo exibido no painel central." : ""
                    }
                </p>
                 <p className="text-xs mt-2">O chat é desabilitado durante a leitura de documentos.</p>
            </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulário de chat desabilitado para modos de leitura */}
      {!isReaderMode && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center space-x-2">
            <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholderText()}
                className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-400 text-gray-100 disabled:opacity-50"
                rows={1}
                disabled={isInputDisabled}
                style={{ maxHeight: '100px', overflowY: 'auto' }}
                aria-label="Campo de entrada de mensagem"
            />
            <button
                type="submit"
                disabled={isInputDisabled || !userInput.trim()}
                className="p-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Enviar mensagem"
            >
                {isLoading ? <LoadingSpinner size="sm" /> : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                )}
            </button>
            </div>
        </form>
      )}
    </div>
  );
};
