import React from 'react';
import { X, Gamepad2, Eye, Sparkles, Map, Smartphone } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CORE_BINDS: Array<[string, string]> = [
  ['Move hero', 'W A S D'],
  ['Sprint', 'Hold Shift'],
  ['Jump / swim up', 'Space'],
  ['Mine block / attack', 'Left click'],
  ['Place block / use', 'Right click'],
  ['Use chest / bench / talk', 'E'],
  ['Auto-pathfind', 'Shift + click'],
  ['Open backpack', 'I or Tab'],
  ['Hotbar slots', '1 – 9']
];

const CAMERA_BINDS: Array<[string, string]> = [
  ['Rotate view', 'Q / E'],
  ['Reset perspective', 'R'],
  ['Orbit and tilt', 'Hold middle-drag'],
  ['Zoom (60% – 150%)', 'Wheel or +/-']
];

function BindTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="keybind-table">
      {rows.map(([label, keys]) => (
        <div key={label} className="keybind-row">
          <span>{label}</span>
          <span className="flex items-center gap-1">
            {keys.split(/(\s*[+–]\s*|\s*or\s*)/).filter(Boolean).map((part, i) =>
              /^[+–]|or/.test(part.trim()) ? (
                <span key={i} className="text-[10px] text-[var(--text-lo)]">{part.trim()}</span>
              ) : (
                <kbd key={i}>{part.trim()}</kbd>
              )
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-scrim" onContextMenu={e => e.preventDefault()}>
      <div className="panel modal max-w-2xl" role="dialog" aria-modal="true" aria-label="Adventurer's manual">
        <div className="modal-header">
          <div className="modal-heading">
            <div className="modal-icon" aria-hidden><Gamepad2 size={17} /></div>
            <div className="min-w-0">
              <h2 className="modal-title">Adventurer's manual</h2>
              <p className="modal-sub">Controls &amp; how the world works</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <section className="flex flex-col gap-2">
            <span className="label flex items-center gap-2">
              <Gamepad2 size={12} className="text-[var(--gold)]" />
              Movement &amp; world
            </span>
            <BindTable rows={CORE_BINDS} />
          </section>

          <section className="flex flex-col gap-2">
            <span className="label flex items-center gap-2">
              <Eye size={12} className="text-[var(--gold)]" />
              Camera
            </span>
            <BindTable rows={CAMERA_BINDS} />
          </section>

          <section className="well flex flex-col gap-2 p-3">
            <span className="label flex items-center gap-2">
              <Smartphone size={12} className="text-[var(--gold)]" />
              On a phone or tablet
            </span>
            <p className="body-sm">
              The stick on the left drives movement; hold <b>SPRINT</b> above the hotbar to run.
              On the right, tap <b>MINE</b>, <b>PLACE</b>, <b>INTERACT</b> or <b>GO</b>, and jump from the
              large round pad. Tap the world to aim. The camera column on the far right rotates,
              re-centres and zooms the view.
            </p>
          </section>

          <section className="well flex flex-col gap-2 p-3">
            <span className="label flex items-center gap-2">
              <Sparkles size={12} className="text-[var(--leaf)]" />
              Occlusion &amp; endless terrain
            </span>
            <p className="body-sm">
              <b className="text-[var(--text-hi)]">Clear view.</b> Walls and terrain between you and the
              camera fade away, so your hero, chests and NPCs are never hidden behind a cliff.
            </p>
            <p className="body-sm">
              <b className="text-[var(--text-hi)]">Endless world.</b> Terrain, biomes, rivers, caves, ore
              seams, camps and shrines stream in around you in every direction. There are no borders.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            <Map size={15} />
            Back to the world
          </button>
        </div>
      </div>
    </div>
  );
};