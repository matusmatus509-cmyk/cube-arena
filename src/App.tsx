import { useEffect, useRef, useState, useCallback } from 'react';
import { CubeScene } from './cube/CubeScene';
import { isSolved, MoveType } from './cube/CubeState';

const SCRAMBLE_MOVES: MoveType[] = ['U', "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'L', "L'", 'R', "R'"];

const MOVE_GROUPS = [
  { label: 'Up / Down', moves: ['U', "U'", 'D', "D'"] as MoveType[] },
  { label: 'Front / Back', moves: ['F', "F'", 'B', "B'"] as MoveType[] },
  { label: 'Left / Right', moves: ['L', "L'", 'R', "R'"] as MoveType[] },
  { label: 'Middle Slices', moves: ['M', "M'", 'E', "E'", 'S', "S'"] as MoveType[] },
];

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

    // Sync with cubeScene whenever the panel opens
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
            <h2>🔮 Force Mode (Secret)</h2>
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
              <p><strong>Phase 1:</strong> Double-tap center-top area to activate. Hidden faces → force colors.</p>
              <p><strong>Phase 2:</strong> Rotate cube to hide originally visible faces, then do L → L' move.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cubeSceneRef = useRef<CubeScene | null>(null);
  const [solved, setSolved] = useState(true);
  const [moveCount, setMoveCount] = useState(0);
  const [showMoves, setShowMoves] = useState(false);
  const [scrambling, setScrambling] = useState(false);
  const [solving, setSolving] = useState(false);
  const [showSolvedBanner, setShowSolvedBanner] = useState(false);
  const [showForcePanel, setShowForcePanel] = useState(false);
  const [forceActive, setForceActive] = useState(false);
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
    setMoveCount(0);
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
      setMoveCount(count);
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
      setMoveCount(prev => prev + 1);
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
    setMoveCount(0);
    setShowSolvedBanner(false);
  }, []);

  const handleMove = useCallback((move: MoveType) => {
    if (!cubeSceneRef.current) return;
    cubeSceneRef.current.executeMove(move);
    setMoveCount(prev => prev + 1);
    setSolved(false);
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

  // Title long press handlers
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
      {/* Secret trigger area for Phase 1 */}
      <div 
        className="secret-trigger-area" 
        onMouseDown={handleSecretTrigger}
        onTouchStart={handleSecretTrigger}
      />
      {/* ── Top bar ── */}
      <header className="topbar">
        <button className="topbar-icon" onClick={() => setShowMoves(!showMoves)}>
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
          <div className="stat">
            <span className="stat-num">{moveCount}</span>
            <span className="stat-lbl">moves</span>
          </div>
          <div className={`status-dot ${solved ? 'dot-solved' : 'dot-unsolved'}`} />
        </div>
      </header>

      {/* ── Solved toast ── */}
      {showSolvedBanner && (
        <div className="solved-toast">✅ SOLVED!</div>
      )}

      {/* ── Cube area ── */}
      <div className="cube-area">
        <div className="canvas-wrap" ref={mountRef} />
      </div>

      {/* ── Bottom toolbar ── */}
      <div className="toolbar">
        <button className="tool" onClick={handleScramble} disabled={busy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <span>{scrambling ? '...' : 'Scramble'}</span>
        </button>

        <button className={`tool tool-primary ${solving ? 'active' : ''}`} onClick={handleSolve} disabled={busy || solved}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{solving ? '...' : 'Solve'}</span>
        </button>

        <button className="tool" onClick={handleReset} disabled={busy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {/* ── Move drawer ── */}
      {showMoves && (
        <>
          <div className="overlay" onClick={() => setShowMoves(false)} />
          <div className="drawer">
            <div className="drawer-head">
              <h2>MOVES</h2>
              <button className="drawer-close" onClick={() => setShowMoves(false)}>✕</button>
            </div>
            {MOVE_GROUPS.map(group => (
              <div key={group.label} className="move-section">
                <div className="move-section-title">{group.label}</div>
                <div className="move-grid">
                  {group.moves.map(move => (
                    <button key={move} className="move-chip" onClick={() => handleMove(move)} disabled={busy}>
                      {move}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Force Panel ── */}
      <ForcePanel 
        isOpen={showForcePanel}
        onClose={() => setShowForcePanel(false)}
        cubeScene={cubeSceneRef.current}
      />
    </div>
  );
}
