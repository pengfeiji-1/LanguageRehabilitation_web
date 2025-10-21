/**
 * 简单音频播放器组件 - 按照文档API指南实现
 * 
 * 使用方式：
 * <SimpleAudioPlayer evaluationId={1130} />
 */

import { useState } from 'react';
import { playAudio } from '@/utils/audioUtils';
import { showError } from '@/lib/toast';

interface SimpleAudioPlayerProps {
  evaluationId: number;
  className?: string;
}

export default function SimpleAudioPlayer({ evaluationId, className = '' }: SimpleAudioPlayerProps) {
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    setLoading(true);
    try {
      await playAudio(evaluationId, `audio-player-${evaluationId}`);
    } catch (error) {
      // 简单检测：包含音频+没有/404 = 静默处理
      const errorStr = String(error);
      if (errorStr.includes('音频') && (
          errorStr.includes('没有') || 
          errorStr.includes('不存在') || 
          errorStr.includes('404') ||
          errorStr.includes('No audio')
        )) {
        console.log('🔇 没有音频，静默处理');
      } else {
        console.error('播放失败:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div id={`audio-player-${evaluationId}`} className="mb-2"></div>
      <button 
        onClick={handlePlay}
        disabled={loading}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? '加载中...' : '播放音频'}
      </button>
    </div>
  );
}

// React示例组件，按照文档API指南
export function AudioPlayerExample({ evaluationId }: { evaluationId: number }) {
  const [loading, setLoading] = useState(false);
  
  const play = async () => {
    setLoading(true);
    try {
      await playAudio(evaluationId, 'audio-container');
    } catch (error) {
      showError('播放失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div id="audio-container"></div>
      <button onClick={play} disabled={loading}>
        {loading ? '加载中...' : '播放'}
      </button>
    </div>
  );
}
