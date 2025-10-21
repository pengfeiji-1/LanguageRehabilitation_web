# 🎵 音频API迁移指南

根据新的音频API使用文档，项目已完成重构，本指南说明如何使用新的音频功能。

## 📋 **迁移总览**

### 旧方式 ❌
```javascript
// 复杂的多步骤音频处理
const fetchAudioUrl = useCallback(async () => {
  const response = await adminAPI.getAudioSignedUrl(evaluationId);
  const { signed_url, token } = response.data;
  setAudioUrl(signed_url);
  setAudioToken(token);
  
  const audioResponse = await fetch(signed_url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const audioBlob = await audioResponse.blob();
  const audioBlobUrl = URL.createObjectURL(audioBlob);
  setAudioBlobUrl(audioBlobUrl);
}, [evaluationId]);
```

### 新方式 ✅
```javascript
// 简化的两步播放流程
import { playAudio } from '@/utils/audioUtils';

const handlePlay = async () => {
  await playAudio(evaluationId, 'audio-container');
};
```

## 🚀 **新的使用方法**

### 1. 直接调用工具函数 (推荐)
```javascript
import { playAudio } from '@/utils/audioUtils';

// HTML
<div id="audio-player-container"></div>
<button onClick={() => playAudio(1130, 'audio-player-container')}>
  播放音频
</button>

// 完整示例
async function handlePlayAudio(evaluationId) {
  try {
    await playAudio(evaluationId, 'audio-container');
    console.log('音频播放成功');
  } catch (error) {
    console.error('播放失败:', error.message);
  }
}
```

### 2. 使用SimpleAudioPlayer组件
```jsx
import SimpleAudioPlayer from '@/components/SimpleAudioPlayer';

function MyComponent() {
  return (
    <div>
      <h3>评估记录音频</h3>
      <SimpleAudioPlayer evaluationId={1130} />
    </div>
  );
}
```

### 3. 使用增强版AudioPlayer组件
```jsx
import AudioPlayer from '@/pages/wab/components/AudioPlayer';

function MyComponent() {
  const handleError = (error) => {
    console.error('音频错误:', error);
  };

  return (
    <AudioPlayer 
      evaluationId={1130}
      onError={handleError}
      className="my-audio-player"
    />
  );
}
```

### 4. React Hook方式
```jsx
import { useAudioPlayer } from '@/utils/audioUtils';

function MyComponent() {
  const { play, loading, error } = useAudioPlayer();
  
  const handlePlay = () => {
    play(1130, 'audio-container');
  };

  return (
    <div>
      <div id="audio-container"></div>
      <button onClick={handlePlay} disabled={loading}>
        {loading ? '加载中...' : '播放音频'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## 📊 **API调用流程**

### 核心流程 (自动处理)
```
1. getAudioToken(evaluationId)
   ↓
   GET /api/v1/admin/audio/signed-url/{evaluationId}
   Authorization: Bearer {admin_token}

2. playAudio(evaluationId, containerId)  
   ↓
   GET {signed_url}
   Authorization: Bearer {audio_token}
   
3. 创建音频播放器
   ↓
   HTML Audio Element with Blob URL
```

## 🔧 **迁移步骤**

### Step 1: 替换导入
```diff
- import { adminAPI } from '@/lib/api';
+ import { playAudio } from '@/utils/audioUtils';
```

### Step 2: 简化状态管理
```diff
- const [audioUrl, setAudioUrl] = useState(null);
- const [audioToken, setAudioToken] = useState(null);
- const [audioBlobUrl, setAudioBlobUrl] = useState(null);
+ // 不需要复杂的状态管理
```

### Step 3: 替换播放逻辑
```diff
- const fetchAudioUrl = useCallback(async () => {
-   // 复杂的多步骤处理...
- }, [evaluationId]);

+ const handlePlay = async () => {
+   await playAudio(evaluationId, 'audio-container');
+ };
```

### Step 4: 简化UI
```diff
- <audio src={audioBlobUrl} controls />
- <button onClick={fetchAudioUrl}>重新加载</button>
- <button onClick={testUrl}>测试URL</button>

+ <div id="audio-container"></div>
+ <button onClick={handlePlay}>播放音频</button>
```

## 📝 **最佳实践**

### 1. 容器ID命名
```javascript
// 避免冲突，使用唯一ID
await playAudio(evaluationId, `audio-${evaluationId}`);
```

### 2. 错误处理
```javascript
try {
  await playAudio(evaluationId, 'audio-container');
  toast.success('音频加载成功');
} catch (error) {
  toast.error(`播放失败: ${error.message}`);
}
```

### 3. 内存管理
```javascript
// 音频播放器会自动处理内存清理
// 播放结束后会自动清理blob URL
```

### 4. 调试日志
```javascript
// 工具函数内置了完整的调试日志
// 开发环境下会显示详细的API调用过程
```

## ⚠️ **注意事项**

1. **容器元素**: 确保指定的容器元素存在于DOM中
2. **管理员认证**: 需要用户已登录并有有效的管理员token
3. **音频格式**: 支持WAV、MP3等标准音频格式
4. **移动端兼容**: 某些移动浏览器需要用户交互才能播放音频

## 🧪 **测试示例**

### 完整的测试页面
```html
<!DOCTYPE html>
<html>
<head>
    <title>音频播放测试</title>
</head>
<body>
    <div id="audio-container"></div>
    <button onclick="testAudio()">播放音频</button>

    <script type="module">
        import { playAudio } from '/src/utils/audioUtils.js';
        
        window.testAudio = async () => {
            try {
                await playAudio(1130, 'audio-container');
            } catch (error) {
                alert('播放失败: ' + error.message);
            }
        };
    </script>
</body>
</html>
```

## 🎯 **迁移检查清单**

- [ ] 移除旧的复杂音频状态管理
- [ ] 替换为新的工具函数调用
- [ ] 更新UI为容器+按钮模式
- [ ] 测试音频播放功能
- [ ] 检查错误处理是否正常
- [ ] 验证内存清理是否自动进行

## 🏆 **迁移完成！**

项目现在使用简化的音频API，符合文档指南，更易维护和使用。

有任何问题请参考：
- 📖 音频API使用指南（简化版）
- 🔧 `/utils/audioUtils.ts` 源码
- 🎵 `/components/SimpleAudioPlayer.tsx` 示例
