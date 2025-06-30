import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { MessageCircle } from 'lucide-react';
import { Message } from '../lib/supabase';

interface VirtualizedMessageListProps {
  messages: Message[];
  characterName: string;
  avatarColorIndex: number;
  height: number;
}

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  characterName,
  avatarColorIndex,
  height
}) => {
  const avatarColors = [
    'bg-gradient-to-br from-purple-500 to-pink-500',
    'bg-gradient-to-br from-blue-500 to-cyan-500',
    'bg-gradient-to-br from-green-500 to-teal-500',
    'bg-gradient-to-br from-orange-500 to-red-500',
    'bg-gradient-to-br from-indigo-500 to-purple-500',
    'bg-gradient-to-br from-emerald-500 to-blue-500',
    'bg-gradient-to-br from-rose-500 to-pink-500',
    'bg-gradient-to-br from-amber-500 to-orange-500'
  ];

  const MessageItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    
    return (
      <div style={style} className="px-4">
        <div
          className={`flex gap-3 ${
            message.message_type === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.message_type !== 'user' && (
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
          )}
          <div
            className={`max-w-md p-3 rounded-lg ${
              message.message_type === 'user'
                ? 'bg-purple-500 text-white ml-12'
                : 'bg-white/5 text-purple-100 border border-white/10'
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            <p className="text-xs opacity-70 mt-2">
              {new Date(message.created_at).toLocaleTimeString()}
            </p>
          </div>
          {message.message_type === 'user' && (
            <div className={`w-8 h-8 rounded-full ${avatarColors[avatarColorIndex]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-sm font-bold text-white">
                {characterName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Estimate item height based on message content
  const getItemSize = useMemo(() => {
    return (index: number) => {
      const message = messages[index];
      const baseHeight = 60; // Minimum height for avatar and padding
      const textLines = Math.ceil(message.content.length / 50); // Rough estimate
      return Math.max(baseHeight, textLines * 20 + 40);
    };
  }, [messages]);

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={getItemSize}
      itemData={messages}
    >
      {MessageItem}
    </List>
  );
};

export default VirtualizedMessageList;