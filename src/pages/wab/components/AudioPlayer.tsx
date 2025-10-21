import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TokenManager } from '@/lib/api';

interface AudioPlayerProps {
  evaluationId?: number;
  audioUrl?: string; // 支持直接传入URL（向后兼容）
  className?: string;
  onError?: (error: string) => void;
}

export default function AudioPlayer({ evaluationId, audioUrl, className, onError }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 根据文档API指南实现音频获取逻辑
  const getAudioToken = async (evalId: number) => {
    const response = await fetch(`/api/v1/admin/audio/signed-url/${evalId}`, {
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取音频令牌失败: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  };

  const loadAudio = async (evalId: number) => {
    try {
      setLoading(true);
      
      // 步骤1：获取音频令牌 (按照文档API指南)
      const audioData = await getAudioToken(evalId);
      
      // 步骤2：获取音频文件 (按照文档API指南)
      const response = await fetch(audioData.signed_url, {
        headers: {
          'Authorization': `Bearer ${audioData.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取音频文件失败: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const newBlobUrl = URL.createObjectURL(audioBlob);
      
      // 清理旧的blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      
      setBlobUrl(newBlobUrl);
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
        onError?.('该评估暂无音频资源');
      } else {
        const errorMessage = error instanceof Error ? error.message : '音频加载失败';
        onError?.(errorMessage);
        console.error('音频加载失败:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // 当evaluationId改变时自动加载音频
  useEffect(() => {
    if (evaluationId) {
      loadAudio(evaluationId);
    }
    
    return () => {
      // 清理blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [evaluationId]);

  // 音频播放结束后清理blob URL (按照文档建议的内存管理)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && blobUrl) {
      const handleEnded = () => {
        URL.revokeObjectURL(blobUrl);
      };
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [blobUrl]);

  const togglePlay = () => {
    if (!audioRef.current || (!blobUrl && !audioUrl)) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('播放失败:', error);
        onError?.('音频播放失败，请重试');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!evaluationId && !audioUrl) {
    return (
      <div className={cn("flex items-center text-gray-400", className)}>
        <i className="fa-solid fa-volume-xmark mr-1"></i>
        <span className="text-sm">无音频</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center text-blue-600", className)}>
        <i className="fa-solid fa-spinner fa-spin mr-1"></i>
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors"
        title={isPlaying ? "暂停" : "播放"}
      >
        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`}></i>
      </button>
      
      {duration > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-1 min-w-[60px]">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={blobUrl || audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
    </div>
  );
}
