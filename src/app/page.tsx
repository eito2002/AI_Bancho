'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreateTopicModal } from '@/components/CreateTopicModal';
import { Topic } from '@/types';
import { Plus, MessageSquare, BarChart3 } from 'lucide-react';

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/topics');
      const result = await response.json();

      if (result.success) {
        setTopics(result.data);
      } else {
        console.error('Failed to fetch topics:', result.error);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (
    name: string,
    goal: string,
    axes: string[]
  ) => {
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, goal, axes }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchTopics(); // 一覧を再取得
      } else {
        console.error('Failed to create topic:', result.error);
      }
    } catch (error) {
      console.error('Error creating topic:', error);
    }
  };

  const handleTopicClick = (topicId: string) => {
    router.push(`/topics/${topicId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI意思決定支援ツール
            </h1>
            <p className="text-gray-600 mt-2">
              複数のアイデアを評価軸に沿って比較・採決できます
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* 議題一覧 */}
        {topics.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              議題がありません
            </h3>
            <p className="text-gray-600 mb-6">
              最初の議題を作成して始めましょう
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新規議題を作成
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleTopicClick(topic.id)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {topic.name}
                  </h3>
                  <BarChart3 className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">評価軸:</span>
                    <span className="ml-1">{topic.axes.length}個</span>
                  </div>

                  {topic.axes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topic.axes.slice(0, 3).map((axis, index) => (
                        <span
                          key={index}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        >
                          {axis}
                        </span>
                      ))}
                      {topic.axes.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          +{topic.axes.length - 3}個
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-blue-600 font-medium">
                    詳細を見る →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 新規作成モーダル */}
        <CreateTopicModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateTopic}
        />
      </div>
    </div>
  );
}
