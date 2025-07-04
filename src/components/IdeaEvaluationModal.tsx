'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage, IdeaEvaluationChat, SuggestedIdea } from '@/types';
import {
  Send,
  Bot,
  User,
  CheckCircle,
  XCircle,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

interface IdeaEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  axes: string[];
  topicName?: string;
  topicGoal?: string;
  existingIdeas?: Array<{ name: string; description?: string }>;
  transcript?: string;
  onSubmit: (
    ideaName: string,
    description: string,
    evaluations: Record<string, string>
  ) => void;
}

interface AIResponse {
  done: boolean;
  message: string;
  evaluation?: string;
  ideaSummary?: string;
}

export function IdeaEvaluationModal({
  isOpen,
  onClose,
  axes,
  topicName,
  topicGoal,
  existingIdeas,
  transcript,
  onSubmit,
}: IdeaEvaluationModalProps) {
  const [step, setStep] = useState<'input' | 'chat' | 'confirm' | 'summary'>(
    'input'
  );
  const [ideaName, setIdeaName] = useState('');
  const [description, setDescription] = useState('');
  const [currentAxisIndex, setCurrentAxisIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedIdea[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // テキストエリアの自動リサイズ
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 高さをリセット
      textarea.style.height = 'auto';
      // 内容に合わせて高さを調整
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 128; // max-h-32 (8rem = 128px)
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [inputMessage]);

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
          axes,
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

  const handleStartEvaluation = async () => {
    if (!ideaName.trim()) return;

    setStep('chat');
    setCurrentAxisIndex(0);
    setMessages([]);
    setIsLoading(true);

    try {
      // AIの初期評価を取得
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [], // 空の配列で初回メッセージとして扱う
          ideaName,
          currentAxis: axes[0],
          axes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const aiResponse: AIResponse = result.data;
        setMessages([{ role: 'assistant', content: aiResponse.message }]);
      } else {
        // エラー時のフォールバック
        setMessages([
          {
            role: 'assistant',
            content: `「${ideaName}」の${axes[0]}について、AI初期評価を行いました。評価の詳細を教えてください。`,
          },
        ]);
      }
    } catch (error) {
      console.error('Error getting initial evaluation:', error);
      // エラー時のフォールバック
      setMessages([
        {
          role: 'assistant',
          content: `「${ideaName}」の${axes[0]}について評価していきます。まず初期的な評価を教えてください。`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: inputMessage },
    ];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          ideaName,
          currentAxis: axes[currentAxisIndex],
          axes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const aiResponse: AIResponse = result.data;

        // AIの返答をチャットに追加
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: aiResponse.message },
        ]);

        // 議論が完了した場合
        if (aiResponse.done && aiResponse.evaluation) {
          // 評価を保存
          setEvaluations((prev) => ({
            ...prev,
            [axes[currentAxisIndex]]: aiResponse.evaluation!,
          }));

          // 次の軸に進むかチェック
          if (currentAxisIndex < axes.length - 1) {
            setTimeout(async () => {
              const nextAxisIndex = currentAxisIndex + 1;
              setCurrentAxisIndex(nextAxisIndex);

              // 軸移行の区切りメッセージを追加
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `--- ${axes[nextAxisIndex]}の評価を開始します ---`,
                },
              ]);

              try {
                // 次の軸でのAI初期評価を取得
                const nextResponse = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messages: [], // 空の配列で初回メッセージとして扱う
                    ideaName,
                    currentAxis: axes[nextAxisIndex],
                    axes,
                  }),
                });

                const nextResult = await nextResponse.json();

                if (nextResult.success) {
                  const nextAiResponse: AIResponse = nextResult.data;
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: nextAiResponse.message,
                    },
                  ]);
                } else {
                  // エラー時のフォールバック
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: `次に「${axes[nextAxisIndex]}」についてAI初期評価を行います。評価をご確認ください。`,
                    },
                  ]);
                }
              } catch (error) {
                console.error('Error getting next axis evaluation:', error);
                // エラー時のフォールバック
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: `次に「${axes[nextAxisIndex]}」について評価していきます。`,
                  },
                ]);
              }
            }, 1000);
          } else {
            // 全ての軸の評価が完了 - 確認画面へ
            setTimeout(() => {
              setStep('confirm');
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'エラーが発生しました。もう一度お試しください。',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmIdea = (accepted: boolean) => {
    if (accepted) {
      // アイデアを追加
      setStep('summary');
    } else {
      // 最初からやり直し
      setStep('input');
      setCurrentAxisIndex(0);
      setEvaluations({});
      setMessages([]);
      setInputMessage('');
    }
  };

  const handleSubmitIdea = () => {
    onSubmit(ideaName, description, evaluations);
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setIdeaName('');
    setDescription('');
    setCurrentAxisIndex(0);
    setEvaluations({});
    setMessages([]);
    setInputMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-gray-800">
            {step === 'input' && 'アイデアの基本情報'}
            {step === 'chat' && 'アイデアの評価'}
            {step === 'confirm' && 'アイデアの追加確認'}
            {step === 'summary' && '評価完了'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">
                  アイデア名 *
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="例: AIチャットボット導入"
                    value={ideaName}
                    onChange={(e) => setIdeaName(e.target.value)}
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
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleStartEvaluation}
                  disabled={!ideaName.trim() || isLoading}
                >
                  {isLoading ? 'AI評価を準備中...' : '評価を開始'}
                </Button>
              </div>
            </div>
          )}

          {step === 'chat' && (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50">
                {messages.map((message, index) => {
                  // 区切りメッセージかどうかをチェック
                  const isDividerMessage =
                    message.role === 'assistant' &&
                    message.content.includes('の評価を開始します');

                  if (isDividerMessage) {
                    return (
                      <div key={index} className="flex justify-center my-4">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                          {message.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                        <span className="text-sm text-gray-600 ml-2">
                          AI評価を生成中...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2 mt-4 items-end">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    placeholder="メッセージを入力..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className="min-h-[44px] max-h-32 resize-none overflow-hidden"
                    rows={1}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-[44px] w-[44px] flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 text-center">
                  「{ideaName}」を追加しますか？
                </h3>

                <div className="space-y-4">
                  {description && (
                    <div>
                      <span className="font-medium text-gray-700">説明:</span>
                      <div className="mt-1 p-3 bg-white rounded border text-sm break-words">
                        {description}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-gray-700">評価結果:</span>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {axes.map((axis) => (
                        <div key={axis} className="bg-white p-3 rounded border">
                          <div className="font-medium text-gray-800 mb-1 text-sm">
                            {axis}
                          </div>
                          <div className="text-sm text-gray-600 break-words">
                            {evaluations[axis] || '未評価'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 pb-4">
                <Button
                  onClick={() => handleConfirmIdea(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  OK - アイデアを追加
                </Button>
                <Button
                  onClick={() => handleConfirmIdea(false)}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 px-6 py-2"
                >
                  <XCircle className="w-5 h-5" />
                  NG - やり直す
                </Button>
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">
                  アイデアが追加されました！
                </h3>
                <p className="text-gray-600">
                  「{ideaName}」の評価が完了し、テーブルに追加されました。
                </p>
              </div>

              <div className="flex justify-center">
                <Button onClick={handleSubmitIdea} className="px-8">
                  完了
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
