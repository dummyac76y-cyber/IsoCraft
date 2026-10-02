import React, { useEffect, useRef } from 'react';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';

export interface NpcLine {
  name: string;
  role: string;
  line: string;
}

interface ChatBoxProps {
  dialogue: NpcLine;
  /** Asks whoever we are talking to for another line. */
  onContinue: () => void;
  onClose: () => void;
  /** How many lines have come out of this conversation so far. */
  turn: number;
}

/**
 * Conversation panel.
 *
 * Replaces the old floating line that timed out after a few seconds: talking to
 * someone is a decision, not a notification. It sits in its own layer above the
 * world and below the pause menu, anchored bottom centre so it never lands on
 * the joystick, the action pad or the hotbar.
 */
export function ChatBox({ dialogue, onContinue, onClose, turn }: ChatBoxProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    continueRef.current?.focus();
  }, [dialogue.line]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue, onClose]);

  return (
    <div className="px-chat-layer">
      <div ref={panelRef} className="px-chat">
        <PixelPanel notched padding={0}>
          {/* Speaker */}
          <div className="px-chat__head">
            <span className="px-avatar" style={{ color: 'var(--px-gold)' }} aria-hidden>
              <PixelIcon name="user" size={12} />
            </span>
            <span className="px-title truncate">{dialogue.name}</span>
            <span className="px-label shrink-0">{dialogue.role}</span>
            <span className="px-num ml-auto shrink-0" style={{ color: 'var(--px-gold)' }}>
              #{turn}
            </span>
            <button
              type="button"
              className="px-icon-btn"
              style={{ width: 18, height: 18 }}
              onClick={onClose}
              aria-label="End conversation"
            >
              <PixelIcon name="close" size={9} />
            </button>
          </div>

          {/* Line */}
          <div className="px-chat__body">
            <p className="px-copy" style={{ fontSize: 12, lineHeight: '1.45' }}>{dialogue.line}</p>
          </div>

          {/* Actions */}
          <div className="px-chat__foot">
            <span className="px-label hidden sm:inline" style={{ textTransform: 'none' }}>
              Enter to keep talking
            </span>
            <button
              ref={continueRef}
              type="button"
              className="px-btn px-btn--gold ml-auto"
              onClick={onContinue}
            >
              <PixelIcon name="hand" size={11} />
              Keep talking
            </button>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
