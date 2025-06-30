import React, { useState } from 'react';
import { X, Download, FileText, File, Loader2 } from 'lucide-react';
import { Message } from '../lib/supabase';
import jsPDF from 'jspdf';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  storyTitle: string;
  characterName: string;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  storyTitle,
  characterName
}) => {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'txt'>('pdf');

  if (!isOpen) return null;

  const exportAsText = () => {
    const content = [
      `UNBOUND STORY EXPORT`,
      `Story: ${storyTitle}`,
      `Character: ${characterName}`,
      `Export Date: ${new Date().toLocaleDateString()}`,
      `Total Messages: ${messages.length}`,
      '',
      '=' * 50,
      ''
    ];

    messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString();
      const speaker = message.message_type === 'user' ? characterName : 'Narrator';
      
      content.push(`[${timestamp}] ${speaker}:`);
      content.push(message.content);
      content.push('');
    });

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
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Title page
    pdf.setFontSize(20);
    pdf.text('UNBOUND STORY EXPORT', margin, yPosition);
    yPosition += lineHeight * 2;

    pdf.setFontSize(14);
    pdf.text(`Story: ${storyTitle}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Character: ${characterName}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Total Messages: ${messages.length}`, margin, yPosition);
    yPosition += lineHeight * 3;

    pdf.setFontSize(12);

    messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString();
      const speaker = message.message_type === 'user' ? characterName : 'Narrator';
      
      // Check if we need a new page
      if (yPosition > pageHeight - margin * 2) {
        pdf.addPage();
        yPosition = margin;
      }

      // Speaker and timestamp
      pdf.setFont(undefined, 'bold');
      pdf.text(`[${timestamp}] ${speaker}:`, margin, yPosition);
      yPosition += lineHeight;

      // Message content
      pdf.setFont(undefined, 'normal');
      const lines = pdf.splitTextToSize(message.content, pdf.internal.pageSize.width - margin * 2);
      
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin * 2) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      yPosition += lineHeight; // Space between messages
    });

    pdf.save(`${storyTitle.replace(/\s+/g, '_')}_${characterName}_story.pdf`);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      if (format === 'pdf') {
        exportAsPDF();
      } else {
        exportAsText();
      }
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/20 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-serif font-bold text-white">Export Story</h3>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-2">Story Details</h4>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-purple-100"><strong>Story:</strong> {storyTitle}</p>
              <p className="text-purple-100"><strong>Character:</strong> {characterName}</p>
              <p className="text-purple-100"><strong>Messages:</strong> {messages.length}</p>
              <p className="text-purple-100"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">Export Format</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('pdf')}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  format === 'pdf'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
              >
                <FileText className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">PDF</p>
                  <p className="text-sm opacity-70">Formatted document</p>
                </div>
              </button>

              <button
                onClick={() => setFormat('txt')}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  format === 'txt'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
              >
                <File className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">Text</p>
                  <p className="text-sm opacity-70">Plain text file</p>
                </div>
              </button>
            </div>
          </div>

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

export default ExportModal;