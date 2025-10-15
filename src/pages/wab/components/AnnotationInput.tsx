import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnnotationInputProps {
  value?: string;
  placeholder?: string;
  onSave: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function AnnotationInput({ 
  value = '', 
  placeholder = '添加标注...', 
  onSave, 
  className,
  size = 'md'
}: AnnotationInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleSave = () => {
    onSave(inputValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
          )}
          autoFocus
        />
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700 text-sm"
            title="保存"
          >
            <i className="fa-solid fa-check"></i>
          </button>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-600 text-sm"
            title="取消"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {value ? (
        <span 
          className={cn(
            "text-gray-700 bg-gray-100 px-2 py-1 rounded border cursor-pointer hover:bg-gray-200",
            size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
          )}
          onClick={() => setIsEditing(true)}
          title="点击编辑标注"
        >
          {value}
        </span>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={cn(
            "text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 rounded px-2 py-1 transition-colors",
            size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
          )}
          title="添加标注"
        >
          <i className="fa-solid fa-plus mr-1"></i>
          标注
        </button>
      )}
    </div>
  );
}
