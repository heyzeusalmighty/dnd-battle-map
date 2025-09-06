import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

import type { CustomObj } from "../types";

interface ObjectPanelProps {
  customObjects: CustomObj[];
  setCustomObjects: React.Dispatch<React.SetStateAction<CustomObj[]>>;
  selectedTool: string;
  setSelectedTool: React.Dispatch<React.SetStateAction<string>>;
  newObjLabel: string;
  setNewObjLabel: React.Dispatch<React.SetStateAction<string>>;
  newObjColor: string;
  setNewObjColor: React.Dispatch<React.SetStateAction<string>>;
  handleAddCustomObject: () => void;
}

const ObjectPanel = ({
  customObjects,
  setCustomObjects,
  selectedTool,
  setSelectedTool,
  newObjLabel,
  setNewObjLabel,
  newObjColor,
  setNewObjColor,
  handleAddCustomObject,
}: ObjectPanelProps) => (
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
              variant={selectedTool === o.id ? "default" : "outline"}
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
                variant={selectedTool === o.id ? "default" : "outline"}
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
            aria-label="Pick color"
          />

          {/* Invisible native color input stretched over the swatch */}
          <input
            type="color"
            value={newObjColor}
            onChange={(e) => setNewObjColor(e.target.value)}
            className="absolute inset-0 h-9 w-12 opacity-0 cursor-pointer"
            title="Color"
          />
        </div>
      </div>
      <Button onClick={handleAddCustomObject} className="mt-2 w-full">
        Add Object
      </Button>
    </div>
  </Card>
);

export default ObjectPanel;
