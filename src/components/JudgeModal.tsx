'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TopicDetail, JudgeResult } from '@/types';
import { BarChart3, FileText, Users } from 'lucide-react';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: TopicDetail;
  onJudgeComplete: (result: JudgeResult) => void;
}

export function JudgeModal({
  isOpen,
  onClose,
  topic,
  onJudgeComplete,
}: JudgeModalProps) {
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [isJudging, setIsJudging] = useState(false);

  const handleAxisToggle = (axis: string) => {
    setSelectedAxes((prev) =>
      prev.includes(axis) ? prev.filter((a) => a !== axis) : [...prev, axis]
    );
  };

  const handleJudge = async () => {
    if (selectedAxes.length === 0) {
      alert('評価軸を少なくとも1つ選択してください。');
      return;
    }

    setIsJudging(true);

    try {
      // 文字起こしデータを取得
      let transcriptText = '';
      if (topic.transcript && topic.transcript.entries.length > 0) {
        transcriptText = topic.transcript.entries
          .map((entry) => `[${entry.speaker}] ${entry.text}`)
          .join('\n');
      }

      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: topic.id,
          selectedAxes,
          transcript: transcriptText,
          ideas: topic.ideas,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onJudgeComplete(result.data);
        onClose();
      } else {
        console.error('Failed to perform judgment:', result.error);
        alert('採決に失敗しました。');
      }
    } catch (error) {
      console.error('Error performing judgment:', error);
      alert('採決中にエラーが発生しました。');
    } finally {
      setIsJudging(false);
    }
  };

  const formatTranscriptPreview = () => {
    if (!topic.transcript || topic.transcript.entries.length === 0) {
      return 'まだ文字起こしデータがありません';
    }

    const recentEntries = topic.transcript.entries.slice(-3);
    return recentEntries
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join('\n');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI採決を実行
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            AIが全アイデアを総合的に分析し、最適解を判定します
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* 文字起こし要約プレビュー */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium text-blue-900">
                文字起こし要約プレビュー
              </h3>
            </div>
            <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {formatTranscriptPreview()}
              </pre>
            </div>
            {topic.transcript && topic.transcript.entries.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                総計 {topic.transcript.entries.length}{' '}
                件の発言が記録されています
              </p>
            )}
          </div>

          {/* 評価軸選択 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">
                判定に使用する評価軸
              </h3>
            </div>
            <div className="space-y-3">
              {topic.axes.map((axis) => (
                <div key={axis} className="flex items-center space-x-3">
                  <Checkbox
                    id={axis}
                    checked={selectedAxes.includes(axis)}
                    onCheckedChange={() => handleAxisToggle(axis)}
                  />
                  <label
                    htmlFor={axis}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {axis}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              選択した軸に基づいてAIが総合的に判定します
            </p>
          </div>

          {/* アイデア一覧 */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              対象アイデア ({topic.ideas.length}個)
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {topic.ideas.map((idea, index) => (
                <div key={idea.id} className="text-sm text-gray-700 py-1">
                  {index + 1}. {idea.name}
                </div>
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isJudging}>
              キャンセル
            </Button>
            <Button
              onClick={handleJudge}
              disabled={selectedAxes.length === 0 || isJudging}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isJudging ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  判定中...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  JUDGE
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
