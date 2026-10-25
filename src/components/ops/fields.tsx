"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { CustomField, CustomFieldValues, FieldSection } from "@/lib/contract";
import type { Formatters } from "@/lib/format";
import { useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

/**
 * The tenant's fields (config `fields.<section>`). Built-in fields stay in
 * their place in each form; the config gives them their label and help
 * text, and decides whether they're on, required and shown in lists. Custom
 * fields follow the built-in ones. Records store custom values by field
 * key, and the backend checks everything again.
 */

/** A built-in field's settings, ready for a form or list. */
export interface BuiltInField {
  on: boolean;
  label: string;
  required: boolean;
  /** The help text, if there is one. */
  help: string | undefined;
  /** On and shown in lists. */
  listed: boolean;
}

/** The section's fields: `builtIn(key)` for a built-in field's settings, and the custom fields that are on. */
export function useFields(section: FieldSection) {
  const { config } = useWorkspace();
  const fields = config.fields[section];
  const builtIn = (key: string): BuiltInField => {
    const settings = fields.builtIn[key];
    // Keys that aren't built-in fields, such as a request's vehicleId, count as on.
    if (!settings) return { on: true, label: key, required: false, help: undefined, listed: false };
    return { on: settings.active, label: settings.label, required: settings.required, help: settings.helpText || undefined, listed: settings.active && settings.showInList };
  };
  return { builtIn, custom: fields.custom.filter((field) => field.active) };
}

/** The section's custom fields that are on. */
export const useCustomFields = (section: FieldSection): CustomField[] => useFields(section).custom;

/** `values` without the built-in fields that are off, for a request body. */
export function withoutOff<T extends Record<string, unknown>>(builtIn: (key: string) => BuiltInField, values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => builtIn(key).on)) as Partial<T>;
}

/** A form's custom field values while editing: strings for inputs, booleans for checkboxes. */
export type CustomFieldDraft = Record<string, string | boolean>;

/** Draft values from a record's stored values, or empty ones for a new record. */
export function draftOf(fields: CustomField[], values: CustomFieldValues = {}): CustomFieldDraft {
  return Object.fromEntries(
    fields.map((field) => {
      const value = values[field.key];
      if (field.type === "boolean") return [field.key, value === true];
      return [field.key, value === undefined || typeof value === "boolean" ? "" : String(value)];
    }),
  );
}

/**
 * The `customFields` to send. For a new record, the fields filled in. When
 * editing (with the `initial` draft), only the fields that changed, and
 * null for one that was cleared.
 */
export function customFieldsPayload(fields: CustomField[], draft: CustomFieldDraft, initial?: CustomFieldDraft) {
  const payload: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const value = draft[field.key];
    if (value === undefined || (initial && value === initial[field.key])) continue;
    if (typeof value === "boolean") {
      if (value || initial) payload[field.key] = value;
    } else if (value.trim() === "") {
      if (initial) payload[field.key] = null;
    } else if (field.type === "number") {
      // Anything that isn't a number goes as typed, so the backend's message explains it.
      payload[field.key] = Number.isFinite(Number(value)) ? Number(value) : value;
    } else {
      payload[field.key] = value;
    }
  }
  return payload;
}

/**
 * One input per custom field, as siblings so they flow into the form's grid.
 * Long text and yes/no fields span the full row. `issue` looks up the API's
 * field issues; `path` is where the values sit in the request body.
 */
