'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, goal: string, axes: string[]) => void;
}

export function CreateTopicModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTopicModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [axes, setAxes] = useState<string>('');
  const [topicName, setTopicName] = useState<string>('');
  const [goal, setGoal] = useState<string>('');

  const handleNext = () => {
    if (step === 1 && topicName.trim()) {
      setStep(2);
    } else if (step === 2 && axes.trim()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (topicName.trim() && axes.trim()) {
      const axesList = axes
        .split('\n')
        .map((axis) => axis.trim())
        .filter((axis) => axis.length > 0);

      onSubmit(topicName, goal.trim(), axesList);

      // リセット
      setStep(1);
      setAxes('');
      setTopicName('');
      setGoal('');
      onClose();
    }
  };

  const handleClose = () => {
    setStep(1);
    setAxes('');
    setTopicName('');
    setGoal('');
    onClose();
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'ステップ1: 議題名の入力';
      case 2:
        return 'ステップ2: 評価軸の入力';
      case 3:
        return 'ステップ3: 議論の目標設定';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">議題名</label>
              <Input
                placeholder="例: 新サービスの選定"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button onClick={handleClose} variant="outline">
                キャンセル
              </Button>
              <Button onClick={handleNext} disabled={!topicName.trim()}>
                次へ
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                評価軸を1行ずつ入力してください
              </label>
              <Textarea
                placeholder="例:&#10;コスト&#10;実現可能性&#10;効果の大きさ"
                value={axes}
                onChange={(e) => setAxes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                設定した評価軸
              </label>
              <div className="bg-gray-50 p-3 rounded-md">
                {axes.split('\n').map(
                  (axis, index) =>
                    axis.trim() && (
                      <div key={index} className="text-sm">
                        {index + 1}. {axis.trim()}
                      </div>
                    )
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleBack} variant="outline">
                戻る
              </Button>
              <Button onClick={handleNext} disabled={!axes.trim()}>
                次へ
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                議論の目標（任意）
              </label>
              <Textarea
                placeholder="例: 最適なサービスを選定し、来月までに導入計画を策定する"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                この議論で達成したい目標や期待する成果を記入してください
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">確認</label>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div className="text-sm">
                  <span className="font-medium">議題名:</span> {topicName}
                </div>
                {goal && (
                  <div className="text-sm">
                    <span className="font-medium">目標:</span> {goal}
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">評価軸:</span>
                  <div className="ml-2 mt-1">
                    {axes.split('\n').map(
                      (axis, index) =>
                        axis.trim() && (
                          <div key={index} className="text-xs">
                            {index + 1}. {axis.trim()}
                          </div>
                        )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleBack} variant="outline">
                戻る
              </Button>
              <Button onClick={handleSubmit}>作成</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
