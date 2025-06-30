import React, { useState } from 'react';
import { X, Download, FileText, File, Loader2, Calendar, User, BookOpen, Trophy } from 'lucide-react';
import { Message } from '../lib/supabase';
import { MemoryEvent } from '../lib/types';
import jsPDF from 'jspdf';

interface EnhancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  storyTitle: string;
  characterName: string;
  memoryEvents?: MemoryEvent[];
  totalConversations?: number;
  storyPhase?: string;
}

const EnhancedExportModal: React.FC<EnhancedExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  storyTitle,
  characterName,
  memoryEvents = [],
  totalConversations = 0,
  storyPhase = 'ongoing'
}) => {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'txt' | 'json'>('pdf');

  if (!isOpen) return null;

  const exportAsJSON = () => {
    const exportData = {
      story: {
        title: storyTitle,
        character: characterName,
        exportDate: new Date().toISOString(),
        totalConversations,
        storyPhase
      },
      messages: messages.map(msg => ({
        type: msg.message_type,
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata
      })),
      memoryEvents: memoryEvents.map(event => ({
        description: event.description,
        importance: event.importance,
        characters: event.characters_involved,
        tags: event.tags
      })),
      statistics: {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.message_type === 'user').length,
        storyResponses: messages.filter(m => m.message_type === 'character').length,
        keyMemories: memoryEvents.filter(e => e.importance === 'high').length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyTitle.replace(/\s+/g, '_')}_${characterName}_complete_data.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const content = [
      '=' * 60,
      `UNBOUND STORY EXPORT - ${storyTitle.toUpperCase()}`,
      '=' * 60,
      '',
      `Character: ${characterName}`,
      `Export Date: ${new Date().toLocaleDateString()}`,
      `Total Conversations: ${totalConversations}`,
      `Story Phase: ${storyPhase}`,
      '',
      '=' * 60,
      'CONVERSATION HISTORY',
      '=' * 60,
      ''
    ];

    messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString();
      const speaker = message.message_type === 'user' ? characterName : 
                    message.message_type === 'system' ? 'Narrator' : 'Story';
      
      content.push(`[${timestamp}] ${speaker}:`);
      content.push(message.content);
      content.push('');
      
      if (index < messages.length - 1) {
        content.push('-' * 40);
        content.push('');
      }
    });

    if (memoryEvents.length > 0) {
      content.push('');
      content.push('=' * 60);
      content.push('KEY MEMORIES & EVENTS');
      content.push('=' * 60);
      content.push('');
      
      memoryEvents
        .sort((a, b) => a.importance === 'high' ? -1 : b.importance === 'high' ? 1 : 0)
        .forEach(event => {
          const importance = event.importance.toUpperCase();
          content.push(`[${importance}] ${event.description}`);
          if (event.characters_involved.length > 0) {
            content.push(`   Characters: ${event.characters_involved.join(', ')}`);
          }
          if (event.tags.length > 0) {
            content.push(`   Tags: ${event.tags.join(', ')}`);
          }
          content.push('');
        });
    }

    content.push('');
    content.push('=' * 60);
    content.push('END OF STORY EXPORT');
    content.push('=' * 60);

    const blob = new Blob([content.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyTitle.replace(/\s+/g, '_')}_${characterName}_story.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    const lineHeight = 6;
    let yPosition = margin;

    // Helper function to add new page if needed
    const checkPageBreak = (neededSpace: number = lineHeight * 3) => {
      if (yPosition + neededSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Title page
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.text('UNBOUND STORY EXPORT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 3;

    pdf.setFontSize(18);
    pdf.text(storyTitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    pdf.setFontSize(14);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Character: ${characterName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight;
    pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight;
    pdf.text(`Total Conversations: ${totalConversations}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 3;

    // Story statistics
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Adventure Statistics', margin, yPosition);
    yPosition += lineHeight * 2;

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    const stats = [
      `Total Messages: ${messages.length}`,
      `Your Actions: ${messages.filter(m => m.message_type === 'user').length}`,
      `Story Responses: ${messages.filter(m => m.message_type === 'character').length}`,
      `Key Memories: ${memoryEvents.filter(e => e.importance === 'high').length}`,
      `Story Phase: ${storyPhase}`
    ];

    stats.forEach(stat => {
      pdf.text(stat, margin, yPosition);
      yPosition += lineHeight;
    });

    yPosition += lineHeight * 2;

    // Conversation history
    checkPageBreak();
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Conversation History', margin, yPosition);
    yPosition += lineHeight * 2;

    pdf.setFontSize(10);

    messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString();
      const speaker = message.message_type === 'user' ? characterName : 
                    message.message_type === 'system' ? 'Narrator' : 'Story';
      
      checkPageBreak(lineHeight * 4);

      // Speaker and timestamp
      pdf.setFont(undefined, 'bold');
      pdf.text(`[${timestamp}] ${speaker}:`, margin, yPosition);
      yPosition += lineHeight;

      // Message content
      pdf.setFont(undefined, 'normal');
      const lines = pdf.splitTextToSize(message.content, pageWidth - margin * 2);
      
      lines.forEach((line: string) => {
        checkPageBreak();
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      yPosition += lineHeight; // Space between messages
    });

    // Memory events section
    if (memoryEvents.length > 0) {
      checkPageBreak(lineHeight * 4);
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Key Memories & Events', margin, yPosition);
      yPosition += lineHeight * 2;

      pdf.setFontSize(10);
      memoryEvents
        .sort((a, b) => a.importance === 'high' ? -1 : b.importance === 'high' ? 1 : 0)
        .forEach(event => {
          checkPageBreak(lineHeight * 3);
          
          pdf.setFont(undefined, 'bold');
          pdf.text(`[${event.importance.toUpperCase()}] `, margin, yPosition);
          pdf.setFont(undefined, 'normal');
          
          const eventLines = pdf.splitTextToSize(event.description, pageWidth - margin * 2 - 20);
          eventLines.forEach((line: string, lineIndex: number) => {
            if (lineIndex === 0) {
              pdf.text(line, margin + 20, yPosition);
            } else {
              checkPageBreak();
              pdf.text(line, margin + 20, yPosition);
            }
            yPosition += lineHeight;
          });
          
          if (event.characters_involved.length > 0) {
            pdf.setFont(undefined, 'italic');
            pdf.text(`Characters: ${event.characters_involved.join(', ')}`, margin + 20, yPosition);
            yPosition += lineHeight;
          }
          
          yPosition += lineHeight;
        });
    }

    pdf.save(`${storyTitle.replace(/\s+/g, '_')}_${characterName}_story.pdf`);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      if (format === 'pdf') {
        exportAsPDF();
      } else if (format === 'txt') {
        exportAsText();
      } else if (format === 'json') {
        exportAsJSON();
      }
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-gradient-to-br from-purple-900/90 to-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/20 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Download className="w-6 h-6" />
            Export Your Story
          </h3>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Story Details */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Story Details
            </h4>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-300" />
                <span className="text-purple-100"><strong>Story:</strong> {storyTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-300" />
                <span className="text-purple-100"><strong>Character:</strong> {characterName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-300" />
                <span className="text-purple-100"><strong>Messages:</strong> {messages.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-300" />
                <span className="text-purple-100"><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">Export Format</h4>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setFormat('pdf')}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                  format === 'pdf'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
              >
                <FileText className="w-6 h-6" />
                <div>
                  <p className="font-medium">PDF Document</p>
                  <p className="text-sm opacity-70">Beautifully formatted with story statistics and memories</p>
                </div>
              </button>

              <button
                onClick={() => setFormat('txt')}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                  format === 'txt'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
              >
                <File className="w-6 h-6" />
                <div>
                  <p className="font-medium">Text File</p>
                  <p className="text-sm opacity-70">Plain text format with conversation history</p>
                </div>
              </button>

              <button
                onClick={() => setFormat('json')}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                  format === 'json'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
              >
                <BookOpen className="w-6 h-6" />
                <div>
                  <p className="font-medium">JSON Data</p>
                  <p className="text-sm opacity-70">Complete structured data for backup/analysis</p>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white/10 text-white py-3 px-4 rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export {format.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExportModal;