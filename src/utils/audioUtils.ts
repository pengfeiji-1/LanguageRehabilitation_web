/**
 * 音频工具类 - 根据API文档指南实现
 * 
 * 提供简化的音频播放功能，遵循文档中的两步认证流程
 */

import { useState } from 'react';
import { TokenManager } from '@/lib/api';

export interface AudioData {
  signed_url: string;
  token: string;
  expires_in: number;
  expires_at: string;
  audio_duration: string;
  file_size: string;
}

/**
 * 第一步：获取音频令牌
 * 按照文档API指南实现
 */
export async function getAudioToken(evaluationId: number): Promise<AudioData> {
  const adminToken = TokenManager.getAccessToken();
  if (!adminToken) {
    throw new Error('未找到管理员令牌，请重新登录');
  }

  const response = await fetch(`/api/v1/admin/audio/signed-url/${evaluationId}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('认证失败，请重新登录');
    }
    if (response.status === 404) {
      // 解析具体的404错误信息
      try {
        const errorData = await response.json();
        throw new Error(`No audio: ${errorData.detail || '该评估没有音频文件'}`);
      } catch (jsonError) {
        throw new Error('No audio: 该评估没有音频文件');
      }
    }
    throw new Error(`获取音频令牌失败: ${response.status}`);
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * 第二步：播放音频
 * 按照文档API指南实现完整的音频播放流程
 */
export async function playAudio(evaluationId: number, containerId: string): Promise<void> {
  try {
    // 1. 获取音频令牌
    console.log('开始获取音频令牌，评估ID:', evaluationId);
    const audioData = await getAudioToken(evaluationId);
    
    // 2. 获取音频文件
    console.log('开始获取音频文件:', audioData.signed_url);
    const response = await fetch(audioData.signed_url, {
      headers: {
        'Authorization': `Bearer ${audioData.token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No audio: 音频文件不存在'); // 音频文件不存在，不重试
      }
      throw new Error(`获取音频文件失败: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // 3. 创建播放器
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`未找到容器元素: ${containerId}`);
    }
    
    // 清理之前的音频元素
    const existingAudio = container.querySelector('audio');
    if (existingAudio) {
      const oldSrc = existingAudio.src;
      if (oldSrc.startsWith('blob:')) {
        URL.revokeObjectURL(oldSrc);
      }
      existingAudio.remove();
    }
    
    // 创建新的音频播放器
    const audioElement = document.createElement('audio');
    audioElement.controls = true;
    audioElement.style.width = '100%';
    audioElement.src = audioUrl;
    
    // 播放结束后清理blob URL (按照文档建议的内存管理)
    audioElement.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });
    
    container.appendChild(audioElement);
    
    // 自动播放音频
    try {
      await audioElement.play();
      console.log('音频自动播放成功');
    } catch (error) {
      console.log('自动播放失败，用户需要手动点击播放:', error);
      // 浏览器阻止自动播放时，确保显示播放控件
    }
    
    console.log('音频播放器创建成功');
  } catch (error) {
    console.error('播放失败:', error);
    throw error;
  }
}

/**
 * React Hook版本的音频播放
 * 方便在React组件中使用
 */
export function useAudioPlayer() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const play = async (evaluationId: number, containerId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await playAudio(evaluationId, containerId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '音频播放失败';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { play, loading, error };
}
