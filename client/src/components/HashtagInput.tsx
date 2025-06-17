import React, { useState, useRef, useEffect } from 'react';
import { X, Hash } from 'lucide-react';

interface HashtagInputProps {
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export const HashtagInput: React.FC<HashtagInputProps> = ({
  hashtags,
  onHashtagsChange,
  placeholder = "해시태그를 입력하세요...",
  maxTags = 10,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim();
    if (cleanTag && !hashtags.includes(cleanTag) && hashtags.length < maxTags) {
      onHashtagsChange([...hashtags, cleanTag]);
    }
    setInputValue('');
  };

  const removeHashtag = (indexToRemove: number) => {
    onHashtagsChange(hashtags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && hashtags.length > 0) {
      removeHashtag(hashtags.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Instagram-style: automatically add # if user doesn't type it
    if (value && !value.startsWith('#') && !inputValue) {
      value = '#' + value;
    }
    
    // Remove # from the beginning for storage (we'll add it back for display)
    const cleanValue = value.replace(/^#/, '');
    setInputValue(cleanValue);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    if (inputValue.trim()) {
      addHashtag(inputValue);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={`min-h-[42px] border border-gray-200 rounded-lg p-2 bg-white ${className}`}>
      <div 
        className={`flex flex-wrap gap-2 items-center cursor-text ${
          isInputFocused ? 'outline-2 outline-purple-500 outline-offset-2' : ''
        }`}
        onClick={handleContainerClick}
      >
        {hashtags.map((tag, index) => (
          <div
            key={index}
            className="inline-flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm font-medium"
          >
            <Hash className="h-3 w-3 mr-1" />
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeHashtag(index);
              }}
              className="ml-1 text-purple-500 hover:text-purple-700 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {hashtags.length < maxTags && (
          <div className="flex items-center min-w-0 flex-1">
            <Hash className="h-4 w-4 text-gray-400 mr-1" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={handleInputBlur}
              placeholder={hashtags.length === 0 ? placeholder : ""}
              className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm placeholder-gray-400"
              style={{ minWidth: '120px' }}
            />
          </div>
        )}
      </div>
      
      {hashtags.length >= maxTags && (
        <div className="text-xs text-orange-600 mt-1">
          최대 {maxTags}개의 해시태그까지 추가할 수 있습니다.
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-1">
        스페이스바, 엔터 또는 쉼표로 해시태그를 추가하세요
      </div>
    </div>
  );
};