export function CustomFieldInputs({
  fields,
  draft,
  onChange,
  issue,
  path = "customFields",
}: {
  fields: CustomField[];
  draft: CustomFieldDraft;
  onChange: (draft: CustomFieldDraft) => void;
  issue: (path: string) => string | undefined;
  path?: string;
}) {
  const set = (key: string, value: string | boolean) => onChange({ ...draft, [key]: value });

  return fields.map((field) => {
    const error = issue(`${path}.${field.key}`);
    const value = draft[field.key];
    const label = field.required && field.type !== "boolean" ? `${field.label} *` : field.label;
    const hint = field.helpText || undefined;

    if (field.type === "boolean") {
      return (
        <div key={field.key} className="col-span-full">
          <Checkbox label={field.required ? `${field.label} (required)` : field.label} checked={value === true} onChange={(checked) => set(field.key, checked)} />
          {hint && !error && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
          {error && (
            <p role="alert" className="mt-1 text-[10px] font-bold text-rose-700">
              {error}
            </p>
          )}
        </div>
      );
    }

    const text = typeof value === "string" ? value : "";
    return (
      <Field key={field.key} label={label} hint={hint} error={error} className={field.type === "longText" ? "col-span-full" : ""}>
        {(id) => {
          switch (field.type) {
            case "longText":
              return <Textarea id={id} maxLength={field.maxLength} value={text} onChange={(e) => set(field.key, e.target.value)} />;
            case "number":
              return <Input id={id} type="number" step="any" min={field.min ?? undefined} max={field.max ?? undefined} value={text} onChange={(e) => set(field.key, e.target.value)} />;
            case "date":
              return <Input id={id} type="date" value={text} onChange={(e) => set(field.key, e.target.value)} />;
            case "select": {
              // A retired option still shows for records that picked it.
              const options = field.options.filter((option) => option.active || option.key === text);
              return (
                <Select id={id} value={text} onChange={(e) => set(field.key, e.target.value)}>
                  <option value="">—</option>
                  {options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              );
            }
            default:
              return <Input id={id} maxLength={field.maxLength} value={text} onChange={(e) => set(field.key, e.target.value)} />;
          }
        }}
      </Field>
    );
  });
}

/** A stored custom value as text: dates and numbers in the tenant's locale, option labels for choices. */
export function formatCustomValue(field: CustomField, value: CustomFieldValues[string] | undefined, format: Formatters): string {
  if (field.type === "boolean") return value === true ? "Yes" : "No";
  if (value === undefined || value === "") return "—";
  if (field.type === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return format.day(value);
  if (field.type === "number" && typeof value === "number") return format.number(value);
  if (field.type === "select") return field.options.find((option) => option.key === value)?.label ?? String(value);
  return String(value);
}

/** A built-in field's value as text, for list columns. */
function formatBuiltIn(key: string, value: unknown, format: Formatters): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (key) {
    case "emergencyContact": {
      const contact = value as { name: string; phone: string | null; relation: string | null };
      return [contact.name, contact.phone, contact.relation].filter(Boolean).join(" · ");
    }
    case "dailyRate":
    case "depositAmount":
      return format.money(Number(value));
    case "secondaryDailyRate":
      return format.secondaryMoney(Number(value)) ?? String(value);
    case "mileage":
    case "odometer":
      return format.distance(Number(value));
    case "incurredAt":
      return format.day(String(value));
    case "transmission":
      return TRANSMISSION_LABELS[value as keyof typeof TRANSMISSION_LABELS] ?? String(value);
    case "fuelType":
      return FUEL_LABELS[value as keyof typeof FUEL_LABELS] ?? String(value);
    case "residentType":
      return value === "tourist" ? "Tourist" : "Resident";
    default:
      return String(value);
  }
}

/** The section's custom fields that are on and have a value on this record, as `dt`/`dd` pairs for a `dl`. */
export function CustomFieldList({ section, values }: { section: FieldSection; values: CustomFieldValues }) {
  const { format } = useWorkspace();
  const fields = useCustomFields(section).filter((field) => values[field.key] !== undefined && values[field.key] !== "");
  return fields.map((field) => (
    <div key={field.key}>
      <dt className="text-[10px] font-bold tracking-wider text-muted uppercase">{field.label}</dt>
      <dd className={`text-ink ${field.type === "longText" ? "whitespace-pre-line" : ""}`}>{formatCustomValue(field, values[field.key], format)}</dd>
    </div>
  ));
}

/** Whether any of the section's custom fields that are on has a value on this record. */
export function useHasCustomValues(section: FieldSection, values: CustomFieldValues) {
  return useCustomFields(section).some((field) => values[field.key] !== undefined && values[field.key] !== "");
}

export interface ListColumn<T> {
  key: string;
  label: string;
  cell: (record: T) => string;
}

/**
 * List columns from the config. `listed(key)` says whether a built-in field
 * the list already shows in its own way is still wanted; `columns` are the
 * other fields shown in lists, built-in (not in `nativeKeys`) then custom.
 */
export function useListColumns<T extends { customFields: CustomFieldValues }>(section: FieldSection, nativeKeys: string[]) {
  const { config, format } = useWorkspace();
  const { builtIn, custom } = useFields(section);
  const columns: Array<ListColumn<T>> = [
    ...Object.keys(config.fields[section].builtIn)
      .filter((key) => !nativeKeys.includes(key) && builtIn(key).listed)
      .map((key) => ({ key, label: builtIn(key).label, cell: (record: T) => formatBuiltIn(key, (record as unknown as Record<string, unknown>)[key], format) })),
    ...custom
      .filter((field) => field.showInList)
      .map((field) => ({ key: `custom.${field.key}`, label: field.label, cell: (record: T) => formatCustomValue(field, record.customFields[field.key], format) })),
  ];
  return { listed: (key: string) => builtIn(key).listed, columns };
}

/**
 * Edits a record's custom fields on their own (PATCH `url`), and its notes
 * when `notes` is given and the section's notes field is on. Only what
 * changed is sent.
 */
export function CustomFieldsEditor({
  section,
  url,
  values,
  notes,
  onDone,
}: {
  section: FieldSection;
  url: string;
  values: CustomFieldValues;
  notes?: string;
  onDone?: () => void;
}) {
  const { builtIn, custom: fields } = useFields(section);
  const notesField = builtIn("notes");
  const editNotes = notes !== undefined && notesField.on;
  const [initial, setInitial] = useState(() => draftOf(fields, values));
  const [draft, setDraft] = useState(initial);
  const [notesDraft, setNotesDraft] = useState(notes ?? "");
  const save = useTenantMutation((request, body: unknown) => request<{ customFields: CustomFieldValues }>("PATCH", url, body));
  const issue = (path: string) => save.error?.issueFor(path);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          {
            customFields: customFieldsPayload(fields, draft, initial),
            ...(editNotes && notesDraft !== notes ? { notes: notesDraft } : {}),
          },
          {
            onSuccess: (saved) => {
              toast.success("Details saved");
              setInitial(draftOf(fields, saved.customFields));
              onDone?.();
            },
          },
        );
      }}
    >
      <CustomFieldInputs fields={fields} draft={draft} onChange={setDraft} issue={issue} />
      {editNotes && (
        <Field label={notesField.label} hint={notesField.help} error={issue("notes")} className="col-span-full">
          {(id) => <Textarea id={id} required={notesField.required} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />}
        </Field>
      )}
      <ErrorNote error={save.error} className="col-span-full" />
      <div className="col-span-full flex justify-end">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          Save details
        </Button>
      </div>
    </form>
  );
}
