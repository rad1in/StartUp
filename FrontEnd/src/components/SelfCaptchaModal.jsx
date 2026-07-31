import { useEffect, useRef, useState } from 'react';
import { X, Puzzle, RotateCw, ShieldCheck } from 'lucide-react';

// The self-hosted CAPTCHA's visible fallback UI (see hooks/useSelfCaptcha.js
// for when this ever actually appears — most real users never see it, since
// the invisible tier passes silently). Two tiers render here: a drag-and-
// rotate puzzle piece, and a last-resort arithmetic question.
export default function SelfCaptchaModal({ challenge, onSolved, onCancel }) {
  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="card-luxe w-full max-w-sm p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 text-ink/40 hover:text-ink transition-colors"
          aria-label="بستن"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-4">
          <span className="inline-flex w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white items-center justify-center shadow-accent-glow mb-2">
            <ShieldCheck size={20} />
          </span>
          <h3 className="font-black text-ink text-lg">تایید امنیتی</h3>
          <p className="text-xs text-ink/45 mt-1">
            {challenge.tier === 'puzzle' ? 'تکه را بکش و بچرخان تا دقیقاً جا بیفتد' : 'یک سوال ساده برای تایید'}
          </p>
        </div>

        {challenge.tier === 'puzzle' ? (
          <PuzzleChallenge challenge={challenge} onSolved={onSolved} />
        ) : (
          <MathChallenge challenge={challenge} onSolved={onSolved} />
        )}
      </div>
    </div>
  );
}

function PuzzleChallenge({ challenge, onSolved }) {
  const { token, background, piece, canvas, pieceBox } = challenge;
  const trayHeight = pieceBox.height + 28;
  const startPos = { x: (canvas.width - pieceBox.width) / 2, y: canvas.height + 14 };

  const [pos, setPos] = useState(startPos);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  // A brand-new challenge (new token) means a new image/piece — drop any
  // leftover drag position from a previous failed attempt.
  useEffect(() => {
    setPos(startPos);
    setRotation(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pos };
    setDragging(true);
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    const { startX, startY, origin } = dragRef.current;
    setPos({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
  }

  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function submit() {
    onSolved({ token, x: Math.round(pos.x), y: Math.round(pos.y), rotation: Math.round(rotation) });
  }

  return (
    <div>
      <div
        className="relative mx-auto select-none"
        style={{ width: canvas.width, height: canvas.height + trayHeight }}
      >
        <img
          src={background}
          alt=""
          draggable={false}
          className="absolute top-0 left-0 rounded-xl border border-accent-600/30"
          style={{ width: canvas.width, height: canvas.height }}
        />
        <div
          className="absolute left-0 w-full rounded-xl bg-black/20 border border-dashed border-accent-600/25"
          style={{ top: canvas.height + 8, height: trayHeight - 8 }}
        />
        <img
          src={piece}
          alt=""
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute touch-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: pieceBox.width,
            height: pieceBox.height,
            transform: `rotate(${rotation}deg)`,
            cursor: dragging ? 'grabbing' : 'grab',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))',
            transition: dragging ? 'none' : 'transform 120ms ease',
          }}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <RotateCw size={16} className="text-accent-600 shrink-0" />
        <input
          type="range"
          min={0}
          max={359}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="w-full accent-accent-600"
        />
        <span className="text-xs text-ink/50 w-10 text-left shrink-0">{rotation}°</span>
      </div>

      <button onClick={submit} className="btn-gold w-full py-2.5 mt-4 text-sm flex items-center justify-center gap-2">
        <Puzzle size={15} />
        تایید و ادامه
      </button>
    </div>
  );
}

function MathChallenge({ challenge, onSolved }) {
  const { token, a, b, operator } = challenge;
  const [answer, setAnswer] = useState('');

  function submit(e) {
    e.preventDefault();
    if (answer === '') return;
    onSolved({ token, answer: Number(answer) });
  }

  return (
    <form onSubmit={submit}>
      <p className="text-center text-3xl font-black text-ink my-6 tracking-wide" dir="ltr">
        {a} {operator} {b} = ?
      </p>
      <input
        type="number"
        autoFocus
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="glass-input w-full rounded-xl px-4 py-3 text-center text-xl font-bold"
        placeholder="؟"
      />
      <button type="submit" className="btn-gold w-full py-2.5 mt-4 text-sm">
        تایید و ادامه
      </button>
    </form>
  );
}
