import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useMapContext } from '../context/MapContext';
import { slugify } from '../utils/id';

const ObjectPanel = () => {
  const { state, actions } = useMapContext();

  const { newObjLabel, newObjColor, newObjIcon, customObjects, selectedTool } =
    state;
  const {
    setSelectedTool,
    setNewObjLabel,
    setNewObjColor,
    setNewObjIcon,
    setCustomObjects,
  } = actions;

  const handleAddCustomObject = () => {
    const label = newObjLabel.trim();
    if (!label) return;
    const id = slugify(label);
    if (customObjects.some((o) => o.id === id)) return;
    setCustomObjects((prev) => [
      ...prev,
      {
        id,
        label,
        icon: newObjIcon.trim(),
        color: newObjColor,
      },
    ]);
    setSelectedTool(id);
    setNewObjLabel('');
    setNewObjIcon('');
    setNewObjColor('#8B4513');
  };

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold mb-3">Objects</h3>

      {/* Built-ins */}
      <div className="mb-3">
        <div className="text-xs text-muted-foreground mb-1">Built-ins</div>
        <div className="flex flex-wrap gap-2">
          {customObjects
            .filter((o) => !!o.icon)
            .map((o) => (
              <Button
                key={o.id}
                size="sm"
                variant={selectedTool === o.id ? 'default' : 'outline'}
                className="h-8 px-2"
                onClick={() => setSelectedTool(o.id)}
                title={o.label}
              >
                <span className="mr-1">{o.icon}</span>
                {o.label}
              </Button>
            ))}
        </div>
      </div>

      {/* My objects (user-added) */}
      {customObjects.some((o) => !o.icon) && (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">My objects</div>
          <div className="flex flex-wrap gap-2">
            {customObjects
              .filter((o) => !o.icon)
              .map((o) => (
                <Button
                  key={o.id}
                  size="sm"
                  variant={selectedTool === o.id ? 'default' : 'outline'}
                  className="h-8 px-2"
                  onClick={() => setSelectedTool(o.id)}
                  title={o.label}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-sm mr-2"
                    style={{ background: o.color }}
                  />
                  {o.label}
                </Button>
              ))}
          </div>
        </div>
      )}

      <div className="border-t pt-3">
        <div className="text-xs text-muted-foreground mb-1">New object</div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            placeholder="Label (e.g., Crate)"
            value={newObjLabel}
            onChange={(e) => setNewObjLabel(e.target.value)}
          />
          <div className="relative">
            {/* The visible swatch */}
            <div
              className="h-9 w-12 rounded-md border shadow-inner"
              style={{ backgroundColor: newObjColor }}
            />

            {/* Invisible native color input stretched over the swatch */}
            <input
              type="color"
              value={newObjColor}
              onChange={(e) => setNewObjColor(e.target.value)}
              className="absolute inset-0 h-9 w-12 opacity-0 cursor-pointer"
              title="Color"
              aria-label="Pick color"
            />
          </div>
          <Button onClick={handleAddCustomObject} className="mt-2 w-full">
            Add Object
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ObjectPanel;
