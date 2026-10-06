"use client";
import {
  Children,
  isValidElement,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "@daypicker/react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { localDay } from "@/lib/task-view";
import "@daypicker/react/style.css";

// Mount floating controls inside a native dialog's top layer, when present.
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  "aria-label": label,
}: {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  onChange?: (event: { target: { value: string } }) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement>();
  const options = Children.toArray(children)
    .filter(isValidElement<{ value?: string; children: ReactNode }>)
    .map((child) => ({
      value: String(child.props.value ?? child.props.children),
      label: child.props.children,
    }));
  const encode = (v: string) => v || "__daymark_all__";
  return (
    <span className="select-wrap">
      <SelectPrimitive.Root
        name={name}
        disabled={disabled}
        value={value === undefined ? undefined : encode(value)}
        defaultValue={encode(defaultValue ?? options[0]?.value ?? "")}
        onOpenChange={() =>
          setContainer(trigger.current?.closest("dialog") ?? undefined)
        }
        onValueChange={(v) =>
          onChange?.({ target: { value: v === "__daymark_all__" ? "" : v } })
        }
      >
        <SelectPrimitive.Trigger
          ref={trigger}
          id={id}
          aria-label={label}
          className="select-trigger"
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <ChevronDown size={16} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Content
            className="select-menu"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll">
              Scroll up
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={encode(option.value)}
                  className="select-option"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={16} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="select-scroll">
              Scroll down
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </span>
  );
}

export function DatePicker({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement>();
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const [month, setMonth] = useState(selected);
  const label = name.replaceAll("_", " ");
  function choose(date: Date | undefined) {
    if (!date) return;
    setValue(localDay(date));
    setMonth(date);
    setOpen(false);
  }
  return (
    <span className="date-control">
      <input type="hidden" name={name} value={value} required={required} />
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setContainer(trigger.current?.closest("dialog") ?? undefined);
          setOpen(next);
        }}
      >
        <Popover.Trigger
          ref={trigger}
          className="date-trigger"
          aria-label={`Choose ${label}`}
        >
          <span>
            {selected?.toLocaleDateString("en", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }) ?? "Choose date"}
          </span>
          <CalendarDays size={17} />
        </Popover.Trigger>
        <Popover.Portal container={container}>
          <Popover.Content
            className="calendar-popover"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            aria-label={`Choose ${label}`}
          >
            <DayPicker
              mode="single"
              required
              selected={selected}
              onSelect={choose}
              month={month}
              onMonthChange={setMonth}
              showOutsideDays
              autoFocus
              navLayout="around"
            />
            <div className="date-shortcuts">
              {[0, 1, 7].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    choose(date);
                  }}
                >
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : "In a week"}
                </button>
              ))}
            </div>
            <label className="date-entry">
              Type a date
              <input
                aria-label={`Type ${label}`}
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                defaultValue={value}
                pattern="\d{4}-\d{2}-\d{2}"
                onChange={(event) => {
                  const input = event.target.value;
                  const date = new Date(`${input}T12:00:00`);
                  if (
                    /^\d{4}-\d{2}-\d{2}$/.test(input) &&
                    !Number.isNaN(date.getTime()) &&
                    localDay(date) === input
                  ) {
                    setValue(input);
                    setMonth(date);
                  }
                }}
              />
            </label>
            <Popover.Close
              className="calendar-close"
              aria-label="Close calendar"
            >
              Done
            </Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}
