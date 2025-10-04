import { HelpCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { useMapContext } from '../context/MapContext';

const HelpDialog = () => {
  const { state, actions } = useMapContext();

  const { showHelp, distanceRule, gridScale } = state;
  const { setShowHelp } = actions;

  return (
    <div className="fixed bottom-4 right-8 z-50">
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="rounded-full shadow-lg flex gap-1"
            title="Show controls (H)"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Controls</span>
          </Button>
        </DialogTrigger>

        <DialogContent
          className="w-[92vw] sm:w-[640px] max-w-[95vw] max-h-[80vh]
             p-0 overflow-hidden flex flex-col"
        >
          <DialogHeader className="p-4 pb-2 border-b shrink-0">
            <DialogTitle>Controls</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4">
            <div className="space-y-4 text-sm leading-6">
              {/* Tools */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Tools
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-mono">Select</span>: Click a token to
                    select. Hover shows a dashed preview; walls block with a red
                    stop. Click to move the lil homie.
                  </li>
                  <li>
                    <span className="font-mono">Measure</span>: Click–drag to
                    measure distances. Uses{' '}
                    <span className="font-mono">{distanceRule}</span> at{' '}
                    <span className="font-mono">{gridScale}ft</span>
                    /square, though you can muck that up good if you want.
                  </li>
                  <li>
                    <span className="font-mono">Paint</span>: Place{' '}
                    <span className="font-mono">Wall</span>s (shit you can't
                    move through), <span className="font-mono">Difficult</span>{' '}
                    (2x move stuff) terrain, or{' '}
                    <span className="font-mono">Door</span>
                    s. Can click-drag to apply and Right-click(-drag) to delete.
                  </li>
                  <li>
                    <span className="font-mono">Map Settings </span>
                    Screw around with grid size/scale/diagonal distance
                    calculation (nerd shyt)
                  </li>
                </ul>
              </div>

              {/* Characters */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Characters
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-mono">Add</span>: You can{' '}
                    <strong>Add</strong> one party member at a time should you
                    wish.{' '}
                    <ul>
                      <strong>Add Party</strong> brings the milkshake to the
                      yard.{' '}
                    </ul>
                    <ul>None of this will overwrite existing characters.</ul>
                    <ul>
                      <strong>Add Custom NPC</strong> has{' '}
                      <strong>Single</strong> or <strong>Bulk</strong> options.
                    </ul>
                    <ul>
                      Bulk auto-names gaggles of bros like{' '}
                      <span className="font-mono">Zombie 1..N</span>.
                    </ul>
                  </li>
                  <li>
                    <span className="font-mono">Manage</span> Can update
                    health/ouchies, kill homies off, etc.
                    <ul>
                      <strong>HP/DMG</strong>: PCs show HP; NPCs show DMG only
                      so Dakota can LIE.
                    </ul>
                    <ul>
                      <strong>Selection</strong>: Selecting a character's lil
                      list entry centers it on the map.
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Initiative */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Initiative
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Roll</strong>: Uses modifiers input during character
                    create (NPCs) or stored (PCs).
                  </li>
                  <li>
                    <strong>Modes</strong>:{' '}
                    <span className="font-mono">Auto</span> sorts by initiative;{' '}
                    <span className="font-mono">Manual</span> preserves your
                    custom order. This button is styled like straight buns and
                    sits just below the <strong>Round</strong> indicator.
                  </li>
                </ul>
              </div>

              {/* Shortcuts */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Shortcuts
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      H
                    </span>{' '}
                    Open/close Controls
                  </div>
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      Esc
                    </span>{' '}
                    Cancel measure / Deselect
                  </div>

                  <div className="col-span-2 my-1 border-t" />

                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      ⌘/Ctrl+Z
                    </span>{' '}
                    Undo
                  </div>
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      ⇧⌘/Ctrl+Z
                    </span>{' '}
                    <span className="font-mono inline-block rounded border px-1 ml-1">
                      Ctrl+Y
                    </span>{' '}
                    Redo
                  </div>

                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      Space
                    </span>{' '}
                    or{' '}
                    <span className="font-mono inline-block rounded border px-1">
                      Enter
                    </span>{' '}
                    Next turn
                  </div>
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      Backspace
                    </span>{' '}
                    or{' '}
                    <span className="font-mono inline-block rounded border px-1">
                      ⇧Space
                    </span>{' '}
                    Previous turn
                  </div>

                  <div className="col-span-2 my-1 border-t" />

                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      V
                    </span>{' '}
                    Select mode
                  </div>
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      M
                    </span>{' '}
                    Measure mode
                  </div>
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      B
                    </span>{' '}
                    Paint mode
                  </div>
                  <div>
                    <span className="font-mono inline-block rounded border px-1">
                      1
                    </span>{' '}
                    Wall{' '}
                    <span className="font-mono inline-block rounded border px-1 ml-1">
                      2
                    </span>{' '}
                    Difficult{' '}
                    <span className="font-mono inline-block rounded border px-1 ml-1">
                      3
                    </span>{' '}
                    Door{' '}
                    <span className="text-muted-foreground">
                      (when painting)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 border-t flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setShowHelp(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpDialog;
