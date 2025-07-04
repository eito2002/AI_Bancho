'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { IdeaEvaluationModal } from '@/components/IdeaEvaluationModal';
import { JudgeModal } from '@/components/JudgeModal';
import { ResultPopup } from '@/components/ResultPopup';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { AddAxisModal } from '@/components/AddAxisModal';
import { RecordingButton } from '@/components/RecordingButton';
import { TopicDetail, Idea, JudgeResult } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [isAddAxisModalOpen, setIsAddAxisModalOpen] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [isResultPopupOpen, setIsResultPopupOpen] = useState(false);
  const [isTranscriptPanelOpen, setIsTranscriptPanelOpen] = useState(false);
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (params.id) {
      fetchTopicDetail(params.id as string);
    }
  }, [params.id]);

  const fetchTopicDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/topics/${id}`);
      const result = await response.json();

      if (result.success) {
        setTopic(result.data);
      } else {
        console.error('Failed to fetch topic detail:', result.error);
      }
    } catch (error) {
      console.error('Error fetching topic detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!topic) return;

    const updatedIdeas = topic.ideas.filter((idea) => idea.id !== ideaId);

    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ideas: updatedIdeas }),
      });

      const result = await response.json();

      if (result.success) {
        setTopic(result.data);
      } else {
        console.error('Failed to delete idea:', result.error);
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  const handleAddIdea = async (
    ideaName: string,
    description: string,
    evaluations: Record<string, string>
  ) => {
    if (!topic) return;

    const newIdea: Idea = {
      id: Date.now().toString(),
      name: ideaName,
      description,
      evaluations,
    };

    const updatedIdeas = [...topic.ideas, newIdea];

    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ideas: updatedIdeas }),
      });

      const result = await response.json();

      if (result.success) {
        setTopic(result.data);
      } else {
        console.error('Failed to add idea:', result.error);
      }
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  };

  const handleAddAxis = async (axis: string) => {
    if (!topic) return;

    const updatedAxes = [...topic.axes, axis];

    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ axes: updatedAxes }),
      });

      const result = await response.json();

      if (result.success) {
        setTopic(result.data);
      } else {
        console.error('Failed to add axis:', result.error);
      }
    } catch (error) {
      console.error('Error adding axis:', error);
    }
  };

  const handleJudgeComplete = (result: JudgeResult) => {
    setJudgeResult(result);
    setIsResultPopupOpen(true);
  };

  const toggleIdeaExpansion = (ideaId: string) => {
    setExpandedIdeas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const handleTranscript = async (text: string, speaker?: string) => {
    if (!topic) return;

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: topic.id,
          text,
          speaker: speaker || '不明',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 議題データを再取得して文字起こしデータを更新
        await fetchTopicDetail(topic.id);

        // TranscriptPanelが開いていない場合は開く
        if (!isTranscriptPanelOpen) {
          setIsTranscriptPanelOpen(true);
        }

        alert(`文字起こし完了:\n話者: ${speaker || '不明'}\n内容: ${text}`);
      } else {
        console.error('文字起こし保存失敗:', result.error);
        alert('文字起こしの保存に失敗しました。');
      }
    } catch (error) {
      console.error('文字起こし保存エラー:', error);
      alert('文字起こしの保存中にエラーが発生しました。');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">議題が見つかりません</h2>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              一覧に戻る
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{topic.name}</h1>
              <p className="text-gray-600 mt-2">
                評価軸: {topic.axes.length}個 | アイデア: {topic.ideas.length}個
                {topic.transcript &&
                  ` | 文字起こし: ${topic.transcript.entries.length}件`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <RecordingButton
              onTranscript={handleTranscript}
              className="text-sm"
            />
            <Button
              variant="outline"
              onClick={() => setIsAddAxisModalOpen(true)}
            >
              論点を追加
            </Button>
            <Button
              onClick={() => setIsJudgeModalOpen(true)}
              disabled={topic.ideas.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              採決する
            </Button>
          </div>
        </div>

        {/* 議論の目標セクション（横一杯） */}
        {topic.goal && (
          <div className="w-full mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <span className="font-medium text-blue-900 text-base">
                  議論の目標:
                </span>
                <p className="text-blue-800 text-base mt-2 leading-relaxed">
                  {topic.goal}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* アイデア一覧（テーブル + アコーディオン形式） */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[250px]">
                    アイデア名
                  </th>
                  {topic.axes.map((axis, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]"
                    >
                      {axis}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topic.ideas.map((idea) => {
                  const isExpanded = expandedIdeas.has(idea.id);
                  return (
                    <React.Fragment key={idea.id}>
                      {/* メインテーブル行 */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 w-[250px]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleIdeaExpansion(idea.id)}
                              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {idea.name}
                              </div>
                              {idea.description && (
                                <div className="text-sm text-gray-500 mt-1 truncate">
                                  {idea.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {Object.keys(idea.evaluations).length}/
                                {topic.axes.length} 評価済み
                              </div>
                            </div>
                          </div>
                        </td>
                        {topic.axes.map((axis, index) => (
                          <td key={index} className="px-6 py-4 w-[200px]">
                            <div className="text-sm text-gray-900">
                              {idea.evaluations[axis] ? (
                                <div>
                                  <div
                                    className="truncate"
                                    title={idea.evaluations[axis]}
                                  >
                                    {idea.evaluations[axis]}
                                  </div>
                                  {idea.evaluations[axis].length > 50 && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      詳細を見る
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">未評価</span>
                              )}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 text-center w-[100px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>

                      {/* 詳細行（アコーディオン） */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          {/* アイデア名列の詳細 */}
                          <td className="px-6 py-4 border-t border-gray-200 w-[250px]">
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-900">
                                詳細情報
                              </div>
                              {idea.description && (
                                <div className="text-sm text-gray-600 break-words">
                                  <span className="font-medium">説明:</span>{' '}
                                  {idea.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                評価進捗: {Object.keys(idea.evaluations).length}
                                /{topic.axes.length}
                              </div>
                            </div>
                          </td>

                          {/* 各観点列の詳細 */}
                          {topic.axes.map((axis, index) => (
                            <td
                              key={index}
                              className="px-6 py-4 border-t border-gray-200 align-top w-[200px]"
                            >
                              <div className="space-y-2">
                                {idea.evaluations[axis] ? (
                                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                                    <div className="text-xs font-medium text-blue-900 mb-2">
                                      詳細評価
                                    </div>
                                    <div className="text-sm text-gray-700 break-words">
                                      {idea.evaluations[axis]}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                                    <div className="text-xs text-gray-500 italic">
                                      この観点での評価はまだ行われていません
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}

                          {/* 操作列の詳細 */}
                          <td className="px-6 py-4 border-t border-gray-200 text-center w-[100px]">
                            <div className="text-xs text-gray-500">
                              詳細表示中
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* アイデア追加行 */}
                <tr className="bg-blue-50 hover:bg-blue-100">
                  <td colSpan={topic.axes.length + 2} className="px-6 py-4">
                    <Button
                      variant="ghost"
                      className="w-full text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2"
                      onClick={() => setIsIdeaModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      アイデアを追加
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 空の状態 */}
        {topic.ideas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              アイデアがありません
            </h3>
            <p className="text-gray-600 mb-6">
              最初のアイデアを追加して評価を始めましょう
            </p>
            <Button onClick={() => setIsIdeaModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              アイデアを追加
            </Button>
          </div>
        )}

        {/* モーダル */}
        <IdeaEvaluationModal
          isOpen={isIdeaModalOpen}
          onClose={() => setIsIdeaModalOpen(false)}
          axes={topic.axes}
          topicName={topic.name}
          topicGoal={topic.goal}
          existingIdeas={topic.ideas.map((idea) => ({
            name: idea.name,
            description: idea.description,
          }))}
          transcript={
            topic.transcript?.entries
              .map((entry) => `[${entry.speaker || '不明'}] ${entry.text}`)
              .join('\n') || ''
          }
          onSubmit={handleAddIdea}
        />

        <AddAxisModal
          isOpen={isAddAxisModalOpen}
          onClose={() => setIsAddAxisModalOpen(false)}
          onSubmit={handleAddAxis}
          topic={topic}
        />

        <JudgeModal
          isOpen={isJudgeModalOpen}
          onClose={() => setIsJudgeModalOpen(false)}
          topic={topic}
          onJudgeComplete={handleJudgeComplete}
        />

        <ResultPopup
          isOpen={isResultPopupOpen}
          onClose={() => setIsResultPopupOpen(false)}
          result={judgeResult}
          topicId={topic.id}
        />

        {/* 文字起こしパネル */}
        <TranscriptPanel
          topicId={topic.id}
          isOpen={isTranscriptPanelOpen}
          onToggle={() => setIsTranscriptPanelOpen(!isTranscriptPanelOpen)}
        />
      </div>
    </div>
  );
}
