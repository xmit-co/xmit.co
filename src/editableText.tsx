import { useEffect, useState } from "preact/hooks";

export function EditableText({
  value,
  prefix,
  placeholder,
  submit,
  whenMissing,
  type,
}: {
  class?: string | undefined;
  value: string | undefined;
  whenMissing?: string | undefined;
  prefix?: string | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  submit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [value]);
  if (editing) {
    return (
      <input
        type={type || "text"}
        value={value}
        placeholder={placeholder}
        ref={(e) => e && e.focus()}
        onFocusIn={(e) => (e.target as HTMLInputElement).select()}
        onFocusOut={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value;
            if (v == value) {
              setEditing(false);
            } else {
              submit(v);
            }
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        onInput={(e) => {
          const t = e.target as HTMLInputElement;
          t.style.width = `max(10em, ${t.value.length}ch)`;
        }}
      />
    );
  }
  if (prefix !== undefined && value !== undefined) {
    value = prefix + value;
  }
  return (
    <span class="clickable" onClick={() => setEditing(true)}>
      {value || <em>{whenMissing}</em>}
      <button>✎</button>
    </span>
  );
}
