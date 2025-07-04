'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { JudgeResult } from '@/types';
import { Trophy, Award, Check, Download } from 'lucide-react';

interface ResultPopupProps {
  isOpen: boolean;
  onClose: () => void;
  result: JudgeResult | null;
  topicId?: string;
}

export function ResultPopup({
  isOpen,
  onClose,
  result,
  topicId,
}: ResultPopupProps) {
  if (!result) return null;

  const handleExportPDF = async () => {
    if (!topicId) return;

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          judgeResult: result,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `AI採決結果_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('PDF export failed');
        alert('PDFエクスポートに失敗しました');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDFエクスポートに失敗しました');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 AI採決結果
          </DialogTitle>
          <p className="text-sm text-gray-600 text-center mt-2">
            AIによる総合的な判定結果です
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* 総合一位 */}
          <div className="text-center bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-8 border-2 border-yellow-200">
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">総合一位</h2>
            <p className="text-4xl font-bold text-yellow-600 mb-4">
              {result.winner.name}
            </p>
          </div>

          {/* AI判定理由 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">AI判定理由</h3>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-gray-700 leading-relaxed">
                {result.reasoning}
              </p>
            </div>
          </div>

          {/* 観点別1位 */}
          {result.axisWinners && Object.keys(result.axisWinners).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">観点別1位</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.axisWinners).map(([axis, winner]) => (
                  <div
                    key={axis}
                    className="bg-purple-50 rounded-lg p-4 border border-purple-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium text-purple-900">{axis}</h4>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">
                      {winner.name}
                    </p>
                    <p className="text-sm text-gray-600">{winner.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 全体ランキング */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">全体ランキング</h3>
            <div className="space-y-2">
              {result.ranking.map((item, index) => (
                <div
                  key={item.ideaId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === 0
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-white'
                          : index === 1
                            ? 'bg-gray-400 text-white'
                            : index === 2
                              ? 'bg-orange-400 text-white'
                              : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`font-medium ${
                        index === 0 ? 'text-yellow-800' : 'text-gray-900'
                      }`}
                    >
                      {item.ideaName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 font-mono">
                    スコア: {item.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              議事録付きでPDFエクスポート
            </Button>
            <Button onClick={onClose}>閉じる</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
