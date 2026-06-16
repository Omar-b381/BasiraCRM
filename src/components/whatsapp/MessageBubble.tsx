import React from 'react';
import { Check, CheckCheck, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { WhatsAppMessage } from '../../types/message.types';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isInbound = message.direction === 'inbound';
  const time = new Date(message.timestamp).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={clsx('flex w-full mb-3.5', {
        'justify-start': isInbound,
        'justify-end': !isInbound,
      })}
    >
      <div
        className={clsx('max-w-[70%] rounded-2xl px-4 py-3 text-xs leading-relaxed relative shadow-md', {
          'bg-gray-800 text-gray-100 rounded-tr-none border border-gray-700/60': isInbound,
          'bg-indigo-600 text-white rounded-tl-none shadow-indigo-600/10': !isInbound,
        })}
      >
        {/* محتوى الرسالة */}
        <p className="whitespace-pre-wrap font-semibold select-text">{message.body}</p>

        {/* ذيل الرسالة: التوقيت والحالة */}
        <div
          className={clsx('flex items-center gap-1.5 mt-2 text-[9px] justify-end', {
            'text-gray-500': isInbound,
            'text-indigo-200': !isInbound,
          })}
        >
          <span>{time}</span>
          {!isInbound && (
            <span className="shrink-0">
              {message.status === 'sending' && (
                <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin block" />
              )}
              {message.status === 'sent' && <Check className="w-3.5 h-3.5" />}
              {(message.status === 'delivered' || message.status === 'read') && (
                <CheckCheck className={clsx('w-3.5 h-3.5', {
                  'text-cyan-300': message.status === 'read'
                })} />
              )}
              {message.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
