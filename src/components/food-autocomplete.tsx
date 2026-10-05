"use client";

import { useId, useRef, useState } from "react";
import { roleLabels, stateLabels, suggestFoods, type FoodRole, type PreparationState } from "@/lib/food-catalog";

export type SuggestableFood = { id: string; name: string; role: FoodRole; preparation_state: PreparationState };

const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal";

export function FoodAutocomplete({ foods, value, onValueChange, onSelect, label, name, placeholder, maxLength }: {
  foods: SuggestableFood[];
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (food: SuggestableFood, input: HTMLInputElement | null) => void;
  label: string;
  name?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const listId = useId();
  const inputId = `${listId}-input`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = suggestFoods(foods, value);
  const showList = open && suggestions.length > 0;

  function choose(food: SuggestableFood) {
    setOpen(false);
    setActive(-1);
    onSelect(food, inputRef.current);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && showList && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="relative grid gap-1">
      <label className="text-sm font-semibold" htmlFor={inputId}>{label}</label>
      <input
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList}
        autoComplete="off"
        className={inputClass}
        id={inputId}
        maxLength={maxLength}
        name={name}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        type="search"
        value={value}
      />
      {showList && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg" id={listId} role="listbox">
          {suggestions.map((food, index) => (
            <li
              aria-selected={index === active}
              className={`cursor-pointer px-3 py-2 text-sm font-normal ${index === active ? "bg-lime-100" : "hover:bg-zinc-100"}`}
              id={`${listId}-${index}`}
              key={food.id}
              // mousedown runs before the input loses focus, so the list is still there to click.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(food);
              }}
              role="option"
            >
              <span className="block font-semibold">{food.name}</span>
              <span className="block text-xs text-zinc-600">{roleLabels[food.role]} · {stateLabels[food.preparation_state]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The food library's search box: suggestions as you type, and choosing one runs the search.
export function FoodSearchInput({ foods, initialValue }: { foods: SuggestableFood[]; initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <FoodAutocomplete
      foods={foods}
      label="Search by name"
      maxLength={60}
      name="q"
      onSelect={(food, input) => {
        setValue(food.name);
        if (input) input.value = food.name;
        input?.form?.requestSubmit();
      }}
      onValueChange={setValue}
      value={value}
    />
  );
}
