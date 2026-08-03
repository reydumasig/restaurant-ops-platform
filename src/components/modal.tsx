"use client";

import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", SIZE_CLASSES[size])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
