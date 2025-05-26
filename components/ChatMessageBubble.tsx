
import React from 'react';
import type { ChatMessage } from '../types';
import { MessageSender } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const { sender, text, timestamp } = message; // Removed sources

  const isUser = sender === MessageSender.USER;
  const isSystem = sender === MessageSender.SYSTEM;

  const bubbleClasses = isUser
    ? 'bg-sky-600 text-white self-end rounded-l-xl rounded-tr-xl'
    : isSystem
    ? 'bg-yellow-700/30 text-yellow-200 self-center text-sm italic border border-yellow-600/50 w-full md:w-3/4 lg:w-2/3'
    : 'bg-gray-700 text-gray-100 self-start rounded-r-xl rounded-tl-xl';
  
  const containerClasses = isUser ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start';

  const renderTextWithLinks = (inputText: string): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(inputText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(inputText.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline"
        >
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < inputText.length) {
      parts.push(inputText.substring(lastIndex));
    }
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return parts.map((part, i) => {
      if (typeof part === 'string') {
        const subParts = [];
        let subLastIndex = 0;
        let subMatch;
        while((subMatch = urlRegex.exec(part)) !== null) {
          if(subMatch.index > subLastIndex) {
            subParts.push(part.substring(subLastIndex, subMatch.index));
          }
          // Type assertion for React.ReactElement
          const potentialExistingLink = parts.find(p => typeof p !== 'string' && ((p as React.ReactElement).props as { href?: string }).href === subMatch[0]);
          if(!potentialExistingLink) {
            subParts.push(
              <a
                key={`${i}-${subMatch.index}`}
                href={subMatch[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                {subMatch[0]}
              </a>
            );
          } else {
             subParts.push(subMatch[0]);
          }
          subLastIndex = urlRegex.lastIndex;
        }
        if(subLastIndex < part.length) {
          subParts.push(part.substring(subLastIndex));
        }
        return subParts.length > 0 ? subParts : part;
      }
      return part;
    }).flat();
  };


  return (
    <div className={`flex ${containerClasses} w-full`}>
      <div className={`p-3 md:p-4 shadow-md max-w-xl lg:max-w-2xl xl:max-w-3xl ${bubbleClasses}`}>
        <div className="whitespace-pre-wrap break-words">
          {renderTextWithLinks(text)}
        </div>
        {/* Removed sources rendering block */}
        {!isSystem && (
          <p className="text-xs text-gray-400 mt-2 text-right">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};
