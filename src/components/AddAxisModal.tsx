'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SuggestedAxis, TopicDetail } from '@/types';
import { Lightbulb, Plus, Loader2 } from 'lucide-react';

interface AddAxisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (axis: string) => void;
  topic: TopicDetail;
}

export function AddAxisModal({
  isOpen,
  onClose,
  onSubmit,
  topic,
}: AddAxisModalProps) {
  const [axis, setAxis] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedAxis[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      // 文字起こしデータを取得
      let transcriptText = '';
      if (topic.transcript && topic.transcript.entries.length > 0) {
        transcriptText = topic.transcript.entries
          .map((entry) => `[${entry.speaker}] ${entry.text}`)
          .join('\n');
      }

      const response = await fetch('/api/suggest-axes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicName: topic.name,
          goal: topic.goal,
          existingAxes: topic.axes,
          transcript: transcriptText,
          ideas: topic.ideas.map((idea) => ({
            name: idea.name,
            description: idea.description,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuggestions(result.data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSubmit = () => {
    if (axis.trim()) {
      onSubmit(axis.trim());
      setAxis('');
      onClose();
    }
  };

  const handleSuggestionSelect = (suggestion: SuggestedAxis) => {
    setAxis(suggestion.name);
    setShowSuggestions(false);
  };

  const handleClose = () => {
    setAxis('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-800">評価軸を追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* AIサジェスチョンセクション */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">AIからの提案</h3>
              {isLoadingSuggestions && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>

            {isLoadingSuggestions ? (
              <div className="text-sm text-blue-700">
                議論の内容を分析して評価軸を提案しています...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-blue-700 mb-3">
                  議論を踏まえた評価軸の提案:
                </p>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="flex items-start gap-2">
                      <Plus className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {suggestion.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {suggestion.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-blue-600 mt-2">
                  ※ 提案をクリックすると入力欄に自動入力されます
                </div>
              </div>
            ) : (
              <div className="text-sm text-blue-700">
                現在の議論内容では具体的な提案を生成できませんでした。
                手動で評価軸を入力してください。
              </div>
            )}
          </div>

          {/* 手動入力セクション */}
          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700">
              新しい評価軸
            </label>
            <Input
              placeholder="例: 実装の難易度"
              value={axis}
              onChange={(e) => setAxis(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <p className="text-xs text-gray-500 mt-1">
              上のAI提案から選択するか、独自の評価軸を入力してください
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={!axis.trim()}>
              追加
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
