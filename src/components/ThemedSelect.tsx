import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_VALUE = "__fomo_empty__";

type ThemedSelectOption = {
  value: string;
  label: string;
};

type ThemedSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  className?: string;
};

export function ThemedSelect({
  value,
  onValueChange,
  options,
  placeholder = "Pilih",
  className = "",
}: ThemedSelectProps) {
  return (
    <Select
      value={value || EMPTY_VALUE}
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE ? "" : nextValue)}
    >
      <SelectTrigger
        className={`h-10 w-full rounded-xl border-[#E7DED3] bg-white px-3 text-sm text-[#241C17] shadow-[0_8px_18px_rgba(42,33,28,0.04)] focus:ring-[#B77945]/20 ${className}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="z-[90] overflow-hidden rounded-xl border-[#D7C9BA] bg-white p-1 text-[#241C17] shadow-[0_18px_42px_rgba(42,33,28,0.16)]"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value || EMPTY_VALUE}
            value={option.value || EMPTY_VALUE}
            className="rounded-lg px-3 py-2 text-sm text-[#241C17] focus:bg-[#F1E8DC] focus:text-[#241C17] data-[state=checked]:bg-[#B77945] data-[state=checked]:text-white"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
