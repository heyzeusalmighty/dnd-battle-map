import { useEffect } from 'react';


interface UserHotkeysProps {
  setSelectedCharacterId: (id: string | null) => void;
}


const useUserHotkeys = (props: UserHotkeysProps) => {

  const { 
    setSelectedCharacterId
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
  
        // don't hijack typing
        if (isTypingTarget(e.target)) return;
  
        if (key === 'escape') {
          e.preventDefault();
          setSelectedCharacterId(null);
          return;
        }
        
  
        
      };
  
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [setSelectedCharacterId]);


 
}


export default useUserHotkeys;