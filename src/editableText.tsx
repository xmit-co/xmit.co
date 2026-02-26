import { useEffect, useRef, useState } from "preact/hooks";

export function EditableText({
  value,
  prefix,
  placeholder,
  submit,
  whenMissing,
  type,
  buttonText,
  buttonIcon,
}: {
  class?: string | undefined;
  value?: string | undefined;
  whenMissing?: string | undefined;
  prefix?: string | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  buttonText?: string | undefined;
  buttonIcon?: string | undefined;
  submit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => setEditing(false), [value]);
  if (editing) {
    return (
      <input
        type={type || "text"}
        defaultValue={value}
        placeholder={placeholder}
        ref={(e) => {
          inputRef.current = e;
          e?.focus();
        }}
        onFocusIn={() => inputRef.current?.select()}
        onFocusOut={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = inputRef.current!.value;
            if (v == value) {
              setEditing(false);
            } else {
              submit(v);
              if (!value) {
                setEditing(false);
              }
            }
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        onInput={() => {
          const t = inputRef.current!;
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
      <button style={{ marginLeft: "0.5em" }}>
        {buttonIcon || "✎"} {buttonText || "edit"}
      </button>
    </span>
  );
}
