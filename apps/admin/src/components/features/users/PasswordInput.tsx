"use client";

import { Sparkles } from "lucide-react";
import { generatePassword } from "@curo/web/auth";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@curo/web/ui/input-group";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Gets a new random password to put in the field. */
  onGenerate: (password: string) => void;
};

/** A password typed in plain sight, since the admin passes it on, or made up with Generate. */
export function PasswordInput({ onGenerate, ...input }: PasswordInputProps) {
  return (
    <InputGroup>
      <InputGroupInput type="text" autoComplete="off" spellCheck={false} className="font-mono placeholder:font-sans" placeholder="At least 8 characters" {...input} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton onClick={() => onGenerate(generatePassword())}>
          <Sparkles /> Generate
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
