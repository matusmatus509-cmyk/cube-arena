import { useEffect, useRef, useState, useCallback } from 'react';
import { CubeScene } from './cube/CubeScene';
import { isSolved, MoveType } from './cube/CubeState';

const SCRAMBLE_MOVES: MoveType[] = ['U', "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'L', "L'", 'R', "R'"];

// Force Panel Component
function ForcePanel({ 
    isOpen, 
    onClose, 
    cubeScene, 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    cubeScene: CubeScene | null; 
  }) {
    const [forceSnapshotExists, setForceSnapshotExists] = useState(false);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
      if (isOpen && cubeScene) {
        setForceSnapshotExists(!!cubeScene.getForceSnapshot());
      }
    }, [cubeScene, isOpen]);

    if (!isOpen) return null;

    const handleSetSnapshot = () => {
      if (!cubeScene) return;
      cubeScene.setForceSnapshot();
      setForceSnapshotExists(true);
      setStatus('Force Cube SNAPSHOT stored (exact copy of current cube)');
    };

    const handleClear = () => {
      if (!cubeScene) return;
      cubeScene.clearForceSnapshot();
      setForceSnapshotExists(false);
      setStatus('Force Cube cleared');
    };

    return (
      <div className="force-panel-overlay" onClick={onClose}>
        <div className="force-panel" onClick={e => e.stopPropagation()}>
          <div className="force-panel-header">
            <h2>Force Mode (Secret)</h2>
            <button onClick={onClose}>✕</button>
          </div>

          <div className="force-panel-content">
            <div className="force-status">
              Force Cube: {forceSnapshotExists ? 'STORED ✓' : 'none'}
            </div>

            <div className="force-buttons">
              <button onClick={handleSetSnapshot} className="force-btn">
                Snapshot Force Cube (Exact Copy)
              </button>
              <button onClick={handleClear} className="force-btn force-btn-danger">
                Clear Force Cube
              </button>
            </div>

            {status && <div className="force-status">{status}</div>}

            <div className="force-hint">
              <p><strong>Phase 1:</strong> Double-tap center-top area to activate. Hidden faces force colors.</p>
              <p><strong>Phase 2:</strong> Rotate cube to hide originally visible faces, then do L then L&apos; move.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

// Side Panel Component
function SidePanel({
  isOpen,
  onClose,
  onScramble,
  onSolve,
  scrambling,
  solving,
  solved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScramble: () => void;
  onSolve: () => void;
  scrambling: boolean;
  solving: boolean;
  solved: boolean;
}) {
  const busy = scrambling || solving;

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <h2>MENU</h2>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-actions">
          <button
            className="drawer-action-btn"
            onClick={() => { onScramble(); onClose(); }}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            <span>{scrambling ? 'Scrambling...' : 'Scramble'}</span>
          </button>

          <button
            className={`drawer-action-btn drawer-action-solve ${solving ? 'active' : ''}`}
            onClick={() => { onSolve(); onClose(); }}
            disabled={busy || solved}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{solving ? 'Solving...' : 'Solve'}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cubeSceneRef = useRef<CubeScene | null>(null);
  const [solved, setSolved] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [scrambling, setScrambling] = useState(false);
  const [solving, setSolving] = useState(false);
  const [showSolvedBanner, setShowSolvedBanner] = useState(false);
  const [showForcePanel, setShowForcePanel] = useState(false);
  const [, setForceActive] = useState(false);
  const scrambleRef = useRef(false);
  const solveRef = useRef(false);
  const titlePressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new CubeScene(mountRef.current);
    cubeSceneRef.current = scene;
    scene.setOnStateChange((state) => {
      const s = isSolved(state);
      setSolved(s);
      if (s) {
        setShowSolvedBanner(true);
        setTimeout(() => setShowSolvedBanner(false), 3000);
      }
    });
    scene.onForceActiveChange = setForceActive;
    return () => {
      if (titlePressTimer.current) clearTimeout(titlePressTimer.current);
      scene.destroy(); cubeSceneRef.current = null;
    };
  }, []);

  const handleScramble = useCallback(() => {
    if (!cubeSceneRef.current || scrambling || solving) return;
    solveRef.current = false;
    setSolving(false);
    setScrambling(true);
    scrambleRef.current = true;
    setSolved(false);
    setShowSolvedBanner(false);
    cubeSceneRef.current.clearHistory();
    const total = 20;
    let count = 0;
    let lastFace = '';
    const next = () => {
      if (count >= total || !scrambleRef.current) {
        setScrambling(false);
        scrambleRef.current = false;
        return;
      }
      let move: MoveType;
      do { move = SCRAMBLE_MOVES[Math.floor(Math.random() * SCRAMBLE_MOVES.length)]; } while (move[0] === lastFace);
      lastFace = move[0];
      cubeSceneRef.current?.executeMove(move);
      count++;
      setTimeout(next, 90);
    };
    next();
  }, [scrambling, solving]);

  const handleSolve = useCallback(() => {
    if (!cubeSceneRef.current || scrambling || solving || solved || cubeSceneRef.current.isForceModeActive()) return;
    const sequence = cubeSceneRef.current.getSolveSequence();
    if (sequence.length === 0) return;
    setSolving(true);
    solveRef.current = true;
    let index = 0;
    const next = () => {
      if (index >= sequence.length || !solveRef.current) {
        setSolving(false);
        solveRef.current = false;
        return;
      }
      cubeSceneRef.current?.executeSolveMove(sequence[index]);
      index++;
      setTimeout(next, 220);
    };
    next();
  }, [scrambling, solving, solved]);

  const handleReset = useCallback(() => {
    if (!cubeSceneRef.current) return;
    scrambleRef.current = false;
    solveRef.current = false;
    setScrambling(false);
    setSolving(false);
    cubeSceneRef.current.reset();
    cubeSceneRef.current.resetRotation();
    setShowSolvedBanner(false);
  }, []);

  const busy = scrambling || solving;

  const lastTapRef = useRef<number>(0);
  const handleSecretTrigger = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    if (now - lastTapRef.current < 300) {
      if (cubeSceneRef.current && !cubeSceneRef.current.isForceModeActive() && cubeSceneRef.current.getForceSnapshot()) {
        cubeSceneRef.current.activateForceMode();
      }
    }
    lastTapRef.current = now;
  }, []);

  const onTitleMouseDown = () => {
    titlePressTimer.current = window.setTimeout(() => {
      setShowForcePanel(true);
    }, 3000);
  };

  const onTitleMouseUp = () => {
    if (titlePressTimer.current) {
      clearTimeout(titlePressTimer.current);
      titlePressTimer.current = null;
    }
  };

  return (
    <div className="app-root">
      {/* Secret trigger area */}
      <div 
        className="secret-trigger-area" 
        onMouseDown={handleSecretTrigger}
        onTouchStart={handleSecretTrigger}
      />

      {/* Top bar */}
      <header className="topbar">
        <button className="topbar-icon" onClick={() => setShowPanel(!showPanel)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span 
          className="topbar-title" 
          onMouseDown={onTitleMouseDown}
          onMouseUp={onTitleMouseUp}
          onMouseLeave={onTitleMouseUp}
          onTouchStart={onTitleMouseDown}
          onTouchEnd={onTitleMouseUp}
        >
          CUBEMIX
        </span>
        <div className="topbar-stats">
          <div className={`status-dot ${solved ? 'dot-solved' : 'dot-unsolved'}`} />
        </div>
      </header>

      {/* Solved toast */}
      {showSolvedBanner && (
        <div className="solved-toast">SOLVED!</div>
      )}

      {/* Cube area */}
      <div className="cube-area">
        <div className="canvas-wrap" ref={mountRef} />
      </div>

      {/* Bottom toolbar — Reset only */}
      <div className="toolbar">
        <button className="tool" onClick={handleReset} disabled={busy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {/* Side panel with Scramble + Solve */}
      <SidePanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        onScramble={handleScramble}
        onSolve={handleSolve}
        scrambling={scrambling}
        solving={solving}
        solved={solved}
      />

      {/* Force Panel */}
      <ForcePanel 
        isOpen={showForcePanel}
        onClose={() => setShowForcePanel(false)}
        cubeScene={cubeSceneRef.current}
      />
    </div>
  );
}
