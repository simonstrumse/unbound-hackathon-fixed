import React from 'react';
import { Trophy, Clock, MessageCircle, Sparkles, Play, Home, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CompletionScreenProps {
  storyTitle: string;
  characterName: string;
  totalConversations: number;
  timePlayed: string;
  keyDecisions: string[];
  summary: string;
  onExport: () => void;
  onNewGameSameCharacter: () => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  storyTitle,
  characterName,
  totalConversations,
  timePlayed,
  keyDecisions,
  summary,
  onExport,
  onNewGameSameCharacter
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main completion card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-4xl font-serif font-bold text-white mb-4">Adventure Complete!</h1>
          <h2 className="text-2xl font-serif text-purple-200 mb-6">{storyTitle}</h2>
          
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <p className="text-purple-100 leading-relaxed whitespace-pre-line text-lg">
              {summary}
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{totalConversations}</h3>
            <p className="text-purple-200">Total Conversations</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{timePlayed}</h3>
            <p className="text-purple-200">Time Played</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{keyDecisions.length}</h3>
            <p className="text-purple-200">Key Decisions</p>
          </div>
        </div>

        {/* Key Decisions */}
        {keyDecisions.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
            <h3 className="text-xl font-serif font-bold text-white mb-4">Your Key Decisions</h3>
            <div className="space-y-3">
              {keyDecisions.map((decision, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className="text-purple-100 leading-relaxed">{decision}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
          >
            <Download className="w-5 h-5" />
            Export Story
          </button>

          <button
            onClick={onNewGameSameCharacter}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
          >
            <Play className="w-5 h-5" />
            New Game ({characterName})
          </button>

          <Link
            to="/stories"
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-lg font-semibold transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Browse Stories
          </Link>

          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 border-2 border-white/30 text-white px-6 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
          >
            <Home className="w-5 h-5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;