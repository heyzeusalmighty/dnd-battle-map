import { useEffect } from 'react';


interface UseHotkeysProps {
  mode: 'select' | 'measure' | 'paint';
  setMode: (mode: 'select' | 'measure' | 'paint') => void;  
  setPaintTool: (tool: 'wall' | 'difficult' | 'door') => void;
  undo: () => void;
  redo: () => void;
  handleNextTurn: () => void;
  setCurrentTurn: (fn: (v: number) => number) => void;
  setShowHelp: (v: boolean | ((v: boolean) => boolean)) => void;
}


const useHotkeys = (props: UseHotkeysProps) => {

  const { 
    mode,
    setMode,    
    setPaintTool,
    undo,
    redo,
    handleNextTurn,
    setCurrentTurn,
    setShowHelp,
   } = props;

  // hotkey guard
  const isTypingTarget = (t: EventTarget | null) => {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  };

  // hotkey enablers
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        const meta = e.metaKey || e.ctrlKey;
  
        // don't hijack typing
        if (isTypingTarget(e.target)) return;
  
        // ---- Undo / Redo (Meta/Ctrl) ----
        if (meta && key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (meta && ((key === 'z' && e.shiftKey) || key === 'y')) {
          e.preventDefault();
          redo();
          return;
        }
  
        // ---- Turn controls (optional; remove if you don't want them) ----
        if (key === ' ' || key === 'enter') {
          // next
          e.preventDefault();
          handleNextTurn();
          return;
        }
        if (key === 'backspace' || (e.shiftKey && key === ' ')) {
          // prev
          e.preventDefault();
          setCurrentTurn((v) => Math.max(0, v - 1));
          return;
        }
  
        // ---- Mode switching ----
        if (key === 'v') {
          e.preventDefault();
          setMode('select');
          return;
        }
        if (key === 'm') {
          e.preventDefault();
          setMode('measure');
          return;
        }
        if (key === 'b') {
          e.preventDefault();
          setMode('paint');
          return;
        }
  
        // ---- Paint subtools (only when painting) ----
        if (mode === 'paint') {
          if (key === '1') {
            e.preventDefault();
            setPaintTool('wall');
            return;
          }
          if (key === '2') {
            e.preventDefault();
            setPaintTool('difficult');
            return;
          }
          if (key === '3') {
            e.preventDefault();
            setPaintTool('door');
            return;
          }
          if (key === 'h') {
            e.preventDefault();
            setShowHelp((v) => !v);
            return;
          }
        }
      };
  
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [mode, undo, redo, handleNextTurn, setCurrentTurn, setMode, setPaintTool]);
}


export default useHotkeys;