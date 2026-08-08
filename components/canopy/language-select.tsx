"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSelect({
  name,
  value,
  onValueChange,
}: {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Select
      defaultValue={value ? undefined : "zh-CN"}
      value={value}
      onValueChange={onValueChange}
      name={name}
    >
      <SelectTrigger className="mt-2">
        <SelectValue placeholder="Choose language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="zh-CN">Mandarin</SelectItem>
        <SelectItem value="zh-HK">Cantonese</SelectItem>
        <SelectItem value="fr-FR">French</SelectItem>
        <SelectItem value="und">Agnostic</SelectItem>
      </SelectContent>
    </Select>
  );
}
