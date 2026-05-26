"use client";

import * as React from "react";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { cn } from "@/lib/utils";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

const FormItemContext = React.createContext<{ id: string }>({ id: "" });

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-1.5", className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    const { id } = React.useContext(FormItemContext);
    return (
      <label
        ref={ref}
        htmlFor={id}
        className={cn("block text-xs text-slate-400", className)}
        {...props}
      />
    );
  }
);
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    const { id } = React.useContext(FormItemContext);
    return <div ref={ref} id={id} {...props} />;
  }
);
FormControl.displayName = "FormControl";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { name } = React.useContext(FormFieldContext);
    const { formState: { errors } } = useFormContext();

    const fieldError = name.split(".").reduce((obj: unknown, key) => {
      if (obj && typeof obj === "object") return (obj as Record<string, unknown>)[key];
      return undefined;
    }, errors) as { message?: string } | undefined;

    const msg = fieldError?.message ?? (children as string);
    if (!msg) return null;

    return (
      <p ref={ref} className={cn("text-xs text-red-400 mt-0.5", className)} {...props}>
        {msg}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export { Form, FormControl, FormField, FormItem, FormLabel, FormMessage };
