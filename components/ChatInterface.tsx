
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { MessageSender } from '../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { LoadingSpinner } from './LoadingSpinner';

type ChatMode = 'general' | 'cdc';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isSpeaking: boolean;
  onToggleSpeak: () => void;
  chatReady: boolean;
  ragContextAvailable: boolean;
  chatMode: ChatMode;
  cdcError: string | null;
  isProcessingCdc: boolean;
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
  cdcError,
  isProcessingCdc
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
    if (userInput.trim() && chatReady) {
      onSendMessage(userInput.trim());
      setUserInput('');
    }
  };
  
  useEffect(() => {
    if (chatReady && inputRef.current) {
        inputRef.current.focus();
    }
  }, [chatReady]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any); // Cast to any to satisfy FormEvent type for handleSubmit
    }
  };

  const getChatTitle = () => {
    if (chatMode === 'cdc') {
        return "Chat CDC";
    }
    return "Chat Jurídico";
  };

  const getPlaceholderText = () => {
    if (chatMode === 'cdc') {
        if (isProcessingCdc) return "Processando o CDC...";
        if (cdcError) return "Erro ao carregar o CDC. Verifique o painel lateral.";
        if (!chatReady) return "Aguardando o CDC ser carregado...";
        return "Digite sua pergunta sobre o CDC...";
    }
    // General mode
    if (!ragContextAvailable) return "Aguardando processamento dos arquivos (PDF, JSON, TXT)...";
    if (!chatReady) return "Inicializando assistente...";
    return "Digite sua consulta jurídica...";
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-sky-400">{getChatTitle()}</h2>
        {chatReady && (
          <button
            onClick={onToggleSpeak}
            title={isSpeaking ? "Parar Leitura" : "Ler Respostas em Voz Alta"}
            className={`p-2 rounded-full transition-colors ${
              isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-sky-500 hover:bg-sky-600'
            } text-white`}
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
        {chatMode === 'general' && !ragContextAvailable && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-lg">Por favor, envie e processe seus documentos (PDF, JSON, TXT) primeiro.</p>
            <p className="text-sm">A interface de chat será ativada após o processamento dos arquivos.</p>
          </div>
        )}
        {chatMode === 'cdc' && isProcessingCdc && (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <LoadingSpinner size="lg" />
                <p className="text-lg mt-4">Carregando Código de Defesa do Consumidor...</p>
             </div>
        )}
        {chatMode === 'cdc' && cdcError && !isProcessingCdc &&(
             <div className="flex flex-col items-center justify-center h-full text-center text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="text-lg">Falha ao carregar o CDC.</p>
                <p className="text-sm">{cdcError}</p>
             </div>
        )}
        {ragContextAvailable && messages.length === 0 && !isLoading && !isProcessingCdc && !cdcError && (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-500">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12s3.862-8.25 8.625-8.25S21 7.444 21 12Z" />
                </svg>
                <p className="text-lg">Nenhuma mensagem ainda.</p>
                <p className="text-sm">
                    {chatMode === 'cdc' 
                        ? "Comece a conversa digitando sua pergunta sobre o CDC abaixo." 
                        : "Comece a conversa digitando sua pergunta jurídica abaixo."}
                </p>
             </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

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
            disabled={!chatReady || isLoading || (chatMode ==='cdc' && (isProcessingCdc || !!cdcError)) }
            style={{ maxHeight: '100px', overflowY: 'auto' }}
            aria-label="Campo de entrada de mensagem"
          />
          <button
            type="submit"
            disabled={!chatReady || isLoading || !userInput.trim() || (chatMode ==='cdc' && (isProcessingCdc || !!cdcError))}
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
    </div>
  );
};
