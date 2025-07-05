'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Plus, Sparkles } from 'lucide-react';

interface SuggestedIdea {
  name: string;
  description: string;
  reason: string;
}

interface QuickIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ideaName: string, description: string) => void;
  topicName?: string;
  topicGoal?: string;
  axes?: string[];
  existingIdeas?: Array<{ name: string; description?: string }>;
  transcript?: string;
}

export function QuickIdeaModal({
  isOpen,
  onClose,
  onSubmit,
  topicName,
  topicGoal,
  axes,
  existingIdeas,
  transcript,
}: QuickIdeaModalProps) {
  const [ideaName, setIdeaName] = useState('');
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedIdea[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = () => {
    if (!ideaName.trim()) return;

    onSubmit(ideaName.trim(), description.trim());
    handleClose();
  };

  const handleClose = () => {
    setIdeaName('');
    setDescription('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const fetchIdeaSuggestions = async () => {
    if (!topicName) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/suggest-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicName,
          goal: topicGoal,
          axes: axes || [],
          transcript,
          existingIdeas: existingIdeas || [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuggestions(result.data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching idea suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SuggestedIdea) => {
    setIdeaName(suggestion.name);
    setDescription(suggestion.description);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            クイックアイデア追加
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>クイックモード:</strong>{' '}
              アイデア名だけで素早く追加できます。
              AIが自動的に各軸の評価を生成し、後から編集も可能です。
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700">
              アイデア名 *
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="例: AIチャットボット導入"
                value={ideaName}
                onChange={(e) => setIdeaName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={fetchIdeaSuggestions}
                disabled={isLoadingSuggestions || !topicName}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                title="AIサジェスション"
              >
                {isLoadingSuggestions ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  AIサジェスション
                </span>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="bg-white border border-blue-100 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 mb-1">
                      {suggestion.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {suggestion.description}
                    </div>
                    <div className="text-xs text-blue-600">
                      {suggestion.reason}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowSuggestions(false)}
                variant="ghost"
                size="sm"
                className="mt-2 text-gray-500"
              >
                閉じる
              </Button>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700">
              説明（任意）
            </label>
            <Textarea
              placeholder="アイデアの詳細説明..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!ideaName.trim()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              アイデアを追加
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
