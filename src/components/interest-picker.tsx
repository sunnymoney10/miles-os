import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = ["drawing", "building", "dinosaurs", "music", "space", "animals", "stories", "science", "dance", "nature", "robots", "cooking"];

export function InterestPicker({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id: string }) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim().toLowerCase().slice(0, 30);
    if (!v || value.includes(v) || value.length >= 12) return;
    onChange([...value, v]);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    }
  }

  return (
    <div className="grid gap-3">
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => {
          if (draft) {
            add(draft);
            setDraft("");
          }
        }}
        placeholder="Type an interest and press Enter"
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen interests">
          {value.map((i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== i))}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                aria-label={`Remove ${i}`}
              >
                {i} <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Suggestions">
        {SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:border-solid hover:text-foreground"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}